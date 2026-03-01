// @ts-nocheck
const dotenv = require('dotenv');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const connectDB = require('../database/db');
const User = require('../models/User');

dotenv.config();

async function seedAdmin() {
  const name = process.env.ADMIN_NAME || 'Admin';
  const email = (process.env.ADMIN_EMAIL || 'admin@bitefinder.test').toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD || 'Admin@123';

  if (!process.env.MONGO_URI) {
    // eslint-disable-next-line no-console
    console.error('Missing MONGO_URI in environment. Please set it in .env');
    process.exit(1);
  }

  await connectDB();

  const existing = await User.findOne({ email });

  if (existing) {
    if (existing.role !== 'admin') {
      existing.role = 'admin';
      await existing.save();
      // eslint-disable-next-line no-console
      console.log(`Promoted existing user to admin: ${email}`);
    } else {
      // eslint-disable-next-line no-console
      console.log(`Admin already exists: ${email}`);
    }
  } else {
    const hashedPassword = await bcrypt.hash(password, 10);
    await User.create({
      name,
      email,
      password: hashedPassword,
      role: 'admin',
    });
    // eslint-disable-next-line no-console
    console.log(`Created admin user: ${email}`);
  }

  // eslint-disable-next-line no-console
  console.log('Admin login credentials (local/dev):');
  // eslint-disable-next-line no-console
  console.log(`  email: ${email}`);
  // eslint-disable-next-line no-console
  console.log(`  password: ${password}`);

  await mongoose.disconnect();
}

seedAdmin().catch(async (err) => {
  // eslint-disable-next-line no-console
  console.error('Failed to seed admin:', err);
  try {
    await mongoose.disconnect();
  } catch (_) {
    // ignore
  }
  process.exit(1);
});


