const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const expressJwt = require('../../../infrastructure/middleware/jwt');
const { uploadLimiter } = require('../../../infrastructure/middleware/rateLimiter');

const router = express.Router();

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm',
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

const uploadDir = path.join(__dirname, '../../../../uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    // Chỉ lấy extension, không giữ tên gốc để tránh path traversal
    const ext = path.extname(file.originalname).toLowerCase().replace(/[^a-z0-9.]/g, '');
    cb(null, uniqueSuffix + ext);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error(`Loại file không được phép: ${file.mimetype}`));
    }
    cb(null, true);
  },
});

router.post('/', expressJwt, uploadLimiter, upload.single('file'), (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Không có file được upload' });
  }
  res.json({
    url: `/uploads/${req.file.filename}`,
    filename: req.file.originalname,
    size: req.file.size,
    mimetype: req.file.mimetype,
  });
});

// Multer error handler
router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message?.includes('Loại file')) {
    return res.status(400).json({ message: err.message });
  }
  next(err);
});

module.exports = router;
