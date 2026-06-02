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

// GET /groups/:id - group detail + members
router.get('/:id', expressJwt, async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Not found' });
    const members = await GroupMember.find({ groupId: req.params.id })
      .populate('userId', 'username displayName avatarUrl isOnline');
    const me = members.find(m => String(m.userId?._id) === String(req.user.id));
    res.json({ group, members, myRole: me?.role || 'member' });
  } catch (err) { next(err); }
});

// PUT /groups/:id - rename group or update avatar
router.put('/:id', expressJwt, async (req, res, next) => {
  try {
    const me = await GroupMember.findOne({ groupId: req.params.id, userId: req.user.id });
    if (!me || me.role !== 'admin') return res.status(403).json({ message: 'Chỉ admin mới được sửa nhóm' });
    const { name, avatarUrl } = req.body;
    const update = {};
    if (name) update.name = String(name).trim().slice(0, 50);
    if (avatarUrl !== undefined) update.avatarUrl = avatarUrl;
    const group = await Group.findByIdAndUpdate(req.params.id, update, { new: true });
    if (name && group?.conversationId) {
      await Conversation.findByIdAndUpdate(group.conversationId, { title: name });
    }
    res.json({ group });
  } catch (err) { next(err); }
});

// POST /groups/:id/members - add member
router.post('/:id/members', expressJwt, async (req, res, next) => {
  try {
    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId required' });
    const me = await GroupMember.findOne({ groupId: req.params.id, userId: req.user.id });
    if (!me || me.role !== 'admin') return res.status(403).json({ message: 'Chỉ admin mới được thêm thành viên' });
    await GroupMember.findOneAndUpdate(
      { groupId: req.params.id, userId },
      { $setOnInsert: { role: 'member' } },
      { upsert: true, new: true }
    );
    const group = await Group.findById(req.params.id);
    if (group?.conversationId) {
      await Conversation.findByIdAndUpdate(group.conversationId, { $addToSet: { members: userId } });
    }
    await Group.findByIdAndUpdate(req.params.id, { $inc: { membersCount: 1 } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// DELETE /groups/:id/members/:userId - kick member
router.delete('/:id/members/:userId', expressJwt, async (req, res, next) => {
  try {
    const me = await GroupMember.findOne({ groupId: req.params.id, userId: req.user.id });
    if (!me || me.role !== 'admin') return res.status(403).json({ message: 'Chỉ admin mới được kick' });
    if (String(req.params.userId) === String(req.user.id)) {
      return res.status(400).json({ message: 'Không thể tự kick mình' });
    }
    await GroupMember.deleteOne({ groupId: req.params.id, userId: req.params.userId });
    const group = await Group.findById(req.params.id);
    if (group?.conversationId) {
      await Conversation.findByIdAndUpdate(group.conversationId, { $pull: { members: req.params.userId } });
    }
    await Group.findByIdAndUpdate(req.params.id, { $inc: { membersCount: -1 } });
    res.json({ ok: true });
  } catch (err) { next(err); }
});

// POST /groups/:id/leave - leave group (non-admin)
router.post('/:id/leave', expressJwt, async (req, res, next) => {
  try {
    const group = await Group.findById(req.params.id);
    if (!group) return res.status(404).json({ message: 'Not found' });
    if (String(group.createdBy) === String(req.user.id)) {
      return res.status(400).json({ message: 'Admin phải xóa nhóm thay vì rời' });
    }
    await GroupMember.deleteOne({ groupId: req.params.id, userId: req.user.id });
    if (group.conversationId) {
      await Conversation.findByIdAndUpdate(group.conversationId, { $pull: { members: req.user.id } });
    }
    await Group.findByIdAndUpdate(req.params.id, { $inc: { membersCount: -1 } });
    res.json({ ok: true });
  } catch (err) { next(err); }
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
