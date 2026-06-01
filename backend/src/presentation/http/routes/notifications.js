const express = require('express');
const mongoose = require('mongoose');
const expressJwt = require('../../../infrastructure/middleware/jwt');
const Notification = require('../../../infrastructure/models/notification');

const router = express.Router();

// GET /notifications?limit=20&cursor=<_id>
router.get('/', expressJwt, async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit || '20'), 50);
    const cursor = req.query.cursor;

    const query = { user: req.user.id };
    if (cursor) {
      query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    const notifications = await Notification.find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = notifications.length > limit;
    const results = notifications.slice(0, limit);

    // Đếm số chưa đọc (chỉ khi không có cursor để tránh query thừa)
    let unreadCount;
    if (!cursor) {
      unreadCount = await Notification.countDocuments({ user: req.user.id, isRead: false });
    }

    res.json({
      notifications: results,
      cursor: results.length ? results[results.length - 1]._id : null,
      hasMore,
      unreadCount,
    });
  } catch (err) {
    next(err);
  }
});

// PUT /notifications/read-by-conversation/:conversationId
router.put('/read-by-conversation/:conversationId', expressJwt, async (req, res, next) => {
  try {
    await Notification.updateMany(
      { user: req.user.id, relatedId: req.params.conversationId, isRead: false },
      { $set: { isRead: true } }
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// PUT /notifications/read-all
router.put('/read-all', expressJwt, async (req, res, next) => {
  try {
    await Notification.updateMany({ user: req.user.id, isRead: false }, { $set: { isRead: true } });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// PUT /notifications/:id/read
router.put('/:id/read', expressJwt, async (req, res, next) => {
  try {
    await Notification.findOneAndUpdate(
      { _id: req.params.id, user: req.user.id },
      { $set: { isRead: true } }
    );
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
