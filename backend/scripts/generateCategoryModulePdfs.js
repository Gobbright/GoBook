import PDFDocument from 'pdfkit';
import fs from 'fs';
import path from 'path';

const docsDir = path.resolve('docs');
fs.mkdirSync(docsDir, { recursive: true });

const retailBaseSections = [
  ['Dashboard', [
    ['Dashboard', 'View key business totals, recent activity, sales, stock, and operational highlights.'],
  ]],
  ['Sales & Bill', [
    ['Bills', 'Create customer invoices, record payment or credit, and reduce stock for sold products.'],
    ['Quotation', 'Prepare customer estimates before confirming an order or invoice.'],
    ['Sales Return', 'Record returned sales items and add eligible quantities back to stock.'],
    ['Delivery Challan', 'Issue delivery documents for goods movement before or without final billing.'],
    ['Credit Note', 'Reduce customer receivables for returns, discounts, or billing corrections.'],
    ['Debit Note', 'Add extra charges or upward adjustments to customer accounts.'],
    ['E-Invoice', 'Prepare GST e-invoice details for eligible tax invoices.'],
    ['E-Way Bill', 'Capture transport and invoice information required for e-way bill movement.'],
    ['Receivables', 'Track unpaid invoices, old balances, due dates, and customer outstanding amounts.'],
  ]],
  ['Purchase', [
    ['Purchase Order', 'Raise supplier purchase requests before goods or invoices are received.'],
    ['Purchase Entry', 'Record supplier bills and increase stock for purchased products.'],
    ['Supplier Returns', 'Return goods to suppliers and reduce the corresponding stock.'],
  ]],
  ['Accounting', [
    ['Vouchers', 'Record accounting vouchers for receipts, payments, journals, and adjustments.'],
    ['Ledger', 'View party and account-wise debit, credit, and closing balance details.'],
    ['Journal Entry', 'Post manual accounting entries for non-sales and non-purchase adjustments.'],
    ['Trial Balance', 'Review ledger balances to verify accounting accuracy.'],
    ['P&L Statement', 'Summarize income, expenses, and profit or loss.'],
    ['Balance Sheet', 'View assets, liabilities, and capital position.'],
    ['Cash Book', 'Track cash receipts and payments.'],
    ['Bank Book', 'Track bank receipts, payments, and account movement.'],
    ['Bank Reconciliation', 'Match bank book entries with actual bank statement records.'],
  ]],
  ['GST', [
    ['GST Dashboard', 'View GST tax summary and filing-related overview.'],
    ['GSTR-1', 'Prepare outward supply details from sales for GSTR-1 reporting.'],
    ['GSTR-3B', 'Summarize sales tax, ITC, and payable tax for GSTR-3B.'],
    ['GSTR-9', 'Prepare annual GST summary information for yearly return review.'],
    ['GST Reconciliation', 'Compare GST records and identify mismatches for correction.'],
  ]],
  ['Customers', [
    ['Customers', 'Maintain customer profiles, contact details, GSTIN, and billing information.'],
    ['Vendor Management', 'Maintain supplier records, contact details, GSTIN, and payables context.'],
    ['Leads', 'Capture potential customers and sales opportunities.'],
    ['Follow Ups', 'Schedule and track customer follow-up activities.'],
  ]],
  ['Employee Management', [
    ['Dashboard', 'View employee attendance, payroll, leave, and HR summary.'],
    ['Employees', 'Maintain employee profiles, roles, and work details.'],
    ['Attendance', 'Record daily attendance and working status.'],
    ['Leave', 'Manage employee leave requests and approvals.'],
    ['Payroll', 'Calculate salary, deductions, and payroll status.'],
  ]],
  ['Online Store', [
    ['Setup', 'Configure online store basics and selling preferences.'],
    ['Theme', 'Customize storefront visual appearance.'],
    ['Products', 'Publish selected products for online selling.'],
    ['Orders', 'Manage online orders and stock movement.'],
    ['Reports', 'Review online store sales and order performance.'],
  ]],
  ['Marketing', [
    ['WhatsApp Business', 'Send and manage WhatsApp customer communication.'],
    ['Email Marketing', 'Create and send customer email campaigns.'],
  ]],
  ['Reports', [
    ['Reports', 'Open the central reporting area.'],
    ['Sales Reports', 'Analyze sales performance, invoice totals, and customer billing.'],
    ['Purchase Reports', 'Analyze supplier purchases, purchase entries, and returns.'],
    ['Inventory Reports', 'Review stock value, movement, and availability.'],
    ['Service Reports', 'Analyze service billing and service item performance.'],
    ['CRM Reports', 'Review customer, lead, and follow-up activity.'],
    ['HR Reports', 'Review employee, attendance, leave, and payroll reports.'],
    ['Accounting Reports', 'Review vouchers, ledgers, and financial statements.'],
    ['GST Reports', 'Review GST filing and tax summary reports.'],
  ]],
  ['Data Management', [
    ['Export Data', 'Export business data for backup or external use.'],
    ['Import Data', 'Import records from supported files into business modules.'],
    ['Delete Period', 'Remove selected period data when intentionally cleaning records.'],
  ]],
  ['Settings', [
    ['Multi Branch', 'Configure branches and branch-wise operations.'],
    ['Users & Roles', 'Manage user access, permissions, and roles.'],
    ['Audit Report', 'Review user activity and system change history.'],
    ['Business Settings', 'Configure company profile, GST, invoice, and print settings.'],
    ['Templates', 'Manage reusable document and communication templates.'],
  ]],
];

const electronicsSections = retailBaseSections.map(([name, items]) => {
  if (name !== 'Inventory') return [name, items];
  return ['Inventory', [
    ['Electronics Inventory', 'Maintain devices with brand, model, serial or IMEI, barcode, GST, and warranty details.'],
    ['Services', 'Maintain repair, installation, AMC, and other non-stock service items.'],
    ['Product Masters', 'Manage electronics categories, brands, models, and setup masters.'],
    ['Warehouse', 'Track device and accessory storage locations.'],
    ['Barcode', 'Generate and print barcodes for devices, accessories, and stock identification.'],
    ['Stock Summary', 'View current device and accessory stock quantity and value.'],
    ['Stock Ledger', 'Review item-wise movement from purchase, sales, returns, and adjustments.'],
    ['Stock In', 'Record manual inward stock adjustments or receipts.'],
    ['Stock Out', 'Record manual outward stock adjustments or issues.'],
    ['Stock Alerts', 'Monitor low stock devices, accessories, and reorder requirements.'],
  ]];
});

const fashionSections = retailBaseSections.map(([name, items]) => {
  if (name !== 'Inventory') return [name, items];
  return ['Inventory', [
    ['Fashion Inventory', 'Maintain styles with brand, size, material, color, SKU, barcode, GST, and variants.'],
    ['Services', 'Maintain alteration, customization, styling, and other non-stock service items.'],
    ['Product Masters', 'Manage fashion categories, brands, sizes, materials, colors, and setup masters.'],
    ['Warehouse', 'Track store, rack, or warehouse locations for fashion stock.'],
    ['Barcode', 'Generate and print product or variant barcodes for fashion items.'],
    ['Stock Summary', 'View current stock quantity and value by style, size, and variant.'],
    ['Stock Ledger', 'Review item movement from purchase, sales, returns, and adjustments.'],
    ['Stock In', 'Record manual inward stock adjustments or receipts.'],
    ['Stock Out', 'Record manual outward stock adjustments or issues.'],
    ['Stock Alerts', 'Monitor low-stock styles, sizes, and reorder requirements.'],
  ]];
});

const automobileSections = [
  ['Dashboard', [
    ['Dashboard', 'View job cards, vehicles in service, revenue, and pending delivery summary.'],
  ]],
  ['Customers & Vehicles', [
    ['Customers', 'Maintain customer profiles, contact details, and service relationship history.'],
    ['Vehicles', 'Maintain vehicle details such as registration number, model, and owner mapping.'],
    ['Vehicle Service History', 'Track all previous service and repair records for each vehicle.'],
    ['Documents', 'Store vehicle, customer, insurance, and service-related documents.'],
  ]],
  ['Job Cards', [
    ['Create Job Card', 'Open a service job with vehicle complaints, requested work, and intake details.'],
    ['Technician Allocation', 'Assign mechanics or technicians to service jobs.'],
    ['Estimate', 'Prepare repair estimates before customer approval or invoicing.'],
    ['WhatsApp Approval Link', 'Send estimate approval links to customers through WhatsApp.'],
    ['Status Tracking', 'Track job progress from intake to repair, testing, and delivery.'],
  ]],
  ['Service', [
    ['Inspection', 'Record vehicle inspection checklist and condition notes.'],
    ['Repair', 'Track repair work, parts used, and service actions performed.'],
    ['Spare Parts', 'Manage spare part usage linked to service jobs.'],
    ['Labour Charges', 'Record labour work and service charge details.'],
    ['Road Test', 'Capture test drive observations and final service validation.'],
    ['Delivery', 'Record vehicle delivery, customer confirmation, and closing status.'],
  ]],
  ['Service Invoice', [
    ['Estimate -> Invoice', 'Convert approved estimates into final service invoices.'],
    ['Parts + Labour Split', 'Separate spare parts and labour charges for clear billing.'],
    ['Insurance Claim Billing', 'Prepare invoices and claim details for insurance-related work.'],
  ]],
  ['Inventory', [
    ['Products', 'Maintain spare parts, accessories, consumables, and stock item masters.'],
    ['Services', 'Maintain service labour and non-stock service charge items.'],
    ['Product Masters', 'Manage part categories, brands, and product setup masters.'],
    ['Warehouse', 'Track spare part storage locations.'],
    ['Barcode', 'Generate and print barcodes for spare parts and accessories.'],
    ['Stock Summary', 'View available spare part and accessory stock.'],
    ['Stock Ledger', 'Review stock movement from purchases, usage, sales, and returns.'],
    ['Stock In', 'Record inward spare parts or inventory adjustments.'],
    ['Stock Out', 'Record outward spare parts usage or stock adjustments.'],
    ['Stock Alerts', 'Monitor low-stock spares and reorder requirements.'],
  ]],
  ...retailBaseSections.filter(([name]) => ['Accounting', 'GST', 'Customers', 'Employee Management', 'Online Store', 'Marketing', 'Reports', 'Data Management', 'Settings'].includes(name)),
];

const pdfs = [
  {
    filename: 'electronics-technology-modules.pdf',
    title: 'Electronics & Technology Subcategory',
    subtitle: 'Modules, subsections, and one-line functionality for electronics retail businesses.',
    color: '#2563eb',
    sections: electronicsSections,
  },
  {
    filename: 'fashion-lifestyle-modules.pdf',
    title: 'Fashion & Lifestyle Subcategory',
    subtitle: 'Modules, subsections, and one-line functionality for fashion retail businesses.',
    color: '#db2777',
    sections: fashionSections,
  },
  {
    filename: 'automobile-category-modules.pdf',
    title: 'Automobile Category',
    subtitle: 'Modules, subsections, and one-line functionality for automobile service and billing businesses.',
    color: '#0f766e',
    sections: automobileSections,
  },
];

function renderPdf(config) {
  const out = path.join(docsDir, config.filename);
  const doc = new PDFDocument({ size: 'A4', margin: 46, info: { Title: config.title } });
  doc.pipe(fs.createWriteStream(out));

  const pageW = doc.page.width;
  const pageH = doc.page.height;
  const left = 46;
  const contentW = pageW - left * 2;
  const bottom = pageH - 50;
  let pageNo = 1;

  function header(title = config.title, subtitle = config.subtitle, color = config.color) {
    doc.rect(0, 0, pageW, 90).fill('#f8fafc');
    doc.rect(0, 86, pageW, 4).fill(color);
    doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(19).text(title, left, 27, { width: contentW });
    doc.fillColor('#64748b').font('Helvetica').fontSize(10).text(subtitle, left, 56, { width: contentW });
    doc.y = 116;
  }

  function footer() {
    doc.fillColor('#94a3b8').font('Helvetica').fontSize(8).text(`GoBook Suite | ${config.title} | Page ${pageNo}`, left, pageH - 62, { width: contentW, align: 'center', lineBreak: false });
  }

  function addPage(title, subtitle, color) {
    footer();
    pageNo += 1;
    doc.addPage();
    header(title, subtitle, color);
  }

  header();
  doc.fillColor('#334155').font('Helvetica').fontSize(10.5)
    .text('This document lists each module with its available subsections and a short explanation of what each subsection is used for.', left, 124, { width: contentW, lineGap: 3 });
  doc.y = 166;

  for (const [sectionName, items] of config.sections) {
    if (doc.y + 60 > bottom) addPage(config.title, config.subtitle, config.color);
    const sectionY = doc.y;
    doc.roundedRect(left, sectionY, contentW, 42, 6).fill('#ffffff').stroke('#dbe4ef');
    doc.rect(left, sectionY, 7, 42).fill(config.color);
    doc.fillColor(config.color).font('Helvetica-Bold').fontSize(14).text(sectionName, left + 18, sectionY + 9, { width: contentW - 36 });
    doc.fillColor('#64748b').font('Helvetica').fontSize(9).text(`${items.length} subsections`, left + 18, sectionY + 26, { width: contentW - 36 });
    doc.y = sectionY + 55;

    for (const [label, description] of items) {
      const descH = doc.heightOfString(description, { width: contentW - 196, lineGap: 2 });
      const rowH = Math.max(42, descH + 20);
      if (doc.y + rowH > bottom) addPage(`${sectionName} - Continued`, 'Subsections and one-line functionality.', config.color);
      const rowY = doc.y;
      doc.roundedRect(left, rowY, contentW, rowH, 5).fill('#ffffff').stroke('#e2e8f0');
      doc.circle(left + 14, rowY + rowH / 2, 3.5).fill(config.color);
      doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(10).text(label, left + 30, rowY + 12, { width: 132 });
      doc.fillColor('#334155').font('Helvetica').fontSize(9.8).text(description, left + 176, rowY + 11, { width: contentW - 194, lineGap: 2 });
      doc.y = rowY + rowH + 7;
    }
    doc.moveDown(0.7);
  }

  footer();
  doc.end();
  return out;
}

for (const pdf of pdfs) {
  console.log(renderPdf(pdf));
}
