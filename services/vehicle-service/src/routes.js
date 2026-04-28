const express = require('express');
const {
  authMiddleware,
  asyncHandler,
  HttpError,
} = require('@car-rental/shared');
const Vehicle = require('./models/Vehicle');

const router = express.Router();

router.get(
  '/',
  authMiddleware(),
  asyncHandler(async (req, res) => {
    const filter = {};
    if (req.query.type) filter.type = req.query.type;
    if (req.query.available === 'true') filter.isOnRent = false;
    if (req.query.available === 'false') filter.isOnRent = true;
    const vehicles = await Vehicle.find(filter).sort({ createdAt: -1 });
    res.json(vehicles);
  })
);

router.get(
  '/stats',
  authMiddleware(),
  asyncHandler(async (_req, res) => {
    const [total, onRent, cars, vans] = await Promise.all([
      Vehicle.countDocuments(),
      Vehicle.countDocuments({ isOnRent: true }),
      Vehicle.countDocuments({ type: 'car' }),
      Vehicle.countDocuments({ type: 'van' }),
    ]);
    res.json({
      total,
      onRent,
      available: total - onRent,
      cars,
      vans,
    });
  })
);

router.get(
  '/:id',
  authMiddleware(),
  asyncHandler(async (req, res) => {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) throw new HttpError(404, 'vehicle not found');
    res.json(vehicle);
  })
);

router.post(
  '/',
  authMiddleware(['admin', 'staff']),
  asyncHandler(async (req, res) => {
    const { type, make, model, registrationNumber, year, dailyRate, seats, notes } =
      req.body || {};
    if (!type || !make || !model || !registrationNumber || dailyRate == null) {
      throw new HttpError(400, 'type, make, model, registrationNumber, dailyRate are required');
    }
    if (!['car', 'van'].includes(type)) {
      throw new HttpError(400, "type must be 'car' or 'van'");
    }
    const exists = await Vehicle.findOne({
      registrationNumber: registrationNumber.toUpperCase(),
    });
    if (exists) throw new HttpError(409, 'registrationNumber already exists');
    const vehicle = await Vehicle.create({
      type,
      make,
      model,
      registrationNumber,
      year,
      dailyRate,
      seats,
      notes,
    });
    res.status(201).json(vehicle);
  })
);

router.put(
  '/:id',
  authMiddleware(['admin', 'staff']),
  asyncHandler(async (req, res) => {
    const allowed = ['make', 'model', 'year', 'dailyRate', 'seats', 'notes'];
    const update = {};
    for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];
    const vehicle = await Vehicle.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!vehicle) throw new HttpError(404, 'vehicle not found');
    res.json(vehicle);
  })
);

router.delete(
  '/:id',
  authMiddleware(['admin']),
  asyncHandler(async (req, res) => {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) throw new HttpError(404, 'vehicle not found');
    if (vehicle.isOnRent) {
      throw new HttpError(409, 'cannot delete a vehicle that is currently on rent');
    }
    await vehicle.deleteOne();
    res.json({ ok: true, id: req.params.id });
  })
);

router.post(
  '/:id/rent',
  authMiddleware(['admin', 'staff']),
  asyncHandler(async (req, res) => {
    const { rentalId } = req.body || {};
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) throw new HttpError(404, 'vehicle not found');
    if (vehicle.isOnRent) throw new HttpError(409, 'vehicle is already on rent');
    vehicle.isOnRent = true;
    vehicle.currentRentalId = rentalId || null;
    await vehicle.save();
    res.json(vehicle);
  })
);

router.post(
  '/:id/return',
  authMiddleware(['admin', 'staff']),
  asyncHandler(async (req, res) => {
    const vehicle = await Vehicle.findById(req.params.id);
    if (!vehicle) throw new HttpError(404, 'vehicle not found');
    vehicle.isOnRent = false;
    vehicle.currentRentalId = null;
    await vehicle.save();
    res.json(vehicle);
  })
);

module.exports = router;
