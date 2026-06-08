import { auth, enforceRole, request } from './api.js';

enforceRole('user');

const form = document.getElementById('apply-form');
const feedback = document.getElementById('feedback');
const jobIdInput = document.getElementById('job_id');

function showMessage(message, type = 'error') {
  if (!feedback) return;
  feedback.className = `notice ${type}`;
  feedback.textContent = message;
}

const params = new URLSearchParams(window.location.search);
const jobId = params.get('job_id');
if (jobIdInput && jobId) jobIdInput.value = jobId;

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
    if (jobId) jobIdInput.value = jobId;
  } catch (error) {
    showMessage(error.message, 'error');
  }
});
