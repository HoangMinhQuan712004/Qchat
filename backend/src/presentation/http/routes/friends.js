const express = require('express');
const expressJwt = require('../../../infrastructure/middleware/jwt');
const User = require('../../../infrastructure/models/user');

const router = express.Router();

// POST /friends - add friend (body: { userId })
router.post('/', expressJwt, async (req,res)=>{
  const meId = req.user.id;
  const { userId } = req.body;
  if(!userId) return res.status(400).json({ message: 'userId required' });
  if(String(meId) === String(userId)) return res.status(400).json({ message: 'cannot add yourself' });

  await User.findByIdAndUpdate(meId, { $addToSet: { friends: userId } });
  // Optionally add reciprocal friend
  await User.findByIdAndUpdate(userId, { $addToSet: { friends: meId } });

  res.json({ ok: true });
});

// GET /friends - list my friends
router.get('/', expressJwt, async (req,res)=>{
  const me = await User.findById(req.user.id).populate('friends','username displayName avatarUrl isOnline');
  res.json({ friends: me.friends || [] });
});

module.exports = router;
