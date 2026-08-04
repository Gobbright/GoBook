import mongoose from 'mongoose';

import { env } from '../src/config/env.js';
import { Employee } from '../src/models/Employee.js';

await mongoose.connect(env.mongodbUri);

const total = await Employee.countDocuments({ loginAccess: true });
const missing = await Employee.countDocuments({
  loginAccess: true,
  $or: [{ loginPassword: { $exists: false } }, { loginPassword: '' }],
});

console.log(JSON.stringify({ total, missing }));
await mongoose.disconnect();