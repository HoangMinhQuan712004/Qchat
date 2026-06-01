const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../../../infrastructure/models/user');
const { validate, schemas } = require('../../../infrastructure/middleware/validate');
const { authLimiter } = require('../../../infrastructure/middleware/rateLimiter');

const router = express.Router();
const secret = process.env.JWT_SECRET || 'change_this_secret';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

passport.use(new GoogleStrategy({
  clientID: process.env.GOOGLE_CLIENT_ID,
  clientSecret: process.env.GOOGLE_CLIENT_SECRET,
  callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
}, async (accessToken, refreshToken, profile, done) => {
  try {
    const email = profile.emails?.[0]?.value;
    if (!email) return done(new Error('Không lấy được email từ Google'));

    let user = await User.findOne({ googleId: profile.id });
    if (!user) {
      user = await User.findOne({ email });
      if (user) {
        user.googleId = profile.id;
        if (!user.avatarUrl) user.avatarUrl = profile.photos?.[0]?.value;
        await user.save();
      } else {
        const username = email.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_') + '_' + Math.floor(Math.random() * 1000);
        user = await User.create({
          googleId: profile.id,
          email,
          username,
          displayName: profile.displayName || username,
          avatarUrl: profile.photos?.[0]?.value,
        });
      }
    }
    done(null, user);
  } catch (err) {
    done(err);
  }
}));

router.get('/google', authLimiter, passport.authenticate('google', { scope: ['profile', 'email'], session: false }));

router.get('/google/callback',
  passport.authenticate('google', { session: false, failureRedirect: `${FRONTEND_URL}?error=google_failed` }),
  (req, res) => {
    const user = req.user;
    const token = jwt.sign({ id: user._id, username: user.username }, secret, { expiresIn: '7d' });
    const userData = encodeURIComponent(JSON.stringify({
      id: user._id, username: user.username, displayName: user.displayName, avatarUrl: user.avatarUrl
    }));
    res.redirect(`${FRONTEND_URL}?token=${token}&user=${userData}`);
  }
);

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
