const express = require('express');
const bcrypt = require('bcryptjs');
const {
  signToken,
  authMiddleware,
  asyncHandler,
  HttpError,
} = require('@car-rental/shared');
const User = require('./models/User');

const router = express.Router();

router.post(
  '/login',
  asyncHandler(async (req, res) => {
    const { username, password } = req.body || {};
    if (!username || !password) {
      throw new HttpError(400, 'username and password are required');
    }
    const user = await User.findOne({ username: username.toLowerCase() });
    if (!user) throw new HttpError(401, 'Invalid credentials');
    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) throw new HttpError(401, 'Invalid credentials');
    const token = signToken({
      sub: user._id.toString(),
      username: user.username,
      role: user.role,
      fullName: user.fullName,
    });
    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        role: user.role,
        fullName: user.fullName,
      },
    });
  })
);

router.post(
  '/register',
  authMiddleware(['admin']),
  asyncHandler(async (req, res) => {
    const { username, password, role = 'staff', fullName = '' } = req.body || {};
    if (!username || !password) {
      throw new HttpError(400, 'username and password are required');
    }
    const exists = await User.findOne({ username: username.toLowerCase() });
    if (exists) throw new HttpError(409, 'username already exists');
    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      username: username.toLowerCase(),
      passwordHash,
      role,
      fullName,
    });
    res.status(201).json({
      id: user._id,
      username: user.username,
      role: user.role,
      fullName: user.fullName,
    });
  })
);

router.get(
  '/me',
  authMiddleware(),
  asyncHandler(async (req, res) => {
    const user = await User.findById(req.user.sub).select('-passwordHash');
    if (!user) throw new HttpError(404, 'user not found');
    res.json(user);
  })
);

router.get(
  '/users',
  authMiddleware(['admin']),
  asyncHandler(async (_req, res) => {
    const users = await User.find().select('-passwordHash').sort({ createdAt: -1 });
    res.json(users);
  })
);

module.exports = router;
