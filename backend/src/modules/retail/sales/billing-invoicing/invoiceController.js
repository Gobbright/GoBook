import { Invoice } from '../../../../models/Invoice.js';
import { Payment } from '../../../../models/Payment.js';
import { BusinessSettings } from '../../../../models/BusinessSettings.js';
import { httpError } from '../../../../utils/httpError.js';
import { sendMail } from '../../../../utils/mailer.js';
import { postInventoryForDocument, reverseInventoryForDocument } from '../../../../services/inventoryMovements.js';
import {
  postInvoiceAccounting,
  postPurchaseEntryAccounting,
  reverseAccountingPosting,
} from '../../../../services/accountingPostings.js';
import {
  attachAccountingStatus,
  attachAccountingStatusList,
} from '../../../../services/salesAccountingStatus.js';

// GET /api/sales/invoices/next-number?prefix=INV
export async function getNextNumber(req, res, next) {
  try {
    const { prefix = 'INV' } = req.query;
    const last = await Invoice.findOne(
      { businessId: req.user.businessId, number: new RegExp(`^${prefix}-`, 'i') },
      { number: 1 },
      { sort: { createdAt: -1 } },
    );
    let seq = 1;
    if (last) {
      const parts = last.number.split('-');
      const n = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(n)) seq = n + 1;
    }
    res.json({ number: `${prefix}-${String(seq).padStart(4, '0')}` });
  } catch (err) {
    next(err);
  }
}

// GET /api/sales/invoices
export async function listInvoices(req, res, next) {
  try {
    const { documentType, search, page = 1, limit = 50 } = req.query;
    const filter = { userId: req.user.id };
    if (documentType) filter.documentType = documentType;
    if (search) {
      filter.$or = [
        { number: new RegExp(search, 'i') },
        { 'customer.name': new RegExp(search, 'i') },
      ];
    }

    const [data, total] = await Promise.all([
      Invoice.find(filter)
        .sort({ createdAt: -1 })
        .skip((Number(page) - 1) * Number(limit))
        .limit(Number(limit))
        .lean(),
      Invoice.countDocuments(filter),
    ]);

    res.json({ data: await attachAccountingStatusList(req.user.id, data), total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
}

// GET /api/sales/invoices/:id
export async function getInvoice(req, res, next) {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user.id }).lean();
    if (!invoice) return next(httpError(404, 'Invoice not found'));
    res.json(await attachAccountingStatus(req.user.id, invoice));
  } catch (err) {
    next(err);
  }
}

// POST /api/sales/invoices
export async function createInvoice(req, res, next) {
  try {
    const invoice = await Invoice.create({ ...req.body, userId: req.user.id, businessId: req.user.businessId });
    try {
      await postInventoryForDocument(invoice, req.user.id);
      await postInvoiceAccounting(invoice, req.user);
      await postPurchaseEntryAccounting(invoice, req.user);
    } catch (err) {
      await reverseInventoryForDocument(invoice, req.user.id).catch(() => {});
      await reverseAccountingPosting({ userId: req.user.id, sourceType: 'invoice', sourceId: invoice._id }).catch(() => {});
      await reverseAccountingPosting({ userId: req.user.id, sourceType: 'purchase-entry', sourceId: invoice._id }).catch(() => {});
      await Invoice.deleteOne({ _id: invoice._id, userId: req.user.id });
      throw err;
    }
    res.status(201).json(await attachAccountingStatus(req.user.id, invoice.toObject()));
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, `Invoice number "${req.body.number}" already exists`));
    next(err);
  }
}

// PUT /api/sales/invoices/:id
export async function updateInvoice(req, res, next) {
  try {
    const existing = await Invoice.findOne({ _id: req.params.id, userId: req.user.id });
    if (!existing) return next(httpError(404, 'Invoice not found'));
    const nextInvoice = new Invoice({
      ...existing.toObject(),
      ...req.body,
      _id: existing._id,
      userId: existing.userId,
      businessId: existing.businessId,
    });

    await reverseInventoryForDocument(existing, req.user.id);
    try {
      await postInventoryForDocument(nextInvoice, req.user.id);
    } catch (err) {
      await postInventoryForDocument(existing, req.user.id);
      throw err;
    }

    let invoice;
    try {
      invoice = await Invoice.findOneAndUpdate(
        { _id: req.params.id, userId: req.user.id },
        { $set: req.body },
        { new: true, runValidators: false },
      );
    } catch (err) {
      await reverseInventoryForDocument(nextInvoice, req.user.id);
      await postInventoryForDocument(existing, req.user.id);
      throw err;
    }

    await postInvoiceAccounting(invoice, req.user);
    await postPurchaseEntryAccounting(invoice, req.user);

    res.json(await attachAccountingStatus(req.user.id, invoice.toObject()));
  } catch (err) {
    next(err);
  }
}

// DELETE /api/sales/invoices/:id
export async function deleteInvoice(req, res, next) {
  try {
    const invoice = await Invoice.findOneAndDelete({ _id: req.params.id, userId: req.user.id }).lean();
    if (!invoice) return next(httpError(404, 'Invoice not found'));
    await reverseInventoryForDocument(invoice, req.user.id);
    await reverseAccountingPosting({ userId: req.user.id, sourceType: 'invoice', sourceId: invoice._id });
    await reverseAccountingPosting({ userId: req.user.id, sourceType: 'purchase-entry', sourceId: invoice._id });
    const payments = await Payment.find({ invoiceId: invoice._id, userId: req.user.id }).lean();
    for (const payment of payments) {
      await reverseAccountingPosting({ userId: req.user.id, sourceType: 'payment', sourceId: payment._id });
    }
    await Payment.deleteMany({ invoiceId: invoice._id, userId: req.user.id });
    res.json({ message: 'Invoice deleted successfully' });
  } catch (err) {
    next(err);
  }
}

// POST /api/sales/invoices/:id/send-email
export async function sendInvoiceEmail(req, res, next) {
  try {
    const invoice = await Invoice.findOne({ _id: req.params.id, userId: req.user.id }).lean();
    if (!invoice) return next(httpError(404, 'Invoice not found'));

    const { toEmail, pdfBase64 } = req.body;
    if (!toEmail) return next(httpError(400, 'Recipient email is required'));

    const biz = await BusinessSettings.findOne({ userId: req.user.id }).lean() || {};
    const fmtCurrency = (n) => `₹${Number(n || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`;
    const fmtDate = (s) => { if (!s) return '-'; const d = new Date(s); return isNaN(d) ? s : d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); };

    let calculatedTotal = 0;
    const itemRows = (invoice.items || [])
      .filter((it) => it.description || Number(it.rate) > 0)
      .map((it, idx) => {
        const taxable = (Number(it.qty) || 0) * (Number(it.rate) || 0) * (1 - (Number(it.discount) || 0) / 100);
        const gst     = taxable * ((Number(it.gstRate) || 0) / 100);
        calculatedTotal += taxable + gst;
        const bg = idx % 2 === 0 ? '#ffffff' : '#f8fafc';
        return `<tr style="background:${bg}">
          <td style="padding:11px 14px;border-bottom:1px solid #e5e7eb;font-size:13px;color:#111827">${it.description || '-'}</td>
          <td style="padding:11px 10px;border-bottom:1px solid #e5e7eb;text-align:center;font-size:13px;color:#374151">${it.qty}</td>
          <td style="padding:11px 14px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:13px;color:#374151">${fmtCurrency(it.rate)}</td>
          <td style="padding:11px 14px;border-bottom:1px solid #e5e7eb;text-align:right;font-size:13px;font-weight:600;color:#1e3a8a">${fmtCurrency(taxable + gst)}</td>
        </tr>`;
      }).join('');

    // Add additional charges (freight, packing, etc.) to the total
    (invoice.charges || []).forEach((c) => {
      const amt = Number(c.amount) || 0;
      calculatedTotal += amt + amt * ((Number(c.gstRate) || 0) / 100);
    });

    const grandTotal = fmtCurrency(invoice.grandTotal || invoice.totals?.grandTotal || calculatedTotal);
    const docLabel = { invoice: 'Invoice', quotation: 'Quotation', 'credit-note': 'Credit Note', 'debit-note': 'Debit Note', 'delivery-challan': 'Delivery Challan' }[invoice.documentType] || 'Invoice';

    const notesBlock = (invoice.notes || invoice.terms) ? `
    <tr>
      <td style="padding:0 36px 20px">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#fffbeb;border:1px solid #fde68a;border-radius:8px">
          <tr><td style="padding:14px 18px">
            ${invoice.notes ? `<div style="font-size:13px;color:#374151"><span style="font-weight:700;color:#92400e">Notes:</span> ${invoice.notes}</div>` : ''}
            ${invoice.terms ? `<div style="font-size:13px;color:#374151;margin-top:${invoice.notes ? '6' : '0'}px"><span style="font-weight:700;color:#92400e">Terms:</span> ${invoice.terms}</div>` : ''}
          </td></tr>
        </table>
      </td>
    </tr>` : '';

    const bankBlock = biz.bankName ? `
    <tr>
      <td style="padding:0 36px 24px">
        <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px">
          <tr><td style="padding:14px 18px">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#16a34a;margin-bottom:10px">Payment / Bank Details</div>
            <table cellpadding="0" cellspacing="0" border="0">
              <tr><td style="font-size:12px;color:#6b7280;padding-right:12px;padding-bottom:4px">Bank</td><td style="font-size:13px;color:#111827;font-weight:600;padding-bottom:4px">${biz.bankName}</td></tr>
              ${biz.accountNumber ? `<tr><td style="font-size:12px;color:#6b7280;padding-right:12px;padding-bottom:4px">A/C No.</td><td style="font-size:13px;color:#111827;font-weight:600;padding-bottom:4px">${biz.accountNumber}</td></tr>` : ''}
              ${biz.ifscCode ? `<tr><td style="font-size:12px;color:#6b7280;padding-right:12px">IFSC</td><td style="font-size:13px;color:#111827;font-weight:600">${biz.ifscCode}</td></tr>` : ''}
            </table>
          </td></tr>
        </table>
      </td>
    </tr>` : '';

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#eef2f7;font-family:Arial,'Helvetica Neue',sans-serif">

<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#eef2f7">
<tr><td align="center" style="padding:32px 16px">

<table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.10)">

  <!-- HEADER -->
  <tr>
    <td style="background:#1e3a8a;padding:0">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="padding:28px 36px 22px">
            <div style="font-size:22px;font-weight:700;color:#ffffff;letter-spacing:-0.3px">${biz.businessName || 'GoBook Enterprises'}</div>
            ${biz.gstin ? `<div style="font-size:12px;color:#93c5fd;margin-top:4px">GSTIN: ${biz.gstin}</div>` : ''}
            ${(biz.address || biz.city || biz.state) ? `<div style="font-size:12px;color:#bfdbfe;margin-top:2px">${[biz.address, [biz.city, biz.state, biz.pincode].filter(Boolean).join(', ')].filter(Boolean).join(', ')}</div>` : ''}
          </td>
          <td align="right" valign="middle" style="padding:28px 36px 22px;white-space:nowrap">
            <table cellpadding="0" cellspacing="0" border="0" style="background:rgba(255,255,255,0.13);border-radius:8px">
              <tr><td style="padding:10px 18px;text-align:center">
                <div style="font-size:10px;color:#93c5fd;text-transform:uppercase;letter-spacing:1.5px;font-weight:700">${docLabel}</div>
                <div style="font-size:20px;font-weight:800;color:#ffffff;margin-top:3px">#${invoice.number}</div>
              </td></tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  <!-- DATE BAR -->
  <tr>
    <td style="background:#1e40af;padding:9px 36px">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td style="font-size:12px;color:#bfdbfe">Date: <span style="color:#ffffff;font-weight:700">${fmtDate(invoice.meta?.date)}</span></td>
          ${invoice.meta?.dueDate ? `<td align="right" style="font-size:12px;color:#bfdbfe">Due: <span style="color:#fbbf24;font-weight:700">${fmtDate(invoice.meta.dueDate)}</span></td>` : ''}
        </tr>
      </table>
    </td>
  </tr>

  <!-- BODY -->
  <tr>
    <td style="padding:30px 36px 20px">

      <!-- Greeting -->
      <p style="margin:0 0 22px;font-size:14px;color:#374151;line-height:1.75">
        Dear <strong style="color:#111827">${invoice.customer?.name || 'Customer'}</strong>,<br>
        Please find your ${docLabel.toLowerCase()} details below. Thank you for your business!
      </p>

      <!-- Bill To -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin-bottom:26px">
        <tr>
          <td width="4" bgcolor="#3b82f6" style="border-radius:4px 0 0 4px">&nbsp;</td>
          <td style="background:#eff6ff;border-radius:0 8px 8px 0;padding:14px 18px">
            <div style="font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:1.5px;color:#3b82f6;margin-bottom:7px">Bill To</div>
            <div style="font-size:16px;font-weight:700;color:#111827">${invoice.customer?.name || '-'}</div>
            ${invoice.customer?.phone ? `<div style="font-size:13px;color:#6b7280;margin-top:3px">${invoice.customer.phone}</div>` : ''}
            ${invoice.customer?.gstin ? `<div style="font-size:12px;color:#6b7280;margin-top:2px">GSTIN: ${invoice.customer.gstin}</div>` : ''}
            ${invoice.customer?.address ? `<div style="font-size:13px;color:#374151;margin-top:5px">${invoice.customer.address}${invoice.customer.city ? ', ' + invoice.customer.city : ''}${invoice.customer.state ? ', ' + invoice.customer.state : ''}</div>` : ''}
          </td>
        </tr>
      </table>

      <!-- Items table -->
      <table width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;border-radius:8px;overflow:hidden;border:1px solid #e2e8f0">
        <tr style="background:#1e3a8a">
          <th style="padding:11px 14px;text-align:left;font-size:11px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:0.8px">Description</th>
          <th style="padding:11px 10px;text-align:center;font-size:11px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:0.8px;width:45px">Qty</th>
          <th style="padding:11px 14px;text-align:right;font-size:11px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:0.8px;width:90px">Rate</th>
          <th style="padding:11px 14px;text-align:right;font-size:11px;font-weight:700;color:#ffffff;text-transform:uppercase;letter-spacing:0.8px;width:100px">Amount</th>
        </tr>
        ${itemRows}
      </table>

    </td>
  </tr>

  <!-- GRAND TOTAL -->
  <tr>
    <td style="padding:4px 36px 28px">
      <table width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td></td>
          <td align="right" width="230">
            <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#1e3a8a;border-radius:10px">
              <tr>
                <td style="padding:16px 22px">
                  <table width="100%" cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="font-size:12px;color:#bfdbfe;font-weight:600;text-transform:uppercase;letter-spacing:0.8px">Grand Total</td>
                      <td align="right" style="font-size:22px;font-weight:800;color:#ffffff">${grandTotal}</td>
                    </tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </td>
  </tr>

  ${notesBlock}
  ${bankBlock}

  <!-- FOOTER -->
  <tr>
    <td style="background:#f1f5f9;border-top:2px solid #e2e8f0;padding:18px 36px;text-align:center">
      <div style="font-size:13px;color:#475569;margin-bottom:5px">
        ${biz.businessEmail ? biz.businessEmail : ''}${biz.phone ? (biz.businessEmail ? '&nbsp;&nbsp;|&nbsp;&nbsp;' : '') + biz.phone : ''}
      </div>
      <div style="font-size:11px;color:#94a3b8">This is a computer-generated ${docLabel.toLowerCase()}. Please retain this for your records.</div>
      <div style="font-size:10px;color:#cbd5e1;margin-top:4px">Powered by GoBook</div>
    </td>
  </tr>

</table>

</td></tr>
</table>

</body>
</html>`;

    const attachments = pdfBase64
      ? [{ filename: `${docLabel}-${invoice.number}.pdf`, content: Buffer.from(pdfBase64, 'base64'), contentType: 'application/pdf' }]
      : [];

    await sendMail({ to: toEmail, subject: `${docLabel} #${invoice.number} from ${biz.businessName || 'GoBook Enterprises'}`, html, attachments });
    res.json({ message: 'Email sent successfully' });
  } catch (err) {
    next(err);
  }
}
