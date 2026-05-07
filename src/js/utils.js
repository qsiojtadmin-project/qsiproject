export function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function wirePasswordToggle(button) {
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

export function initPasswordToggles(root = document) {
  root.querySelectorAll('[data-password-toggle]').forEach(wirePasswordToggle);
}

export function updateYear(selector = '#year') {
  const yearEl = document.querySelector(selector);
  if (yearEl) {
    yearEl.textContent = new Date().getFullYear();
  }
}

export function initAdminShortcut() {
  const secretSequences = ['ADMIN', 'SUPERADMIN'];
  const secretBypassKey = 'questserv_secret_bypass';
  let secretBuffer = '';

  document.addEventListener('keydown', (event) => {
    if (!event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) {
      secretBuffer = '';
      return;
    }

    const char = (event.key || '').toUpperCase();
    if (char.length !== 1 || !/[A-Z]/.test(char)) {
      secretBuffer = '';
      return;
    }

    secretBuffer += char;

    const matchedSequence = secretSequences.find((sequence) => secretBuffer === sequence);
    if (matchedSequence) {
      sessionStorage.setItem(secretBypassKey, 'true');
      window.location.href = '/pages/admin-ui.html';
      secretBuffer = '';
      return;
    }

    const hasValidPrefix = secretSequences.some((sequence) => sequence.startsWith(secretBuffer));
    if (hasValidPrefix) {
      return;
    }

    secretBuffer = char;
    const canRestart = secretSequences.some((sequence) => sequence.startsWith(secretBuffer));
    if (!canRestart) {
      secretBuffer = '';
    }
  });
}
