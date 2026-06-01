const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 phút
  max: 20,
  message: { message: 'Quá nhiều yêu cầu, thử lại sau 15 phút' },
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 phút
  max: 120,
  message: { message: 'Quá nhiều yêu cầu, thử lại sau' },
  standardHeaders: true,
  legacyHeaders: false,
});

const uploadLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 20,
  message: { message: 'Quá nhiều lần upload, thử lại sau' },
  standardHeaders: true,
  legacyHeaders: false,
});

const walletLimiter = rateLimit({
  windowMs: 1 * 60 * 1000,
  max: 10,
  message: { message: 'Quá nhiều giao dịch, thử lại sau' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, apiLimiter, uploadLimiter, walletLimiter };
