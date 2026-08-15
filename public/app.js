const API = '/api';
let token = localStorage.getItem('token') || null;
let socket = null;
let currentRoom = null;

function el(id) { return document.getElementById(id); }

async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  if (auth && token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(API + path, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || 'حدث خطأ');
  return data;
}

function showScreen(name) {
  el('screen-auth').classList.toggle('hidden', name !== 'auth');
  el('screen-main').classList.toggle('hidden', name !== 'main');
}
function showView(name) {
  ['game', 'wallet', 'leaderboard'].forEach(v => {
    el(`view-${v}`).classList.toggle('hidden', v !== name);
  });
  document.querySelectorAll('.nav-tab').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === name);
  });
}

document.querySelectorAll('.tab-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    const tab = btn.dataset.tab;
    el('form-login').classList.toggle('hidden', tab !== 'login');
    el('form-register').classList.toggle('hidden', tab !== 'register');
  });
});

el('form-login').addEventListener('submit', async (e) => {
  e.preventDefault();
  el('login-error').textContent = '';
  try {
    const data = await api('/auth/login', {
      method: 'POST',
      auth: false,
      body: { email: el('login-email').value, password: el('login-password').value }
    });
    onAuthSuccess(data);
  } catch (err) {
    el('login-error').textContent = err.message;
  }
});

el('form-register').addEventListener('submit', async (e) => {
  e.preventDefault();
  el('register-error').textContent = '';
  try {
    const data = await api('/auth/register', {
      method: 'POST',
      auth: false,
      body: { email: el('register-email').value, password: el('register-password').value }
    });
    onAuthSuccess(data);
  } catch (err) {
    el('register-error').textContent = err.message;
  }
});

function onAuthSuccess(data) {
  token = data.token;
  localStorage.setItem('token', token);
  updateBalance(data.user.points);
  startApp();
}

el('btn-logout').addEventListener('click', () => {
  token = null;
  localStorage.removeItem('token');
  if (socket) socket.disconnect();
  showScreen('auth');
});

document.querySelectorAll('.nav-tab').forEach(btn => {
  btn.addEventListener('click', () => {
    showView(btn.dataset.view);
    if (btn.dataset.view === 'leaderboard') loadLeaderboard();
  });
});

function updateBalance(points) {
  el('points-balance').textContent = points;
}

function renderBoard(room) {
  currentRoom = room;
  el('pick-cost').textContent = room.pickCost;
  const statusPill = el('room-status');
  statusPill.textContent = room.status === 'open' ? 'جولة مفتوحة' : 'الجولة مغلقة';
  statusPill.classList.toggle('closed', room.status !== 'open');

  const board = el('board');
  board.innerHTML = '';
  Object.entries(room.slots).forEach(([num, taken]) => {
    const tile = document.createElement('div');
    tile.className = 'tile' + (taken ? ' taken' : '') + (room.status !== 'open' ? ' disabled' : '');
    tile.textContent = num;
    tile.dataset.number = num;
    if (!taken && room.status === 'open') {
      tile.addEventListener('click', () => pickNumber(Number(num)));
    }
    board.appendChild(tile);
  });
}

async function loadRoom() {
  const data = await api('/game/room');
  renderBoard(data.room);
  if (socket) socket.emit('join_room', data.room.id);
}

async function pickNumber(number) {
  el('result-banner').classList.add('hidden');
  try {
    const data = await api('/game/pick', { method: 'POST', body: { number } });
    renderBoard(data.room);
    const me = await api('/wallet/me');
    updateBalance(me.points);

    const myTile = document.querySelector(`.tile[data-number="${number}"]`);
    if (myTile) myTile.classList.add('mine');

    if (data.roundResult) {
      showRoundResult(data.roundResult, number);
      loadRecentRounds();
    }
  } catch (err) {
    alert(err.message);
  }
}

function showRoundResult(round, myNumber) {
  const won = round.payouts.some(p => p.number === myNumber);
  const banner = el('result-banner');
  banner.classList.remove('hidden');
  banner.classList.toggle('lost', !won);
  const winners = round.winningNumbers.join('، ');
  banner.innerHTML = won
    ? `🎉 مبروك! رقمك من ضمن الأرقام الرابحة (${winners}). حصلت على نقاط إضافية ورُفع ترتيبك.`
    : `الأرقام الرابحة في هذه الجولة: <b class="mono">${winners}</b>. حظ أوفر في الجولة القادمة!`;
}

async function loadRecentRounds() {
  const data = await api('/game/rounds/recent');
  const list = el('recent-rounds');
  list.innerHTML = '';
  data.rounds.forEach(r => {
    const li = document.createElement('li');
    const time = new Date(r.createdAt).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' });
    li.innerHTML = `<span>${time}</span><b>${r.winningNumbers.join(' - ')}</b>`;
    list.appendChild(li);
  });
}

el('form-deposit').addEventListener('submit', async (e) => {
  e.preventDefault();
  el('deposit-error').textContent = '';
  el('deposit-success').textContent = '';
  try {
    await api('/wallet/deposit-request', {
      method: 'POST',
      body: {
        usdtTxid: el('deposit-txid').value,
        usdtAmount: parseFloat(el('deposit-amount').value)
      }
    });
    el('deposit-success').textContent = 'تم إرسال طلبك، سيتم تأكيده يدويًا قريبًا وإضافة النقاط لرصيدك.';
    e.target.reset();
  } catch (err) {
    el('deposit-error').textContent = err.message;
  }
});

el('btn-copy-address').addEventListener('click', () => {
  navigator.clipboard.writeText(el('wallet-address-text').textContent.trim());
  el('btn-copy-address').textContent = 'تم النسخ';
  setTimeout(() => (el('btn-copy-address').textContent = 'نسخ'), 1500);
});

async function loadLeaderboard() {
  const data = await api('/leaderboard');
  const list = el('leaderboard-list');
  list.innerHTML = '';
  data.leaderboard.forEach((u, i) => {
    const li = document.createElement('li');
    li.innerHTML = `<span class="rank">${i + 1}</span><span class="email">${u.email}</span><span class="pts">${u.rankPoints} نقطة</span>`;
    list.appendChild(li);
  });
}

async function startApp() {
  showScreen('main');
  showView('game');

  socket = io();
  socket.on('room_update', (room) => {
    if (currentRoom && room.id === currentRoom.id) renderBoard(room);
  });
  socket.on('round_result', () => {
    api('/wallet/me').then(me => updateBalance(me.points)).catch(() => {});
  });
  socket.on('new_room', (room) => {
    if (!currentRoom || room.status === 'open') {
      renderBoard(room);
      socket.emit('join_room', room.id);
    }
  });

  const me = await api('/wallet/me');
  updateBalance(me.points);
  await loadRoom();
  await loadRecentRounds();
}

(async function init() {
  if (token) {
    try {
      await startApp();
      return;
    } catch (err) {
      localStorage.removeItem('token');
      token = null;
    }
  }
  showScreen('auth');
})();
