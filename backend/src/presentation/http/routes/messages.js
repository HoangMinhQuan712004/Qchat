const express = require('express');
const expressJwt = require('../../../infrastructure/middleware/jwt');
const Message = require('../../../infrastructure/models/message');

const router = express.Router();

// GET /messages/:conversationId?limit=50
router.get('/:conversationId', expressJwt, async (req, res) => {
  const { conversationId } = req.params;
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
  const before = req.query.before;

  const query = { conversationId };
  if (before) {
    query.createdAt = { $lt: before };
  }

  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('sender', 'username displayName avatarUrl');

  res.json({ messages: messages.reverse() });
});

module.exports = router;
