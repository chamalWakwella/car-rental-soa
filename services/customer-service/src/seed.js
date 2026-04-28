require('dotenv').config();
const mongoose = require('mongoose');
const Customer = require('./models/Customer');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/car_rental_customers';

const yearsAgo = (n) => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - n);
  return d;
};

const seedCustomers = [
  { name: 'Alice Johnson', address: '12 Maple Street, London', email: 'alice@example.com', phone: '+44 7123 456001', dateOfBirth: yearsAgo(22), licenseNumber: 'AJ22-001' },
  { name: 'Bob Smith', address: '34 Oak Avenue, Manchester', email: 'bob@example.com', phone: '+44 7123 456002', dateOfBirth: yearsAgo(35), licenseNumber: 'BS35-002' },
  { name: 'Carla Mendes', address: '56 Pine Road, Bristol', email: 'carla@example.com', phone: '+44 7123 456003', dateOfBirth: yearsAgo(58), licenseNumber: 'CM58-003' },
  { name: 'David Lee', address: '78 Cedar Close, Leeds', email: 'david@example.com', phone: '+44 7123 456004', dateOfBirth: yearsAgo(42), licenseNumber: 'DL42-004' },
];

async function run() {
  await mongoose.connect(MONGO_URI);
  for (const c of seedCustomers) {
    const exists = await Customer.findOne({ email: c.email });
    if (exists) {
      console.log(`[customer-seed] ${c.name} already exists, skipping`);
      continue;
    }
    await Customer.create(c);
    console.log(`[customer-seed] created customer ${c.name}`);
  }
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('[customer-seed] failed', err);
  process.exit(1);
});
