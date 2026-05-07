import { updateAuthLinks } from './api.js';
import { updateYear } from './utils.js';

window.addEventListener('DOMContentLoaded', () => {
  updateAuthLinks();
  updateYear();
});
