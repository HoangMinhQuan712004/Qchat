const express = require('express');
const mongoose = require('mongoose');
const expressJwt = require('../../../infrastructure/middleware/jwt');
const Conversation = require('../../../infrastructure/models/conversation');
const Message = require('../../../infrastructure/models/message');

const router = express.Router();

// POST /conversations — tạo 1-1 hoặc nhóm
router.post('/', expressJwt, async (req, res, next) => {
  try {
    const { members, title, isGroup } = req.body;
    if (!members || !Array.isArray(members) || members.length < 1) {
      return res.status(400).json({ message: 'members là bắt buộc' });
    }

    const myId = req.user.id;
    const allMembers = Array.from(new Set([...members.map(String), String(myId)]));

    if (!isGroup && allMembers.length === 2) {
      const exists = await Conversation.findOne({
        isGroup: false,
        members: { $all: allMembers, $size: 2 },
      }).sort({ lastMessageAt: -1 });
      if (exists) return res.json({ conversation: exists });
    }

    const conv = await Conversation.create({
      members: allMembers,
      title,
      isGroup: !!isGroup,
      lastMessageAt: new Date(),
    });
    res.json({ conversation: conv });
  } catch (err) {
    next(err);
  }
});

// GET /conversations — danh sách hội thoại có phân trang
router.get('/', expressJwt, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit || '20'), 50);
    const cursor = req.query.cursor; // lastMessageAt timestamp

    const query = { members: userId };
    if (cursor) {
      query.lastMessageAt = { $lt: new Date(cursor) };
    }

    const convs = await Conversation.find(query)
      .sort({ lastMessageAt: -1 })
      .limit(limit + 1)
      .populate('members', 'username displayName avatarUrl isOnline')
      .lean();

    const hasMore = convs.length > limit;
    const results = convs.slice(0, limit);

    // Dedup 1-1 (chỉ giữ cuộc trò chuyện gần nhất với mỗi partner)
    const uniqueConvs = [];
    const seenPartners = new Set();
    for (const c of results) {
      if (c.isGroup) {
        uniqueConvs.push(c);
      } else {
        const partner = c.members.find(m => String(m._id) !== String(userId));
        const partnerId = partner ? String(partner._id) : 'self';
        if (!seenPartners.has(partnerId)) {
          seenPartners.add(partnerId);
          uniqueConvs.push(c);
        }
      }
    }

    res.json({
      conversations: uniqueConvs,
      cursor: results.length ? results[results.length - 1].lastMessageAt : null,
      hasMore,
    });
  } catch (err) {
    next(err);
  }
});

// POST /conversations/:id/mute
router.post('/:id/mute', expressJwt, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const { mute } = req.body;
    const update = mute
      ? { $addToSet: { mutedBy: userId } }
      : { $pull: { mutedBy: userId } };
    await Conversation.findByIdAndUpdate(req.params.id, update);
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

// DELETE /conversations/:id/messages — xóa toàn bộ tin nhắn
router.delete('/:id/messages', expressJwt, async (req, res, next) => {
  try {
    const conv = await Conversation.findOne({ _id: req.params.id, members: req.user.id });
    if (!conv) return res.status(403).json({ message: 'Không có quyền' });
    await Message.deleteMany({ conversationId: req.params.id });
    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
