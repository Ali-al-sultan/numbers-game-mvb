const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data', 'db.json');

function defaultData() {
  return {
    users: {},
    deposits: {},
    rooms: {},
    rounds: [],
    currentOpenRoomId: null
  };
}

let cache = null;

function load() {
  if (cache) return cache;
  if (!fs.existsSync(DB_FILE)) {
    cache = defaultData();
    persist();
    return cache;
  }
  try {
    const raw = fs.readFileSync(DB_FILE, 'utf-8');
    cache = JSON.parse(raw);
  } catch (err) {
    cache = defaultData();
  }
  return cache;
}

function persist() {
  fs.mkdirSync(path.dirname(DB_FILE), { recursive: true });
  fs.writeFileSync(DB_FILE, JSON.stringify(cache, null, 2), 'utf-8');
}

function getUserById(id) { return load().users[id] || null; }
function getUserByEmail(email) {
  const users = load().users;
  return Object.values(users).find(u => u.email.toLowerCase() === email.toLowerCase()) || null;
}
function saveUser(user) { load().users[user.id] = user; persist(); return user; }

function saveDeposit(deposit) { load().deposits[deposit.id] = deposit; persist(); return deposit; }
function getDeposit(id) { return load().deposits[id] || null; }
function listPendingDeposits() { return Object.values(load().deposits).filter(d => d.status === 'pending'); }

function saveRoom(room) { load().rooms[room.id] = room; persist(); return room; }
function getRoom(id) { return load().rooms[id] || null; }
function getOpenRoomId() { return load().currentOpenRoomId; }
function setOpenRoomId(id) { load().currentOpenRoomId = id; persist(); }
function saveRound(round) { load().rounds.push(round); persist(); return round; }
function listRecentRounds(limit = 20) {
  const rounds = load().rounds;
  return rounds.slice(Math.max(0, rounds.length - limit)).reverse();
}

function getLeaderboard(limit = 20) {
  const users = Object.values(load().users);
  return users
    .sort((a, b) => b.rankPoints - a.rankPoints)
    .slice(0, limit)
    .map(u => ({ id: u.id, email: maskEmail(u.email), rankPoints: u.rankPoints }));
}

function maskEmail(email) {
  const [name, domain] = email.split('@');
  if (!domain) return email;
  const visible = name.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(1, name.length - 2))}@${domain}`;
}

module.exports = {
  getUserById, getUserByEmail, saveUser,
  saveDeposit, getDeposit, listPendingDeposits,
  saveRoom, getRoom, getOpenRoomId, setOpenRoomId,
  saveRound, listRecentRounds, getLeaderboard
};
