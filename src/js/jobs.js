import { request } from './api.js';

const jobList = document.getElementById('job-list');
const form = document.getElementById('job-filter-form');

function renderJobs(jobs) {
  if (!jobs.length) {
    jobList.innerHTML = '<p class="muted">No jobs found for your filter.</p>';
    return;
  }

  jobList.innerHTML = jobs.map((job) => `
    <article class="job-card">
      <h3>${job.title}</h3>
      <div class="job-meta">
        <span class="tag">${job.location}</span>
        <span class="tag">${job.type}</span>
      </div>
      <p class="muted">${job.description.slice(0, 160)}...</p>
      <a class="btn btn-primary" href="/pages/job-details.html?id=${job.id}">Read More</a>
    </article>
  `).join('');
}

async function fetchJobs(params = new URLSearchParams()) {
  try {
    const qs = params.toString() ? `?${params.toString()}` : '';
    const jobs = await request(`/jobs${qs}`);
    renderJobs(jobs);
  } catch (error) {
    jobList.innerHTML = `<p class="notice error">${error.message}</p>`;
  }
}

form?.addEventListener('submit', (e) => {
  e.preventDefault();
  const data = new FormData(form);
  const params = new URLSearchParams();
  Object.entries(Object.fromEntries(data.entries())).forEach(([key, value]) => {
    if (value) params.set(key, value);
  });
  fetchJobs(params);
});

fetchJobs();
