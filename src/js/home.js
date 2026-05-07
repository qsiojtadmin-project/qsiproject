import { request } from './api.js';

const recommendedJobsList = document.getElementById('recommended-jobs-list');
const adminDesignsList = document.getElementById('admin-designs-list');
const homeJobFilter = document.getElementById('home-job-filter');
const jobsTotalCount = document.getElementById('jobs-total-count');
const jobsPaginationText = document.getElementById('jobs-pagination-text');
const topMatchesList = document.getElementById('top-matches-list');
const latestOpeningsList = document.getElementById('latest-openings-list');
const jobsKickerTyping = document.getElementById('jobs-kicker-typing');

function escapeHtml(text = '') {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getInitials(title = '') {
  return title
    .split(' ')
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('')
    .substring(0, 2) || 'JB';
}

function getSalaryRange(index) {
  const ranges = ['$60k - $80k', '$110k - $150k', '$120k - $160k', '$140k - $180k', '$160k - $210k'];
  return ranges[index % ranges.length];
}

function getCompactSalary(index) {
  const ranges = ['$80k+', '$130k+', '$150k+', '$180k+', '$210k+'];
  return ranges[index % ranges.length];
}

function getPostedLabel(index) {
  const labels = ['Just now', '1 day ago', '2 days ago', '3 days ago', '5 days ago'];
  return labels[index % labels.length];
}

function getCompanyName(job = {}) {
  return job.company || job.companyName || 'QuestServ Solutions';
}

function getJobType(job = {}) {
  return job.type || 'Full-time';
}

function startKickerTypingAnimation() {
  if (!jobsKickerTyping) return;

  const words = ['Solution'];
  let wordIndex = 0;
  let charIndex = 0;
  let isDeleting = false;

  const tick = () => {
    const currentWord = words[wordIndex];
    charIndex = isDeleting ? charIndex - 1 : charIndex + 1;
    jobsKickerTyping.textContent = currentWord.slice(0, Math.max(charIndex, 0));

    let delay = isDeleting ? 220 : 260;

    if (!isDeleting && charIndex === currentWord.length) {
      delay = 1800;
      isDeleting = true;
    } else if (isDeleting && charIndex === 0) {
      isDeleting = false;
      wordIndex = (wordIndex + 1) % words.length;
      delay = 540;
    }

    window.setTimeout(tick, delay);
  };

  jobsKickerTyping.textContent = '';
  window.setTimeout(tick, 450);
}

function updateJobSummary(total, visible) {
  if (jobsTotalCount) {
    jobsTotalCount.textContent = `${total} Total`;
  }

  if (jobsPaginationText) {
    jobsPaginationText.textContent = total
      ? `Showing 1-${visible} of ${total} results`
      : 'Showing 0 results';
  }
}

function renderJobCards(jobs = []) {
  if (!recommendedJobsList) return;

  if (!jobs.length) {
    recommendedJobsList.innerHTML = '<p class="muted">No jobs available at the moment.</p>';
    updateJobSummary(0, 0);
    return;
  }

  const visibleJobs = jobs.slice(0, 5);
  updateJobSummary(jobs.length, visibleJobs.length);

  recommendedJobsList.innerHTML = visibleJobs.map((job, index) => `
    <article class="jobs-listing-card">
      <div class="jobs-listing-top">
        <div class="jobs-listing-brand">
          <div class="jobs-listing-logo">${escapeHtml(getInitials(job.title))}</div>
          <div>
            <h3>${escapeHtml(job.title)}</h3>
            <p>${escapeHtml(getCompanyName(job))} <span>&bull;</span> ${escapeHtml(job.location || 'Remote')}</p>
          </div>
        </div>
        <span class="jobs-listing-type">${escapeHtml(getJobType(job))}</span>
      </div>

      <p class="jobs-listing-description">
        ${escapeHtml(job.description?.substring(0, 180) || 'Explore a high-impact role with a growing team building practical solutions for enterprise clients.')}
      </p>

      <div class="jobs-listing-bottom">
        <div class="jobs-listing-meta">
          <span>${getSalaryRange(index)}</span>
          <span>${getPostedLabel(index)}</span>
        </div>
        <a href="/pages/apply.html?id=${job.id}" class="jobs-apply-button">Apply Now</a>
      </div>
    </article>
  `).join('');
}

function renderSidebarJobs(target, jobs = [], salarySeed = 0) {
  if (!target || !jobs.length) return;

  target.innerHTML = jobs.slice(0, 3).map((job, index) => `
    <article class="jobs-mini-item">
      <div>
        <strong>${escapeHtml(job.title)}</strong>
        <span>${escapeHtml(job.location || 'Remote')}</span>
      </div>
      <em>${getCompactSalary(index + salarySeed)}</em>
    </article>
  `).join('');
}

async function loadRecommendedJobs() {
  try {
    const jobs = await request('/jobs');
    const list = jobs || [];

    renderJobCards(list);
    renderSidebarJobs(topMatchesList, list, 1);
    renderSidebarJobs(latestOpeningsList, [...list].reverse(), 2);
  } catch (error) {
    console.error('Error loading jobs:', error);
    if (recommendedJobsList) {
      recommendedJobsList.innerHTML = `<p class="muted">Error loading jobs: ${escapeHtml(error.message)}</p>`;
    }
    updateJobSummary(0, 0);
  }
}

async function loadAdminDesigns() {
  if (!adminDesignsList) return;

  try {
    const designs = await request('/admin/designs');
    if (!designs || designs.length === 0) {
      adminDesignsList.innerHTML = '<p class="muted">No design templates available yet.</p>';
      return;
    }

    adminDesignsList.innerHTML = designs.map((design) => `
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
    adminDesignsList.innerHTML = '<p class="muted">No design templates available.</p>';
  }
}

homeJobFilter?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(homeJobFilter);
  const keyword = formData.get('keyword')?.trim() || '';
  const location = formData.get('location')?.trim() || '';

  try {
    const jobs = await request('/jobs');
    let filtered = jobs || [];

    if (keyword) {
      filtered = filtered.filter((job) =>
        job.title.toLowerCase().includes(keyword.toLowerCase()) ||
        (job.description || '').toLowerCase().includes(keyword.toLowerCase())
      );
    }

    if (location) {
      filtered = filtered.filter((job) =>
        (job.location || '').toLowerCase().includes(location.toLowerCase())
      );
    }

    if (!filtered.length) {
      if (recommendedJobsList) {
        recommendedJobsList.innerHTML = '<p class="muted">No jobs match your search criteria.</p>';
      }
      updateJobSummary(0, 0);
      return;
    }

    renderJobCards(filtered);
    renderSidebarJobs(topMatchesList, filtered, 1);
    renderSidebarJobs(latestOpeningsList, [...filtered].reverse(), 2);
  } catch (error) {
    console.error('Error searching jobs:', error);
    if (recommendedJobsList) {
      recommendedJobsList.innerHTML = '<p class="muted">Error searching jobs</p>';
    }
    updateJobSummary(0, 0);
  }
});

loadRecommendedJobs();
loadAdminDesigns();
startKickerTypingAnimation();
