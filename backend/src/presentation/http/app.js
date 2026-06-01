const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const path = require('path');
const passport = require('passport');
const { apiLimiter } = require('../../infrastructure/middleware/rateLimiter');

const authRoutes = require('./routes/auth');
const messagesRoutes = require('./routes/messages');
const conversationsRoutes = require('./routes/conversations');
const usersRoutes = require('./routes/users');
const friendsRoutes = require('./routes/friends');
const groupsRoutes = require('./routes/groups');
const uploadRoutes = require('./routes/upload');
const walletRoutes = require('./routes/wallet');
const notificationsRoutes = require('./routes/notifications');
const newsRoutes = require('./routes/news');

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173,http://localhost:3000').split(',');

function createApp() {
  const app = express();

  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));

  app.use(cors({
    origin: (origin, cb) => {
      if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      cb(new Error('Not allowed by CORS'));
    },
    credentials: true,
  }));

  app.use(express.json({ limit: '2mb' }));
  app.use(express.urlencoded({ extended: false, limit: '2mb' }));
  app.use(passport.initialize());

  app.use('/uploads', express.static(path.join(__dirname, '../../../uploads')));

  app.use(apiLimiter);

  app.use('/auth', authRoutes);
  app.use('/messages', messagesRoutes);
  app.use('/conversations', conversationsRoutes);
  app.use('/users', usersRoutes);
  app.use('/friends', friendsRoutes);
  app.use('/groups', groupsRoutes);
  app.use('/upload', uploadRoutes);
  app.use('/wallet', walletRoutes);
  app.use('/notifications', notificationsRoutes);
  app.use('/news', newsRoutes);

  app.get('/', (req, res) => res.json({ ok: true }));

  // Global error handler
  app.use((err, req, res, next) => {
    if (err.name === 'UnauthorizedError') {
      return res.status(401).json({ message: 'Token không hợp lệ hoặc đã hết hạn' });
    }
    if (err.message === 'Not allowed by CORS') {
      return res.status(403).json({ message: 'CORS: origin không được phép' });
    }
    console.error(`[${new Date().toISOString()}] ${req.method} ${req.path}`, err.message);
    res.status(err.status || 500).json({ message: err.message || 'Lỗi server' });
  });

  return app;
}

module.exports = createApp;
