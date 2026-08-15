const { v4: uuidv4 } = require('uuid');
const db = require('./db');

const BOARD_SIZE = 9;
const WINNERS_COUNT = 3;
const PICK_COST = 2;

function createRoom() {
  const room = {
    id: uuidv4(),
    gameType: 'numbers-9',
    status: 'open',
    boardSize: BOARD_SIZE,
    slots: {},
    createdAt: new Date().toISOString(),
    closedAt: null
  };
  for (let n = 1; n <= BOARD_SIZE; n++) room.slots[n] = null;
  db.saveRoom(room);
  db.setOpenRoomId(room.id);
  return room;
}

function getOrCreateOpenRoom() {
  const openId = db.getOpenRoomId();
  if (openId) {
    const room = db.getRoom(openId);
    if (room && room.status === 'open') return room;
  }
  return createRoom();
}

function publicRoomView(room) {
  const slots = {};
  for (const [num, userId] of Object.entries(room.slots)) {
    slots[num] = userId ? true : false;
  }
  return {
    id: room.id,
    gameType: room.gameType,
    status: room.status,
    boardSize: room.boardSize,
    pickCost: PICK_COST,
    slots,
    takenCount: Object.values(room.slots).filter(Boolean).length
  };
}

function pickNumber(userId, number) {
  const user = db.getUserById(userId);
  if (!user) throw httpError(404, 'المستخدم غير موجود');

  const room = getOrCreateOpenRoom();
  if (room.status !== 'open') throw httpError(409, 'هذه الجولة أُغلقت للتو، أعد المحاولة');

  const key = String(number);
  if (!room.slots.hasOwnProperty(key)) throw httpError(400, 'رقم غير صالح');
  if (room.slots[key]) throw httpError(409, 'هذا الرقم محجوز بالفعل، اختر رقمًا آخر');

  const alreadyPicked = Object.values(room.slots).includes(userId);
  if (alreadyPicked) throw httpError(409, 'لقد اخترت رقمًا بالفعل في هذه الجولة');

  if (user.points < PICK_COST) throw httpError(402, 'رصيد النقاط غير كافٍ');

  user.points -= PICK_COST;
  db.saveUser(user);

  room.slots[key] = userId;
  db.saveRoom(room);

  const takenCount = Object.values(room.slots).filter(Boolean).length;
  let roundResult = null;

  if (takenCount === room.boardSize) {
    roundResult = resolveRound(room);
  }

  return { room: db.getRoom(room.id), roundResult };
}

function resolveRound(room) {
  const allNumbers = Object.keys(room.slots).map(Number);
  const winningNumbers = pickRandomSubset(allNumbers, WINNERS_COUNT);

  const pot = room.boardSize * PICK_COST;
  const payoutPerWinner = Math.floor(pot / winningNumbers.length);

  const payouts = [];
  for (const num of winningNumbers) {
    const userId = room.slots[String(num)];
    const user = db.getUserById(userId);
    if (user) {
      user.points += payoutPerWinner;
      user.rankPoints += 10;
      db.saveUser(user);
      payouts.push({ userId, number: num, points: payoutPerWinner });
    }
  }

  room.status = 'closed';
  room.closedAt = new Date().toISOString();
  db.saveRoom(room);

  const round = {
    id: uuidv4(),
    roomId: room.id,
    winningNumbers,
    payouts,
    createdAt: new Date().toISOString()
  };
  db.saveRound(round);

  createRoom();
  return round;
}

function pickRandomSubset(arr, count) {
  const copy = [...arr];
  const result = [];
  while (result.length < count && copy.length > 0) {
    const idx = Math.floor(Math.random() * copy.length);
    result.push(copy.splice(idx, 1)[0]);
  }
  return result;
}

function httpError(status, message) {
  const err = new Error(message);
  err.status = status;
  return err;
}

module.exports = { getOrCreateOpenRoom, publicRoomView, pickNumber, PICK_COST, BOARD_SIZE };
