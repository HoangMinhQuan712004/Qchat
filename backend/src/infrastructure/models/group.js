const { Schema, model } = require('mongoose');

const GroupSchema = new Schema({
  name: { type: String, required: true },
  avatarUrl: { type: String },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  membersCount: { type: Number, default: 0 },
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation' }
}, { timestamps: true });

module.exports = model('Group', GroupSchema);
