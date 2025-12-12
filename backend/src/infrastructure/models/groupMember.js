const { Schema, model } = require('mongoose');

const GroupMemberSchema = new Schema({
  groupId: { type: Schema.Types.ObjectId, ref: 'Group', required: true, index: true },
  userId: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  role: { type: String, enum: ['member','admin'], default: 'member' }
}, { timestamps: true });

GroupMemberSchema.index({ groupId: 1, userId: 1 }, { unique: true });

module.exports = model('GroupMember', GroupMemberSchema);
