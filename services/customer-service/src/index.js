require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { errorHandler, logger } = require('@car-rental/shared');
const customerRoutes = require('./routes/customers');
const rentalRoutes = require('./routes/rentals');

const app = express();
app.use(cors());
app.use(express.json());
app.use(logger('customer'));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'customer' }));
app.use('/customers', customerRoutes);
app.use('/rentals', rentalRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 4003;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/car_rental_customers';

async function start() {
  await mongoose.connect(MONGO_URI);
  console.log('[customer] mongo connected');
  app.listen(PORT, () => console.log(`[customer] listening on :${PORT}`));
}

start().catch((err) => {
  console.error('[customer] failed to start', err);
  process.exit(1);
});
