import { auth, enforceRole, request } from './api.js';

enforceRole('user');

const form = document.getElementById('application-form') || document.getElementById('apply-form');
const feedback = document.getElementById('feedback');
const jobIdInput = document.getElementById('job_id');
const nameInput = document.getElementById('profile-name') || document.getElementById('fullName');
const emailInput = document.getElementById('profile-email') || document.getElementById('email');

function showMessage(message, type = 'error') {
  if (!feedback) return;
  feedback.className = `notice ${type}`;
  feedback.textContent = message;
}

const params = new URLSearchParams(window.location.search);
const jobId = params.get('job_id') || params.get('id');
if (jobIdInput && jobId) jobIdInput.value = jobId;

if (auth.user) {
  if (nameInput) nameInput.value = auth.user.name || '';
  if (emailInput) emailInput.value = auth.user.email || '';
}

form?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const data = new FormData(form);

  try {
    await request('/applications', {
      method: 'POST',
      body: data,
    });
    showMessage('Application submitted successfully.', 'success');
    form.reset();
    if (auth.user) {
      if (nameInput) nameInput.value = auth.user.name || '';
      if (emailInput) emailInput.value = auth.user.email || '';
    }
    if (jobId && jobIdInput) jobIdInput.value = jobId;
  } catch (error) {
    showMessage(error.message, 'error');
  }
});
