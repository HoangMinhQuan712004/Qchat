const { Schema, model } = require('mongoose');

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String },
  googleId: { type: String, unique: true, sparse: true },
  displayName: { type: String },
  avatarUrl: { type: String },
  isOnline: { type: Boolean, default: false },
  lastSeenAt: { type: Date },
  friends: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  blocked: [{ type: Schema.Types.ObjectId, ref: 'User' }],
  friendRequests: [{ from: { type: Schema.Types.ObjectId, ref: 'User' }, sentAt: { type: Date, default: Date.now } }],
  balance: { type: Number, default: 200000 }
}, { timestamps: true });

module.exports = model('User', UserSchema);
