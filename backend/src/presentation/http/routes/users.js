const express = require('express');
const expressJwt = require('../../../infrastructure/middleware/jwt');
const User = require('../../../infrastructure/models/user');

const router = express.Router();

// GET /users?q=&limit=20&page=1
router.get('/', expressJwt, async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '20'), 50);
    const page = Math.max(1, parseInt(req.query.page || '1'));
    const skip = (page - 1) * limit;
    const q = req.query.q ? String(req.query.q).trim() : '';

    let filter = { _id: { $ne: req.user.id } };

    if (q) {
      // Escape regex special chars để tránh ReDoS
      const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      filter.$or = [
        { username: { $regex: `^${escaped}`, $options: 'i' } },
        { displayName: { $regex: `^${escaped}`, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter)
        .select('username displayName avatarUrl isOnline')
        .skip(skip)
        .limit(limit)
        .lean(),
      q ? User.countDocuments(filter) : Promise.resolve(0),
    ]);

    res.json({ users, total: q ? total : undefined, page, limit });
  } catch (err) {
    next(err);
  }
});

// PUT /users/me — cập nhật profile
router.put('/me', expressJwt, async (req, res, next) => {
  try {
    const { displayName, username, bio } = req.body;
    const update = {};

    if (displayName !== undefined) update.displayName = String(displayName).trim().slice(0, 50);
    if (bio !== undefined) update.bio = String(bio).trim().slice(0, 200);

    if (username !== undefined) {
      const newUsername = String(username).trim().slice(0, 30);
      if (!/^[a-zA-Z0-9_]+$/.test(newUsername)) {
        return res.status(400).json({ message: 'Username chỉ được chứa chữ, số và dấu _' });
      }
      if (newUsername.length < 3) {
        return res.status(400).json({ message: 'Username tối thiểu 3 ký tự' });
      }
      const existing = await User.findOne({ username: newUsername, _id: { $ne: req.user.id } }).lean();
      if (existing) return res.status(409).json({ message: 'Username đã được sử dụng' });
      update.username = newUsername;
    }

    const updated = await User.findByIdAndUpdate(req.user.id, update, { new: true })
      .select('username displayName avatarUrl bio balance').lean();

    res.json({ user: updated });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
