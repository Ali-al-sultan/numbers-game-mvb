const express = require('express');
const db = require('../db');
const { authMiddleware } = require('../auth');

const router = express.Router();

router.get('/', authMiddleware, (req, res) => {
  res.json({ leaderboard: db.getLeaderboard(20) });
});

module.exports = router;
