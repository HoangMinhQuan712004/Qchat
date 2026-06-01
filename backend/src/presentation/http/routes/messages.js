const express = require('express');
const expressJwt = require('../../../infrastructure/middleware/jwt');
const Message = require('../../../infrastructure/models/message');

const router = express.Router();

// GET /messages/:conversationId?limit=50&before=date
router.get('/:conversationId', expressJwt, async (req, res) => {
  const { conversationId } = req.params;
  const limit = Math.min(parseInt(req.query.limit || '50', 10), 200);
  const before = req.query.before;

  const query = { conversationId };
  if (before) query.createdAt = { $lt: before };

  const messages = await Message.find(query)
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('sender', 'username displayName avatarUrl')
    .populate('replyTo', 'text sender type attachments')
    .populate('reactions.user', 'username displayName');

  res.json({ messages: messages.reverse() });
});

// PUT /messages/:id — edit message
router.put('/:id', expressJwt, async (req, res, next) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: 'Không tìm thấy tin nhắn' });
    if (String(msg.sender) !== String(req.user.id)) return res.status(403).json({ message: 'Không có quyền' });
    if (msg.deleted) return res.status(400).json({ message: 'Tin nhắn đã bị xóa' });
    if (msg.type !== 'text') return res.status(400).json({ message: 'Chỉ chỉnh sửa được tin nhắn văn bản' });

    msg.text = req.body.text || msg.text;
    msg.edited = true;
    await msg.save();
    await msg.populate('sender', 'username displayName avatarUrl');

    // Emit to socket
    const io = req.app.get('io');
    if (io) io.to(String(msg.conversationId)).emit('message_updated', { message: msg });

    res.json({ message: msg });
  } catch (err) { next(err); }
});

// DELETE /messages/:id — soft delete
router.delete('/:id', expressJwt, async (req, res, next) => {
  try {
    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: 'Không tìm thấy tin nhắn' });
    if (String(msg.sender) !== String(req.user.id)) return res.status(403).json({ message: 'Không có quyền' });

    msg.deleted = true;
    msg.text = '';
    msg.attachments = [];
    await msg.save();

    const io = req.app.get('io');
    if (io) io.to(String(msg.conversationId)).emit('message_deleted', { messageId: msg._id, conversationId: msg.conversationId });

    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /messages/:id/react — toggle reaction
router.post('/:id/react', expressJwt, async (req, res, next) => {
  try {
    const { emoji } = req.body;
    if (!emoji) return res.status(400).json({ message: 'Thiếu emoji' });

    const msg = await Message.findById(req.params.id);
    if (!msg) return res.status(404).json({ message: 'Không tìm thấy tin nhắn' });

    const existingIdx = msg.reactions.findIndex(
      r => r.emoji === emoji && String(r.user) === String(req.user.id)
    );

    if (existingIdx >= 0) {
      msg.reactions.splice(existingIdx, 1);
    } else {
      msg.reactions.push({ emoji, user: req.user.id });
    }

    await msg.save();
    await msg.populate('reactions.user', 'username displayName');

    const io = req.app.get('io');
    if (io) io.to(String(msg.conversationId)).emit('message_reacted', {
      messageId: msg._id,
      conversationId: msg.conversationId,
      reactions: msg.reactions,
    });

    res.json({ reactions: msg.reactions });
  } catch (err) { next(err); }
});

// PUT /messages/:conversationId/read — mark messages as read
router.put('/:conversationId/read', expressJwt, async (req, res, next) => {
  try {
    await Message.updateMany(
      { conversationId: req.params.conversationId, readBy: { $ne: req.user.id } },
      { $addToSet: { readBy: req.user.id } }
    );
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
