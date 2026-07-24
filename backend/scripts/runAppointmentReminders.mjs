import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { runAppointmentReminders } from '../src/jobs/appointmentReminders.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function main() {
  if (!MONGODB_URI) {
    throw new Error('MONGODB_URI not found in .env file');
  }
  await mongoose.connect(MONGODB_URI);
  console.log('Connected to MongoDB');

  const onlyUserId = process.argv[2] || null;
  const result = await runAppointmentReminders({ force: true, onlyUserId });
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((err) => {
    console.error('Failed to run appointment reminders:', err);
    process.exitCode = 1;
  })
  .finally(() => mongoose.disconnect());
