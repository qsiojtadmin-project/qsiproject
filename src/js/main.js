import { request } from './api.js';

async function loadFeaturedJobs() {
  const list = document.getElementById('featured-jobs');
  if (!list) return;

  try {
    const jobs = await request('/jobs/featured');
    if (!jobs.length) {
      list.innerHTML = '<p class="muted">No open roles yet.</p>';
      return;
    }

    list.innerHTML = jobs.map((job) => `
      <article class="job-card">
        <h3>${job.title}</h3>
        <div class="job-meta">
          <span class="tag">${job.location}</span>
          <span class="tag">${job.type}</span>
        </div>
        <p class="muted">${job.description.slice(0, 110)}...</p>
        <a class="btn btn-secondary" href="/pages/job-details.html?id=${job.id}">View Details</a>
      </article>
    `).join('');
  } catch (error) {
    list.innerHTML = `<p class="notice error">${error.message}</p>`;
  }
}

loadFeaturedJobs();
