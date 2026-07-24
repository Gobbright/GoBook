import 'dotenv/config';
import mongoose from 'mongoose';

import { AppUser } from '../src/models/AppUser.js';
import { Attendance } from '../src/models/Attendance.js';
import { Employee } from '../src/models/Employee.js';
import { EmployeeLogin } from '../src/models/EmployeeLogin.js';

await mongoose.connect(process.env.MONGODB_URI);
const owners = await Employee.aggregate([{ $group: { _id: '$userId', employees: { $sum: 1 } } }]);
const out = [];
for (const owner of owners) {
  const user = await AppUser.findById(owner._id).select('name email category').lean();
  out.push({
    ownerUserId: String(owner._id),
    name: user?.name || '',
    email: user?.email || '',
    category: user?.category || '',
    employees: owner.employees,
    logins: await EmployeeLogin.countDocuments({ ownerUserId: owner._id }),
    attendance: await Attendance.countDocuments({ userId: owner._id }),
  });
}
console.log(JSON.stringify(out, null, 2));
await mongoose.disconnect();
