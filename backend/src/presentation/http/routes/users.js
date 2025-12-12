const express = require('express');
const expressJwt = require('../../../infrastructure/middleware/jwt');
const User = require('../../../infrastructure/models/user');

const router = express.Router();

// GET /users - list users (simple, paginate in real app)
router.get('/', expressJwt, async (req,res)=>{
  const q = req.query.q ? { $or: [ { username: { $regex: req.query.q, $options: 'i' } }, { displayName: { $regex: req.query.q, $options: 'i' } } ] } : {};
  const users = await User.find(q).select('username displayName avatarUrl isOnline');
  res.json({ users });
});

module.exports = router;
