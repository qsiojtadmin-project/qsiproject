import { auth, request } from './api.js';

const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const roleSelect = document.getElementById('role');
const adminCodeInput = document.getElementById('admin_code');
const adminCodeField = document.getElementById('admin-code-field');

function wirePasswordToggle(button) {
  const targetId = button.dataset.target;
  const input = document.getElementById(targetId);
  if (!input) return;

  button.addEventListener('click', () => {
    const isHidden = input.type === 'password';
    input.type = isHidden ? 'text' : 'password';
    button.classList.toggle('is-visible', isHidden);
    button.setAttribute('aria-label', `${isHidden ? 'Hide' : 'Show'} password`);
    button.setAttribute('aria-pressed', isHidden ? 'true' : 'false');
  });
}

document.querySelectorAll('[data-password-toggle]').forEach(wirePasswordToggle);

function getFeedbackEl(formType) {
  return document.getElementById(`${formType}-feedback`) || document.getElementById('feedback');
}

function showMessage(formType, message, type = 'error') {
  const feedback = getFeedbackEl(formType);
  if (!feedback) return;
  feedback.className = `notice ${type}`;
  feedback.textContent = message;
}

function clearMessage(formType) {
  const feedback = getFeedbackEl(formType);
  if (!feedback) return;
  feedback.className = '';
  feedback.textContent = '';
}

roleSelect?.addEventListener('change', () => {
  const isAdmin = roleSelect.value === 'admin';
  if (!adminCodeInput || !adminCodeField) return;
  adminCodeField.style.display = isAdmin ? 'block' : 'none';
  adminCodeInput.required = isAdmin;
  if (!isAdmin) {
    adminCodeInput.value = '';
  }
});

loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessage('login');
  const data = Object.fromEntries(new FormData(loginForm).entries());

  try {
    const res = await request('/auth/login', { method: 'POST', body: JSON.stringify(data) });
    auth.setSession(res.token, res.user);
    window.location.href = res.user.role === 'admin' ? '/pages/admin-dashboard.html' : '/pages/jobs.html';
  } catch (error) {
    showMessage('login', error.message, 'error');
  }
});

registerForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  clearMessage('register');
  const data = Object.fromEntries(new FormData(registerForm).entries());

  if ((data.password || '').length < 6) {
    showMessage('register', 'Password must be at least 6 characters.', 'error');
    return;
  }

  try {
    const res = await request('/auth/register', { method: 'POST', body: JSON.stringify(data) });
    auth.setSession(res.token, res.user);
    window.location.href = res.user.role === 'admin' ? '/pages/admin-dashboard.html' : '/pages/jobs.html';
  } catch (error) {
    showMessage('register', error.message, 'error');
  }
});
