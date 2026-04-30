import { auth, request } from './api.js';

const details = document.getElementById('job-details');
const params = new URLSearchParams(window.location.search);
const id = params.get('id');

async function loadJob() {
  if (!id) {
    details.innerHTML = '<p class="notice error">Missing job ID.</p>';
    return;
  }

  try {
    const job = await request(`/jobs/${id}`);
    details.innerHTML = `
      <h1>${job.title}</h1>
      <div class="job-meta">
        <span class="tag">${job.location}</span>
        <span class="tag">${job.type}</span>
      </div>
      <p>${job.description}</p>
      <h3>Requirements</h3>
      <p class="muted">Strong communication, team collaboration, and relevant domain experience.</p>
      <a class="btn btn-primary" href="/pages/apply.html?job_id=${job.id}">Apply Now</a>
    `;

    if (!auth.user) {
      const note = document.createElement('p');
      note.className = 'notice warn';
      note.textContent = 'Login is required before submitting an application.';
      details.appendChild(note);
    }
  } catch (error) {
    details.innerHTML = `<p class="notice error">${error.message}</p>`;
  }
}

loadJob();
