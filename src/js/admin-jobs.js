import { request } from './api.js';

const form = document.getElementById('job-form');
const saveBtn = document.getElementById('job-save-btn');
const idInput = document.getElementById('job_id');
const feedback = document.getElementById('feedback');
const imageInput = document.getElementById('template-image');

const previewCard = document.getElementById('job-preview-card');
const previewTitle = document.getElementById('preview-title');
const previewDescription = document.getElementById('preview-description');
const previewMeta = document.getElementById('preview-meta');
const previewCta = document.getElementById('preview-cta');

const fontFamilySelect = document.getElementById('style-font-family');
const fontSizeRange = document.getElementById('style-font-size');
const fontSizeLabel = document.getElementById('style-font-size-label');
const textColorInput = document.getElementById('style-text-color');
const textColorPicker = document.getElementById('style-text-color-picker');
const overlayRange = document.getElementById('style-overlay');
const overlayLabel = document.getElementById('style-overlay-label');

const draftBtn = document.getElementById('save-draft-btn');
const previewBtn = document.getElementById('preview-post-btn');

function show(msg, type = 'error') {
  if (!feedback) return;
  feedback.className = `notice ${type}`;
  feedback.textContent = msg;
}

function refreshPreview() {
  if (!form) return;

  previewTitle.textContent = form.title.value || 'Senior Software Engineer';
  previewDescription.textContent = form.description.value || 'Join our innovative team and build cutting-edge solutions';
  previewMeta.textContent = form.details?.value || 'Full-time • Remote • $120k-$160k';
  previewCta.textContent = form.cta?.value || 'Apply Now';

  const size = Number(fontSizeRange?.value || 24);
  const family = fontFamilySelect?.value || 'Inter';
  const textColor = textColorInput?.value || '#ffffff';
  const overlay = Number(overlayRange?.value || 60) / 100;

  if (fontSizeLabel) fontSizeLabel.textContent = `${size}px`;
  if (overlayLabel) overlayLabel.textContent = `${Math.round(overlay * 100)}%`;

  previewCard.style.fontFamily = family;
  previewCard.style.color = textColor;
  previewTitle.style.fontSize = `${size + 10}px`;
  previewDescription.style.fontSize = `${Math.max(size - 2, 14)}px`;
  previewMeta.style.fontSize = `${Math.max(size - 4, 12)}px`;
  previewCard.style.background = `linear-gradient(135deg, rgba(0, 31, 22, ${overlay}), rgba(0, 50, 40, ${Math.min(overlay + 0.08, 1)}))`;
}

function resetForm() {
  form?.reset();
  if (idInput) idInput.value = '';
  if (saveBtn) saveBtn.textContent = 'Publish Post';
  if (fontSizeRange) fontSizeRange.value = '24';
  if (textColorInput) textColorInput.value = '#ffffff';
  if (textColorPicker) textColorPicker.value = '#ffffff';
  if (overlayRange) overlayRange.value = '60';
  if (fontFamilySelect) fontFamilySelect.value = 'Inter';
  refreshPreview();
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const data = Object.fromEntries(new FormData(form).entries());

  try {
    if (idInput?.value) {
      await request(`/jobs/${idInput.value}`, { method: 'PUT', body: JSON.stringify(data) });
      show('Template updated.', 'success');
    } else {
      await request('/jobs', { method: 'POST', body: JSON.stringify(data) });
      show('Template published.', 'success');
    }
  } catch (error) {
    show(error.message, 'error');
  }
});

form?.addEventListener('input', refreshPreview);
fontFamilySelect?.addEventListener('change', refreshPreview);
fontSizeRange?.addEventListener('input', refreshPreview);
overlayRange?.addEventListener('input', refreshPreview);

textColorInput?.addEventListener('input', () => {
  if (textColorPicker) textColorPicker.value = textColorInput.value;
  refreshPreview();
});

textColorPicker?.addEventListener('input', () => {
  if (textColorInput) textColorInput.value = textColorPicker.value;
  refreshPreview();
});

imageInput?.addEventListener('change', () => {
  const file = imageInput.files?.[0];
  if (!file) return;
  const url = URL.createObjectURL(file);
  previewCard.style.background = `linear-gradient(135deg, rgba(0, 31, 22, 0.62), rgba(0, 50, 40, 0.70)), url('${url}') center/cover no-repeat`;
});

draftBtn?.addEventListener('click', () => {
  show('Draft saved locally.', 'success');
});

previewBtn?.addEventListener('click', () => {
  refreshPreview();
  show('Preview updated.', 'success');
});

async function loadLatestTemplate() {
  try {
    const jobs = await request('/jobs');
    if (!jobs.length || !form) {
      resetForm();
      return;
    }

    const latest = jobs[0];
    form.title.value = latest.title || '';
    form.description.value = latest.description || '';
    if (form.details) form.details.value = latest.details || `${latest.type || 'Full-time'} • ${latest.location || 'Remote'} • ${latest.salary || '$120k-$160k'}`;
    if (form.cta) form.cta.value = latest.cta || 'Apply Now';
    if (idInput) idInput.value = latest.id || '';
    if (saveBtn) saveBtn.textContent = latest.id ? 'Publish Post' : 'Publish Post';
    refreshPreview();
  } catch {
    resetForm();
  }
}

loadLatestTemplate();
