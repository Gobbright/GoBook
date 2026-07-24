import mongoose from 'mongoose';

import { env } from '../src/config/env.js';
import { Employee } from '../src/models/Employee.js';
import { EmployeeLogin } from '../src/models/EmployeeLogin.js';

const DEFAULT_PASSWORD = 'Employee@123';

await mongoose.connect(env.mongodbUri);

const employeeResult = await Employee.updateMany(
  { loginAccess: true, $or: [{ loginPassword: { $exists: false } }, { loginPassword: '' }] },
  { $set: { loginPassword: DEFAULT_PASSWORD } },
);

const loginResult = await EmployeeLogin.updateMany(
  { loginEnabled: true, $or: [{ loginPassword: { $exists: false } }, { loginPassword: '' }] },
  { $set: { loginPassword: DEFAULT_PASSWORD } },
);

console.log(JSON.stringify({
  defaultPassword: DEFAULT_PASSWORD,
  employeesUpdated: employeeResult.modifiedCount,
  loginsUpdated: loginResult.modifiedCount,
}));

await mongoose.disconnect();