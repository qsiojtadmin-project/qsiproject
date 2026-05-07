import { request } from './api.js';

const form = document.getElementById('job-form');
const idInput = document.getElementById('job_id');
const feedback = document.getElementById('feedback');
const draftBtn = document.getElementById('save-draft-btn');
const alertOverlay = document.getElementById('job-alert');
const alertTitle = document.getElementById('job-alert-title');
const alertMessage = document.getElementById('job-alert-message');
const alertOkBtn = document.getElementById('job-alert-ok');
const alertModal = alertOverlay?.querySelector('.job-alert-modal');
const submitBtn = document.getElementById('job-save-btn');

const fPosition = document.getElementById('field-position');
const fGender = document.getElementById('field-gender');
const fEmail = document.getElementById('field-email');
const fSubject = document.getElementById('field-subject');
const fPhone = document.getElementById('field-phone');
const fWebsite = document.getElementById('field-website');

const pPosition = document.getElementById('p-position-display');
const pReq = document.getElementById('p-req');
const pDesc = document.getElementById('p-desc');
const pBen = document.getElementById('p-ben');
const pEmail = document.getElementById('p-email-display');
const pSubject = document.getElementById('p-subject-display');
const pPhone = document.getElementById('p-phone-display');
const pWebsite = document.getElementById('p-website-display');
const pHeroBg = document.getElementById('p-hero-bg');

const bgInput = document.getElementById('bg-image-input');
const clearBtn = document.getElementById('clear-image-btn');
const uploadText = document.getElementById('upload-label-text');

const params = new URLSearchParams(window.location.search);
const requestedJobId = params.get('id');
let backgroundImageUrl = '';
let closeTimer = null;
let isSaving = false;

function cancelAnimations(el) {
  if (!el || typeof el.getAnimations !== 'function') return;
  el.getAnimations().forEach((animation) => animation.cancel());
}

const listData = {
  'req-list': [
    'High School graduate (Junior or Senior).',
    '18-35 years old.',
    'Preferably with or without experience (Training will be provided).',
    'Valid ID and NBI Clearance (Required).'
  ],
  'desc-list': [
    'Operate production machines efficiently.',
    'Quality control and visual product inspection.',
    'Maintain a clean and safe work environment (5S).'
  ],
  'ben-list': [
    'Free Shuttle Service (Pick-up points specified).',
    'Attendance Bonus and Overtime Pay.',
    'Complete benefits (SSS, PhilHealth, PAG-IBIG).'
  ]
};

const posterMap = {
  'req-list': pReq,
  'desc-list': pDesc,
  'ben-list': pBen
};

function show(msg, type = 'error') {
  if (!feedback) return;
  feedback.className = `notice ${type}`;
  feedback.textContent = msg;

  if (type === 'success') {
    return;
  }

  window.setTimeout(() => {
    feedback.textContent = '';
    feedback.className = '';
  }, 8000);
}

function openSuccessModal(title, message) {
  if (!alertOverlay || !alertTitle || !alertMessage) return;

  if (closeTimer) {
    window.clearTimeout(closeTimer);
    closeTimer = null;
  }

  alertTitle.textContent = title;
  alertMessage.textContent = message;

  alertOverlay.classList.remove('is-closing', 'is-open');
  cancelAnimations(alertModal);
  alertOverlay.querySelectorAll('*').forEach((node) => cancelAnimations(node));
  requestAnimationFrame(() => {
    alertOverlay.classList.add('is-open');
    alertOverlay.setAttribute('aria-hidden', 'false');
    alertOkBtn?.focus();
  });

  alertOverlay.setAttribute('aria-hidden', 'false');
}

function closeSuccessModal() {
  if (!alertOverlay) return;

  if (!alertOverlay.classList.contains('is-open')) return;

  alertOverlay.classList.remove('is-open');
  alertOverlay.classList.add('is-closing');

  if (closeTimer) {
    window.clearTimeout(closeTimer);
  }

  closeTimer = window.setTimeout(() => {
    alertOverlay.classList.remove('is-closing');
    alertOverlay.setAttribute('aria-hidden', 'true');
    closeTimer = null;
  }, 360);
}

function setSavingState(nextState) {
  isSaving = nextState;
  if (submitBtn) submitBtn.disabled = nextState;
  if (draftBtn) draftBtn.disabled = nextState;
}

function applyBackgroundImage(url = '') {
  backgroundImageUrl = url;

  if (url) {
    pHeroBg.style.backgroundImage = `url('${url}')`;
    pHeroBg.style.backgroundSize = 'cover';
    pHeroBg.style.backgroundPosition = 'center';
    pHeroBg.classList.add('has-image');
    uploadText.textContent = 'Background image loaded';
    clearBtn.style.display = 'block';
    return;
  }

  pHeroBg.style.backgroundImage = '';
  pHeroBg.classList.remove('has-image');
  uploadText.textContent = 'Click to upload background image';
  clearBtn.style.display = 'none';
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Failed to read image file'));
    reader.readAsDataURL(file);
  });
}

bgInput?.addEventListener('change', async () => {
  const file = bgInput.files?.[0];
  if (!file) return;

  try {
    const dataUrl = await readFileAsDataUrl(file);
    applyBackgroundImage(dataUrl);
    uploadText.textContent = file.name;
  } catch (error) {
    show(error.message, 'error');
  }
});

clearBtn?.addEventListener('click', () => {
  if (bgInput) bgInput.value = '';
  applyBackgroundImage('');
});

function renderEditorList(listId) {
  const container = document.getElementById(listId);
  if (!container) return;

  container.innerHTML = listData[listId].map((val, index) => `
    <div class="dynamic-list-item">
      <input
        class="input"
        value="${val.replace(/&/g, '&amp;').replace(/"/g, '&quot;')}"
        data-list="${listId}"
        data-index="${index}"
        placeholder="Enter item..."
      />
      <button type="button" class="rm-btn" data-remove="${listId}" data-index="${index}" title="Remove">x</button>
    </div>
  `).join('');
}

function renderPosterList(listId) {
  const el = posterMap[listId];
  if (!el) return;

  el.innerHTML = listData[listId]
    .filter((value) => value.trim())
    .map((value) => `<li>${value}</li>`)
    .join('');
}

function syncPoster() {
  const position = fPosition?.value.trim() || 'Production Operator';
  const gender = fGender?.value.trim();

  if (pPosition) pPosition.textContent = `${gender ? `${gender} ` : ''}${position}`;
  if (pEmail) pEmail.textContent = fEmail?.value.trim() || 'carmonaqsi@gmail.com';
  if (pSubject) pSubject.textContent = fSubject?.value.trim() || 'MALE PROD OPERATOR';
  if (pPhone) pPhone.textContent = fPhone?.value.trim() || '+1 (555) 123-4567';
  if (pWebsite) pWebsite.textContent = fWebsite?.value.trim() || 'https://www.facebook.com/spal.carmona';

  Object.keys(listData).forEach(renderPosterList);
}

function init() {
  Object.keys(listData).forEach((listId) => {
    renderEditorList(listId);
    renderPosterList(listId);
  });
}

function buildPayload(status) {
  return {
    title: fPosition?.value.trim(),
    gender: fGender?.value.trim(),
    requirements: listData['req-list'].filter((value) => value.trim()),
    description: listData['desc-list'].filter((value) => value.trim()),
    benefits: listData['ben-list'].filter((value) => value.trim()),
    email: fEmail?.value.trim(),
    subject: fSubject?.value.trim(),
    phone: fPhone?.value.trim(),
    website: fWebsite?.value.trim(),
    backgroundImageUrl,
    status
  };
}

async function persistTemplate(status) {
  const payload = buildPayload(status);

  if (!payload.title) {
    show('Position title is required.', 'error');
    return null;
  }

  if (idInput?.value) {
    return request(`/jobs/${idInput.value}`, {
      method: 'PUT',
      body: JSON.stringify(payload)
    });
  }

  return request('/jobs', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
}

document.addEventListener('input', (event) => {
  const input = event.target.closest('input[data-list]');
  if (input) {
    listData[input.dataset.list][Number(input.dataset.index)] = input.value;
    renderPosterList(input.dataset.list);
    return;
  }

  if ([fPosition, fGender, fEmail, fSubject, fPhone, fWebsite].includes(event.target)) {
    syncPoster();
  }
});

document.addEventListener('click', (event) => {
  const removeBtn = event.target.closest('button[data-remove]');
  if (removeBtn) {
    const { remove: listId, index } = removeBtn.dataset;
    listData[listId].splice(Number(index), 1);
    renderEditorList(listId);
    renderPosterList(listId);
    return;
  }

  const addBtn = event.target.closest('button[data-target]');
  if (!addBtn) return;

  const listId = addBtn.dataset.target;
  listData[listId].push('');
  renderEditorList(listId);
  window.setTimeout(() => {
    const container = document.getElementById(listId);
    container?.querySelectorAll('input').item(listData[listId].length - 1)?.focus();
  }, 50);
});

form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  if (isSaving) return;

  try {
    setSavingState(true);
    const saved = await persistTemplate('published');
    if (!saved) return;

    if (idInput) idInput.value = saved.id;
    if (saved.id) {
      params.set('id', saved.id);
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    }

    openSuccessModal('Post Published', 'Your job hire template was published successfully and will appear in Home Posts.');
  } catch (error) {
    show(error.message, 'error');
  } finally {
    setSavingState(false);
  }
});

draftBtn?.addEventListener('click', async () => {
  if (isSaving) return;

  try {
    setSavingState(true);
    const saved = await persistTemplate('draft');
    if (!saved) return;

    if (idInput) idInput.value = saved.id;
    if (saved.id) {
      params.set('id', saved.id);
      window.history.replaceState({}, '', `${window.location.pathname}?${params.toString()}`);
    }

    openSuccessModal('Draft Saved', 'Your job hire template draft was saved successfully.');
  } catch (error) {
    show(error.message, 'error');
  } finally {
    setSavingState(false);
  }
});

alertOkBtn?.addEventListener('click', closeSuccessModal);
alertOverlay?.addEventListener('click', (event) => {
  if (event.target === alertOverlay) closeSuccessModal();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeSuccessModal();
});

function applyLoadedTemplate(job) {
  if (idInput) idInput.value = job.id || '';
  if (fPosition) fPosition.value = job.title || '';
  if (fGender) fGender.value = job.gender || '';
  if (fEmail) fEmail.value = job.email || '';
  if (fSubject) fSubject.value = job.subject || '';
  if (fPhone) fPhone.value = job.phone || '';
  if (fWebsite) fWebsite.value = job.website || '';

  if (Array.isArray(job.requirements) && job.requirements.length) listData['req-list'] = job.requirements;
  if (Array.isArray(job.description) && job.description.length) listData['desc-list'] = job.description;
  if (Array.isArray(job.benefits) && job.benefits.length) listData['ben-list'] = job.benefits;

  applyBackgroundImage(job.backgroundImageUrl || '');
}

async function loadTemplate() {
  try {
    if (requestedJobId) {
      const job = await request(`/admin/jobs/${requestedJobId}`);
      applyLoadedTemplate(job);
    } else {
      const jobs = await request('/admin/jobs');
      if (jobs.length) applyLoadedTemplate(jobs[0]);
    }
  } catch {
    // Keep defaults if nothing is stored yet.
  }

  init();
  syncPoster();
}

loadTemplate();
