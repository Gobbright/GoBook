import { Attendance } from '../../../models/Attendance.js';
import { httpError } from '../../../utils/httpError.js';
import { asText, enumValue, importSummary, parseExcelRows } from '../../../utils/excelImport.js';

const ATTENDANCE_IMPORT_COLUMNS = {
  'employee id': 'employeeId',
  'emp id': 'employeeId',
  empid: 'employeeId',
  name: 'name',
  'employee name': 'name',
  dept: 'dept',
  department: 'dept',
  date: 'date',
  'check in': 'checkIn',
  checkin: 'checkIn',
  'time in': 'checkIn',
  'in time': 'checkIn',
  arrival: 'checkIn',
  'check out': 'checkOut',
  checkout: 'checkOut',
  'time out': 'checkOut',
  'out time': 'checkOut',
  departure: 'checkOut',
  hours: 'hours',
  'work hours': 'hours',
  'total hours': 'hours',
  hrs: 'hours',
  status: 'status',
  'attendance status': 'status',
};

function applyDateFilter(filter, { date, dateFrom, dateTo }) {
  if (date) {
    filter.date = date;
    return;
  }
  if (dateFrom || dateTo) {
    filter.date = {};
    if (dateFrom) filter.date.$gte = dateFrom;
    if (dateTo) filter.date.$lte = dateTo;
  }
}

// GET /api/hr-payroll/attendance/stats?date=&dateFrom=&dateTo=
export async function getAttendanceStats(req, res, next) {
  try {
    const { date, dateFrom, dateTo } = req.query;
    const filter = { userId: req.user.id };
    applyDateFilter(filter, { date, dateFrom, dateTo });
    const result = await Attendance.aggregate([
      { $match: filter },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ]);
    const stats = { total: 0, present: 0, absent: 0, late: 0, onLeave: 0 };
    for (const r of result) {
      stats.total += r.count;
      if (r._id === 'Present') stats.present = r.count;
      else if (r._id === 'Absent') stats.absent = r.count;
      else if (r._id === 'Late') stats.late = r.count;
      else if (r._id === 'On Leave') stats.onLeave = r.count;
    }
    res.json(stats);
  } catch (err) {
    next(err);
  }
}

// GET /api/hr-payroll/attendance?date=&dateFrom=&dateTo=&dept=&page=&limit=
export async function listAttendance(req, res, next) {
  try {
    const { date, dateFrom, dateTo, dept, page = 1, limit = 50 } = req.query;
    const filter = { userId: req.user.id };
    applyDateFilter(filter, { date, dateFrom, dateTo });
    if (dept && dept !== 'All Departments') filter.dept = dept;

    const skip = (Number(page) - 1) * Number(limit);
    const [data, total] = await Promise.all([
      Attendance.find(filter).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)).lean(),
      Attendance.countDocuments(filter),
    ]);
    res.json({ data, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    next(err);
  }
}

// GET /api/hr-payroll/attendance/:id
export async function getAttendanceRecord(req, res, next) {
  try {
    const record = await Attendance.findOne({ _id: req.params.id, userId: req.user.id }).lean();
    if (!record) return next(httpError(404, 'Attendance record not found'));
    res.json(record);
  } catch (err) {
    next(err);
  }
}

// POST /api/hr-payroll/attendance
export async function createAttendanceRecord(req, res, next) {
  try {
    const { employeeId, date } = req.body;
    const userId = req.user.id;
    if (employeeId && date) {
      const existing = await Attendance.findOne({ userId, employeeId, date });
      if (existing) return next(httpError(409, 'Attendance record already exists for this employee on this date'));
    }
    const record = await Attendance.create({ ...req.body, userId });
    res.status(201).json(record);
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, 'Attendance record already exists for this employee and date'));
    next(err);
  }
}

// POST /api/hr-payroll/attendance/import
export async function importAttendance(req, res, next) {
  try {
    const userId = req.user.id;
    const rows = await parseExcelRows(req.file, ATTENDANCE_IMPORT_COLUMNS, 'Employee ID, Name, Date, Status');
    const summary = importSummary();

    for (const { rowNumber, record } of rows) {
      const employeeId = asText(record.employeeId);
      const name = asText(record.name);
      const date = asText(record.date);
      if (!employeeId || !name || !date) {
        summary.skipped++;
        summary.errors.push(`Row ${rowNumber}: employee ID, name, and date are required`);
        continue;
      }

      const data = {
        userId,
        employeeId,
        name,
        dept: asText(record.dept),
        date,
        checkIn: asText(record.checkIn) || '--',
        checkOut: asText(record.checkOut) || '--',
        hours: asText(record.hours) || '--',
        status: enumValue(record.status, ['Present', 'Late', 'Absent', 'On Leave'], 'Absent'),
      };

      const existing = await Attendance.findOne({ userId, employeeId, date });
      if (existing) {
        await Attendance.findByIdAndUpdate(existing._id, { $set: data }, { runValidators: true });
        summary.updated++;
      } else {
        await Attendance.create(data);
        summary.imported++;
      }
    }

    res.json(summary);
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, 'Duplicate attendance rows found for the same employee and date'));
    next(err);
  }
}

// PUT /api/hr-payroll/attendance/:id
export async function updateAttendanceRecord(req, res, next) {
  try {
    const record = await Attendance.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      { $set: req.body },
      { new: true, runValidators: true },
    ).lean();
    if (!record) return next(httpError(404, 'Attendance record not found'));
    res.json(record);
  } catch (err) {
    next(err);
  }
}

// DELETE /api/hr-payroll/attendance/:id
export async function deleteAttendanceRecord(req, res, next) {
  try {
    const record = await Attendance.findOneAndDelete({ _id: req.params.id, userId: req.user.id }).lean();
    if (!record) return next(httpError(404, 'Attendance record not found'));
    res.json({ message: 'Attendance record deleted' });
  } catch (err) {
    next(err);
  }
}
