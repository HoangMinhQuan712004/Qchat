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

module.exports = router;
