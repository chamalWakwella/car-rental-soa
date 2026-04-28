require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const { errorHandler, logger } = require('@car-rental/shared');
const authRoutes = require('./routes');

const app = express();
app.use(cors());
app.use(express.json());
app.use(logger('auth'));

app.get('/health', (_req, res) => res.json({ status: 'ok', service: 'auth' }));
app.use('/auth', authRoutes);
app.use(errorHandler);

const PORT = process.env.PORT || 4001;
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/car_rental_auth';

async function start() {
  await mongoose.connect(MONGO_URI);
  console.log('[auth] mongo connected');
  app.listen(PORT, () => console.log(`[auth] listening on :${PORT}`));
}

start().catch((err) => {
  console.error('[auth] failed to start', err);
  process.exit(1);
});
