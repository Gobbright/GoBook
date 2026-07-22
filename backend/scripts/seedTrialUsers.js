import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { AppUser } from '../src/models/AppUser.js';
import bcryptjs from 'bcryptjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const MONGODB_URI = process.env.MONGODB_URI;

async function seedTrialUsers() {
  try {
    if (!MONGODB_URI) {
      throw new Error('MONGODB_URI not found in .env file');
    }
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to MongoDB');

    const trialUsers = [
      {
        name: 'Trial User 1',
        email: 'trial1@example.com',
        password: await bcryptjs.hash('trial123', 10),
        emailVerified: true,
        authProvider: 'email',
        businessName: 'Trial Business 1',
        category: 'retail',
        subscriptionPlan: '', // No subscription = trial/free user
        subscriptionAmount: 0,
        status: 'Active',
        role: 'Sales Executive',
        phone: '9876543210',
        onboardingCompleted: true,
      },
      {
        name: 'Trial User 2',
        email: 'trial2@example.com',
        password: await bcryptjs.hash('trial123', 10),
        emailVerified: true,
        authProvider: 'email',
        businessName: 'Trial Business 2',
        category: 'manufacturing',
        subscriptionPlan: '', // No subscription = trial/free user
        subscriptionAmount: 0,
        status: 'Active',
        role: 'Sales Executive',
        phone: '9876543211',
        onboardingCompleted: true,
      },
    ];

    const created = await AppUser.insertMany(trialUsers);
    console.log('✓ Created 2 trial/free users:');
    created.forEach((user, i) => {
      console.log(`  ${i + 1}. ${user.name} (${user.email}) - ${user.businessName}`);
    });

    console.log('\n✅ Trial users seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding trial users:', error.message);
    process.exit(1);
  }
}

seedTrialUsers();
