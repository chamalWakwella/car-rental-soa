require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { errorHandler, logger } = require('@car-rental/shared');
const vehicleRoutes = require('./routes');

const app = express();
app.use(cors());
app.use(express.json());
app.use(logger('vehicle'));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'vehicle' }));
app.use('/vehicles', vehicleRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 4002;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/car_rental_vehicles';

async function start() {
  await mongoose.connect(MONGO_URI);
  console.log('[vehicle] mongo connected');
  app.listen(PORT, () => console.log(`[vehicle] listening on :${PORT}`));
}

start().catch((err) => {
  console.error('[vehicle] failed to start', err);
  process.exit(1);
});
