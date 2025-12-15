const express = require('express');
const expressJwt = require('../../../infrastructure/middleware/jwt');
const User = require('../../../infrastructure/models/user');
const Transaction = require('../../../infrastructure/models/transaction');
const mongoose = require('mongoose');
const crypto = require('crypto');

const router = express.Router();

// GET /wallet/history
router.get('/history', expressJwt, async (req, res) => {
    const userId = req.user.id;
    const transactions = await Transaction.find({
        $or: [{ fromUser: userId }, { toUser: userId }]
    })
        .sort({ createdAt: -1 })
        .limit(50)
        .populate('fromUser', 'username displayName')
        .populate('toUser', 'username displayName');

    res.json({ transactions });
});

// POST /wallet/transfer
router.post('/transfer', expressJwt, async (req, res) => {
    const { toUsername, amount } = req.body;
    const fromUserId = req.user.id;

    if (!toUsername || !amount || amount <= 0) {
        return res.status(400).json({ message: 'Invalid input' });
    }

    // NOTE: MongoDB Transactions require a Replica Set. 
    // For standalone dev environments, we will use sequential updates.
    try {
        const fromUser = await User.findById(fromUserId);
        if (!fromUser) throw new Error('User not found');

        if (fromUser.balance < amount) {
            throw new Error('Insufficient balance');
        }

        const toUser = await User.findOne({ username: toUsername });
        if (!toUser) throw new Error('Recipient not found');

        if (String(toUser._id) === String(fromUserId)) {
            throw new Error('Cannot transfer to self');
        }

        // Deduct
        fromUser.balance -= amount;
        await fromUser.save();

        // Add
        toUser.balance += amount;
        await toUser.save();

        // Record Transaction
        const tx = new Transaction({
            fromUser: fromUserId,
            toUser: toUser._id,
            amount,
            type: 'TRANSFER',
            status: 'SUCCESS',
            description: `Transfer to ${toUser.displayName || toUser.username}`,
            hash: '0x' + crypto.randomBytes(32).toString('hex')
        });
        await tx.save();

        res.json({ ok: true, balance: fromUser.balance, transaction: tx });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
});

module.exports = router;
