require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('./models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/car_rental_auth';

async function run() {
  await mongoose.connect(MONGO_URI);
  const seedUsers = [
    { username: 'admin', password: 'admin123', role: 'admin', fullName: 'System Admin' },
    { username: 'staff', password: 'staff123', role: 'staff', fullName: 'Front Desk Staff' },
  ];
  for (const u of seedUsers) {
    const existing = await User.findOne({ username: u.username });
    if (existing) {
      console.log(`[auth-seed] user '${u.username}' already exists, skipping`);
      continue;
    }
    const passwordHash = await bcrypt.hash(u.password, 10);
    await User.create({
      username: u.username,
      passwordHash,
      role: u.role,
      fullName: u.fullName,
    });
    console.log(`[auth-seed] created user '${u.username}' / '${u.password}' (${u.role})`);
  }
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('[auth-seed] failed', err);
  process.exit(1);
});
