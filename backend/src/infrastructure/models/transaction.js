const { Schema, model } = require('mongoose');

const TransactionSchema = new Schema({
    fromUser: { type: Schema.Types.ObjectId, ref: 'User' }, // Null for system rewards
    toUser: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true, min: 1 },
    type: { type: String, enum: ['TRANSFER', 'SYSTEM', 'REWARD'], default: 'TRANSFER' },
    status: { type: String, enum: ['PENDING', 'SUCCESS', 'FAILED'], default: 'SUCCESS' },
    description: { type: String },
    hash: { type: String, unique: true }
}, { timestamps: true });

TransactionSchema.index({ fromUser: 1, createdAt: -1 });
TransactionSchema.index({ toUser: 1, createdAt: -1 });

module.exports = model('Transaction', TransactionSchema);
