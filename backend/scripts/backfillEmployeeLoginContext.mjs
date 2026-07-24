import 'dotenv/config';
import mongoose from 'mongoose';

import { AppUser } from '../src/models/AppUser.js';
import { Employee } from '../src/models/Employee.js';
import { EmployeeLogin } from '../src/models/EmployeeLogin.js';

function slugify(value) {
  return String(value || 'employee').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'employee';
}

await mongoose.connect(process.env.MONGODB_URI);

const owners = new Map();
let employeesUpdated = 0;
let loginsUpdated = 0;

async function getCategory(ownerUserId) {
  const key = String(ownerUserId);
  if (!owners.has(key)) {
    const owner = await AppUser.findById(ownerUserId).select('category').lean();
    owners.set(key, owner?.category || 'retail');
  }
  return owners.get(key);
}

for await (const employee of Employee.find()) {
  const category = await getCategory(employee.userId);
  await Employee.updateOne({ _id: employee._id }, { $set: { category } });
  employeesUpdated += 1;
  const result = await EmployeeLogin.updateOne(
    { ownerUserId: employee.userId, employeeId: employee.employeeId },
    {
      $set: {
        category,
        loginSlug: slugify(employee.name),
        employeeObjectId: employee._id,
        name: employee.name,
        email: String(employee.email || '').toLowerCase(),
      },
    },
  );
  loginsUpdated += result.matchedCount;
}

for await (const login of EmployeeLogin.find()) {
  const category = login.category || await getCategory(login.ownerUserId);
  await EmployeeLogin.updateOne(
    { _id: login._id },
    { $set: { category, loginSlug: login.loginSlug || slugify(login.name) } },
  );
}

const before = await EmployeeLogin.collection.indexes().catch(() => []);
const dropped = [];
for (const index of before) {
  if (index.name === 'email_1') {
    await EmployeeLogin.collection.dropIndex(index.name);
    dropped.push(index.name);
  }
}
await EmployeeLogin.syncIndexes();
const after = await EmployeeLogin.collection.indexes();

console.log(JSON.stringify({ employeesUpdated, loginsUpdated, dropped, indexes: after.map((index) => index.name) }));
await mongoose.disconnect();
