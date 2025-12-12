const { Schema, model } = require('mongoose');

// Conversation can be 1-1 or group
const ConversationSchema = new Schema({
  title: { type: String },
  isGroup: { type: Boolean, default: false },
  members: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  lastMessageAt: { type: Date }
}, { timestamps: true });

ConversationSchema.index({ members: 1 });

module.exports = model('Conversation', ConversationSchema);
