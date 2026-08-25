import { BankBookEntry } from '../../../models/BankBookEntry.js';
import { CashBookEntry } from '../../../models/CashBookEntry.js';
import { AccountingPosting } from '../../../models/AccountingPosting.js';
import { AccountingVoucher } from '../../../models/AccountingVoucher.js';
import { Invoice } from '../../../models/Invoice.js';
import { JournalEntry } from '../../../models/JournalEntry.js';
import { LedgerAccount } from '../../../models/LedgerAccount.js';
import { Payment } from '../../../models/Payment.js';
import { postInvoiceAccounting, postPaymentAccounting } from '../../../services/accountingPostings.js';
import { branchForNewRecord, branchScopedQuery } from '../../../utils/branchScope.js';
import { httpError } from '../../../utils/httpError.js';
import { asNumber, asText, enumValue, importSummary, parseExcelRows } from '../../../utils/excelImport.js';

const closingOf = (account) => Number(account.opening ?? 0) + Number(account.debit ?? 0) - Number(account.credit ?? 0);

const LEDGER_IMPORT_COLUMNS = {
  name: 'name',
  account: 'name',
  'account name': 'name',
  ledger: 'name',
  'ledger name': 'name',
  group: 'group',
  'account group': 'group',
  'ledger group': 'group',
  opening: 'opening',
  'opening balance': 'opening',
  balance: 'opening',
  ob: 'opening',
  debit: 'debit',
  dr: 'debit',
  credit: 'credit',
  cr: 'credit',
  color: 'color',
};

const JOURNAL_IMPORT_COLUMNS = {
  date: 'date',
  'entry no': 'entryNo',
  entryno: 'entryNo',
  'journal no': 'entryNo',
  'voucher no': 'entryNo',
  'voucher number': 'entryNo',
  'vch no': 'entryNo',
  voucher: 'entryNo',
  particulars: 'particulars',
  narration: 'particulars',
  description: 'particulars',
  details: 'particulars',
  note: 'particulars',
  notes: 'particulars',
  debit: 'debit',
  dr: 'debit',
  credit: 'credit',
  cr: 'credit',
  status: 'status',
};

function normalizeAmountFields(body, fields) {
  return fields.reduce((payload, field) => {
    if (body[field] !== undefined) payload[field] = Number(body[field]);
    return payload;
  }, { ...body });
}

function withCashRunningBalances(entries) {
  let running = 0;
  return entries.map((entry) => {
    if (entry.vchType === 'OB') {
      running = Number(entry.balance) || 0;
      return { ...entry, balance: running };
    }

    running += Number(entry.receipt) || 0;
    running -= Number(entry.payment) || 0;
    return { ...entry, balance: running };
  });
}

function withBankRunningBalances(entries) {
  let running = 0;
  return entries.map((entry) => {
    if (entry.vchType === 'OB') {
      running = Number(entry.balance) || 0;
      return { ...entry, balance: running };
    }

    running += Number(entry.deposit) || 0;
    running -= Number(entry.withdrawal) || 0;
    if (entry.vchType === 'CB') running = Number(entry.balance) || running;
    return { ...entry, balance: running };
  });
}

async function voucherReportFilter(req) {
  const { from, to, voucherType, status = 'Posted' } = req.query;
  const filter = await branchScopedQuery(req, { model: AccountingVoucher, ownerField: 'userId' });
  if (status && status !== 'All') filter.status = status;
  if (voucherType && voucherType !== 'All') filter.voucherType = voucherType;
  if (from || to) {
    filter.date = {};
    if (from) filter.date.$gte = from;
    if (to) filter.date.$lte = to;
  }
  return filter;
}

function rounded(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

const CURRENT_BILL_DOCUMENT_TYPES = ['invoice', 'bill-of-supply'];

async function ledgerAccountsFilter(req, extra = {}) {
  return branchScopedQuery(req, { model: LedgerAccount, ownerField: 'userId' }, extra);
}

async function journalEntriesFilter(req, extra = {}) {
  return branchScopedQuery(req, { model: JournalEntry, ownerField: 'userId' }, extra);
}

async function cashBookFilter(req, extra = {}) {
  return branchScopedQuery(req, { model: CashBookEntry, ownerField: 'userId' }, extra);
}

async function bankBookFilter(req, extra = {}) {
  return branchScopedQuery(req, { model: BankBookEntry, ownerField: 'userId' }, extra);
}

async function branchValueForRecord(req) {
  return branchForNewRecord(req, req.body?.branch || req.query?.branch || req.user.branch || '');
}

async function ledgerBalancesFromVouchers(req) {
  const vouchers = await AccountingVoucher.find(await voucherReportFilter(req)).sort({ date: 1, createdAt: 1 }).lean();
  const map = new Map();
  for (const voucher of vouchers) {
    for (const line of voucher.lines || []) {
      const key = line.ledgerName;
      const current = map.get(key) || {
        name: line.ledgerName,
        group: line.ledgerGroup,
        opening: 0,
        debit: 0,
        credit: 0,
      };
      current.group = current.group || line.ledgerGroup;
      if (line.side === 'debit') current.debit = rounded(current.debit + line.amount);
      if (line.side === 'credit') current.credit = rounded(current.credit + line.amount);
      map.set(key, current);
    }
  }
  return Array.from(map.values()).sort((a, b) => a.group.localeCompare(b.group) || a.name.localeCompare(b.name));
}

export async function listLedgerAccounts(req, res, next) {
  try {
    const { search, group } = req.query;
    const filter = await ledgerAccountsFilter(req);
    if (search) filter.name = new RegExp(search, 'i');
    if (group && group !== 'All Groups') filter.group = group;

    const accounts = await LedgerAccount.find(filter).sort({ name: 1 }).lean();
    res.json({ accounts });
  } catch (err) {
    next(err);
  }
}

export async function createLedgerAccount(req, res, next) {
  try {
    const { name } = req.body ?? {};
    const userId = req.user.id;
    const branch = await branchValueForRecord(req);
    if (name) {
      const existing = await LedgerAccount.findOne(await ledgerAccountsFilter(req, { userId, name }));
      if (existing) return next(httpError(409, `Ledger account "${name}" already exists`));
    }
    const payload = normalizeAmountFields(req.body ?? {}, ['opening', 'debit', 'credit']);
    const account = await LedgerAccount.create({ ...payload, userId, businessId: req.user.businessId, branch });
    res.status(201).json({ account });
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, 'Ledger account name already exists'));
    next(err);
  }
}

export async function importLedgerAccounts(req, res, next) {
  try {
    const userId = req.user.id;
    const branch = await branchValueForRecord(req);
    const rows = await parseExcelRows(req.file, LEDGER_IMPORT_COLUMNS, 'Account Name, Group, Opening, Debit, Credit');
    const summary = importSummary();

    for (const { rowNumber, record } of rows) {
      const name = asText(record.name);
      const group = asText(record.group);
      if (!name || !group) {
        summary.skipped++;
        summary.errors.push(`Row ${rowNumber}: account name and group are required`);
        continue;
      }

      const data = {
        userId,
        businessId: req.user.businessId,
        branch,
        name,
        group,
        opening: asNumber(record.opening, 0),
        debit: asNumber(record.debit, 0),
        credit: asNumber(record.credit, 0),
        color: asText(record.color) || '#2563eb',
      };

      const existing = await LedgerAccount.findOne(await ledgerAccountsFilter(req, { userId, name }));
      if (existing) {
        await LedgerAccount.findByIdAndUpdate(existing._id, { $set: data }, { runValidators: true });
        summary.updated++;
      } else {
        await LedgerAccount.create(data);
        summary.imported++;
      }
    }

    res.json(summary);
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, 'Duplicate ledger account name found in import'));
    next(err);
  }
}

export async function updateLedgerAccount(req, res, next) {
  try {
    const payload = normalizeAmountFields(req.body ?? {}, ['opening', 'debit', 'credit']);
    if (req.body?.branch !== undefined) payload.branch = await branchValueForRecord(req);
    const account = await LedgerAccount.findOneAndUpdate(
      await ledgerAccountsFilter(req, { _id: req.params.id }),
      { $set: payload },
      { new: true, runValidators: true },
    ).lean();
    if (!account) return next(httpError(404, 'Ledger account not found'));
    res.json({ account });
  } catch (err) {
    next(err);
  }
}

export async function deleteLedgerAccount(req, res, next) {
  try {
    const account = await LedgerAccount.findOneAndDelete(await ledgerAccountsFilter(req, { _id: req.params.id })).lean();
    if (!account) return next(httpError(404, 'Ledger account not found'));
    res.json({ message: 'Ledger account deleted' });
  } catch (err) {
    next(err);
  }
}

export async function listJournalEntries(req, res, next) {
  try {
    const { status } = req.query;
    const filter = await journalEntriesFilter(req);
    if (status && status !== 'All') filter.status = status;
    const entries = await JournalEntry.find(filter).sort({ date: -1, createdAt: -1 }).lean();
    res.json({ entries });
  } catch (err) {
    next(err);
  }
}

export async function createJournalEntry(req, res, next) {
  try {
    const { entryNo } = req.body ?? {};
    const userId = req.user.id;
    const branch = await branchValueForRecord(req);
    if (entryNo) {
      const existing = await JournalEntry.findOne(await journalEntriesFilter(req, { userId, entryNo }));
      if (existing) return next(httpError(409, `Journal entry "${entryNo}" already exists`));
    }
    const payload = normalizeAmountFields(req.body ?? {}, ['debit', 'credit']);
    const entry = await JournalEntry.create({ ...payload, userId, businessId: req.user.businessId, branch });
    res.status(201).json({ entry });
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, 'Journal entry number already exists'));
    next(err);
  }
}

export async function importJournalEntries(req, res, next) {
  try {
    const userId = req.user.id;
    const branch = await branchValueForRecord(req);
    const rows = await parseExcelRows(req.file, JOURNAL_IMPORT_COLUMNS, 'Date, Entry No, Particulars, Debit, Credit');
    const summary = importSummary();

    for (const { rowNumber, record } of rows) {
      const date = asText(record.date);
      const entryNo = asText(record.entryNo);
      const particulars = asText(record.particulars);
      const debit = asNumber(record.debit, Number.NaN);
      const credit = asNumber(record.credit, Number.NaN);

      if (!date || !entryNo || !particulars || !Number.isFinite(debit) || !Number.isFinite(credit)) {
        summary.skipped++;
        summary.errors.push(`Row ${rowNumber}: date, entry no, particulars, debit, and credit are required`);
        continue;
      }
      if (debit < 0 || credit < 0 || (debit === 0 && credit === 0)) {
        summary.skipped++;
        summary.errors.push(`Row ${rowNumber}: debit/credit must be non-negative and at least one amount is required`);
        continue;
      }

      const data = {
        userId,
        businessId: req.user.businessId,
        branch,
        date,
        entryNo,
        particulars,
        debit,
        credit,
        status: enumValue(record.status, ['Draft', 'Posted'], 'Posted'),
      };

      const existing = await JournalEntry.findOne(await journalEntriesFilter(req, { userId, entryNo }));
      if (existing) {
        await JournalEntry.findByIdAndUpdate(existing._id, { $set: data }, { runValidators: true });
        summary.updated++;
      } else {
        await JournalEntry.create(data);
        summary.imported++;
      }
    }

    res.json(summary);
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, 'Duplicate journal entry number found in import'));
    next(err);
  }
}

export async function updateJournalEntry(req, res, next) {
  try {
    const payload = normalizeAmountFields(req.body ?? {}, ['debit', 'credit']);
    if (req.body?.branch !== undefined) payload.branch = await branchValueForRecord(req);
    const entry = await JournalEntry.findOneAndUpdate(
      await journalEntriesFilter(req, { _id: req.params.id }),
      { $set: payload },
      { new: true, runValidators: true },
    ).lean();
    if (!entry) return next(httpError(404, 'Journal entry not found'));
    res.json({ entry });
  } catch (err) {
    next(err);
  }
}

export async function deleteJournalEntry(req, res, next) {
  try {
    const entry = await JournalEntry.findOneAndDelete(await journalEntriesFilter(req, { _id: req.params.id })).lean();
    if (!entry) return next(httpError(404, 'Journal entry not found'));
    res.json({ message: 'Journal entry deleted' });
  } catch (err) {
    next(err);
  }
}

export async function getTrialBalance(req, res, next) {
  try {
    const accounts = await ledgerBalancesFromVouchers(req);
    res.json({
      accounts: accounts.map((account) => {
        const closing = closingOf(account);
        return {
          _id: account._id,
          account: account.name,
          group: account.group,
          debit: closing >= 0 ? closing : 0,
          credit: closing < 0 ? Math.abs(closing) : 0,
        };
      }),
    });
  } catch (err) {
    next(err);
  }
}

export async function getPnlStatement(req, res, next) {
  try {
    const accounts = await ledgerBalancesFromVouchers(req);
    const income = accounts
      .filter((account) => /income|sales/i.test(account.group))
      .map((account) => ({ label: account.name, amount: Math.abs(closingOf(account)) }));
    const expenses = accounts
      .filter((account) => /expense|purchase/i.test(account.group))
      .map((account) => ({ label: account.name, amount: Math.abs(closingOf(account)) }));

    res.json({ income, expenses });
  } catch (err) {
    next(err);
  }
}

export async function getBalanceSheet(req, res, next) {
  try {
    const accounts = await ledgerBalancesFromVouchers(req);
    const assets = accounts
      .filter((account) => /asset|cash|bank|debtor|stock/i.test(account.group))
      .map((account) => ({ label: account.name, amount: Math.abs(closingOf(account)) }));
    const liabilities = accounts
      .filter((account) => /liabilit|creditor|capital|loan/i.test(account.group))
      .map((account) => ({ label: account.name, amount: Math.abs(closingOf(account)) }));

    res.json({ liabilities, assets });
  } catch (err) {
    next(err);
  }
}

export async function getDayBook(req, res, next) {
  try {
    const filter = await voucherReportFilter(req);
    const vouchers = await AccountingVoucher.find(filter).sort({ date: 1, createdAt: 1 }).lean();
    const summaryByType = new Map();

    for (const voucher of vouchers) {
      const current = summaryByType.get(voucher.voucherType) || {
        voucherType: voucher.voucherType,
        count: 0,
        debitTotal: 0,
        creditTotal: 0,
      };
      current.count += 1;
      current.debitTotal = rounded(current.debitTotal + voucher.debitTotal);
      current.creditTotal = rounded(current.creditTotal + voucher.creditTotal);
      summaryByType.set(voucher.voucherType, current);
    }

    res.json({
      vouchers,
      summary: Array.from(summaryByType.values()),
      totals: {
        count: vouchers.length,
        debitTotal: rounded(vouchers.reduce((sum, row) => sum + row.debitTotal, 0)),
        creditTotal: rounded(vouchers.reduce((sum, row) => sum + row.creditTotal, 0)),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getLedgerStatement(req, res, next) {
  try {
    const ledgerName = String(req.query.ledgerName || '').trim();
    if (!ledgerName) return next(httpError(400, 'ledgerName is required'));

    const filter = {
      ...(await voucherReportFilter(req)),
      'lines.ledgerName': ledgerName,
    };
    const [ledger, vouchers] = await Promise.all([
      LedgerAccount.findOne(await ledgerAccountsFilter(req, { name: ledgerName })).lean(),
      AccountingVoucher.find(filter).sort({ date: 1, createdAt: 1 }).lean(),
    ]);

    let running = rounded(ledger?.opening || 0);
    const entries = [];
    for (const voucher of vouchers) {
      for (const line of voucher.lines || []) {
        if (line.ledgerName !== ledgerName) continue;
        const debit = line.side === 'debit' ? rounded(line.amount) : 0;
        const credit = line.side === 'credit' ? rounded(line.amount) : 0;
        running = rounded(running + debit - credit);
        entries.push({
          voucherId: voucher._id,
          date: voucher.date,
          voucherType: voucher.voucherType,
          voucherNo: voucher.voucherNo,
          partyName: voucher.partyName,
          referenceNo: voucher.referenceNo,
          particulars: (voucher.lines || [])
            .filter((other) => other.ledgerName !== ledgerName)
            .map((other) => other.ledgerName)
            .join(', '),
          narration: line.narration || voucher.narration,
          debit,
          credit,
          balance: running,
        });
      }
    }

    res.json({
      ledger: {
        name: ledgerName,
        group: ledger?.group || '',
        opening: rounded(ledger?.opening || 0),
      },
      entries,
      totals: {
        debitTotal: rounded(entries.reduce((sum, row) => sum + row.debit, 0)),
        creditTotal: rounded(entries.reduce((sum, row) => sum + row.credit, 0)),
        closing: running,
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function getVoucherRegister(req, res, next) {
  try {
    const filter = await voucherReportFilter(req);
    const vouchers = await AccountingVoucher.find(filter).sort({ voucherType: 1, date: 1 }).lean();
    const rows = [];
    const byType = new Map();

    for (const voucher of vouchers) {
      const row = byType.get(voucher.voucherType) || {
        voucherType: voucher.voucherType,
        count: 0,
        debitTotal: 0,
        creditTotal: 0,
      };
      row.count += 1;
      row.debitTotal = rounded(row.debitTotal + voucher.debitTotal);
      row.creditTotal = rounded(row.creditTotal + voucher.creditTotal);
      byType.set(voucher.voucherType, row);
    }

    for (const row of byType.values()) rows.push(row);
    res.json({ rows, vouchers });
  } catch (err) {
    next(err);
  }
}

export async function getOutstandingStatement(req, res, next) {
  try {
    const type = req.query.type === 'payables' ? 'payables' : 'receivables';
    const groupPattern = type === 'payables' ? /sundry creditors|creditor/i : /sundry debtors|debtor/i;
    const accounts = await ledgerBalancesFromVouchers(req);
    const rows = accounts
      .filter((account) => groupPattern.test(account.group || ''))
      .map((account) => {
        const closing = closingOf(account);
        const outstanding = type === 'payables' ? Math.max(0, -closing) : Math.max(0, closing);
        return {
          ledgerName: account.name,
          group: account.group,
          opening: rounded(account.opening),
          debit: rounded(account.debit),
          credit: rounded(account.credit),
          outstanding: rounded(outstanding),
        };
      })
      .filter((row) => row.outstanding > 0);

    res.json({
      type,
      rows,
      totalOutstanding: rounded(rows.reduce((sum, row) => sum + row.outstanding, 0)),
    });
  } catch (err) {
    next(err);
  }
}

export async function getBillWiseStatement(req, res, next) {
  try {
    const type = req.query.type === 'payables' ? 'payables' : 'receivables';
    const groupPattern = type === 'payables' ? /sundry creditors|creditor/i : /sundry debtors|debtor/i;
    const accounts = await ledgerBalancesFromVouchers(req);
    const partyNames = new Set(accounts.filter((account) => groupPattern.test(account.group || '')).map((account) => account.name));
    const vouchers = await AccountingVoucher.find(await voucherReportFilter(req)).sort({ date: 1, createdAt: 1 }).lean();
    const billMap = new Map();

    for (const voucher of vouchers) {
      for (const line of voucher.lines || []) {
        if (!partyNames.has(line.ledgerName)) continue;
        const billRef = line.billRef || voucher.referenceNo || voucher.sourceNumber || voucher.voucherNo;
        const key = `${line.ledgerName}::${billRef}`;
        const current = billMap.get(key) || {
          partyName: line.ledgerName,
          ledgerGroup: line.ledgerGroup,
          billRef,
          firstDate: voucher.date,
          lastDate: voucher.date,
          debit: 0,
          credit: 0,
          vouchers: [],
        };
        current.firstDate = current.firstDate < voucher.date ? current.firstDate : voucher.date;
        current.lastDate = current.lastDate > voucher.date ? current.lastDate : voucher.date;
        if (line.side === 'debit') current.debit = rounded(current.debit + line.amount);
        if (line.side === 'credit') current.credit = rounded(current.credit + line.amount);
        current.vouchers.push(voucher.voucherNo);
        billMap.set(key, current);
      }
    }

    const rows = Array.from(billMap.values())
      .map((row) => {
        const net = rounded(row.debit - row.credit);
        return {
          ...row,
          outstanding: type === 'payables' ? rounded(Math.max(0, -net)) : rounded(Math.max(0, net)),
          voucherCount: row.vouchers.length,
        };
      })
      .filter((row) => row.outstanding > 0)
      .sort((a, b) => a.partyName.localeCompare(b.partyName) || a.billRef.localeCompare(b.billRef));

    res.json({
      type,
      rows,
      totalOutstanding: rounded(rows.reduce((sum, row) => sum + row.outstanding, 0)),
    });
  } catch (err) {
    next(err);
  }
}

export async function getCostCenterStatement(req, res, next) {
  try {
    const vouchers = await AccountingVoucher.find(await voucherReportFilter(req)).sort({ date: 1, createdAt: 1 }).lean();
    const centerMap = new Map();

    for (const voucher of vouchers) {
      for (const line of voucher.lines || []) {
        const costCenter = String(line.costCenter || '').trim();
        if (!costCenter) continue;
        const current = centerMap.get(costCenter) || {
          costCenter,
          debit: 0,
          credit: 0,
          voucherCount: 0,
          lines: [],
        };
        if (line.side === 'debit') current.debit = rounded(current.debit + line.amount);
        if (line.side === 'credit') current.credit = rounded(current.credit + line.amount);
        current.voucherCount += 1;
        current.lines.push({
          date: voucher.date,
          voucherType: voucher.voucherType,
          voucherNo: voucher.voucherNo,
          ledgerName: line.ledgerName,
          side: line.side,
          amount: rounded(line.amount),
          narration: line.narration || voucher.narration,
        });
        centerMap.set(costCenter, current);
      }
    }

    const rows = Array.from(centerMap.values())
      .map((row) => ({ ...row, net: rounded(row.debit - row.credit) }))
      .sort((a, b) => a.costCenter.localeCompare(b.costCenter));

    res.json({
      rows,
      totals: {
        debit: rounded(rows.reduce((sum, row) => sum + row.debit, 0)),
        credit: rounded(rows.reduce((sum, row) => sum + row.credit, 0)),
        net: rounded(rows.reduce((sum, row) => sum + row.net, 0)),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function listCashBookEntries(req, res, next) {
  try {
    const entries = await CashBookEntry.find(await cashBookFilter(req)).sort({ date: 1, createdAt: 1 }).lean();
    res.json({ entries: withCashRunningBalances(entries) });
  } catch (err) {
    next(err);
  }
}

export async function createCashBookEntry(req, res, next) {
  try {
    const payload = normalizeAmountFields(req.body ?? {}, ['receipt', 'payment', 'balance']);
    const entry = await CashBookEntry.create({
      ...payload,
      userId: req.user.id,
      businessId: req.user.businessId,
      branch: await branchValueForRecord(req),
    });
    res.status(201).json({ entry });
  } catch (err) {
    next(err);
  }
}

export async function updateCashBookEntry(req, res, next) {
  try {
    const payload = normalizeAmountFields(req.body ?? {}, ['receipt', 'payment', 'balance']);
    if (req.body?.branch !== undefined) payload.branch = await branchValueForRecord(req);
    const entry = await CashBookEntry.findOneAndUpdate(
      await cashBookFilter(req, { _id: req.params.id }),
      { $set: payload },
      { new: true, runValidators: true },
    ).lean();
    if (!entry) return next(httpError(404, 'Cash book entry not found'));
    res.json({ entry });
  } catch (err) {
    next(err);
  }
}

export async function deleteCashBookEntry(req, res, next) {
  try {
    const entry = await CashBookEntry.findOneAndDelete(await cashBookFilter(req, { _id: req.params.id })).lean();
    if (!entry) return next(httpError(404, 'Cash book entry not found'));
    res.json({ message: 'Cash book entry deleted' });
  } catch (err) {
    next(err);
  }
}

export async function listBankBookEntries(req, res, next) {
  try {
    const baseFilter = await bankBookFilter(req);
    const banks = await BankBookEntry.distinct('bank', baseFilter);
    const bank = req.query.bank || banks[0] || '';
    const filter = { ...baseFilter, ...(bank ? { bank } : {}) };
    const entries = await BankBookEntry.find(filter).sort({ date: 1, createdAt: 1 }).lean();
    const first = entries[0] ?? {};

    res.json({
      banks,
      bank,
      accountNo: first.accountNo ?? '',
      ifsc: first.ifsc ?? '',
      accountType: first.accountType ?? '',
      entries: withBankRunningBalances(entries),
    });
  } catch (err) {
    next(err);
  }
}

export async function getBankReconciliation(req, res, next) {
  try {
    const baseFilter = await bankBookFilter(req);
    const banks = await BankBookEntry.distinct('bank', baseFilter);
    const bank = req.query.bank || banks[0] || '';
    const { from, to, status = 'All' } = req.query;
    const filter = { ...baseFilter, ...(bank ? { bank } : {}) };
    if (from || to) {
      filter.date = {};
      if (from) filter.date.$gte = from;
      if (to) filter.date.$lte = to;
    }
    if (status === 'Cleared') filter.reconciled = true;
    if (status === 'Uncleared') filter.reconciled = { $ne: true };

    const entries = await BankBookEntry.find(filter).sort({ date: 1, createdAt: 1 }).lean();
    const activeEntries = entries.filter((entry) => !['OB', 'CB'].includes(entry.vchType));
    const first = entries[0] ?? {};
    const bookBalance = rounded(activeEntries.reduce((sum, entry) => sum + Number(entry.deposit || 0) - Number(entry.withdrawal || 0), 0));
    const clearedBalance = rounded(activeEntries
      .filter((entry) => entry.reconciled)
      .reduce((sum, entry) => sum + Number(entry.deposit || 0) - Number(entry.withdrawal || 0), 0));

    res.json({
      banks,
      bank,
      accountNo: first.accountNo ?? '',
      ifsc: first.ifsc ?? '',
      accountType: first.accountType ?? '',
      entries,
      summary: {
        totalEntries: activeEntries.length,
        clearedEntries: activeEntries.filter((entry) => entry.reconciled).length,
        unclearedEntries: activeEntries.filter((entry) => !entry.reconciled).length,
        bookBalance,
        clearedBalance,
        difference: rounded(bookBalance - clearedBalance),
      },
    });
  } catch (err) {
    next(err);
  }
}

export async function updateBankReconciliation(req, res, next) {
  try {
    const reconciled = Boolean(req.body?.reconciled);
    const payload = {
      reconciled,
      bankDate: reconciled ? String(req.body?.bankDate || '').trim() : '',
      bankReference: reconciled ? String(req.body?.bankReference || '').trim() : '',
      reconciliationNotes: String(req.body?.reconciliationNotes || '').trim(),
      reconciledAt: reconciled ? new Date() : null,
    };
    const entry = await BankBookEntry.findOneAndUpdate(
      await bankBookFilter(req, { _id: req.params.id }),
      { $set: payload },
      { new: true, runValidators: true },
    ).lean();
    if (!entry) return next(httpError(404, 'Bank book entry not found'));
    res.json({ entry });
  } catch (err) {
    next(err);
  }
}

export async function createBankBookEntry(req, res, next) {
  try {
    const payload = normalizeAmountFields(req.body ?? {}, ['deposit', 'withdrawal', 'balance']);
    const entry = await BankBookEntry.create({
      ...payload,
      userId: req.user.id,
      businessId: req.user.businessId,
      branch: await branchValueForRecord(req),
    });
    res.status(201).json({ entry });
  } catch (err) {
    next(err);
  }
}

export async function updateBankBookEntry(req, res, next) {
  try {
    const payload = normalizeAmountFields(req.body ?? {}, ['deposit', 'withdrawal', 'balance']);
    if (req.body?.branch !== undefined) payload.branch = await branchValueForRecord(req);
    const entry = await BankBookEntry.findOneAndUpdate(
      await bankBookFilter(req, { _id: req.params.id }),
      { $set: payload },
      { new: true, runValidators: true },
    ).lean();
    if (!entry) return next(httpError(404, 'Bank book entry not found'));
    res.json({ entry });
  } catch (err) {
    next(err);
  }
}

export async function deleteBankBookEntry(req, res, next) {
  try {
    const entry = await BankBookEntry.findOneAndDelete(await bankBookFilter(req, { _id: req.params.id })).lean();
    if (!entry) return next(httpError(404, 'Bank book entry not found'));
    res.json({ message: 'Bank book entry deleted' });
  } catch (err) {
    next(err);
  }
}

export async function resetAccountingFromInvoices(req, res, next) {
  try {
    const postingFilter = await branchScopedQuery(req, { model: AccountingPosting, ownerField: 'userId' });
    const voucherFilter = await voucherReportFilter({ ...req, query: { ...req.query, status: 'All' } });
    const journalFilter = await journalEntriesFilter(req);
    const cashFilter = await cashBookFilter(req);
    const bankFilter = await bankBookFilter(req);
    const ledgerFilter = await ledgerAccountsFilter(req);

    const [
      postingResult,
      voucherResult,
      journalResult,
      cashBookResult,
      bankBookResult,
      ledgerResult,
    ] = await Promise.all([
      AccountingPosting.deleteMany(postingFilter),
      AccountingVoucher.deleteMany(voucherFilter),
      JournalEntry.deleteMany(journalFilter),
      CashBookEntry.deleteMany(cashFilter),
      BankBookEntry.deleteMany(bankFilter),
      LedgerAccount.deleteMany(ledgerFilter),
    ]);

    const invoices = await Invoice.find(await branchScopedQuery(req, { model: Invoice, ownerField: 'userId' }, {
      documentType: { $in: CURRENT_BILL_DOCUMENT_TYPES },
    })).sort({ createdAt: 1, _id: 1 });

    const invoiceMap = new Map(invoices.map((invoice) => [String(invoice._id), invoice]));
    const invoiceIds = invoices.map((invoice) => invoice._id);
    const rebuildErrors = [];
    let invoicesPosted = 0;
    let paymentsPosted = 0;

    for (const invoice of invoices) {
      try {
        const posting = await postInvoiceAccounting(invoice, req.user);
        if (posting) invoicesPosted += 1;
      } catch (err) {
        rebuildErrors.push({
          source: 'invoice',
          number: invoice.number,
          message: err.message || 'Unable to post invoice',
        });
      }
    }

    if (invoiceIds.length) {
      const payments = await Payment.find(await branchScopedQuery(req, { model: Payment, ownerField: 'userId' }, {
        invoiceId: { $in: invoiceIds },
      })).sort({ createdAt: 1, _id: 1 });
      for (const payment of payments) {
        try {
          const posting = await postPaymentAccounting(payment, invoiceMap.get(String(payment.invoiceId)), req.user);
          if (posting) paymentsPosted += 1;
        } catch (err) {
          rebuildErrors.push({
            source: 'payment',
            number: payment.invoiceNumber || String(payment._id),
            message: err.message || 'Unable to post payment',
          });
        }
      }
    }

    res.json({
      message: rebuildErrors.length
        ? 'Accounting reset completed with some skipped records'
        : 'Accounting reset and rebuilt from current invoices',
      deleted: {
        postings: postingResult.deletedCount || 0,
        vouchers: voucherResult.deletedCount || 0,
        journalEntries: journalResult.deletedCount || 0,
        cashBookEntries: cashBookResult.deletedCount || 0,
        bankBookEntries: bankBookResult.deletedCount || 0,
        ledgers: ledgerResult.deletedCount || 0,
      },
      rebuilt: {
        invoices: invoicesPosted,
        payments: paymentsPosted,
      },
      errors: rebuildErrors,
    });
  } catch (err) {
    next(err);
  }
}

export async function getAccountingSummary(req, res, next) {
  try {
    const [ledgerCount, journalCount, voucherCount, cashBookCount, bankBookCount] = await Promise.all([
      LedgerAccount.countDocuments(await ledgerAccountsFilter(req)),
      JournalEntry.countDocuments(await journalEntriesFilter(req)),
      AccountingVoucher.countDocuments(await voucherReportFilter({ ...req, query: { ...req.query, status: 'All' } })),
      CashBookEntry.countDocuments(await cashBookFilter(req)),
      BankBookEntry.countDocuments(await bankBookFilter(req)),
    ]);

    res.json({
      module: 'Accounting',
      counts: {
        ledgers: ledgerCount,
        journalEntries: journalCount,
        vouchers: voucherCount,
        cashBookEntries: cashBookCount,
        bankBookEntries: bankBookCount,
      },
      endpoints: [
        '/vouchers',
        '/vouchers/types',
        '/vouchers/next-number',
        '/ledger',
        '/journal-entries',
        '/trial-balance',
        '/pnl',
        '/balance-sheet',
        '/cash-book',
        '/bank-book',
      ],
    });
  } catch (err) {
    next(err);
  }
}
