const express = require('express');
const multer = require('multer');
const { v2: cloudinary } = require('cloudinary');
const expressJwt = require('../../../infrastructure/middleware/jwt');
const { uploadLimiter } = require('../../../infrastructure/middleware/rateLimiter');

const router = express.Router();

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  'video/mp4', 'video/webm',
  'audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/webm',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
]);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (!ALLOWED_MIME_TYPES.has(file.mimetype)) {
      return cb(new Error(`Loại file không được phép: ${file.mimetype}`));
    }
    cb(null, true);
  },
});

function uploadToCloudinary(buffer, mimetype) {
  const resourceType = mimetype.startsWith('video/') ? 'video'
    : mimetype.startsWith('audio/') ? 'video'  // Cloudinary dùng 'video' cho audio
    : mimetype.startsWith('image/') ? 'image'
    : 'raw';

  return new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(
      { folder: 'qchat', resource_type: resourceType },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    stream.end(buffer);
  });
}

router.post('/', expressJwt, uploadLimiter, upload.single('file'), async (req, res, next) => {
  if (!req.file) {
    return res.status(400).json({ message: 'Không có file được upload' });
  }
  try {
    const result = await uploadToCloudinary(req.file.buffer, req.file.mimetype);
    res.json({
      url:      result.secure_url,
      filename: req.file.originalname,
      size:     req.file.size,
      mimetype: req.file.mimetype,
    });
  } catch (err) {
    next(err);
  }
});

router.use((err, req, res, next) => {
  if (err instanceof multer.MulterError || err.message?.includes('Loại file')) {
    return res.status(400).json({ message: err.message });
  }
  next(err);
});

module.exports = router;
