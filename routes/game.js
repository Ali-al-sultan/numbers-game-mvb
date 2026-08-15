const express = require('express');
const { authMiddleware } = require('../auth');
const engine = require('../gameEngine');
const db = require('../db');

module.exports = function (io) {
  const router = express.Router();

  router.get('/room', authMiddleware, (req, res) => {
    const room = engine.getOrCreateOpenRoom();
    res.json({ room: engine.publicRoomView(room) });
  });

  router.get('/rounds/recent', authMiddleware, (req, res) => {
    res.json({ rounds: db.listRecentRounds(10) });
  });

  router.post('/pick', authMiddleware, (req, res) => {
    const { number } = req.body || {};
    try {
      const { room, roundResult } = engine.pickNumber(req.userId, number);
      const view = engine.publicRoomView(room);

      io.to(room.id).emit('room_update', view);

      if (roundResult) {
        io.to(room.id).emit('round_result', roundResult);
        const newRoom = engine.getOrCreateOpenRoom();
        io.emit('new_room', engine.publicRoomView(newRoom));
      }

      res.json({ room: view, roundResult });
    } catch (err) {
      res.status(err.status || 500).json({ error: err.message || 'خطأ غير متوقع' });
    }
  });

  return router;
};
