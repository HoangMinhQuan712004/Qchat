const { Schema, model } = require('mongoose');

const UserSchema = new Schema({
  username: { type: String, required: true, unique: true, index: true },
  email: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  displayName: { type: String },
  avatarUrl: { type: String },
  isOnline: { type: Boolean, default: false },
  lastSeenAt: { type: Date },
  friends: [{ type: Schema.Types.ObjectId, ref: 'User' }]
}, { timestamps: true });

module.exports = model('User', UserSchema);
