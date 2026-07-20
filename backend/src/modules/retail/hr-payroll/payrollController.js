import { Payroll } from '../../../models/Payroll.js';
import { httpError } from '../../../utils/httpError.js';
import { asNumber, asText, enumValue, importSummary, parseExcelRows } from '../../../utils/excelImport.js';

const PAYROLL_IMPORT_COLUMNS = {
  'employee id': 'employeeId',
  'emp id': 'employeeId',
  empid: 'employeeId',
  name: 'name',
  'employee name': 'name',
  dept: 'dept',
  department: 'dept',
  month: 'month',
  'pay period': 'month',
  'salary month': 'month',
  'pay month': 'month',
  basic: 'basic',
  'basic salary': 'basic',
  salary: 'basic',
  allowances: 'allowances',
  allowance: 'allowances',
  deductions: 'deductions',
  deduction: 'deductions',
  net: 'net',
  'net salary': 'net',
  'net pay': 'net',
  'take home': 'net',
  status: 'status',
};

// GET /api/hr-payroll/payroll/stats?month=
export async function getPayrollStats(req, res, next) {
  try {
    const { month } = req.query;
    const filter = { userId: req.user.id };
    if (month) filter.month = month;
    const result = await Payroll.aggregate([
      { $match: filter },
      {
        $group: {
          _id: null,
          totalEmployees: { $sum: 1 },
          grossSalary:    { $sum: { $add: ['$basic', '$allowances'] } },
          totalDeductions: { $sum: '$deductions' },
          totalNet:        { $sum: '$net' },
        },
      },
    ]);
    const stats = result[0] ?? { totalEmployees: 0, grossSalary: 0, totalDeductions: 0, totalNet: 0 };
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

// GET /api/hr-payroll/payroll/months
export async function getMonths(req, res, next) {
  try {
    const months = await Payroll.distinct('month', { userId: req.user.id });
    res.json(months.filter(Boolean).sort().reverse());
  } catch (err) {
    next(err);
  }
}

// GET /api/hr-payroll/payroll?month=&dept=&page=&limit=
export async function listPayroll(req, res, next) {
  try {
    const { month, dept, page = 1, limit = 50 } = req.query;
    const filter = { userId: req.user.id };
    if (month) filter.month = month;
    if (dept && dept !== 'All Departments') filter.dept = dept;

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      Payroll.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Payroll.countDocuments(filter),
    ]);
    res.json({ data, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
}

// GET /api/hr-payroll/payroll/:id
export async function getPayrollRecord(req, res, next) {
  try {
    const record = await Payroll.findOne({ _id: req.params.id, userId: req.user.id }).lean();
    if (!record) return next(httpError(404, 'Payroll record not found'));
    res.json(record);
  } catch (err) {
    next(err);
  }
}

// POST /api/hr-payroll/payroll
export async function createPayrollRecord(req, res, next) {
  try {
    const { basic = 0, allowances = 0, deductions = 0, employeeId, month } = req.body;
    const userId = req.user.id;
    if (employeeId && month) {
      const existing = await Payroll.findOne({ userId, employeeId, month });
      if (existing) return next(httpError(409, 'Payroll record already exists for this employee and month'));
    }
    const net = Number(basic) + Number(allowances) - Number(deductions);
    const record = await Payroll.create({ ...req.body, userId, basic, allowances, deductions, net });
    res.status(201).json(record);
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, 'Payroll record already exists for this employee and month'));
    next(err);
  }
}

// POST /api/hr-payroll/payroll/import
export async function importPayroll(req, res, next) {
  try {
    const userId = req.user.id;
    const rows = await parseExcelRows(req.file, PAYROLL_IMPORT_COLUMNS, 'Employee ID, Name, Month, Basic, Allowances, Deductions');
    const summary = importSummary();

    for (const { rowNumber, record } of rows) {
      const employeeId = asText(record.employeeId);
      const name = asText(record.name);
      const month = asText(record.month);
      if (!employeeId || !name || !month) {
        summary.skipped++;
        summary.errors.push(`Row ${rowNumber}: employee ID, name, and month are required`);
        continue;
      }

      const basic = asNumber(record.basic, 0);
      const allowances = asNumber(record.allowances, 0);
      const deductions = asNumber(record.deductions, 0);
      const data = {
        userId,
        employeeId,
        name,
        dept: asText(record.dept),
        month,
        basic,
        allowances,
        deductions,
        net: record.net === '' || record.net == null ? basic + allowances - deductions : asNumber(record.net, basic + allowances - deductions),
        status: enumValue(record.status, ['Paid', 'Pending'], 'Pending'),
      };

      const existing = await Payroll.findOne({ userId, employeeId, month });
      if (existing) {
        await Payroll.findByIdAndUpdate(existing._id, { $set: data }, { runValidators: true });
        summary.updated++;
      } else {
        await Payroll.create(data);
        summary.imported++;
      }
    }

    res.json(summary);
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, 'Duplicate payroll rows found for the same employee and month'));
    next(err);
  }
}

// PUT /api/hr-payroll/payroll/:id
export async function updatePayrollRecord(req, res, next) {
  try {
    const update = { ...req.body };
    if (update.basic !== undefined || update.allowances !== undefined || update.deductions !== undefined) {
      const existing = await Payroll.findOne({ _id: req.params.id, userId: req.user.id }).lean();
      const basic = update.basic ?? existing?.basic ?? 0;
      const allowances = update.allowances ?? existing?.allowances ?? 0;
      const deductions = update.deductions ?? existing?.deductions ?? 0;
      update.net = Number(basic) + Number(allowances) - Number(deductions);
    }
    const record = await Payroll.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: update },
      { new: true, runValidators: true },
    ).lean();
    if (!record) return next(httpError(404, 'Payroll record not found'));
    res.json(record);
  } catch (err) {
    next(err);
  }
}

// PATCH /api/hr-payroll/payroll/:id/status
export async function patchPayrollStatus(req, res, next) {
  try {
    const { status } = req.body;
    const record = await Payroll.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: { status } },
      { new: true },
    ).lean();
    if (!record) return next(httpError(404, 'Payroll record not found'));
    res.json(record);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/hr-payroll/payroll/:id
export async function deletePayrollRecord(req, res, next) {
  try {
    const record = await Payroll.findOneAndDelete({ _id: req.params.id, userId: req.user.id }).lean();
    if (!record) return next(httpError(404, 'Payroll record not found'));
    res.json({ message: 'Payroll record deleted' });
  } catch (err) {
    next(err);
  }
}
