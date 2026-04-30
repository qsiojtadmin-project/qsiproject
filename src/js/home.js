import { request } from './api.js';

const recommendedJobsList = document.getElementById('recommended-jobs-list');
const adminDesignsList = document.getElementById('admin-designs-list');
const homeJobFilter = document.getElementById('home-job-filter');

function escapeHtml(text = '') {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getInitials(title = '') {
  return title
    .split(' ')
    .slice(0, 2)
    .map(word => word[0]?.toUpperCase())
    .join('')
    .substring(0, 2) || 'JB';
}

async function loadRecommendedJobs() {
  try {
    const jobs = await request('/jobs');
    if (!jobs || jobs.length === 0) {
      recommendedJobsList.innerHTML = '<p class="muted">No jobs available at the moment.</p>';
      return;
    }

    // Show only first 4 recommended jobs
    const recommended = jobs.slice(0, 4);
    recommendedJobsList.innerHTML = recommended.map(job => `
      <div class="home-job-card">
        <div class="home-job-card-header">
          <div class="home-job-card-logo">${escapeHtml(getInitials(job.title))}</div>
          <div>
            <h3 class="home-job-card-title">${escapeHtml(job.title)}</h3>
          </div>
        </div>
        <div class="home-job-card-meta">
          <span>📍 ${escapeHtml(job.location || 'Remote')}</span>
          <span>💼 ${escapeHtml(job.type || 'Full-time')}</span>
        </div>
        <p class="home-job-card-desc">${escapeHtml(job.description?.substring(0, 100) + '...' || 'Exciting opportunity awaits')}</p>
        <div class="home-job-card-footer">
          <a href="/pages/job-details.html?id=${job.id}" class="btn btn-outline">View Details</a>
          <a href="/pages/apply.html?id=${job.id}" class="btn btn-primary">Submit Resume</a>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading jobs:', error);
    recommendedJobsList.innerHTML = `<p class="muted">Error loading jobs: ${escapeHtml(error.message)}</p>`;
  }
}

async function loadAdminDesigns() {
  try {
    const designs = await request('/admin/designs');
    if (!designs || designs.length === 0) {
      adminDesignsList.innerHTML = '<p class="muted">No design templates available yet.</p>';
      return;
    }

    // Show all available designs
    adminDesignsList.innerHTML = designs.map(design => `
      <div class="home-design-card">
        <div class="home-design-card-image">
          ${design.imageUrl ? `<img src="${escapeHtml(design.imageUrl)}" alt="${escapeHtml(design.title)}" />` : `<div>${escapeHtml(design.title)}</div>`}
        </div>
        <div class="home-design-card-content">
          <h3 class="home-design-card-title">${escapeHtml(design.title)}</h3>
          <div class="home-design-card-meta">
            ${design.type ? `<span class="home-design-tag">${escapeHtml(design.type)}</span>` : ''}
            ${design.category ? `<span class="home-design-tag">${escapeHtml(design.category)}</span>` : ''}
          </div>
          <p class="home-design-card-desc">${escapeHtml(design.description?.substring(0, 80) + '...' || '')}</p>
          <div class="home-design-card-footer">
            <a href="#" class="btn btn-primary">View Requirements</a>
          </div>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading designs:', error);
    // Silently fail if designs endpoint doesn't exist
    adminDesignsList.innerHTML = '<p class="muted">No design templates available.</p>';
  }
}

// Handle job filter form
homeJobFilter?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const formData = new FormData(homeJobFilter);
  const keyword = formData.get('keyword')?.trim() || '';
  const location = formData.get('location')?.trim() || '';

  try {
    const jobs = await request('/jobs');
    let filtered = jobs || [];

    if (keyword) {
      filtered = filtered.filter(job =>
        job.title.toLowerCase().includes(keyword.toLowerCase()) ||
        (job.description || '').toLowerCase().includes(keyword.toLowerCase())
      );
    }

    if (location) {
      filtered = filtered.filter(job =>
        (job.location || '').toLowerCase().includes(location.toLowerCase())
      );
    }

    if (filtered.length === 0) {
      recommendedJobsList.innerHTML = '<p class="muted">No jobs match your search criteria.</p>';
      return;
    }

    recommendedJobsList.innerHTML = filtered.slice(0, 4).map(job => `
      <div class="home-job-card">
        <div class="home-job-card-header">
          <div class="home-job-card-logo">${escapeHtml(getInitials(job.title))}</div>
          <div>
            <h3 class="home-job-card-title">${escapeHtml(job.title)}</h3>
          </div>
        </div>
        <div class="home-job-card-meta">
          <span>📍 ${escapeHtml(job.location || 'Remote')}</span>
          <span>💼 ${escapeHtml(job.type || 'Full-time')}</span>
        </div>
        <p class="home-job-card-desc">${escapeHtml(job.description?.substring(0, 100) + '...' || 'Exciting opportunity awaits')}</p>
        <div class="home-job-card-footer">
          <a href="/pages/job-details.html?id=${job.id}" class="btn btn-outline">View Details</a>
          <a href="/pages/apply.html?id=${job.id}" class="btn btn-primary">Submit Resume</a>
        </div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error searching jobs:', error);
    recommendedJobsList.innerHTML = `<p class="muted">Error searching jobs</p>`;
  }
});

// Load data on page load
loadRecommendedJobs();
loadAdminDesigns();
