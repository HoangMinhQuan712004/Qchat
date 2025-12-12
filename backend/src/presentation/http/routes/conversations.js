const express = require('express');
const expressJwt = require('../../../infrastructure/middleware/jwt');
const Conversation = require('../../../infrastructure/models/conversation');

const router = express.Router();

// Create 1-1 or group conversation
// Create 1-1 or group conversation
router.post('/', expressJwt, async (req, res) => {
  const { members, title, isGroup } = req.body;
  if (!members || !Array.isArray(members) || members.length < 1) return res.status(400).json({ message: 'members required' });

  // Ensure current user is in members
  const myId = req.user.id;
  const allMembers = Array.from(new Set([...members, myId]));

  if (!isGroup && allMembers.length === 2) {
    // Check if 1-1 already exists
    // Find ALL matches, then pick the one with most recent activity or just the first one
    const exists = await Conversation.find({ isGroup: false, members: { $all: allMembers, $size: 2 } }).sort({ lastMessageAt: -1 });
    if (exists.length > 0) return res.json({ conversation: exists[0] });
  }

  const conv = await Conversation.create({ members: allMembers, title, isGroup: !!isGroup, lastMessageAt: new Date() });
  res.json({ conversation: conv });
});

// GET /conversations - list conversations for current user
// Deduplicate logic: For 1-1 chats, only return the most active one per partner.
router.get('/', expressJwt, async (req, res) => {
  const userId = req.user.id;
  // Fetch all inclusive
  const allConvs = await Conversation.find({ members: userId }).sort({ lastMessageAt: -1 }).populate('members', 'username displayName avatarUrl');

  const uniqueConvs = [];
  const seenPartners = new Set();

  for (const c of allConvs) {
    if (c.isGroup) {
      uniqueConvs.push(c);
    } else {
      // 1-1: Identify partner
      const partner = c.members.find(m => String(m._id) !== String(userId));
      const partnerId = partner ? String(partner._id) : (c.members.length > 0 ? String(c.members[0]._id) : 'self');

      if (!seenPartners.has(partnerId)) {
        seenPartners.add(partnerId);
        uniqueConvs.push(c);
      }
    }
  }

  res.json({ conversations: uniqueConvs });
});

module.exports = router;
