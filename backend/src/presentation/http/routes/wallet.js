const express = require('express');
const expressJwt = require('../../../infrastructure/middleware/jwt');
const { validate, schemas } = require('../../../infrastructure/middleware/validate');
const { walletLimiter } = require('../../../infrastructure/middleware/rateLimiter');
const User = require('../../../infrastructure/models/user');
const Transaction = require('../../../infrastructure/models/transaction');
const Notification = require('../../../infrastructure/models/notification');
const mongoose = require('mongoose');
const crypto = require('crypto');
const { getIO } = require('../../socket/socket');

const router = express.Router();

// GET /wallet/history
router.get('/history', expressJwt, async (req, res, next) => {
  try {
    const userId = req.user.id;
    const limit = Math.min(parseInt(req.query.limit || '30'), 100);
    const cursor = req.query.cursor;

    const query = { $or: [{ fromUser: userId }, { toUser: userId }] };
    if (cursor) {
      query._id = { $lt: new mongoose.Types.ObjectId(cursor) };
    }

    const transactions = await Transaction.find(query)
      .sort({ _id: -1 })
      .limit(limit + 1)
      .populate('fromUser', 'username displayName')
      .populate('toUser', 'username displayName')
      .lean();

    const hasMore = transactions.length > limit;
    const results = transactions.slice(0, limit);

    res.json({
      transactions: results,
      cursor: results.length ? results[results.length - 1]._id : null,
      hasMore,
    });
  } catch (err) {
    next(err);
  }
});

// POST /wallet/transfer
router.post('/transfer', expressJwt, walletLimiter, validate(schemas.transfer), async (req, res, next) => {
  const { toUsername, amount, description } = req.body;
  const fromUserId = req.user.id;

  try {
    const toUser = await User.findOne({ username: toUsername }).lean();
    if (!toUser) return res.status(404).json({ message: 'Không tìm thấy người nhận' });
    if (String(toUser._id) === String(fromUserId)) {
      return res.status(400).json({ message: 'Không thể chuyển cho chính mình' });
    }

    // Atomic deduction: chỉ thành công nếu balance >= amount
    const updatedFrom = await User.findOneAndUpdate(
      { _id: fromUserId, balance: { $gte: amount } },
      { $inc: { balance: -amount } },
      { new: true }
    );

    if (!updatedFrom) {
      return res.status(400).json({ message: 'Số dư không đủ' });
    }

    // Atomic addition cho người nhận
    await User.findByIdAndUpdate(toUser._id, { $inc: { balance: amount } });

    const tx = await Transaction.create({
      fromUser: fromUserId,
      toUser: toUser._id,
      amount,
      type: 'TRANSFER',
      status: 'SUCCESS',
      description: description || `Chuyển tiền cho ${toUser.displayName || toUser.username}`,
      hash: '0x' + crypto.randomBytes(32).toString('hex'),
    });

    const io = getIO();

    const receiverMsg = `Bạn nhận được ${amount.toLocaleString()} xu từ ${updatedFrom.username}`;
    io.to(String(toUser._id)).emit('wallet_notification', { type: 'success', message: receiverMsg });
    Notification.create({
      user: toUser._id,
      type: 'transfer_received',
      title: 'Nhận tiền',
      message: receiverMsg,
      relatedId: tx._id,
    }).catch(() => {});

    const senderMsg = `Chuyển thành công ${amount.toLocaleString()} xu cho ${toUser.username}`;
    io.to(String(fromUserId)).emit('wallet_notification', { type: 'success', message: senderMsg });
    Notification.create({
      user: fromUserId,
      type: 'transfer_sent',
      title: 'Chuyển tiền',
      message: senderMsg,
      relatedId: tx._id,
    }).catch(() => {});

    res.json({ ok: true, balance: updatedFrom.balance, transaction: tx });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
