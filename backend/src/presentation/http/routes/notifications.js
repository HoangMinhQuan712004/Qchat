const express = require('express');
const expressJwt = require('../../../infrastructure/middleware/jwt');
const Notification = require('../../../infrastructure/models/notification');

const router = express.Router();

// GET /notifications - Get my notifications
router.get('/', expressJwt, async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user.id })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json({ notifications });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT /notifications/read-all - Mark all as read
router.put('/read-all', expressJwt, async (req, res) => {
    try {
        await Notification.updateMany({ user: req.user.id, isRead: false }, { isRead: true });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// PUT /notifications/:id/read - Mark one as read
router.put('/:id/read', expressJwt, async (req, res) => {
    try {
        await Notification.findByIdAndUpdate(req.params.id, { isRead: true });
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

module.exports = router;
