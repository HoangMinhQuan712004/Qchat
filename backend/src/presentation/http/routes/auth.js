const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../../infrastructure/models/user');
const { validate, schemas } = require('../../../infrastructure/middleware/validate');
const { authLimiter } = require('../../../infrastructure/middleware/rateLimiter');

const router = express.Router();
const secret = process.env.JWT_SECRET || 'change_this_secret';

router.post('/register', authLimiter, validate(schemas.register), async (req, res, next) => {
  try {
    const { username, email, password, displayName } = req.body;

    const existing = await User.findOne({ $or: [{ username }, { email }] }).lean();
    if (existing) return res.status(409).json({ message: 'Tên đăng nhập hoặc email đã tồn tại' });

    const hash = await bcrypt.hash(password, 10);
    const u = await User.create({ username, email, passwordHash: hash, displayName });
    const token = jwt.sign({ id: u._id, username: u.username }, secret, { expiresIn: '7d' });

    res.status(201).json({ token, user: { id: u._id, username: u.username, displayName: u.displayName } });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ message: 'Tên đăng nhập hoặc email đã tồn tại' });
    next(err);
  }
});

router.post('/login', authLimiter, validate(schemas.login), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email }).lean();
    if (!user) return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return res.status(401).json({ message: 'Email hoặc mật khẩu không đúng' });

    const token = jwt.sign({ id: user._id, username: user.username }, secret, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, username: user.username, displayName: user.displayName } });
  } catch (err) {
    next(err);
  }
});

router.get('/me', require('../../../infrastructure/middleware/jwt'), async (req, res, next) => {
  try {
    const u = await User.findById(req.user.id).lean();
    if (!u) return res.status(404).json({ message: 'Không tìm thấy người dùng' });

    // Lazy init balance cho tài khoản cũ
    if (u.balance === undefined) {
      await User.findByIdAndUpdate(u._id, { balance: 200000 });
      u.balance = 200000;
    }

    res.json({ user: { id: u._id, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl, balance: u.balance } });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
