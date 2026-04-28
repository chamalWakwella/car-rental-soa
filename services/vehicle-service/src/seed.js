require('dotenv').config();
const mongoose = require('mongoose');
const Vehicle = require('./models/Vehicle');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/car_rental_vehicles';

const seedVehicles = [
  { type: 'car', make: 'Toyota', model: 'Corolla', registrationNumber: 'CAR-1001', year: 2022, dailyRate: 45, seats: 5 },
  { type: 'car', make: 'Honda', model: 'Civic', registrationNumber: 'CAR-1002', year: 2021, dailyRate: 50, seats: 5 },
  { type: 'car', make: 'Ford', model: 'Focus', registrationNumber: 'CAR-1003', year: 2020, dailyRate: 40, seats: 5 },
  { type: 'car', make: 'BMW', model: '3 Series', registrationNumber: 'CAR-1004', year: 2023, dailyRate: 95, seats: 5 },
  { type: 'car', make: 'Tesla', model: 'Model 3', registrationNumber: 'CAR-1005', year: 2024, dailyRate: 110, seats: 5 },
  { type: 'van', make: 'Ford', model: 'Transit', registrationNumber: 'VAN-2001', year: 2021, dailyRate: 80, seats: 8 },
  { type: 'van', make: 'Mercedes', model: 'Sprinter', registrationNumber: 'VAN-2002', year: 2022, dailyRate: 110, seats: 12 },
  { type: 'van', make: 'Volkswagen', model: 'Crafter', registrationNumber: 'VAN-2003', year: 2020, dailyRate: 90, seats: 9 },
];

async function run() {
  await mongoose.connect(MONGO_URI);
  for (const v of seedVehicles) {
    const exists = await Vehicle.findOne({ registrationNumber: v.registrationNumber });
    if (exists) {
      console.log(`[vehicle-seed] ${v.registrationNumber} already exists, skipping`);
      continue;
    }
    await Vehicle.create(v);
    console.log(`[vehicle-seed] created ${v.type} ${v.make} ${v.model} (${v.registrationNumber})`);
  }
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('[vehicle-seed] failed', err);
  process.exit(1);
});
