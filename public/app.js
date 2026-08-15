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

el('form-register').addEventListener('submit',
