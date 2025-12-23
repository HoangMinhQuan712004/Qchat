const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: { type: String, required: true, enum: ['message', 'transfer_sent', 'transfer_received', 'system'] },
    title: { type: String, required: true },
    message: { type: String, required: true },
    relatedId: { type: mongoose.Schema.Types.ObjectId }, // e.g., ConversationID or TransactionID
    isRead: { type: Boolean, default: false },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Notification', notificationSchema);
