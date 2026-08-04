import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';

import { env } from '../src/config/env.js';
import { AppUser } from '../src/models/AppUser.js';
import { Attendance } from '../src/models/Attendance.js';
import { AttendanceCorrection } from '../src/models/AttendanceCorrection.js';
import { Employee } from '../src/models/Employee.js';
import { EmployeeLogin } from '../src/models/EmployeeLogin.js';
import { Holiday } from '../src/models/Holiday.js';
import { Leave } from '../src/models/Leave.js';
import { Notice } from '../src/models/Notice.js';
import { Payroll } from '../src/models/Payroll.js';

const PASSWORD = 'Employee@123';
const TODAY = '2026-07-24';

const CATEGORY_PREFIX = {
  retail: 'RET',
  school: 'SCH',
  hospital: 'HOS',
  hotel: 'HOT',
  manufacturing: 'MFG',
  construction: 'CON',
  ngo: 'NGO',
  automobile: 'AUT',
};

const CATEGORY_PROFILES = {
  construction: [
    ['Arun Kumar', 'Projects', 'Site Engineer'],
    ['Divya S', 'Planning', 'Quantity Surveyor'],
    ['Karthik Raj', 'Safety', 'Safety Officer'],
    ['Meena Priya', 'Materials', 'Store Keeper'],
    ['Suresh Babu', 'Site Operations', 'Site Supervisor'],
  ],
  hotel: [
    ['Arun Kumar', 'Front Office', 'Receptionist'],
    ['Divya S', 'Housekeeping', 'Housekeeping Executive'],
    ['Karthik Raj', 'Food and Beverage', 'Service Associate'],
    ['Meena Priya', 'Reservations', 'Reservation Executive'],
    ['Suresh Babu', 'Maintenance', 'Maintenance Supervisor'],
  ],
  manufacturing: [
    ['Arun Kumar', 'Production', 'Production Operator'],
    ['Divya S', 'Quality', 'Quality Inspector'],
    ['Karthik Raj', 'Stores', 'Store Assistant'],
    ['Meena Priya', 'Planning', 'Production Planner'],
    ['Suresh Babu', 'Maintenance', 'Maintenance Technician'],
  ],
  school: [
    ['Arun Kumar', 'Academics', 'Teacher'],
    ['Divya S', 'Administration', 'Office Assistant'],
    ['Karthik Raj', 'Transport', 'Transport Coordinator'],
    ['Meena Priya', 'Accounts', 'Fee Executive'],
    ['Suresh Babu', 'Library', 'Librarian'],
  ],
  hospital: [
    ['Arun Kumar', 'Outpatient', 'Patient Coordinator'],
    ['Divya S', 'Nursing', 'Staff Nurse'],
    ['Karthik Raj', 'Pharmacy', 'Pharmacy Assistant'],
    ['Meena Priya', 'Billing', 'Billing Executive'],
    ['Suresh Babu', 'Laboratory', 'Lab Technician'],
  ],
  ngo: [
    ['Arun Kumar', 'Programs', 'Program Coordinator'],
    ['Divya S', 'Donor Relations', 'Donor Executive'],
    ['Karthik Raj', 'Field Operations', 'Field Officer'],
    ['Meena Priya', 'Accounts', 'Accounts Assistant'],
    ['Suresh Babu', 'Volunteers', 'Volunteer Coordinator'],
  ],
  automobile: [
    ['Arun Kumar', 'Service', 'Service Advisor'],
    ['Divya S', 'Customer Care', 'Customer Executive'],
    ['Karthik Raj', 'Workshop', 'Technician'],
    ['Meena Priya', 'Billing', 'Billing Executive'],
    ['Suresh Babu', 'Spares', 'Parts Coordinator'],
  ],
  retail: [
    ['Arun Kumar', 'Sales', 'Sales Executive'],
    ['Divya S', 'Billing', 'Cashier'],
    ['Karthik Raj', 'Inventory', 'Stock Assistant'],
    ['Meena Priya', 'Accounts', 'Accounts Assistant'],
    ['Suresh Babu', 'Warehouse', 'Warehouse Coordinator'],
  ],
};

const attendanceRows = [
  { status: 'Present', checkIn: '08:55', checkOut: '17:35', hours: '8h 40m' },
  { status: 'Present', checkIn: '09:00', checkOut: '17:40', hours: '8h 40m' },
  { status: 'Late', checkIn: '09:42', checkOut: '18:05', hours: '8h 23m' },
  { status: 'On Leave', checkIn: '--', checkOut: '--', hours: '--' },
  { status: 'Absent', checkIn: '--', checkOut: '--', hours: '--' },
];

const leaveStatuses = ['Pending', 'Approved', 'Rejected', 'Pending', 'Approved'];
const correctionStatuses = ['Pending', 'Approved', 'Rejected', 'Pending', 'Approved'];
const holidayRows = [
  ['Independence Day', '2026-08-15', 'Public'],
  ['Company Foundation Day', '2026-09-05', 'Company'],
  ['Gandhi Jayanti', '2026-10-02', 'Public'],
  ['Diwali Holiday', '2026-11-08', 'Public'],
  ['Year End Holiday', '2026-12-31', 'Company'],
];

function slugify(value) {
  return String(value || 'employee').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'employee';
}

async function clearOwnerData(ownerId) {
  await Promise.all([
    Employee.deleteMany({ userId: ownerId }),
    EmployeeLogin.deleteMany({ ownerUserId: ownerId }),
    Attendance.deleteMany({ userId: ownerId }),
    Leave.deleteMany({ userId: ownerId }),
    Payroll.deleteMany({ userId: ownerId }),
    AttendanceCorrection.deleteMany({ ownerUserId: ownerId }),
    Notice.deleteMany({ ownerUserId: ownerId }),
    Holiday.deleteMany({ ownerUserId: ownerId }),
  ]);
}

async function seedOwner(owner, passwordHash) {
  const category = owner.category || 'retail';
  const prefix = CATEGORY_PREFIX[category] || 'EMP';
  const profiles = CATEGORY_PROFILES[category] || CATEGORY_PROFILES.retail;
  const ownerSuffix = String(owner._id).slice(-8);

  await clearOwnerData(owner._id);
  const employees = [];

  for (const [index, profile] of profiles.entries()) {
    const [name, dept, designation] = profile;
    const number = String(index + 1).padStart(3, '0');
    const employeeId = `${prefix}-EMP-${number}`;
    const email = `employee${number}.${ownerSuffix}@gobook.test`;
    const gender = index % 2 === 0 ? 'Male' : 'Female';
    const employee = await Employee.create({
      userId: owner._id,
      category,
      employeeId,
      name,
      dept,
      designation,
      email,
      phone: `98765${String(index + 10001).slice(-5)}`,
      gender,
      status: 'Active',
      loginAccess: true,
      loginPassword: PASSWORD,
      employeeRole: 'employee',
      joinDate: `2026-07-${String(index + 1).padStart(2, '0')}`,
      basicSalary: 22000 + (index * 1500),
    });
    employees.push(employee);

    await EmployeeLogin.create({
      ownerUserId: owner._id,
      employeeObjectId: employee._id,
      employeeId,
      name,
      email,
      category,
      loginSlug: slugify(name),
      passwordHash,
      loginPassword: PASSWORD,
      role: 'employee',
      loginEnabled: true,
      status: 'Active',
    });

    await Attendance.create({
      userId: owner._id,
      employeeId,
      name,
      dept,
      date: TODAY,
      ...attendanceRows[index],
    });

    await Leave.create({
      userId: owner._id,
      leaveId: `LV-${number}`,
      name,
      empId: employeeId,
      type: index % 2 === 0 ? 'Casual Leave' : 'Sick Leave',
      from: `2026-08-${String(index + 3).padStart(2, '0')}`,
      to: `2026-08-${String(index + 3).padStart(2, '0')}`,
      days: 1,
      status: leaveStatuses[index],
      applied: TODAY,
      reason: `Demo leave request ${index + 1}`,
      recordedBy: name,
    });

    await Payroll.create({
      userId: owner._id,
      employeeId,
      name,
      dept,
      month: '2026-07',
      basic: employee.basicSalary,
      allowances: 2500 + (index * 250),
      deductions: 800 + (index * 100),
      net: employee.basicSalary + 1700 + (index * 150),
      status: index < 3 ? 'Paid' : 'Pending',
    });

    await AttendanceCorrection.create({
      ownerUserId: owner._id,
      employeeId,
      name,
      dept,
      date: `2026-07-${String(18 + index).padStart(2, '0')}`,
      checkIn: '09:00',
      checkOut: '17:30',
      reason: `Demo attendance correction ${index + 1}`,
      status: correctionStatuses[index],
      reviewedBy: correctionStatuses[index] === 'Pending' ? '' : owner.name,
      reviewedAt: correctionStatuses[index] === 'Pending' ? undefined : new Date(),
    });
  }

  for (let index = 0; index < 5; index += 1) {
    await Notice.create({
      ownerUserId: owner._id,
      title: ['Team Meeting', 'Attendance Reminder', 'Payroll Update', 'Holiday Notice', 'Safety Reminder'][index],
      message: `Demo notice ${index + 1} for ${owner.businessName || owner.name}`,
      audience: index === 4 ? 'employee' : 'all',
      status: index === 3 ? 'Draft' : 'Published',
      publishDate: `2026-07-${String(20 + index).padStart(2, '0')}`,
    });

    const [name, date, type] = holidayRows[index];
    await Holiday.create({
      ownerUserId: owner._id,
      name,
      date,
      type,
      description: `Demo ${type.toLowerCase()} holiday`,
    });
  }

  return {
    ownerUserId: String(owner._id),
    name: owner.name,
    email: owner.email,
    category,
    employeeIds: employees.map((employee) => employee.employeeId),
  };
}

async function main() {
  await mongoose.connect(env.mongodbUri, { dbName: env.mongodbDbName });
  const owners = await AppUser.find({ status: { $ne: 'Deleted' } }).sort({ createdAt: 1 });
  const passwordHash = await bcrypt.hash(PASSWORD, 10);
  const seeded = [];

  for (const owner of owners) {
    seeded.push(await seedOwner(owner, passwordHash));
  }

  const audit = [];
  for (const owner of owners) {
    audit.push({
      ownerUserId: String(owner._id),
      name: owner.name,
      category: owner.category,
      employees: await Employee.countDocuments({ userId: owner._id }),
      logins: await EmployeeLogin.countDocuments({ ownerUserId: owner._id }),
      attendance: await Attendance.countDocuments({ userId: owner._id }),
      leaves: await Leave.countDocuments({ userId: owner._id }),
      payroll: await Payroll.countDocuments({ userId: owner._id }),
      corrections: await AttendanceCorrection.countDocuments({ ownerUserId: owner._id }),
      notices: await Notice.countDocuments({ ownerUserId: owner._id }),
      holidays: await Holiday.countDocuments({ ownerUserId: owner._id }),
    });
  }

  console.log(JSON.stringify({
    usersSeeded: seeded.length,
    employeePassword: PASSWORD,
    seeded,
    audit,
  }, null, 2));
  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});