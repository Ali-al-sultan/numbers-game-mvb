const path = require('path');
const express = require('express');
const cors = require('cors');
const http = require('http');
const { Server } = require('socket.io');

const { router: authRouter } = require('./routes/auth');
const walletRouter = require('./routes/wallet');
const leaderboardRouter = require('./routes/leaderboard');
const gameRouterFactory = require('./routes/game');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: '*' } });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/auth', authRouter);
app.use('/api/wallet', walletRouter);
app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/game', gameRouterFactory(io));

io.on('connection', (socket) => {
  socket.on('join_room', (roomId) => { if (roomId) socket.join(roomId); });
  socket.on('leave_room', (roomId) => { if (roomId) socket.leave(roomId); });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`الخادم يعمل على المنفذ ${PORT}`);
});
