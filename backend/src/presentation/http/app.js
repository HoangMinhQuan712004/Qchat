const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const messagesRoutes = require('./routes/messages');
const conversationsRoutes = require('./routes/conversations');
const usersRoutes = require('./routes/users');
const friendsRoutes = require('./routes/friends');
const groupsRoutes = require('./routes/groups');

const uploadRoutes = require('./routes/upload');
const path = require('path');

function createApp() {
  const app = express();
  app.use(cors());
  app.use(express.json());

  // Static serve
  app.use('/uploads', express.static(path.join(__dirname, '../../../uploads')));

  app.use('/auth', authRoutes);
  app.use('/messages', messagesRoutes);
  app.use('/conversations', conversationsRoutes);
  app.use('/users', usersRoutes);
  app.use('/friends', friendsRoutes);
  app.use('/groups', groupsRoutes);
  app.use('/upload', uploadRoutes);

  app.get('/', (req, res) => res.json({ ok: true }));

  return app;
}

module.exports = createApp;
