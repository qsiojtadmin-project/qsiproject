import { auth, request } from './api.js';

const form = document.getElementById('create-user-form');
const feedback = document.getElementById('user-feedback');
const usersBody = document.getElementById('users-body');
const createBtn = document.getElementById('create-user-btn');
const sessionLabel = document.getElementById('session-label');
const searchInput = document.getElementById('user-search');
const roleFilter = document.getElementById('user-role-filter');
const totalUsersEl = document.getElementById('um-total-users');
const adminCountEl = document.getElementById('um-admin-count');
const userCountEl = document.getElementById('um-user-count');

let allUsers = [];

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function showFeedback(message, type = 'success') {
  if (!feedback) return;
  feedback.className = `um-feedback ${type}`;
  feedback.textContent = message;
}

function roleClass(role) {
  return role === 'admin' ? 'role-pill admin' : 'role-pill';
}

function ensureAdminAccess() {
  const user = auth.user;
  if (!user || user.role !== 'admin') {
    // Keep admin pages accessible in preview mode instead of forcing a login redirect.
    document.body.setAttribute('data-admin-preview', 'true');

    if (sessionLabel) {
      sessionLabel.textContent = 'Admin (Preview)';
    }

    return {
      id: 'preview-admin',
      name: 'Admin',
      role: 'admin',
      isPreview: true
    };
  }

  if (sessionLabel) {
    sessionLabel.textContent = user.name || 'Admin';
  }

  return user;
}

let currentUser = ensureAdminAccess();

async function loadUsers() {
  if (!usersBody || !currentUser) return;

  if (currentUser.isPreview) {
    usersBody.innerHTML = '<tr><td colspan="4">Preview mode: sign in as admin to load real users.</td></tr>';
    return;
  }

  try {
    const users = await request('/admin/users');
    allUsers = Array.isArray(users) ? users : [];
    updateStats(allUsers);
    applyFilters();
  } catch (error) {
    usersBody.innerHTML = `<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`;
  }
}

function updateStats(users = []) {
  const total = users.length;
  const admins = users.filter((item) => String(item.role || '').toLowerCase() === 'admin').length;
  const regularUsers = total - admins;

  if (totalUsersEl) totalUsersEl.textContent = String(total);
  if (adminCountEl) adminCountEl.textContent = String(admins);
  if (userCountEl) userCountEl.textContent = String(regularUsers);
}

function renderUsers(users = []) {
  if (!usersBody) return;

  if (!users.length) {
    usersBody.innerHTML = '<tr><td colspan="4" class="um-empty">No users found.</td></tr>';
    return;
  }

  usersBody.innerHTML = users.map((user) => {
    const isSelf = String(user.id) === String(currentUser?.id);
    const actionBtn = isSelf
      ? '<button class="btn btn-secondary" type="button" disabled>You</button>'
      : `<button class="btn btn-secondary" type="button" data-delete-id="${escapeHtml(user.id)}">Delete</button>`;

    return `
      <tr>
        <td>${escapeHtml(user.name || '-')}</td>
        <td>${escapeHtml(user.email || '-')}</td>
        <td><span class="${roleClass(user.role)}">${escapeHtml(user.role || 'user')}</span></td>
        <td>${actionBtn}</td>
      </tr>
    `;
  }).join('');
}

function applyFilters() {
  const search = String(searchInput?.value || '').trim().toLowerCase();
  const role = String(roleFilter?.value || 'all').toLowerCase();

  const filtered = allUsers.filter((user) => {
    const userRole = String(user.role || 'user').toLowerCase();
    const name = String(user.name || '').toLowerCase();
    const email = String(user.email || '').toLowerCase();

    const matchesRole = role === 'all' || userRole === role;
    const matchesSearch = !search || name.includes(search) || email.includes(search);
    return matchesRole && matchesSearch;
  });

  renderUsers(filtered);
}

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (!currentUser || !createBtn) return;

  if (currentUser.isPreview) {
    showFeedback('Preview mode: sign in as admin to create users.', 'error');
    return;
  }

  const formData = new FormData(form);
  const name = String(formData.get('name') || '').trim();
  const email = String(formData.get('email') || '').trim();
  const password = String(formData.get('password') || '');
  const role = String(formData.get('role') || 'user');

  if (!name || !email || !password) {
    showFeedback('Name, email, and password are required.', 'error');
    return;
  }

  if (password.length < 6) {
    showFeedback('Password must be at least 6 characters.', 'error');
    return;
  }

  try {
    createBtn.disabled = true;
    await request('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ name, email, password, role })
    });

    showFeedback('User created successfully.', 'success');
    form.reset();
    const roleInput = document.getElementById('role');
    if (roleInput) roleInput.value = 'user';

    await loadUsers();
  } catch (error) {
    showFeedback(error.message || 'Failed to create user.', 'error');
  } finally {
    createBtn.disabled = false;
  }
});

usersBody?.addEventListener('click', async (event) => {
  const button = event.target.closest('button[data-delete-id]');
  if (!button) return;

  const userId = button.dataset.deleteId;
  if (!userId) return;

  const confirmed = window.confirm('Delete this user?');
  if (!confirmed) return;

  if (currentUser?.isPreview) {
    showFeedback('Preview mode: sign in as admin to delete users.', 'error');
    return;
  }

  try {
    await request(`/admin/users/${userId}`, { method: 'DELETE' });
    showFeedback('User deleted.', 'success');
    await loadUsers();
  } catch (error) {
    showFeedback(error.message || 'Failed to delete user.', 'error');
  }
});

searchInput?.addEventListener('input', applyFilters);
roleFilter?.addEventListener('change', applyFilters);

if (currentUser) {
  loadUsers();
}
