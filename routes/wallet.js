const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { authMiddleware, adminMiddleware } = require('../auth');

const router = express.Router();
const POINTS_PER_USDT = 10;

router.post('/deposit-request', authMiddleware, (req, res) => {
  const { usdtTxid, usdtAmount } = req.body || {};
  const amount = parseFloat(usdtAmount);
  if (!usdtTxid || typeof usdtTxid !== 'string' || usdtTxid.trim().length < 6) {
    return res.status(400).json({ error: 'رقم عملية التحويل (TXID) غير صالح' });
  }
  if (!amount || amount <= 0) {
    return res.status(400).json({ error: 'قيمة الإيداع غير صالحة' });
  }

  const deposit = {
    id: uuidv4(),
    userId: req.userId,
    usdtTxid: usdtTxid.trim(),
    usdtAmount: amount,
    pointsRequested: Math.floor(amount * POINTS_PER_USDT),
    status: 'pending',
    createdAt: new Date().toISOString(),
    adminNote: null
  };
  db.saveDeposit(deposit);
  res.json({ deposit });
});

router.get('/me', authMiddleware, (req, res) => {
  const user = db.getUserById(req.userId);
  res.json({ points: user.points, rankPoints: user.rankPoints });
});

router.get('/admin/deposits/pending', adminMiddleware, (req, res) => {
  res.json({ deposits: db.listPendingDeposits() });
});

router.post('/admin/deposits/:id/approve', adminMiddleware, (req, res) => {
  const deposit = db.getDeposit(req.params.id);
  if (!deposit) return res.status(404).json({ error: 'الطلب غير موجود' });
  if (deposit.status !== 'pending') return res.status(409).json({ error: 'تمت معالجة هذا الطلب مسبقًا' });

  const user = db.getUserById(deposit.userId);
  if (!user) return res.status(404).json({ error: 'المستخدم غير موجود' });

  user.points += deposit.pointsRequested;
  db.saveUser(user);

  deposit.status = 'approved';
  deposit.adminNote = 'تمت الموافقة والتحقق من عملية USDT يدويًا';
  db.saveDeposit(deposit);

  res.json({ deposit, userPoints: user.points });
});

router.post('/admin/deposits/:id/reject', adminMiddleware, (req, res) => {
  const deposit = db.getDeposit(req.params.id);
  if (!deposit) return res.status(404).json({ error: 'الطلب غير موجود' });
  if (deposit.status !== 'pending') return res.status(409).json({ error: 'تمت معالجة هذا الطلب مسبقًا' });

  deposit.status = 'rejected';
  deposit.adminNote = req.body?.reason || 'مرفوض';
  db.saveDeposit(deposit);

  res.json({ deposit });
});

module.exports = router;
