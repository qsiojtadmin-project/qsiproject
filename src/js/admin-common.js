import { auth } from './api.js';

const user = auth.user;
if (!user || user.role !== 'admin') {
  document.body.setAttribute('data-admin-preview', 'true');
}

window.addEventListener('DOMContentLoaded', () => {
  const btn = document.getElementById('mobile-toggle');
  const sidebar = document.getElementById('sidebar');

  btn?.addEventListener('click', () => {
    sidebar?.classList.toggle('open');
  });
});
