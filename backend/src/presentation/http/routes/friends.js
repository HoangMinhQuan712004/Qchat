const express = require('express');
const mongoose = require('mongoose');
const expressJwt = require('../../../infrastructure/middleware/jwt');
const User = require('../../../infrastructure/models/user');

const router = express.Router();

// GET /friends/requests — lời mời kết bạn đang chờ
router.get('/requests', expressJwt, async (req, res, next) => {
  try {
    const me = await User.findById(req.user.id)
      .populate('friendRequests.from', 'username displayName avatarUrl');
    res.json({ requests: me.friendRequests || [] });
  } catch (err) { next(err); }
});

// POST /friends — gửi lời mời kết bạn
router.post('/', expressJwt, async (req, res, next) => {
  try {
    const meId = String(req.user.id);
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId required' });
    if (meId === String(userId)) return res.status(400).json({ message: 'Không thể kết bạn với chính mình' });

    const target = await User.findById(userId);
    if (!target) return res.status(404).json({ message: 'Người dùng không tồn tại' });

    // Đã là bạn bè?
    if (target.friends.map(String).includes(meId)) {
      return res.status(409).json({ message: 'Đã là bạn bè' });
    }
    // Đã gửi request rồi?
    if (target.friendRequests.some(r => String(r.from) === meId)) {
      return res.status(409).json({ message: 'Đã gửi lời mời trước đó' });
    }

    await User.findByIdAndUpdate(userId, {
      $push: { friendRequests: { from: meId, sentAt: new Date() } }
    });

    const me = await User.findById(meId).select('username displayName avatarUrl');

    // Emit socket
    const io = req.app.get('io');
    if (io) {
      io.to(String(userId)).emit('friend_request', {
        from: { _id: me._id, username: me.username, displayName: me.displayName, avatarUrl: me.avatarUrl },
        sentAt: new Date(),
      });
    }

    res.json({ ok: true, message: 'Đã gửi lời mời kết bạn' });
  } catch (err) { next(err); }
});

// POST /friends/requests/:fromId/accept
router.post('/requests/:fromId/accept', expressJwt, async (req, res, next) => {
  try {
    const meId = req.user.id;
    const fromId = req.params.fromId;

    const me = await User.findById(meId);
    const hasReq = me.friendRequests.some(r => String(r.from) === String(fromId));
    if (!hasReq) return res.status(404).json({ message: 'Không tìm thấy lời mời' });

    // Thêm bạn bè 2 chiều + xóa request
    await User.findByIdAndUpdate(meId, {
      $addToSet: { friends: fromId },
      $pull: { friendRequests: { from: fromId } },
    });
    await User.findByIdAndUpdate(fromId, {
      $addToSet: { friends: meId },
    });

    const io = req.app.get('io');
    if (io) {
      const meData = await User.findById(meId).select('username displayName avatarUrl');
      io.to(String(fromId)).emit('friend_accepted', {
        by: { _id: meData._id, username: meData.username, displayName: meData.displayName, avatarUrl: meData.avatarUrl },
      });
    }

    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /friends/requests/:fromId/decline
router.post('/requests/:fromId/decline', expressJwt, async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, {
      $pull: { friendRequests: { from: req.params.fromId } },
    });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// GET /friends
router.get('/', expressJwt, async (req, res, next) => {
  try {
    const me = await User.findById(req.user.id).populate('friends', 'username displayName avatarUrl isOnline');
    res.json({ friends: me.friends || [] });
  } catch (err) { next(err); }
});

// DELETE /friends/:id — unfriend
router.delete('/:id', expressJwt, async (req, res, next) => {
  try {
    const meId = req.user.id;
    const friendId = req.params.id;
    const fOid = new mongoose.Types.ObjectId(friendId);
    const mOid = new mongoose.Types.ObjectId(meId);
    await User.findByIdAndUpdate(meId, { $pull: { friends: fOid } });
    await User.findByIdAndUpdate(friendId, { $pull: { friends: mOid } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /friends/block
router.post('/block', expressJwt, async (req, res, next) => {
  try {
    const meId = req.user.id;
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId required' });
    const oid = new mongoose.Types.ObjectId(userId);
    const mOid = new mongoose.Types.ObjectId(meId);
    await User.findByIdAndUpdate(meId, { $addToSet: { blocked: oid }, $pull: { friends: oid } });
    await User.findByIdAndUpdate(userId, { $pull: { friends: mOid } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// GET /friends/blocked
router.get('/blocked', expressJwt, async (req, res, next) => {
  try {
    const me = await User.findById(req.user.id).populate('blocked', 'username displayName avatarUrl');
    res.json({ blocked: me.blocked || [] });
  } catch (err) { next(err); }
});

// DELETE /friends/block/:id — unblock
router.delete('/block/:id', expressJwt, async (req, res, next) => {
  try {
    await User.findByIdAndUpdate(req.user.id, { $pull: { blocked: req.params.id } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

module.exports = router;
