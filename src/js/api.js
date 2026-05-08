const API_BASE_CANDIDATES = window.location.origin.includes(':5000')
  ? ['/api']
  : ['http://localhost:5000/api', '/api'];

export const API_BASE = API_BASE_CANDIDATES[0];

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
  const isForm = options.body instanceof FormData;
  let lastNetworkError = null;

  for (const base of API_BASE_CANDIDATES) {
    const headers = { ...(options.headers || {}) };

    if (!isForm) {
      headers['Content-Type'] = 'application/json';
    }
    if (auth.token) {
      headers.Authorization = `Bearer ${auth.token}`;
    }

    try {
      const res = await fetch(`${base}${path}`, { ...options, headers });
      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data.message || 'Request failed');
      }

      return data;
    } catch (error) {
      if (error instanceof TypeError) {
        lastNetworkError = error;
        continue;
      }
      throw error;
    }
  }

  if (lastNetworkError) {
    throw new Error('Cannot connect to backend API. Start the backend server (node backend/server.js).');
  }

  throw new Error('Request failed');
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
    window.location.href = '/pages/login.html';
  }
}
