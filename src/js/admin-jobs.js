import { request } from './api.js';

// ── Field references ────────────────────────────────
const form        = document.getElementById('job-form');
const idInput     = document.getElementById('job_id');
const feedback    = document.getElementById('feedback');
const draftBtn    = document.getElementById('save-draft-btn');

const fPosition   = document.getElementById('field-position');
const fGender     = document.getElementById('field-gender');
const fEmail      = document.getElementById('field-email');
const fSubject    = document.getElementById('field-subject');
const fPhone      = document.getElementById('field-phone');
const fWebsite    = document.getElementById('field-website');

// ── Poster display references ───────────────────────
const pPosition   = document.getElementById('p-position-display');
const pReq        = document.getElementById('p-req');
const pDesc       = document.getElementById('p-desc');
const pBen        = document.getElementById('p-ben');
const pEmail      = document.getElementById('p-email-display');
const pSubject    = document.getElementById('p-subject-display');
const pPhone      = document.getElementById('p-phone-display');
const pWebsite    = document.getElementById('p-website-display');
const pHeroBg     = document.getElementById('p-hero-bg');

// ── Image upload ────────────────────────────────────
const bgInput     = document.getElementById('bg-image-input');
const clearBtn    = document.getElementById('clear-image-btn');
const uploadText  = document.getElementById('upload-label-text');

bgInput?.addEventListener('change', () => {
  const file = bgInput.files?.[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  pHeroBg.style.backgroundImage = `url('${url}')`;
  pHeroBg.classList.add('has-image');
  uploadText.textContent = file.name;
  clearBtn.style.display = 'block';
});

clearBtn?.addEventListener('click', () => {
  bgInput.value = '';
  pHeroBg.style.backgroundImage = '';
  pHeroBg.classList.remove('has-image');
  uploadText.textContent = 'Click to upload background image';
  clearBtn.style.display = 'none';
});

// ── Dynamic list state ──────────────────────────────
const listData = {
  'req-list': [
    'High School graduate (Junior or Senior).',
    '18–35 years old.',
    'Preferably with or without experience (Training will be provided).',
    'Valid ID and NBI Clearance (Required).',
  ],
  'desc-list': [
    'Operate production machines efficiently.',
    'Quality control and visual product inspection.',
    'Maintain a clean and safe work environment (5S).',
  ],
  'ben-list': [
    'Free Shuttle Service (Pick-up points specified).',
    'Attendance Bonus & Overtime Pay.',
    'COMPLETE Benefits (SSS, PhilHealth, PAG-IBIG).',
  ],
};

const posterMap = {
  'req-list':  pReq,
  'desc-list': pDesc,
  'ben-list':  pBen,
};

// ── Feedback ────────────────────────────────────────
function show(msg, type = 'error') {
  if (!feedback) return;
  feedback.className = `notice ${type}`;
  feedback.textContent = msg;
  setTimeout(() => { feedback.textContent = ''; feedback.className = ''; }, 4000);
}

// ── Render editor list ──────────────────────────────
function renderEditorList(listId) {
  const container = document.getElementById(listId);
  if (!container) return;
  container.innerHTML = listData[listId].map((val, i) => `
    <div class="dynamic-list-item">
      <input class="input" value="${val.replace(/"/g, '&quot;').replace(/&/g, '&amp;')}"
             data-list="${listId}" data-index="${i}" placeholder="Enter item..." />
      <button type="button" class="rm-btn" data-remove="${listId}" data-index="${i}" title="Remove">✕</button>
    </div>
  `).join('');
}

// ── Render poster list ──────────────────────────────
function renderPosterList(listId) {
  const el = posterMap[listId];
  if (!el) return;
  el.innerHTML = listData[listId]
    .filter(v => v.trim())
    .map(v => `<li>${v}</li>`)
    .join('');
}

// ── Sync all poster text ────────────────────────────
function syncPoster() {
  const pos    = fPosition?.value.trim() || 'Production Operator';
  const gender = fGender?.value.trim();
  if (pPosition) pPosition.textContent = (gender ? gender + ' ' : '') + pos;
  if (pEmail)   pEmail.textContent    = fEmail?.value.trim()   || 'carmonaqsi@gmail.com';
  if (pSubject) pSubject.textContent  = fSubject?.value.trim() || 'PROD OPERATOR';
  if (pPhone)   pPhone.textContent    = fPhone?.value.trim()   || '+1 (555) 123-4567';
  if (pWebsite) {
    const raw = fWebsite?.value.trim() || 'facebook.com/spot.carmona';
    pWebsite.textContent = raw.replace(/^https?:\/\//, '');
  }
  Object.keys(listData).forEach(renderPosterList);
}

// ── Init everything ─────────────────────────────────
function init() {
  Object.keys(listData).forEach(id => {
    renderEditorList(id);
    renderPosterList(id);
  });
}

// ── Event: input in dynamic list ───────────────────
document.addEventListener('input', (e) => {
  const input = e.target.closest('input[data-list]');
  if (input) {
    listData[input.dataset.list][Number(input.dataset.index)] = input.value;
    renderPosterList(input.dataset.list);
    return;
  }
  // Basic field input → sync poster
  if ([fPosition, fGender, fEmail, fSubject, fPhone, fWebsite].includes(e.target)) {
    syncPoster();
  }
});

// ── Event: clicks (add / remove list items) ─────────
document.addEventListener('click', (e) => {
  const removeBtn = e.target.closest('button[data-remove]');
  if (removeBtn) {
    const { remove: listId, index } = removeBtn.dataset;
    listData[listId].splice(Number(index), 1);
    renderEditorList(listId);
    renderPosterList(listId);
    return;
  }
  const addBtn = e.target.closest('button[data-target]');
  if (addBtn) {
    const listId = addBtn.dataset.target;
    listData[listId].push('');
    renderEditorList(listId);
    setTimeout(() => {
      const c = document.getElementById(listId);
      c?.querySelectorAll('input').item(listData[listId].length - 1)?.focus();
    }, 50);
  }
});

// ── Form submit ──────────────────────────────────────
form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = {
    title:        fPosition?.value.trim(),
    gender:       fGender?.value.trim(),
    requirements: listData['req-list'].filter(v => v.trim()),
    description:  listData['desc-list'].filter(v => v.trim()),
    benefits:     listData['ben-list'].filter(v => v.trim()),
    email:        fEmail?.value.trim(),
    subject:      fSubject?.value.trim(),
    phone:        fPhone?.value.trim(),
    website:      fWebsite?.value.trim(),
  };
  try {
    if (idInput?.value) {
      await request(`/jobs/${idInput.value}`, { method: 'PUT', body: JSON.stringify(data) });
      show('Post updated.', 'success');
    } else {
      const res = await request('/jobs', { method: 'POST', body: JSON.stringify(data) });
      if (idInput && res?.id) idInput.value = res.id;
      show('Post published.', 'success');
    }
  } catch (err) {
    show(err.message, 'error');
  }
});

draftBtn?.addEventListener('click', () => show('Draft saved locally.', 'success'));

// ── Load latest saved template from API ─────────────
async function loadLatestTemplate() {
  try {
    const jobs = await request('/jobs');
    if (!jobs.length) { init(); syncPoster(); return; }
    const j = jobs[0];
    if (idInput)    idInput.value    = j.id       || '';
    if (fPosition)  fPosition.value  = j.title    || '';
    if (fGender)    fGender.value    = j.gender   || '';
    if (fEmail)     fEmail.value     = j.email    || '';
    if (fSubject)   fSubject.value   = j.subject  || '';
    if (fPhone)     fPhone.value     = j.phone    || '';
    if (fWebsite)   fWebsite.value   = j.website  || '';
    if (Array.isArray(j.requirements) && j.requirements.length) listData['req-list']  = j.requirements;
    if (Array.isArray(j.description)  && j.description.length)  listData['desc-list'] = j.description;
    if (Array.isArray(j.benefits)     && j.benefits.length)     listData['ben-list']  = j.benefits;
  } catch { /* use defaults */ }
  init();
  syncPoster();
}

loadLatestTemplate();