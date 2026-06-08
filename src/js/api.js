export const API_BASE = window.location.origin.includes(':5000')
  ? '/api'
  : 'http://localhost:5000/api';

export const auth = {
  get token() {
    return localStorage.getItem('token');
  },
  get user() {
    const raw = localStorage.getItem('user');
    return raw ? JSON.parse(raw) : null;
  },
  setSession(token, user) {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));
  },
  clear() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },
};

export async function request(path, options = {}) {
  const headers = options.headers || {};
  const isForm = options.body instanceof FormData;

  if (!isForm) {
    headers['Content-Type'] = 'application/json';
  }
  if (auth.token) {
    headers.Authorization = `Bearer ${auth.token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

export function updateAuthLinks() {
  const loginBtn = document.getElementById('nav-login');
  const registerBtn = document.getElementById('nav-register');
  const logoutBtn = document.getElementById('nav-logout');
  const dashboardLink = document.getElementById('nav-dashboard');
  const user = auth.user;

  if (logoutBtn) {
    logoutBtn.onclick = () => {
      auth.clear();
      window.location.href = '/index.html';
    };
  }

  if (!loginBtn || !registerBtn || !dashboardLink) return;

  if (user) {
    loginBtn.style.display = 'none';
    registerBtn.style.display = 'none';
    if (logoutBtn) logoutBtn.style.display = 'inline-flex';
    dashboardLink.style.display = 'inline-flex';
    dashboardLink.href = user.role === 'admin' ? '/pages/admin-dashboard.html' : '/pages/jobs.html';
  } else {
    loginBtn.style.display = 'inline-flex';
    registerBtn.style.display = 'inline-flex';
    if (logoutBtn) logoutBtn.style.display = 'none';
    dashboardLink.style.display = 'none';
  }
}

export function enforceRole(role) {
  const user = auth.user;
  if (!user || (role && user.role !== role)) {
    window.location.href = '/pages/login-only.html';
  }
}
