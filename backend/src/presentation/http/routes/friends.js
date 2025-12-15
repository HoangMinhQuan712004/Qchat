const express = require('express');
const expressJwt = require('../../../infrastructure/middleware/jwt');
const User = require('../../../infrastructure/models/user');

const router = express.Router();

// POST /friends - add friend (body: { userId })
router.post('/', expressJwt, async (req, res) => {
  const meId = req.user.id;
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ message: 'userId required' });
  if (String(meId) === String(userId)) return res.status(400).json({ message: 'cannot add yourself' });

  await User.findByIdAndUpdate(meId, { $addToSet: { friends: userId } });
  // Optionally add reciprocal friend
  await User.findByIdAndUpdate(userId, { $addToSet: { friends: meId } });

  res.json({ ok: true });
});

// GET /friends - list my friends
router.get('/', expressJwt, async (req, res) => {
  const me = await User.findById(req.user.id).populate('friends', 'username displayName avatarUrl isOnline');
  res.json({ friends: me.friends || [] });
});



const mongoose = require('mongoose');

// DELETE /friends/:id - unfriend
router.delete('/:id', expressJwt, async (req, res) => {
  const meId = req.user.id;
  const friendId = req.params.id;

  // Remove from both sides using explicit ObjectId to ensure match
  try {
    const fOid = new mongoose.Types.ObjectId(friendId);
    const mOid = new mongoose.Types.ObjectId(meId);

    await User.findByIdAndUpdate(meId, { $pull: { friends: fOid } });
    await User.findByIdAndUpdate(friendId, { $pull: { friends: mOid } });
  } catch (e) {
    console.error('Error unfriend:', e);
    // Fallback to string based in case
    await User.findByIdAndUpdate(meId, { $pull: { friends: friendId } });
    await User.findByIdAndUpdate(friendId, { $pull: { friends: meId } });
  }

  res.json({ ok: true });
});

// POST /friends/block - block user
router.post('/block', expressJwt, async (req, res) => {
  const meId = req.user.id;
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ message: 'userId required' });

  try {
    const oid = new mongoose.Types.ObjectId(userId);
    // Add to blocked list
    await User.findByIdAndUpdate(meId, { $addToSet: { blocked: oid } });

    // Also unfriend if friends
    const meOid = new mongoose.Types.ObjectId(meId);
    await User.findByIdAndUpdate(meId, { $pull: { friends: oid } });
    await User.findByIdAndUpdate(userId, { $pull: { friends: meOid } });

  } catch (e) { console.error(e); }

  res.json({ ok: true });
});

const Conversation = require('../../../infrastructure/models/conversation');

// GET /friends/blocked - list blocked users
router.get('/blocked', expressJwt, async (req, res) => {
  const me = await User.findById(req.user.id).populate('blocked', 'username displayName avatarUrl isOnline');
  res.json({ blocked: me.blocked || [] });
});

// DELETE /friends/block/:id - unblock user
router.delete('/block/:id', expressJwt, async (req, res) => {
  const meId = req.user.id;
  const targetId = req.params.id;

  await User.findByIdAndUpdate(meId, { $pull: { blocked: targetId } });

  res.json({ ok: true });
});

module.exports = router;
