const { Schema, model } = require('mongoose');

const MessageSchema = new Schema({
  conversationId: { type: Schema.Types.ObjectId, ref: 'Conversation', required: true, index: true },
  sender: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  type: { type: String, enum: ['text', 'image', 'file', 'video', 'audio'], default: 'text' },
  text: { type: String },
  attachments: [{ url: String, name: String, size: Number }],
  readBy: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

MessageSchema.index({ conversationId: 1, createdAt: -1 });

module.exports = model('Message', MessageSchema);
