import { updateAuthLinks } from './api.js';

window.addEventListener('DOMContentLoaded', () => {
  updateAuthLinks();

  const yearEl = document.getElementById('year');
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
});
