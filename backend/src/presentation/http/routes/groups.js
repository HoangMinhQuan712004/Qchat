const express = require('express');
const expressJwt = require('../../../infrastructure/middleware/jwt');
const Group = require('../../../infrastructure/models/group');
const GroupMember = require('../../../infrastructure/models/groupMember');
const Conversation = require('../../../infrastructure/models/conversation');

const router = express.Router();

// POST /groups - create group (also create conversation for group chat)
router.post('/', expressJwt, async (req, res) => {
  const { name, avatarUrl, memberIds } = req.body;
  if (!name) return res.status(400).json({ message: 'name required' });

  const allMembers = new Set([String(req.user.id)]);
  if (Array.isArray(memberIds)) memberIds.forEach(m => allMembers.add(String(m)));
  const membersArr = Array.from(allMembers);

  // create conversation for the group
  const conv = await Conversation.create({ members: membersArr, title: name, isGroup: true, lastMessageAt: new Date() });

  const g = await Group.create({ name, avatarUrl, createdBy: req.user.id, membersCount: membersArr.length, conversationId: conv._id });

  // Add creator and members to group_members
  await GroupMember.create({ groupId: g._id, userId: req.user.id, role: 'admin' });
  if (Array.isArray(memberIds)) {
    for (const u of memberIds) {
      await GroupMember.create({ groupId: g._id, userId: u, role: 'member' });
    }
  }
  res.json({ group: g, conversation: conv });
});

// GET /groups - list groups for current user
router.get('/', expressJwt, async (req, res) => {
  const userId = req.user.id;
  const memberships = await GroupMember.find({ userId }).populate('groupId');
  const groups = memberships.map(m => m.groupId).filter(Boolean);
  res.json({ groups });
});

// POST /groups/:id/members - add member
router.post('/:id/members', expressJwt, async (req, res) => {
  const { userId } = req.body;
  if (!userId) return res.status(400).json({ message: 'userId required' });
  const gm = await GroupMember.findOneAndUpdate({ groupId: req.params.id, userId }, { $setOnInsert: { role: 'member' } }, { upsert: true, new: true });
  res.json({ ok: true, member: gm });
});

// DELETE /groups/:id - delete group
router.delete('/:id', expressJwt, async (req, res) => {
  const groupId = req.params.id;
  // Verify owner
  const group = await Group.findById(groupId);
  if (!group) return res.status(404).json({ message: 'Group not found' });

  if (String(group.createdBy) !== String(req.user.id)) {
    return res.status(403).json({ message: 'Only admin can delete group' });
  }

  await Group.findByIdAndDelete(groupId);
  await GroupMember.deleteMany({ groupId });
  // Also delete the linked conversation
  if (group.conversationId) {
    await Conversation.findByIdAndDelete(group.conversationId);
  }

  res.json({ ok: true, groupId });
});

module.exports = router;
