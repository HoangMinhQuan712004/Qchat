const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../../../infrastructure/models/user');

const router = express.Router();
const secret = process.env.JWT_SECRET || 'change_this_secret';

router.post('/register', async (req, res) => {
  const { username, email, password, displayName } = req.body;
  if (!username || !email || !password) return res.status(400).json({ message: 'missing fields' });
  const existing = await User.findOne({ $or: [{ username }, { email }] });
  if (existing) return res.status(409).json({ message: 'User exists' });
  const hash = await bcrypt.hash(password, 10);
  const u = await User.create({ username, email, passwordHash: hash, displayName });
  const token = jwt.sign({ id: u._id, username: u.username }, secret, { expiresIn: '7d' });
  res.json({ token, user: { id: u._id, username: u.username, displayName: u.displayName } });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: 'missing' });
  const user = await User.findOne({ email });
  if (!user) return res.status(401).json({ message: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return res.status(401).json({ message: 'Invalid credentials' });
  const token = jwt.sign({ id: user._id, username: user.username }, secret, { expiresIn: '7d' });
  res.json({ token, user: { id: user._id, username: user.username, displayName: user.displayName } });
});

router.get('/me', require('../../../infrastructure/middleware/jwt'), async (req, res) => {
  const u = await User.findById(req.user.id);
  if (!u) return res.status(404).json({ message: 'User not found' });
  res.json({ user: { id: u._id, username: u.username, displayName: u.displayName, avatarUrl: u.avatarUrl } });
});

module.exports = router;
