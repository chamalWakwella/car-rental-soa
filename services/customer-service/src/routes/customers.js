const express = require('express');
const {
  authMiddleware,
  asyncHandler,
  HttpError,
} = require('@car-rental/shared');
const Customer = require('../models/Customer');
const Rental = require('../models/Rental');

const router = express.Router();

router.get(
  '/',
  authMiddleware(),
  asyncHandler(async (_req, res) => {
    const customers = await Customer.find().sort({ createdAt: -1 });
    res.json(customers);
  })
);

router.get(
  '/stats',
  authMiddleware(),
  asyncHandler(async (_req, res) => {
    const total = await Customer.countDocuments();
    res.json({ total });
  })
);

router.get(
  '/:id',
  authMiddleware(),
  asyncHandler(async (req, res) => {
    const customer = await Customer.findById(req.params.id);
    if (!customer) throw new HttpError(404, 'customer not found');
    const rentals = await Rental.find({ customerId: customer._id }).sort({ createdAt: -1 });
    res.json({ customer, rentals });
  })
);

router.post(
  '/',
  authMiddleware(['admin', 'staff']),
  asyncHandler(async (req, res) => {
    const { name, address, email, phone, dateOfBirth, licenseNumber } = req.body || {};
    if (!name || !address || !dateOfBirth) {
      throw new HttpError(400, 'name, address and dateOfBirth are required');
    }
    const customer = await Customer.create({
      name,
      address,
      email,
      phone,
      dateOfBirth,
      licenseNumber,
    });
    res.status(201).json(customer);
  })
);

router.put(
  '/:id',
  authMiddleware(['admin', 'staff']),
  asyncHandler(async (req, res) => {
    const allowed = ['name', 'address', 'email', 'phone', 'dateOfBirth', 'licenseNumber'];
    const update = {};
    for (const k of allowed) if (req.body[k] !== undefined) update[k] = req.body[k];
    const customer = await Customer.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!customer) throw new HttpError(404, 'customer not found');
    res.json(customer);
  })
);

router.delete(
  '/:id',
  authMiddleware(['admin']),
  asyncHandler(async (req, res) => {
    const activeRental = await Rental.findOne({
      customerId: req.params.id,
      status: 'active',
    });
    if (activeRental) {
      throw new HttpError(409, 'cannot delete a customer with an active rental');
    }
    const result = await Customer.findByIdAndDelete(req.params.id);
    if (!result) throw new HttpError(404, 'customer not found');
    res.json({ ok: true, id: req.params.id });
  })
);

module.exports = router;
