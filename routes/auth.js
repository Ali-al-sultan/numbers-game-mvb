const express = require('express');
const { v4: uuidv4 } = require('uuid');
const db = require('../db');
const { hashPassword, verifyPassword, signToken } = require('../auth');

const router = express.Router();

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

router.post('/register', (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !isValidEmail(email)) {
    return res.status(400).json({ error: 'بريد إلكتروني غير صالح' });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 6 أحرف على الأقل' });
  }
  if (db.getUserByEmail(email)) {
    return res.status(409).json({ error: 'هذا البريد مسجّل بالفعل' });
  }

  const user = {
    id: uuidv4(),
    email,
    passwordHash: hashPassword(password),
    points: 0,
    rankPoints: 0,
    createdAt: new Date().toISOString()
  };
  db.saveUser(user);

  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

router.post('/login', (req, res) => {
  const { email, password } = req.body || {};
  const user = email ? db.getUserByEmail(email) : null;
  if (!user || !verifyPassword(password || '', user.passwordHash)) {
    return res.status(401).json({ error: 'بيانات الدخول غير صحيحة' });
  }
  const token = signToken(user);
  res.json({ token, user: publicUser(user) });
});

function publicUser(user) {
  return { id: user.id, email: user.email, points: user.points, rankPoints: user.rankPoints };
}

module.exports = { router, publicUser };
