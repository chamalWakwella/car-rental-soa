require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { createProxyMiddleware } = require('http-proxy-middleware');
const { authMiddleware, logger, errorHandler } = require('@car-rental/shared');

const PORT = process.env.PORT || 4000;
const AUTH_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4001';
const VEHICLE_URL = process.env.VEHICLE_SERVICE_URL || 'http://localhost:4002';
const CUSTOMER_URL = process.env.CUSTOMER_SERVICE_URL || 'http://localhost:4003';

const app = express();
app.use(cors());
app.use(logger('gateway'));

app.get('/health', (_req, res) =>
  res.json({
    status: 'ok',
    service: 'gateway',
    routes: {
      auth: AUTH_URL,
      vehicle: VEHICLE_URL,
      customer: CUSTOMER_URL,
    },
  })
);

const proxy = (target, servicePrefix) =>
  createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: (path) => servicePrefix + path,
    on: {
      error: (err, _req, res) => {
        console.error('[gateway] proxy error', err.message);
        if (res && !res.headersSent) {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'upstream service unavailable' }));
        }
      },
    },
  });

app.use('/api/auth', proxy(AUTH_URL, '/auth'));
app.use('/api/vehicles', authMiddleware(), proxy(VEHICLE_URL, '/vehicles'));
app.use('/api/customers', authMiddleware(), proxy(CUSTOMER_URL, '/customers'));
app.use('/api/rentals', authMiddleware(), proxy(CUSTOMER_URL, '/rentals'));

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`[gateway] listening on :${PORT}`);
  console.log(`[gateway] -> auth ${AUTH_URL}`);
  console.log(`[gateway] -> vehicle ${VEHICLE_URL}`);
  console.log(`[gateway] -> customer ${CUSTOMER_URL}`);
});
