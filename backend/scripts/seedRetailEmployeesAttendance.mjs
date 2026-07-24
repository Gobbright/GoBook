import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

import { env } from '../src/config/env.js';
import { AppUser } from '../src/models/AppUser.js';
import { Attendance } from '../src/models/Attendance.js';
import { Employee } from '../src/models/Employee.js';
import { EmployeeLogin } from '../src/models/EmployeeLogin.js';

const SALT_ROUNDS = 10;
const targetOwnerEmail = 'tnanbutn@gmail.com';
const employeePassword = 'Employee@123';
const seedToday = new Date('2026-07-24T00:00:00.000Z');

const employees = [
  ['RET-EMP-001', 'Arun Kumar', 'Sales', 'Sales Executive', 'Male', '9876501001', 22000],
  ['RET-EMP-002', 'Divya S', 'Sales', 'Cashier', 'Female', '9876501002', 21000],
  ['RET-EMP-003', 'Karthik Raj', 'Inventory', 'Stock Assistant', 'Male', '9876501003', 20000],
  ['RET-EMP-004', 'Meena Priya', 'Billing', 'Billing Executive', 'Female', '9876501004', 23000],
  ['RET-EMP-005', 'Suresh Babu', 'Warehouse', 'Warehouse Coordinator', 'Male', '9876501005', 24000],
  ['RET-EMP-006', 'Nandhini R', 'Customer Support', 'Support Associate', 'Female', '9876501006', 21500],
  ['RET-EMP-007', 'Vignesh P', 'Sales', 'Floor Supervisor', 'Male', '9876501007', 26000],
  ['RET-EMP-008', 'Pooja M', 'Accounts', 'Accounts Assistant', 'Female', '9876501008', 25000],
  ['RET-EMP-009', 'Rahul K', 'Inventory', 'Purchase Assistant', 'Male', '9876501009', 22500],
  ['RET-EMP-010', 'Sneha Lakshmi', 'HR', 'HR Assistant', 'Female', '9876501010', 23500],
];

function slugify(value) {
  return String(value || 'employee').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'employee';
}

function isoDateDaysAgo(daysAgo) {
  const date = new Date(seedToday);
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().slice(0, 10);
}

function attendanceFor(employeeIndex, daysAgo) {
  const statusCycle = (employeeIndex + daysAgo) % 10;
  if (statusCycle === 0) return { checkIn: '--', checkOut: '--', hours: '--', status: 'Absent' };
  if (statusCycle === 5) return { checkIn: '--', checkOut: '--', hours: '--', status: 'On Leave' };
  const late = statusCycle === 3 || statusCycle === 7;
  const inHour = late ? 9 : 8;
  const inMinute = late ? 45 + (employeeIndex % 10) : 50 + (employeeIndex % 10);
  const checkIn = `${String(inHour).padStart(2, '0')}:${String(inMinute).padStart(2, '0')}`;
  const checkOutHour = late ? 18 : 17;
  const checkOutMinute = 20 + (employeeIndex % 6) * 5;
  const checkOut = `${String(checkOutHour).padStart(2, '0')}:${String(checkOutMinute).padStart(2, '0')}`;
  const minutes = (checkOutHour * 60 + checkOutMinute) - (inHour * 60 + inMinute);
  return { checkIn, checkOut, hours: `${Math.floor(minutes / 60)}h ${minutes % 60}m`, status: late ? 'Late' : 'Present' };
}

async function removeOldDemoEmployeeData() {
  const demoOwner = await AppUser.findOne({ email: 'retail.admin@gobook.test' }).lean();
  if (!demoOwner) return { employees: 0, logins: 0, attendance: 0, users: 0 };
  const employeesDeleted = await Employee.deleteMany({ userId: demoOwner._id });
  const loginsDeleted = await EmployeeLogin.deleteMany({ ownerUserId: demoOwner._id });
  const attendanceDeleted = await Attendance.deleteMany({ userId: demoOwner._id });
  const userDeleted = await AppUser.deleteOne({ _id: demoOwner._id, email: 'retail.admin@gobook.test' });
  return {
    employees: employeesDeleted.deletedCount,
    logins: loginsDeleted.deletedCount,
    attendance: attendanceDeleted.deletedCount,
    users: userDeleted.deletedCount,
  };
}

async function main() {
  await mongoose.connect(env.mongodbUri, { dbName: env.mongodbDbName });
  const owner = await AppUser.findOne({ email: targetOwnerEmail });
  if (!owner) throw new Error(`Target owner not found: ${targetOwnerEmail}`);

  const category = owner.category || 'retail';
  const employeeIds = employees.map(([employeeId]) => employeeId);
  const cleanup = await removeOldDemoEmployeeData();

  await Employee.deleteMany({ userId: owner._id, employeeId: { $nin: employeeIds } });
  await EmployeeLogin.deleteMany({ ownerUserId: owner._id, employeeId: { $nin: employeeIds } });
  await Attendance.deleteMany({ userId: owner._id, employeeId: { $nin: employeeIds } });

  const employeePasswordHash = await bcrypt.hash(employeePassword, SALT_ROUNDS);
  let employeesUpserted = 0;
  let loginsUpserted = 0;
  let attendanceUpserted = 0;

  for (const [index, row] of employees.entries()) {
    const [employeeId, name, dept, designation, gender, phone, basicSalary] = row;
    const email = `tnanbu-${employeeId.toLowerCase()}@gobook.test`;
    const employee = await Employee.findOneAndUpdate(
      { userId: owner._id, employeeId },
      { $set: { userId: owner._id, category, employeeId, name, dept, designation, email, phone, gender, status: 'Active', loginAccess: true, employeeRole: 'employee', joinDate: '2026-07-01', basicSalary } },
      { upsert: true, new: true, runValidators: true },
    );
    employeesUpserted += 1;

    await EmployeeLogin.findOneAndUpdate(
      { ownerUserId: owner._id, employeeId },
      { $set: { ownerUserId: owner._id, employeeObjectId: employee._id, employeeId, name, email, category, loginSlug: slugify(name), passwordHash: employeePasswordHash, role: 'employee', loginEnabled: true, status: 'Active' } },
      { upsert: true, new: true, runValidators: true },
    );
    loginsUpserted += 1;

    for (let daysAgo = 9; daysAgo >= 0; daysAgo -= 1) {
      const date = isoDateDaysAgo(daysAgo);
      await Attendance.findOneAndUpdate(
        { userId: owner._id, employeeId, date },
        { $set: { userId: owner._id, employeeId, name, dept, date, ...attendanceFor(index, daysAgo) } },
        { upsert: true, new: true, runValidators: true },
      );
      attendanceUpserted += 1;
    }
  }

  const attendanceSummary = await Attendance.aggregate([
    { $match: { userId: owner._id } },
    { $group: { _id: '$status', count: { $sum: 1 } } },
    { $sort: { _id: 1 } },
  ]);

  console.log(JSON.stringify({
    owner: { id: String(owner._id), name: owner.name, email: owner.email, category },
    cleanup,
    employeePassword,
    employeesUpserted,
    loginsUpserted,
    attendanceRowsUpserted: attendanceUpserted,
    finalCounts: {
      employees: await Employee.countDocuments({ userId: owner._id }),
      logins: await EmployeeLogin.countDocuments({ ownerUserId: owner._id }),
      attendance: await Attendance.countDocuments({ userId: owner._id }),
    },
    attendanceSummary,
    sampleEmployeeLogins: employees.map(([employeeId, name]) => ({ employeeId, name, email: `tnanbu-${employeeId.toLowerCase()}@gobook.test`, password: employeePassword })),
  }, null, 2));

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await mongoose.disconnect();
  process.exit(1);
});
