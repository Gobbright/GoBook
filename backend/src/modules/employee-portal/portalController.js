import bcrypt from 'bcryptjs';
import fs from 'fs/promises';
import jwt from 'jsonwebtoken';
import multer from 'multer';
import path from 'path';
import { Types } from 'mongoose';
import { fileURLToPath } from 'url';

import { env } from '../../config/env.js';
import { AppUser } from '../../models/AppUser.js';
import { Attendance } from '../../models/Attendance.js';
import { AttendanceCorrection } from '../../models/AttendanceCorrection.js';
import { Employee } from '../../models/Employee.js';
import { EmployeeLogin } from '../../models/EmployeeLogin.js';
import { Holiday } from '../../models/Holiday.js';
import { Leave } from '../../models/Leave.js';
import { Notice } from '../../models/Notice.js';
import { Payroll } from '../../models/Payroll.js';
import { reverseGeocodeLocation } from '../../services/reverseGeocode.js';
import { httpError } from '../../utils/httpError.js';

const SALT_ROUNDS = 10;
const roleSet = new Set(['admin', 'hr', 'employee']);
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const LEAVE_UPLOAD_DIR = path.join(__dirname, '../../../uploads/leaves');
const EMPLOYEE_PHOTO_UPLOAD_DIR = path.join(__dirname, '../../../uploads/employees');

export const leaveAttachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set(['application/pdf', 'image/jpeg', 'image/png']);
    cb(allowed.has(file.mimetype) ? null : httpError(400, 'Only PDF, JPG and PNG files are allowed'), allowed.has(file.mimetype));
  },
});

export const employeePhotoUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set(['image/jpeg', 'image/png']);
    cb(allowed.has(file.mimetype) ? null : httpError(400, 'Only JPG and PNG files are allowed'), allowed.has(file.mimetype));
  },
});

function normalizeEmail(email) {
  return String(email ?? '').trim().toLowerCase();
}

function slugify(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'employee';
}

const ATTENDANCE_TIME_ZONE = 'Asia/Kolkata';

function today() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: ATTENDANCE_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const byType = Object.fromEntries(parts.map((part) => [part.type, part.value]));
  return [byType.year, byType.month, byType.day].join('-');
}

function timeNow() {
  return new Date().toLocaleTimeString('en-IN', { timeZone: ATTENDANCE_TIME_ZONE, hour: '2-digit', minute: '2-digit', hour12: false });
}

function monthRange(month = new Date().toISOString().slice(0, 7)) {
  return { $gte: `${month}-01`, $lte: `${month}-31` };
}

function parseBoolean(value, fallback = false) {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return ['true', '1', 'yes', 'on', 'enable'].includes(String(value).trim().toLowerCase());
}

function parseObject(value, fallback = {}) {
  if (!value) return fallback;
  if (typeof value === 'object') return value;
  try {
    const parsed = JSON.parse(value);
    return parsed && typeof parsed === 'object' ? parsed : fallback;
  } catch {
    return fallback;
  }
}

function datesBetween(from, to = from) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(from)) || !/^\d{4}-\d{2}-\d{2}$/.test(String(to))) return [];
  const dates = [];
  const cursor = new Date(`${from}T00:00:00.000Z`);
  const end = new Date(`${to}T00:00:00.000Z`);
  if (Number.isNaN(cursor.getTime()) || Number.isNaN(end.getTime())) return [];
  while (cursor <= end) {
    dates.push(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return dates;
}

async function saveLeaveAttachment(file) {
  if (!file) return undefined;
  await fs.mkdir(LEAVE_UPLOAD_DIR, { recursive: true });
  const ext = path.extname(file.originalname || '').toLowerCase() || '.bin';
  const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  await fs.writeFile(path.join(LEAVE_UPLOAD_DIR, fileName), file.buffer);
  return {
    originalName: file.originalname || fileName,
    fileName,
    url: `/uploads/leaves/${fileName}`,
    size: file.size || 0,
    mimeType: file.mimetype || '',
    uploadedAt: new Date(),
  };
}

async function saveEmployeePhoto(file) {
  if (!file) return undefined;
  await fs.mkdir(EMPLOYEE_PHOTO_UPLOAD_DIR, { recursive: true });
  const ext = path.extname(file.originalname || '').toLowerCase() || '.jpg';
  const fileName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`;
  await fs.writeFile(path.join(EMPLOYEE_PHOTO_UPLOAD_DIR, fileName), file.buffer);
  return {
    originalName: file.originalname || fileName,
    fileName,
    url: `/uploads/employees/${fileName}`,
    size: file.size || 0,
    mimeType: file.mimetype || '',
    uploadedAt: new Date(),
  };
}

function hoursBetween(start, end) {
  if (!start || !end || start === '--' || end === '--') return '--';
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  if ([sh, sm, eh, em].some(Number.isNaN)) return '--';
  const minutes = Math.max(0, (eh * 60 + em) - (sh * 60 + sm));
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

async function normalizeAttendanceLocation(value) {
  const source = value && typeof value === 'object' ? value : null;
  if (!source) throw httpError(400, 'Live location is required to mark attendance');
  const latitude = Number(source.latitude ?? source.lat);
  const longitude = Number(source.longitude ?? source.lng);
  const accuracy = Number(source.accuracy ?? 0);
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    throw httpError(400, 'Valid live location is required to mark attendance');
  }
  const lookup = await reverseGeocodeLocation(latitude, longitude);
  return {
    latitude,
    longitude,
    accuracy: Number.isFinite(accuracy) ? accuracy : null,
    capturedAt: source.capturedAt ? new Date(source.capturedAt) : new Date(),
    mapUrl: `https://www.google.com/maps?q=${latitude},${longitude}`,
    ...(lookup ?? {}),
  };
}

function signPortalToken(user) {
  return jwt.sign({
    scope: 'employee-portal',
    sub: String(user.id),
    ownerUserId: String(user.ownerUserId),
    employeeObjectId: user.employeeObjectId ? String(user.employeeObjectId) : '',
    employeeId: user.employeeId || '',
    email: user.email,
    name: user.name,
    role: user.role,
    category: user.category || '',
  }, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

function safePortalUser(user) {
  return {
    id: String(user.id),
    ownerUserId: String(user.ownerUserId),
    employeeObjectId: user.employeeObjectId ? String(user.employeeObjectId) : '',
    employeeId: user.employeeId || '',
    name: user.name,
    email: user.email,
    role: user.role,
    category: user.category || '',
  };
}


async function resolveOwnerCategory(ownerUserId) {
  const owner = await AppUser.findById(ownerUserId, { category: 1 }).lean();
  return owner?.category || 'retail';
}
async function nextEmployeeId(ownerUserId) {
  const last = await Employee.findOne({ userId: ownerUserId }, { employeeId: 1 }, { sort: { createdAt: -1 } });
  const n = last ? Number.parseInt(String(last.employeeId).split('-').pop(), 10) : 0;
  return `EMP-${String(Number.isNaN(n) ? 1 : n + 1).padStart(3, '0')}`;
}

async function nextLeaveId(ownerUserId) {
  const last = await Leave.findOne({ userId: ownerUserId }, { leaveId: 1 }, { sort: { createdAt: -1 } });
  const n = last ? Number.parseInt(String(last.leaveId).split('-').pop(), 10) : 0;
  return `LV-${String(Number.isNaN(n) ? 1 : n + 1).padStart(3, '0')}`;
}

async function currentEmployee(req) {
  const { ownerUserId, employeeId } = req.employeeUser;
  if (!employeeId) throw httpError(403, 'Employee profile is required for this action');
  const employee = await Employee.findOne({ userId: ownerUserId, employeeId }).lean();
  if (!employee) throw httpError(404, 'Employee profile not found');
  return employee;
}

export async function loginEmployeePortal(req, res, next) {
  try {
    const loginId = String(req.body.email ?? req.body.employeeId ?? '').trim();
    const ownerUserId = String(req.body.ownerUserId ?? '').trim();
    const scopedEmployeeId = String(req.body.employeeId ?? '').trim();
    const password = String(req.body.password ?? '');
    if (!loginId || !password) return next(httpError(400, 'Employee ID / email and password are required'));

    const email = normalizeEmail(loginId);
    const employeeId = scopedEmployeeId || loginId;
    const query = ownerUserId
      ? { ownerUserId, $or: [{ email }, { employeeId }] }
      : { $or: [{ email }, { employeeId }] };

    const employeeLogin = await EmployeeLogin.findOne(query).select('+passwordHash');
    if (!employeeLogin) return next(httpError(401, 'Invalid employee ID/email or password'));
    if (employeeLogin.role !== 'employee') return next(httpError(403, 'Use the admin login to access Employee Management'));
    if (!employeeLogin.loginEnabled || employeeLogin.status !== 'Active') return next(httpError(403, 'Login access is disabled'));

    const valid = await bcrypt.compare(password, employeeLogin.passwordHash);
    if (!valid) return next(httpError(401, 'Invalid employee ID/email or password'));

    const user = {
      id: employeeLogin._id,
      ownerUserId: employeeLogin.ownerUserId,
      employeeObjectId: employeeLogin.employeeObjectId,
      employeeId: employeeLogin.employeeId,
      name: employeeLogin.name,
      email: employeeLogin.email,
      role: employeeLogin.role,
      category: employeeLogin.category,
    };
    res.json({ token: signPortalToken(user), user: safePortalUser(user) });
  } catch (err) {
    next(err);
  }
}

export async function exchangeMainToken(req, res, next) {
  try {
    const owner = await AppUser.findById(req.user.id).lean();
    if (!owner || owner.status !== 'Active') return next(httpError(403, 'Account is not active'));
    const user = {
      id: owner._id,
      ownerUserId: owner._id,
      name: owner.name,
      email: owner.email,
      role: 'admin',
      category: owner.category || 'retail',
    };
    res.json({ token: signPortalToken(user), user: safePortalUser(user) });
  } catch (err) {
    next(err);
  }
}export async function getEmployeePortalMe(req, res, next) {
  try {
    let employee = null;
    if (req.employeeUser.employeeId) {
      employee = await Employee.findOne({ userId: req.employeeUser.ownerUserId, employeeId: req.employeeUser.employeeId }).lean();
    }
    res.json({ user: req.employeeUser, employee });
  } catch (err) {
    next(err);
  }
}

export async function employeeDashboard(req, res, next) {
  try {
    const ownerUserId = req.employeeUser.ownerUserId;
    const employeeId = req.employeeUser.employeeId;
    const filter = { userId: ownerUserId, employeeId };
    const [attendance, leaves, payslips, notices] = await Promise.all([
      Attendance.countDocuments(filter),
      Leave.countDocuments({ userId: ownerUserId, empId: employeeId }),
      Payroll.countDocuments(filter),
      Notice.countDocuments({ ownerUserId, status: 'Published', audience: { $in: ['all', 'employee'] } }),
    ]);
    res.json({ attendance, leaves, payslips, notices });
  } catch (err) {
    next(err);
  }
}

export async function checkIn(req, res, next) {
  try {
    const employee = await currentEmployee(req);
    const date = today();
    const existing = await Attendance.findOne({ userId: req.employeeUser.ownerUserId, employeeId: employee.employeeId, date }).lean();
    if (existing?.checkIn && existing.checkIn !== '--') {
      return next(httpError(409, 'Check in already saved for today'));
    }

    const checkInTime = timeNow();
    const checkInLocation = await normalizeAttendanceLocation(req.body.location);
    const record = await Attendance.findOneAndUpdate(
      { userId: req.employeeUser.ownerUserId, employeeId: employee.employeeId, date },
      { $setOnInsert: { name: employee.name, dept: employee.dept, checkOut: '--', hours: '--' }, $set: { checkIn: checkInTime, checkInLocation, status: 'Present' } },
      { upsert: true, new: true, setDefaultsOnInsert: true },
    ).lean();
    res.status(201).json(record);
  } catch (err) {
    next(err);
  }
}

export async function checkOut(req, res, next) {
  try {
    const employee = await currentEmployee(req);
    const date = today();
    const existing = await Attendance.findOne({ userId: req.employeeUser.ownerUserId, employeeId: employee.employeeId, date });
    if (!existing?.checkIn || existing.checkIn === '--') {
      return next(httpError(400, 'Check in first to save check out'));
    }
    if (existing.checkOut && existing.checkOut !== '--') {
      return next(httpError(409, 'Check out already saved for today'));
    }

    const checkOutTime = timeNow();
    const checkOutLocation = await normalizeAttendanceLocation(req.body.location);
    const checkIn = existing.checkIn;
    const record = await Attendance.findOneAndUpdate(
      { userId: req.employeeUser.ownerUserId, employeeId: employee.employeeId, date },
      { $set: { checkOut: checkOutTime, checkOutLocation, hours: hoursBetween(checkIn, checkOutTime), status: 'Present' } },
      { new: true, runValidators: true },
    ).lean();
    res.json(record);
  } catch (err) {
    next(err);
  }
}

export async function employeeMonthlyAttendance(req, res, next) {
  try {
    const month = String(req.query.month || new Date().toISOString().slice(0, 7));
    const data = await Attendance.find({ userId: req.employeeUser.ownerUserId, employeeId: req.employeeUser.employeeId, date: monthRange(month) }).sort({ date: -1 }).lean();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function createCorrection(req, res, next) {
  try {
    const employee = await currentEmployee(req);
    const { date, checkIn = '', checkOut = '', reason } = req.body;
    if (!date || !reason) return next(httpError(400, 'Date and reason are required'));
    const correction = await AttendanceCorrection.create({ ownerUserId: req.employeeUser.ownerUserId, employeeId: employee.employeeId, name: employee.name, dept: employee.dept, date, checkIn, checkOut, reason });
    res.status(201).json(correction);
  } catch (err) {
    next(err);
  }
}

export async function applyLeave(req, res, next) {
  try {
    const employee = await currentEmployee(req);
    const { type = 'Casual Leave', from, to, days = 1, reason = '' } = req.body;
    if (!from || !to) return next(httpError(400, 'From and to dates are required'));
    const leave = await Leave.create({ userId: req.employeeUser.ownerUserId, leaveId: await nextLeaveId(req.employeeUser.ownerUserId), name: employee.name, empId: employee.employeeId, dept: employee.dept, type, from, to, days, reason, applied: today(), status: 'Pending', recordedBy: 'Employee Portal' });
    res.status(201).json(leave);
  } catch (err) {
    next(err);
  }
}

export async function employeeLeaveStatus(req, res, next) {
  try {
    const data = await Leave.find({ userId: req.employeeUser.ownerUserId, empId: req.employeeUser.employeeId }).sort({ createdAt: -1 }).limit(10).lean();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function employeeLeaveHistory(req, res, next) {
  try {
    const data = await Leave.find({ userId: req.employeeUser.ownerUserId, empId: req.employeeUser.employeeId }).sort({ createdAt: -1 }).lean();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function employeeNotices(req, res, next) {
  try {
    const data = await Notice.find({ ownerUserId: req.employeeUser.ownerUserId, status: 'Published', audience: { $in: ['all', req.employeeUser.role] } }).sort({ publishDate: -1, createdAt: -1 }).lean();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function employeePayslips(req, res, next) {
  try {
    const data = await Payroll.find({ userId: req.employeeUser.ownerUserId, employeeId: req.employeeUser.employeeId }).sort({ month: -1 }).lean();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function employeeHolidays(req, res, next) {
  try {
    const data = await Holiday.find({ ownerUserId: req.employeeUser.ownerUserId }).sort({ date: 1 }).lean();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function adminDashboard(req, res, next) {
  try {
    const ownerUserId = req.employeeUser.ownerUserId;
    const todayDate = today();
    const ownerObjectId = new Types.ObjectId(String(ownerUserId));
    const [
      employeeStatuses,
      attendanceStatuses,
      pendingLeaves,
      pendingCorrections,
      recentEmployees,
    ] = await Promise.all([
      Employee.aggregate([
        { $match: { userId: ownerObjectId } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Attendance.aggregate([
        { $match: { userId: ownerObjectId, date: todayDate } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),
      Leave.countDocuments({ userId: ownerUserId, status: 'Pending' }),
      AttendanceCorrection.countDocuments({ ownerUserId, status: 'Pending' }),
      Employee.find(
        { userId: ownerUserId },
        { employeeId: 1, name: 1, dept: 1, designation: 1, status: 1, createdAt: 1 },
      ).sort({ createdAt: -1 }).limit(5).lean(),
    ]);

    const employeeCounts = Object.fromEntries(employeeStatuses.map((row) => [row._id, row.count]));
    const attendanceCounts = Object.fromEntries(attendanceStatuses.map((row) => [row._id, row.count]));
    const activeEmployees = employeeCounts.Active || 0;
    const inactiveEmployees = employeeCounts.Inactive || 0;
    const employees = activeEmployees + inactiveEmployees;
    const present = attendanceCounts.Present || 0;
    const late = attendanceCounts.Late || 0;
    const absent = attendanceCounts.Absent || 0;
    const onLeave = attendanceCounts['On Leave'] || 0;
    const marked = present + late + absent + onLeave;
    const notMarked = Math.max(0, activeEmployees - marked);
    const attendanceRate = activeEmployees > 0
      ? Math.round(((present + late) / activeEmployees) * 100)
      : 0;

    res.json({
      date: todayDate,
      employees,
      activeEmployees,
      inactiveEmployees,
      present,
      late,
      absent,
      onLeave,
      notMarked,
      attendanceRate,
      pendingLeaves,
      pendingCorrections,
      recentEmployees,
    });
  } catch (err) {
    next(err);
  }
}

export async function listAdminEmployees(req, res, next) {
  try {
    const ownerUserId = req.employeeUser.ownerUserId;
    const [employees, logins] = await Promise.all([
      Employee.find({ userId: ownerUserId }).sort({ createdAt: -1 }).lean(),
      EmployeeLogin.find({ ownerUserId }, { employeeId: 1, loginPassword: 1 }).lean(),
    ]);
    const passwordByEmployeeId = new Map(logins.map((login) => [login.employeeId, login.loginPassword || '']));
    const data = employees.map((employee) => ({
      ...employee,
      loginPassword: employee.loginPassword || passwordByEmployeeId.get(employee.employeeId) || '',
    }));
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function createAdminEmployee(req, res, next) {
  try {
    const ownerUserId = req.employeeUser.ownerUserId;
    const category = await resolveOwnerCategory(ownerUserId);
    const {
      employeeId, name, email, mobileNumber, phone, department, dept, designation, joiningDate, joinDate,
      password, loginAccess = true, status = 'Active', role = 'employee', basicSalary = 0,
      gender = '', dateOfBirth = '', bloodGroup = '', address = '', branch = '', reportingManager = '',
      employmentType = 'Full Time', shift = '', workLocation = '', emergencyContact = {},
    } = req.body;
    const finalLoginAccess = parseBoolean(loginAccess, true);
    const finalEmergencyContact = parseObject(emergencyContact);
    const visiblePassword = String(password || '').trim();
    if (!name || !email) return next(httpError(400, 'Employee name and email are required'));
    if (finalLoginAccess && !visiblePassword) return next(httpError(400, 'Login password is required when login access is enabled'));
    const finalRole = roleSet.has(role) ? role : 'employee';
    const finalEmployeeId = String(employeeId || await nextEmployeeId(ownerUserId)).trim();
    const photo = await saveEmployeePhoto(req.file);
    const employee = await Employee.create({
      userId: ownerUserId,
      category,
      employeeId: finalEmployeeId,
      name,
      email: normalizeEmail(email),
      phone: mobileNumber || phone || '',
      dept: department || dept || '',
      designation: designation || '',
      joinDate: joiningDate || joinDate || '',
      status,
      loginAccess: finalLoginAccess,
      loginPassword: visiblePassword,
      employeeRole: finalRole,
      basicSalary: Number(basicSalary) || 0,
      ...(photo ? { photo } : {}),
      gender,
      dateOfBirth,
      bloodGroup,
      address,
      branch,
      reportingManager,
      employmentType,
      shift,
      workLocation,
      emergencyContact: {
        name: String(finalEmergencyContact?.name || '').trim(),
        relationship: String(finalEmergencyContact?.relationship || '').trim(),
        phone: String(finalEmergencyContact?.phone || '').trim(),
      },
    });
    const loginSlug = slugify(employee.name);
    if (finalLoginAccess && visiblePassword) {
      await EmployeeLogin.findOneAndUpdate(
        { ownerUserId, employeeId: employee.employeeId },
        { ownerUserId, employeeObjectId: employee._id, employeeId: employee.employeeId, name: employee.name, email: normalizeEmail(email), category, loginSlug, passwordHash: await bcrypt.hash(visiblePassword, SALT_ROUNDS), loginPassword: visiblePassword, role: finalRole, loginEnabled: true, status },
        { upsert: true, new: true, runValidators: true },
      );
    }
    const payload = employee.toObject();
    res.status(201).json({
      ...payload,
      loginContext: {
        ownerUserId: String(ownerUserId),
        category,
        employeeId: employee.employeeId,
        slug: loginSlug,
      },
    });
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, 'Employee ID or login email already exists for this account'));
    next(err);
  }
}
export async function updateAdminEmployee(req, res, next) {
  try {
    const ownerUserId = req.employeeUser.ownerUserId;
    const existing = await Employee.findOne({ _id: req.params.id, userId: ownerUserId });
    if (!existing) return next(httpError(404, 'Employee not found'));

    const {
      password,
      loginAccess,
      role,
      department,
      mobileNumber,
      joiningDate,
      name,
      email,
      designation,
      status,
      basicSalary,
      gender,
      dateOfBirth,
      bloodGroup,
      address,
      branch,
      reportingManager,
      employmentType,
      shift,
      workLocation,
      emergencyContact,
    } = req.body;

    const wantsLogin = loginAccess === undefined ? Boolean(existing.loginAccess) : Boolean(loginAccess);
    const visiblePassword = String(password || '').trim();
    const shouldChangePassword = password !== undefined;
    if (wantsLogin && shouldChangePassword && !visiblePassword) {
      return next(httpError(400, 'New password is required when changing login password'));
    }

    const finalRole = roleSet.has(role) ? role : existing.employeeRole || 'employee';
    const finalName = String(name ?? existing.name).trim();
    const finalEmail = normalizeEmail(email ?? existing.email);
    if (!finalName || !finalEmail) return next(httpError(400, 'Employee name and email are required'));

    const update = {
      name: finalName,
      email: finalEmail,
      phone: mobileNumber !== undefined ? String(mobileNumber ?? '').trim() : existing.phone,
      dept: department !== undefined ? String(department ?? '').trim() : existing.dept,
      designation: designation !== undefined ? String(designation ?? '').trim() : existing.designation,
      joinDate: joiningDate !== undefined ? String(joiningDate ?? '').trim() : existing.joinDate,
      basicSalary: Number.isFinite(Number(basicSalary)) ? Number(basicSalary) : existing.basicSalary,
      loginAccess: wantsLogin,
      status: ['Active', 'Inactive', 'Probation', 'On Leave', 'Resigned', 'Terminated'].includes(status) ? status : existing.status,
      employeeRole: finalRole,
      category: req.employeeUser.category || existing.category || await resolveOwnerCategory(ownerUserId),
      gender: gender !== undefined ? String(gender || '').trim() : existing.gender,
      dateOfBirth: dateOfBirth !== undefined ? String(dateOfBirth || '').trim() : existing.dateOfBirth,
      bloodGroup: bloodGroup !== undefined ? String(bloodGroup || '').trim() : existing.bloodGroup,
      address: address !== undefined ? String(address || '').trim() : existing.address,
      branch: branch !== undefined ? String(branch || '').trim() : existing.branch,
      reportingManager: reportingManager !== undefined ? String(reportingManager || '').trim() : existing.reportingManager,
      employmentType: employmentType !== undefined ? String(employmentType || '').trim() : existing.employmentType,
      shift: shift !== undefined ? String(shift || '').trim() : existing.shift,
      workLocation: workLocation !== undefined ? String(workLocation || '').trim() : existing.workLocation,
    };
    if (emergencyContact !== undefined) {
      update.emergencyContact = {
        name: String(emergencyContact?.name || '').trim(),
        relationship: String(emergencyContact?.relationship || '').trim(),
        phone: String(emergencyContact?.phone || '').trim(),
      };
    }
    if (shouldChangePassword) update.loginPassword = visiblePassword;

    const employee = await Employee.findOneAndUpdate(
      { _id: existing._id, userId: ownerUserId },
      { $set: update },
      { new: true, runValidators: true },
    ).lean();

    if (wantsLogin) {
      const loginUpdate = {
        ownerUserId,
        employeeObjectId: employee._id,
        employeeId: employee.employeeId,
        name: employee.name,
        email: normalizeEmail(employee.email),
        category: employee.category || update.category,
        loginSlug: slugify(employee.name),
        role: employee.employeeRole,
        loginEnabled: true,
        status: employee.status,
      };
      if (shouldChangePassword) {
        loginUpdate.passwordHash = await bcrypt.hash(visiblePassword, SALT_ROUNDS);
        loginUpdate.loginPassword = visiblePassword;
      }

      const existingLogin = await EmployeeLogin.findOne({ ownerUserId, employeeId: employee.employeeId }).select('+passwordHash');
      if (existingLogin) {
        await EmployeeLogin.updateOne({ _id: existingLogin._id }, { $set: loginUpdate }, { runValidators: true });
      } else {
        const initialPassword = shouldChangePassword ? visiblePassword : employee.loginPassword;
        if (!initialPassword) return next(httpError(400, 'Login password is required when login access is enabled'));
        await EmployeeLogin.create({
          ...loginUpdate,
          passwordHash: await bcrypt.hash(initialPassword, SALT_ROUNDS),
          loginPassword: initialPassword,
        });
      }
    } else {
      await EmployeeLogin.updateMany(
        { ownerUserId, employeeId: employee.employeeId },
        { $set: { loginEnabled: false, status: employee.status } },
      );
    }

    res.json(employee);
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, 'Employee ID or login email already exists for this account'));
    next(err);
  }
}
export async function deleteAdminEmployee(req, res, next) {
  try {
    const ownerUserId = req.employeeUser.ownerUserId;
    const employee = await Employee.findOneAndDelete({ _id: req.params.id, userId: ownerUserId }).lean();
    if (!employee) return next(httpError(404, 'Employee not found'));
    await Promise.all([
      EmployeeLogin.deleteMany({ ownerUserId, employeeId: employee.employeeId }),
      Attendance.deleteMany({ userId: ownerUserId, employeeId: employee.employeeId }),
      AttendanceCorrection.deleteMany({ ownerUserId, employeeId: employee.employeeId }),
      Leave.deleteMany({ userId: ownerUserId, empId: employee.employeeId }),
      Payroll.deleteMany({ userId: ownerUserId, employeeId: employee.employeeId }),
    ]);
    res.json({ message: 'Employee deleted', employee });
  } catch (err) {
    next(err);
  }
}
export async function adminTodayAttendance(req, res, next) {
  try {
    const date = String(req.query.date || today()).trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(Date.parse(date + 'T00:00:00Z'))) {
      return next(httpError(400, 'A valid attendance date is required'));
    }
    const data = await Attendance.find({ userId: req.employeeUser.ownerUserId, date }).sort({ name: 1 }).lean();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function adminMonthlyAttendance(req, res, next) {
  try {
    const month = String(req.query.month || new Date().toISOString().slice(0, 7));
    const data = await Attendance.find({ userId: req.employeeUser.ownerUserId, date: monthRange(month) }).sort({ date: -1 }).lean();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function markAdminAttendance(req, res, next) {
  try {
    const ownerUserId = req.employeeUser.ownerUserId;
    const {
      employeeId,
      date = today(),
      status = 'Present',
      checkIn = '--',
      checkOut = '--',
      remarks = '',
      shift = '',
    } = req.body;
    if (!employeeId) return next(httpError(400, 'Employee is required'));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date))) return next(httpError(400, 'A valid attendance date is required'));
    const employee = await Employee.findOne({ userId: ownerUserId, employeeId }).lean();
    if (!employee) return next(httpError(404, 'Employee not found'));
    const allowed = ['Present', 'Late', 'Absent', 'On Leave', 'WFH', 'On Duty', 'Half Day', 'Weekly Off', 'Holiday'];
    const finalStatus = allowed.includes(status) ? status : 'Present';
    const record = await Attendance.findOneAndUpdate(
      { userId: ownerUserId, employeeId, date },
      {
        $set: {
          userId: ownerUserId,
          employeeId,
          name: employee.name,
          dept: employee.dept || '',
          date,
          status: finalStatus,
          checkIn: checkIn || '--',
          checkOut: checkOut || '--',
          hours: hoursBetween(checkIn, checkOut),
          shift: shift || employee.shift || '',
          remarks,
        },
      },
      { upsert: true, new: true, runValidators: true },
    ).lean();
    res.json(record);
  } catch (err) {
    next(err);
  }
}

export async function adminCorrections(req, res, next) {
  try {
    const data = await AttendanceCorrection.find({ ownerUserId: req.employeeUser.ownerUserId }).sort({ createdAt: -1 }).lean();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function createAdminCorrection(req, res, next) {
  try {
    const ownerUserId = req.employeeUser.ownerUserId;
    const employeeId = String(req.body.employeeId || '').trim();
    const date = String(req.body.date || today()).trim();
    const reason = String(req.body.reason || '').trim();
    if (!employeeId) return next(httpError(400, 'Employee is required'));
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return next(httpError(400, 'A valid correction date is required'));
    if (!reason) return next(httpError(400, 'Correction reason is required'));
    const employee = await Employee.findOne({ userId: ownerUserId, employeeId }).lean();
    if (!employee) return next(httpError(404, 'Employee not found'));
    const correction = await AttendanceCorrection.create({
      ownerUserId,
      employeeId,
      name: employee.name,
      dept: employee.dept || '',
      date,
      checkIn: String(req.body.checkIn || '').trim(),
      checkOut: String(req.body.checkOut || '').trim(),
      reason,
      status: 'Pending',
    });
    res.status(201).json(correction);
  } catch (err) {
    next(err);
  }
}

export async function updateCorrection(req, res, next) {
  try {
    const { status } = req.body;
    const correction = await AttendanceCorrection.findOneAndUpdate({ _id: req.params.id, ownerUserId: req.employeeUser.ownerUserId }, { $set: { status, reviewedBy: req.employeeUser.name, reviewedAt: new Date() } }, { new: true }).lean();
    if (!correction) return next(httpError(404, 'Correction request not found'));
    if (status === 'Approved') {
      const checkIn = correction.checkIn || '--';
      const checkOut = correction.checkOut || '--';
      await Attendance.findOneAndUpdate({ userId: correction.ownerUserId, employeeId: correction.employeeId, date: correction.date }, { $set: { name: correction.name, dept: correction.dept, checkIn, checkOut, hours: hoursBetween(checkIn, checkOut), status: 'Present' } }, { upsert: true, new: true });
    }
    res.json(correction);
  } catch (err) {
    next(err);
  }
}

export async function adminLeaves(req, res, next) {
  try {
    const data = await Leave.find({ userId: req.employeeUser.ownerUserId }).sort({ createdAt: -1 }).lean();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function createAdminLeave(req, res, next) {
  try {
    const ownerUserId = req.employeeUser.ownerUserId;
    const empId = String(req.body.empId || req.body.employeeId || '').trim();
    const employee = await Employee.findOne({ userId: ownerUserId, employeeId: empId }).lean();
    if (!employee) return next(httpError(404, 'Employee not found'));

    const from = String(req.body.from || '').trim();
    const to = String(req.body.to || from).trim();
    if (!from || !to) return next(httpError(400, 'From and to dates are required'));

    const attachment = await saveLeaveAttachment(req.file);
    const leave = await Leave.create({
      userId: ownerUserId,
      leaveId: await nextLeaveId(ownerUserId),
      name: employee.name,
      empId: employee.employeeId,
      dept: employee.dept,
      type: req.body.type || 'Casual Leave',
      from,
      to,
      days: Number(req.body.days) || 1,
      reason: req.body.reason || '',
      applied: today(),
      status: req.body.status || 'Pending',
      recordedBy: req.employeeUser.name || 'HR Admin',
      ...(attachment ? { attachment } : {}),
    });
    res.status(201).json(leave);
  } catch (err) {
    next(err);
  }
}

export async function updateLeaveStatus(req, res, next) {
  try {
    const ownerUserId = req.employeeUser.ownerUserId;
    const status = String(req.body.status || '').trim();
    if (!['Approved', 'Pending', 'Rejected'].includes(status)) return next(httpError(400, 'Leave status must be Approved, Pending or Rejected'));
    const leave = await Leave.findOneAndUpdate({ _id: req.params.id, userId: ownerUserId }, { $set: { status } }, { new: true }).lean();
    if (!leave) return next(httpError(404, 'Leave request not found'));
    const leaveDates = datesBetween(leave.from, leave.to);
    const leaveRemark = `Leave approved: ${leave.leaveId} (${leave.type})`;

    if (status === 'Approved' && leaveDates.length) {
      const employee = await Employee.findOne({ userId: ownerUserId, employeeId: leave.empId }).lean();
      await Attendance.bulkWrite(leaveDates.map((date) => ({
        updateOne: {
          filter: { userId: ownerUserId, employeeId: leave.empId, date },
          update: {
            $set: {
              userId: ownerUserId,
              employeeId: leave.empId,
              name: leave.name,
              dept: leave.dept || '',
              date,
              checkIn: '--',
              checkOut: '--',
              hours: '--',
              shift: employee?.shift || '',
              remarks: leaveRemark,
              status: 'On Leave',
            },
          },
          upsert: true,
        },
      })), { ordered: false });
    }

    if (status !== 'Approved' && leaveDates.length) {
      await Attendance.deleteMany({
        userId: ownerUserId,
        employeeId: leave.empId,
        date: { $in: leaveDates },
        status: 'On Leave',
        remarks: leaveRemark,
      });
    }

    res.json(leave);
  } catch (err) {
    next(err);
  }
}

export async function adminPayroll(req, res, next) {
  try {
    const month = String(req.query.month || '').trim();
    const filter = { userId: req.employeeUser.ownerUserId };
    if (month) filter.month = month;
    const data = await Payroll.find(filter).sort({ month: -1, createdAt: -1 }).lean();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function generateAdminPayroll(req, res, next) {
  try {
    const ownerUserId = req.employeeUser.ownerUserId;
    const month = String(req.body.month || new Date().toISOString().slice(0, 7)).trim();
    if (!/^\d{4}-\d{2}$/.test(month)) return next(httpError(400, 'A valid payroll month is required'));
    const employees = await Employee.find({ userId: ownerUserId, status: { $ne: 'Terminated' } }).lean();
    const operations = employees.map((employee) => {
      const basic = Number(employee.basicSalary || 0);
      const allowances = Math.round(basic * 0.22);
      const deductions = Math.round(basic * 0.16);
      return {
        updateOne: {
          filter: { userId: ownerUserId, employeeId: employee.employeeId, month },
          update: {
            $set: {
              userId: ownerUserId,
              employeeId: employee.employeeId,
              name: employee.name,
              dept: employee.dept || '',
              month,
              basic,
              allowances,
              deductions,
              net: Math.max(0, basic + allowances - deductions),
              status: 'Pending',
            },
          },
          upsert: true,
        },
      };
    });
    if (operations.length) await Payroll.bulkWrite(operations, { ordered: false });
    const data = await Payroll.find({ userId: ownerUserId, month }).sort({ createdAt: -1 }).lean();
    res.status(201).json({ data, message: `Payroll generated for ${data.length} employee(s).` });
  } catch (err) {
    next(err);
  }
}

export async function approveAdminPayroll(req, res, next) {
  try {
    const ownerUserId = req.employeeUser.ownerUserId;
    const month = String(req.body.month || '').trim();
    if (!/^\d{4}-\d{2}$/.test(month)) return next(httpError(400, 'A valid payroll month is required'));
    await Payroll.updateMany({ userId: ownerUserId, month }, { $set: { status: 'Paid' } });
    const data = await Payroll.find({ userId: ownerUserId, month }).sort({ createdAt: -1 }).lean();
    res.json({ data, message: `Payroll approved for ${data.length} employee(s).` });
  } catch (err) {
    next(err);
  }
}


export async function updateAdminPayroll(req, res, next) {
  try {
    const basic = Number(req.body.basic);
    const allowances = Number(req.body.allowances);
    const deductions = Number(req.body.deductions);
    const status = String(req.body.status || '').trim();
    if (![basic, allowances, deductions].every(Number.isFinite) || [basic, allowances, deductions].some((value) => value < 0)) {
      return next(httpError(400, 'Salary amounts must be valid non-negative numbers'));
    }
    if (!['Paid', 'Pending'].includes(status)) {
      return next(httpError(400, 'Payroll status must be Paid or Pending'));
    }
    const payroll = await Payroll.findOneAndUpdate(
      { _id: req.params.id, userId: req.employeeUser.ownerUserId },
      {
        $set: {
          basic,
          allowances,
          deductions,
          net: Math.max(0, basic + allowances - deductions),
          status,
        },
      },
      { new: true, runValidators: true },
    ).lean();
    if (!payroll) return next(httpError(404, 'Payroll record not found'));
    res.json(payroll);
  } catch (err) {
    next(err);
  }
}

export async function adminNotices(req, res, next) {
  try {
    const data = await Notice.find({ ownerUserId: req.employeeUser.ownerUserId }).sort({ publishDate: -1, createdAt: -1 }).lean();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function createNotice(req, res, next) {
  try {
    const { title, message } = req.body;
    if (!title || !message) return next(httpError(400, 'Title and message are required'));
    const notice = await Notice.create({
      ownerUserId: req.employeeUser.ownerUserId,
      title,
      message,
      audience: 'all',
      status: 'Published',
      publishDate: today(),
    });
    res.status(201).json(notice);
  } catch (err) {
    next(err);
  }
}

export async function adminHolidays(req, res, next) {
  try {
    const data = await Holiday.find({ ownerUserId: req.employeeUser.ownerUserId }).sort({ date: 1 }).lean();
    res.json({ data });
  } catch (err) {
    next(err);
  }
}

export async function createHoliday(req, res, next) {
  try {
    const { name, date, type = 'Company', description = '' } = req.body;
    if (!name || !date) return next(httpError(400, 'Holiday name and date are required'));
    const holiday = await Holiday.create({ ownerUserId: req.employeeUser.ownerUserId, name, date, type, description });
    res.status(201).json(holiday);
  } catch (err) {
    if (err.code === 11000) return next(httpError(409, 'Holiday already exists for this date'));
    next(err);
  }
}





