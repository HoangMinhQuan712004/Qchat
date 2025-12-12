const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const router = express.Router();

// Ensure upload dir exists
const uploadDir = path.join(__dirname, '../../../../uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        // preserve extension and make unique
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, uniqueSuffix + ext);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 50 * 1024 * 1024 } // 50MB
});

router.post('/', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
    }
    // Return URL. Ideally, this should be a full URL or relative path handled by frontend.
    // Serving 'uploads' as static at /uploads
    const url = `/uploads/${req.file.filename}`;
    res.json({
        url,
        filename: req.file.originalname,
        size: req.file.size,
        mimetype: req.file.mimetype
    });
});

module.exports = router;
