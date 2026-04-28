const express = require('express');
const axios = require('axios');
const {
  authMiddleware,
  asyncHandler,
  HttpError,
} = require('@car-rental/shared');
const Customer = require('../models/Customer');
const Rental = require('../models/Rental');
const {
  calculateAge,
  calculateRentalCost,
  calculatePenalty,
  diffDays,
} = require('../pricing');

const router = express.Router();

const VEHICLE_SERVICE_URL =
  process.env.VEHICLE_SERVICE_URL || 'http://localhost:4002';

function vehicleClient(token) {
  return axios.create({
    baseURL: VEHICLE_SERVICE_URL,
    headers: { Authorization: `Bearer ${token}` },
    timeout: 5000,
  });
}

function getRawToken(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : null;
}

router.get(
  '/',
  authMiddleware(),
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.customerId) filter.customerId = req.query.customerId;
    const rentals = await Rental.find(filter).sort({ createdAt: -1 });
    res.json(rentals);
  })
);

router.get(
  '/stats',
  authMiddleware(),
  asyncHandler(async (_req, res) => {
    const [active, completed, total] = await Promise.all([
      Rental.countDocuments({ status: 'active' }),
      Rental.countDocuments({ status: 'completed' }),
      Rental.countDocuments(),
    ]);
    const revenueAgg = await Rental.aggregate([
      { $match: { status: 'completed' } },
      { $group: { _id: null, total: { $sum: '$finalAmount' } } },
    ]);
    res.json({
      active,
      completed,
      total,
      totalRevenue: revenueAgg[0]?.total || 0,
    });
  })
);

router.get(
  '/:id',
  authMiddleware(),
  asyncHandler(async (req, res) => {
    const rental = await Rental.findById(req.params.id);
    if (!rental) throw new HttpError(404, 'rental not found');
    res.json(rental);
  })
);

router.post(
  '/',
  authMiddleware(['admin', 'staff']),
  asyncHandler(async (req, res) => {
    const { customerId, vehicleId, expectedReturnDate, startDate } = req.body || {};
    if (!customerId || !vehicleId || !expectedReturnDate) {
      throw new HttpError(400, 'customerId, vehicleId, expectedReturnDate are required');
    }
    const customer = await Customer.findById(customerId);
    if (!customer) throw new HttpError(404, 'customer not found');

    const start = startDate ? new Date(startDate) : new Date();
    const expected = new Date(expectedReturnDate);
    if (expected <= start) {
      throw new HttpError(400, 'expectedReturnDate must be after startDate');
    }

    const token = getRawToken(req);
    const vc = vehicleClient(token);

    let vehicle;
    try {
      const r = await vc.get(`/vehicles/${vehicleId}`);
      vehicle = r.data;
    } catch (err) {
      if (err.response?.status === 404) throw new HttpError(404, 'vehicle not found');
      throw new HttpError(502, 'vehicle service unreachable');
    }
    if (vehicle.isOnRent) throw new HttpError(409, 'vehicle is already on rent');

    const days = diffDays(start, expected);
    const age = calculateAge(customer.dateOfBirth, start);
    const { baseCost, ageAdjustment, ageAdjustmentReason, totalCost } =
      calculateRentalCost({ dailyRate: vehicle.dailyRate, days, age });

    const rental = await Rental.create({
      customerId: customer._id,
      customerSnapshot: { name: customer.name, age },
      vehicleId: vehicle.id,
      vehicleSnapshot: {
        type: vehicle.type,
        make: vehicle.make,
        model: vehicle.model,
        registrationNumber: vehicle.registrationNumber,
        dailyRate: vehicle.dailyRate,
      },
      startDate: start,
      expectedReturnDate: expected,
      daysRented: days,
      baseCost,
      ageAdjustment,
      ageAdjustmentReason,
      totalCost,
      status: 'active',
    });

    try {
      await vc.post(`/vehicles/${vehicle.id}/rent`, { rentalId: rental._id.toString() });
    } catch (err) {
      await rental.deleteOne();
      throw new HttpError(502, 'failed to mark vehicle as on rent');
    }

    res.status(201).json(rental);
  })
);

router.post(
  '/:id/return',
  authMiddleware(['admin', 'staff']),
  asyncHandler(async (req, res) => {
    const rental = await Rental.findById(req.params.id);
    if (!rental) throw new HttpError(404, 'rental not found');
    if (rental.status === 'completed') {
      throw new HttpError(409, 'rental is already completed');
    }
    const actualReturnDate = req.body?.actualReturnDate
      ? new Date(req.body.actualReturnDate)
      : new Date();

    const penalty = calculatePenalty({
      dailyRate: rental.vehicleSnapshot.dailyRate,
      expectedReturnDate: rental.expectedReturnDate,
      actualReturnDate,
    });
    rental.actualReturnDate = actualReturnDate;
    rental.penaltyCharges = penalty;
    rental.finalAmount = +(rental.totalCost + penalty).toFixed(2);
    rental.status = 'completed';
    await rental.save();

    const token = getRawToken(req);
    try {
      await vehicleClient(token).post(`/vehicles/${rental.vehicleId}/return`);
    } catch (err) {
      console.error('[customer] failed to mark vehicle returned', err.message);
    }

    res.json(rental);
  })
);

router.post(
  '/quote',
  authMiddleware(),
  asyncHandler(async (req, res) => {
    const { customerId, vehicleId, expectedReturnDate, startDate } = req.body || {};
    if (!customerId || !vehicleId || !expectedReturnDate) {
      throw new HttpError(400, 'customerId, vehicleId, expectedReturnDate are required');
    }
    const customer = await Customer.findById(customerId);
    if (!customer) throw new HttpError(404, 'customer not found');
    const start = startDate ? new Date(startDate) : new Date();
    const expected = new Date(expectedReturnDate);
    if (expected <= start) throw new HttpError(400, 'expectedReturnDate must be after startDate');

    const token = getRawToken(req);
    let vehicle;
    try {
      const r = await vehicleClient(token).get(`/vehicles/${vehicleId}`);
      vehicle = r.data;
    } catch (err) {
      if (err.response?.status === 404) throw new HttpError(404, 'vehicle not found');
      throw new HttpError(502, 'vehicle service unreachable');
    }
    const days = diffDays(start, expected);
    const age = calculateAge(customer.dateOfBirth, start);
    const pricing = calculateRentalCost({ dailyRate: vehicle.dailyRate, days, age });
    res.json({
      customer: { id: customer._id, name: customer.name, age },
      vehicle: {
        id: vehicle.id,
        registrationNumber: vehicle.registrationNumber,
        dailyRate: vehicle.dailyRate,
      },
      days,
      ...pricing,
    });
  })
);

module.exports = router;
