import { Employee } from '../../../models/Employee.js';
import { httpError } from '../../../utils/httpError.js';
import { asNumber, asText, enumValue, importSummary, parseExcelRows } from '../../../utils/excelImport.js';

const EMPLOYEE_IMPORT_COLUMNS = {
  'employee id': 'employeeId',
  'emp id': 'employeeId',
  empid: 'employeeId',
  emp: 'employeeId',
  name: 'name',
  'employee name': 'name',
  'full name': 'name',
  'emp name': 'name',
  'staff name': 'name',
  'worker name': 'name',
  'staff': 'name',
  dept: 'dept',
  department: 'dept',
  designation: 'designation',
  role: 'designation',
  'job title': 'designation',
  email: 'email',
  phone: 'phone',
  mobile: 'phone',
  gender: 'gender',
  sex: 'gender',
  status: 'status',
  'join date': 'joinDate',
  'joining date': 'joinDate',
  'date of joining': 'joinDate',
  doj: 'joinDate',
  joining: 'joinDate',
  joiningdate: 'joinDate',
  salary: 'basicSalary',
  'basic salary': 'basicSalary',
  'basic pay': 'basicSalary',
  ctc: 'basicSalary',
  pay: 'basicSalary',
};

async function nextEmployeeId(userId) {
  const last = await Employee.findOne({ userId }, { employeeId: 1 }, { sort: { createdAt: -1 } });
  let seq = 1;
  if (last) {
    const parts = last.employeeId.split('-');
    const n = parseInt(parts[parts.length - 1], 10);
    if (!isNaN(n)) seq = n + 1;
  }
  return `EMP-${String(seq).padStart(3, '0')}`;
}

// GET /api/hr-payroll/employees/stats
export async function getEmployeeStats(req, res, next) {
  try {
    const userId = req.user.id;
    const [total, active, male, female, deptCount] = await Promise.all([
      Employee.countDocuments({ userId }),
      Employee.countDocuments({ userId, status: 'Active' }),
      Employee.countDocuments({ userId, gender: 'Male' }),
      Employee.countDocuments({ userId, gender: 'Female' }),
      Employee.distinct('dept', { userId }).then((d) => d.filter(Boolean).length),
    ]);
    res.json({ total, active, inactive: total - active, male, female, deptCount });
  } catch (err) {
    next(err);
  }
}

// GET /api/hr-payroll/employees/departments
export async function getDepartments(req, res, next) {
  try {
    const depts = await Employee.distinct('dept', { userId: req.user.id });
    res.json(depts.filter(Boolean).sort());
  } catch (err) {
    next(err);
  }
}

// GET /api/hr-payroll/employees?search=&dept=&status=&page=&limit=
export async function listEmployees(req, res, next) {
  try {
    const { search, dept, status, page = 1, limit = 50 } = req.query;
    const filter = { userId: req.user.id };
    if (search) {
      filter.$or = [
        { name: new RegExp(search, 'i') },
        { employeeId: new RegExp(search, 'i') },
        { email: new RegExp(search, 'i') },
      ];
    }
    if (dept && dept !== 'All Departments') filter.dept = dept;
    if (status && status !== 'All Status') filter.status = status;

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      Employee.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Employee.countDocuments(filter),
    ]);
    res.json({ data, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
}

// GET /api/hr-payroll/employees/:id
export async function getEmployee(req, res, next) {
  try {
    const employee = await Employee.findOne({ _id: req.params.id, userId: req.user.id }).lean();
    if (!employee) return next(httpError(404, 'Employee not found'));
    res.json(employee);
  } catch (err) {
    next(err);
  }
}

// POST /api/hr-payroll/employees
export async function createEmployee(req, res, next) {
  try {
    const { name, email, dept } = req.body;
    const userId = req.user.id;
    const dupKey = email ? { email } : { name, dept };
    const dupField = email ? 'email' : 'name and department';
    const existing = await Employee.findOne({ userId, ...dupKey });
    if (existing) return next(httpError(409, `An employee with this ${dupField} already exists`));
    const employeeId = await nextEmployeeId(userId);
    const employee = await Employee.create({ ...req.body, userId, employeeId });
    res.status(201).json(employee);
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, 'Employee ID already exists'));
    next(err);
  }
}

// POST /api/hr-payroll/employees/import
export async function importEmployees(req, res, next) {
  try {
    const userId = req.user.id;
    const rows = await parseExcelRows(req.file, EMPLOYEE_IMPORT_COLUMNS, 'Employee ID, Name, Department, Salary');
    const summary = importSummary();

    for (const { rowNumber, record } of rows) {
      const name = asText(record.name);
      if (!name) {
        summary.skipped++;
        summary.errors.push(`Row ${rowNumber}: employee name is required`);
        continue;
      }

      const employeeId = asText(record.employeeId) || await nextEmployeeId(userId);
      const data = {
        userId,
        employeeId,
        name,
        dept: asText(record.dept),
        designation: asText(record.designation),
        email: asText(record.email).toLowerCase(),
        phone: asText(record.phone),
        gender: enumValue(record.gender, ['Male', 'Female', 'Other'], 'Male'),
        status: enumValue(record.status, ['Active', 'Inactive'], 'Active'),
        joinDate: asText(record.joinDate),
        basicSalary: asNumber(record.basicSalary, 0),
      };

      const existing = await Employee.findOne({ userId, employeeId });
      if (existing) {
        await Employee.findByIdAndUpdate(existing._id, { $set: data }, { runValidators: true });
        summary.updated++;
      } else {
        await Employee.create(data);
        summary.imported++;
      }
    }

    res.json(summary);
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, 'Duplicate employee ID found in import'));
    next(err);
  }
}

// PUT /api/hr-payroll/employees/:id
export async function updateEmployee(req, res, next) {
  try {
    const { employeeId, ...rest } = req.body;
    const employee = await Employee.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: rest },
      { new: true, runValidators: true },
    ).lean();
    if (!employee) return next(httpError(404, 'Employee not found'));
    res.json(employee);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/hr-payroll/employees/:id
export async function deleteEmployee(req, res, next) {
  try {
    const employee = await Employee.findOneAndDelete({ _id: req.params.id, userId: req.user.id }).lean();
    if (!employee) return next(httpError(404, 'Employee not found'));
    res.json({ message: 'Employee deleted' });
  } catch (err) {
    next(err);
  }
}
