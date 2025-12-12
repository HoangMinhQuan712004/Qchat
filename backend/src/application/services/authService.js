const User = require('../../infrastructure/models/user');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const secret = process.env.JWT_SECRET || 'change_this_secret';

async function register({ username, email, password, displayName }){
  const hash = await bcrypt.hash(password, 10);
  const u = await User.create({ username, email, passwordHash: hash, displayName });
  const token = jwt.sign({ id: u._id, username: u.username }, secret, { expiresIn: '7d' });
  return { token, user: u };
}

async function login({ email, password }){
  const user = await User.findOne({ email });
  if(!user) throw new Error('Invalid credentials');
  const ok = await bcrypt.compare(password, user.passwordHash);
  if(!ok) throw new Error('Invalid credentials');
  const token = jwt.sign({ id: user._id, username: user.username }, secret, { expiresIn: '7d' });
  return { token, user };
}

module.exports = { register, login };
