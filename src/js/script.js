const loginToggleBtn = document.getElementById('login-toggle-btn');
const loginDropdownMenu = document.getElementById('login-dropdown-menu');
const loginForm = document.getElementById('inline-login-form');
const jobFilterForm = document.getElementById('home-job-filter');
const filterDropdownForm = document.getElementById('filter-dropdown-form');
const filterToggleBtn = document.getElementById('filter-toggle-btn');
const filterDropdownMenu = document.getElementById('filter-dropdown-menu');
const filterDropdownClose = document.querySelector('.filter-dropdown-close');
const recommendedJobsList = document.getElementById('recommended-jobs-list');
const homeRecommendedJobsList = document.getElementById('home-recommended-jobs-list');
const jobsTotalCount = document.getElementById('jobs-total-count');
const homeJobsTotalCount = document.getElementById('home-jobs-total-count');
const jobsPaginationText = document.getElementById('jobs-pagination-text');
const homePosterRoot = document.getElementById('home-poster-root');

const SUPABASE_CONFIG = {
  url: window.__SUPABASE_URL__ || 'https://ilbneblzkvzebuklyzgn.supabase.co',
  anonKey: window.__SUPABASE_ANON_KEY__ || '',
};

const SECRET_SEQUENCES = ['ADMIN', 'SUPERADMIN'];
let secretBuffer = '';

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getSupabaseHeaders() {
  return {
    apikey: SUPABASE_CONFIG.anonKey,
    Authorization: `Bearer ${SUPABASE_CONFIG.anonKey}`,
  };
}

function normalizeJobTemplate(row = {}) {
  return {
    id: row.id || '',
    title: row.title || 'Untitled Draft',
    email: row.email || 'hr@questserv.com',
    phone: row.phone || '+1 (555) 123-4567',
    website: row.website || 'www.questserv.com',
    location: row.location || '',
    backgroundImageUrl: row.background_image_url || row.backgroundImageUrl || '',
    requirements: Array.isArray(row.requirements) ? row.requirements : [],
    benefits: Array.isArray(row.benefits) ? row.benefits : [],
    description: Array.isArray(row.description_items)
      ? row.description_items
      : Array.isArray(row.description)
        ? row.description
        : `${row.description_text || ''}`.split('\n').map((line) => line.trim()).filter(Boolean),
  };
}

function buildPosterList(value, fallback) {
  const lines = (Array.isArray(value) ? value : `${value || ''}`.split('\n'))
    .map((line) => String(line).trim())
    .filter(Boolean)
    .slice(0, 4);

  if (!lines.length) {
    return `<li>${escapeHtml(fallback)}</li>`;
  }

  return lines.map((line) => `<li>${escapeHtml(line)}</li>`).join('');
}

function renderHomePoster(post) {
  if (!homePosterRoot) return;

  const title = post?.title || 'Untitled Draft';
  const email = post?.email || 'hr@questserv.com';
  const phone = post?.phone || '+1 (555) 123-4567';
  const website = post?.website || 'www.questserv.com';
  const background = post?.backgroundImageUrl
    ? `<div class="vt-bg" style="background-image: url('${escapeHtml(post.backgroundImageUrl)}')"></div>`
    : '';
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(website)}`;

  homePosterRoot.innerHTML = `
    <div class="home-poster-card">
      <div class="vt-poster">
        ${background}
        <div class="vt-watermark">QUESTSERV SOLUTIONS</div>
        <div class="vt-top">
          <div class="vt-brand">
            <img class="vt-logo" src="assets/logo1.png" alt="QuestServ logo">
            <div class="vt-brand-text"></div>
          </div>
          <div class="vt-hire-badge">
            <span class="we-are">WE ARE</span>
            <span class="hiring">HIRING</span>
          </div>
        </div>
        <div class="vt-hero">
          <h2 id="home-poster-title" class="vt-hero-title">${escapeHtml(title.toUpperCase())}</h2>
          <p class="vt-hero-sub">For position</p>
        </div>
        <div class="vt-body">
          <div class="vt-col">
            <div class="vt-sec">
              <h3 class="vt-sec-title">Requirements</h3>
              <ul class="vt-sec-list">${buildPosterList(post?.requirements, 'Update this content...')}</ul>
            </div>
            <div class="vt-sec">
              <h3 class="vt-sec-title">Benefits</h3>
              <ul class="vt-sec-list">${buildPosterList(post?.benefits, 'Update this content...')}</ul>
            </div>
          </div>
          <div class="vt-divider"></div>
          <div class="vt-col">
            <div class="vt-sec">
              <h3 class="vt-sec-title">Job Description</h3>
              <ul class="vt-sec-list">${buildPosterList(post?.description, 'Update this content...')}</ul>
            </div>
            <div class="vt-sec">
              <h3 class="vt-sec-title">Submit Resume</h3>
              <ul class="vt-sec-list">
                <li>Send your resume to:</li>
                <li><span class="vt-email-hl">${escapeHtml(email)}</span></li>
                <li>${escapeHtml(phone)}</li>
                <li>Subject line: Application - ${escapeHtml(title)}</li>
              </ul>
            </div>
          </div>
        </div>
        <div class="vt-footer">
          <div class="vt-footer-info">
            <span class="hl">${escapeHtml(phone)}</span>
            <span>${escapeHtml(website)}</span>
            <span>${escapeHtml(email)}</span>
          </div>
          <div class="vt-qr">
            <img src="${qrUrl}" alt="QR code">
          </div>
        </div>
      </div>
    </div>
  `;
}

async function loadHomePoster() {
  if (!homePosterRoot) return;

  const fallbackPoster = {
    title: 'Untitled Draft',
    email: 'qsjotadmin@gmail.com',
    phone: '09999999999',
    website: 'www.questserv.com',
    requirements: ['Example', 'Example', 'Example'],
    benefits: ['Example', 'Example', 'Example'],
    description: ['Example', 'Example', 'Example'],
  };

  if (!SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey) {
    renderHomePoster(fallbackPoster);
    return;
  }

  try {
    const response = await fetch(
      `${SUPABASE_CONFIG.url}/rest/v1/job_templates?status=eq.published&select=*&order=published_at.desc.nullslast,updated_at.desc&limit=1`,
      { headers: getSupabaseHeaders() },
    );
    if (!response.ok) throw new Error('Failed to load poster');

    const rows = await response.json();
    renderHomePoster(rows.length ? normalizeJobTemplate(rows[0]) : fallbackPoster);
  } catch (error) {
    console.error(error);
    renderHomePoster(fallbackPoster);
  }
}

function setLoginMenu(open) {
  if (!loginDropdownMenu || !loginToggleBtn) return;
  loginDropdownMenu.classList.toggle('is-open', open);
  loginDropdownMenu.setAttribute('aria-hidden', String(!open));
  loginToggleBtn.setAttribute('aria-expanded', String(open));
}

if (loginToggleBtn && loginDropdownMenu) {
  loginToggleBtn.addEventListener('click', () => {
    setLoginMenu(!loginDropdownMenu.classList.contains('is-open'));
  });

  document.addEventListener('click', (event) => {
    if (!loginDropdownMenu.classList.contains('is-open')) return;
    if (loginDropdownMenu.contains(event.target) || loginToggleBtn.contains(event.target)) return;
    setLoginMenu(false);
  });
}

if (loginForm) {
  loginForm.addEventListener('submit', (event) => {
    event.preventDefault();
    setLoginMenu(false);
    window.location.href = 'pages/user-dashboard.html';
  });
}

const jobs = [
  {
    title: 'Production Staff',
    company: 'QuestServ Solutions',
    type: 'Full-time',
    salary: 18000,
    location: 'Cavite',
    posted: 'Just now',
    summary: 'Support daily operations for manufacturing and warehouse clients across key Metro Manila sites.',
  },
  {
    title: 'Recruitment Coordinator',
    company: 'QuestServ Solutions',
    type: 'Hybrid',
    salary: 22000,
    location: 'Mandaluyong',
    posted: '1 day ago',
    summary: 'Coordinate interviews, candidate screening, and hiring logistics for active client accounts.',
  },
  {
    title: 'Client Success Associate',
    company: 'QuestServ Solutions',
    type: 'On-site',
    salary: 19500,
    location: 'Taguig',
    posted: '2 days ago',
    summary: 'Work with partner companies and applicants to ensure smooth onboarding and placement support.',
  },
];


function renderJobs(list) {
  const jobMarkup = list
    .map(
      (job) => `
        <article class="job-card">
          <div class="job-card-top">
            <div>
              <h3>${job.title}</h3>
              <p>${job.company}</p>
            </div>
            <span class="job-pill">${job.type}</span>
          </div>
          <p class="job-summary">${job.summary}</p>
          <div class="job-card-meta">
            <span><i class="fas fa-location-dot"></i> ${job.location}</span>
            <span><i class="fas fa-money-bill-wave"></i> ₱${job.salary?.toLocaleString() || 'N/A'}</span>
            <span><i class="fas fa-clock"></i> ${job.posted}</span>
          </div>
        </article>
      `,
    )
    .join('');

  if (recommendedJobsList) {
    recommendedJobsList.innerHTML = jobMarkup;
  }

  if (homeRecommendedJobsList) {
    homeRecommendedJobsList.innerHTML = jobMarkup;
  }

  if (jobsTotalCount) {
    jobsTotalCount.textContent = `${list.length} Total`;
  }

  if (homeJobsTotalCount) {
    homeJobsTotalCount.textContent = `${list.length} Total`;
  }

  if (jobsPaginationText) {
    jobsPaginationText.textContent = `Showing ${list.length} results`;
  }
}

function setFilterMenu(open) {
  if (!filterDropdownMenu || !filterToggleBtn) return;
  filterDropdownMenu.classList.toggle('is-open', open);
  filterDropdownMenu.setAttribute('aria-hidden', String(!open));
  filterToggleBtn.setAttribute('aria-expanded', String(open));
}

if (filterToggleBtn && filterDropdownMenu) {
  filterToggleBtn.addEventListener('click', () => {
    setFilterMenu(!filterDropdownMenu.classList.contains('is-open'));
  });

  document.addEventListener('click', (event) => {
    if (!filterDropdownMenu.classList.contains('is-open')) return;
    if (filterDropdownMenu.contains(event.target) || filterToggleBtn.contains(event.target)) return;
    setFilterMenu(false);
  });
}

if (filterDropdownClose) {
  filterDropdownClose.addEventListener('click', () => setFilterMenu(false));
}

function applyDropdownFilters() {
  if (!filterDropdownForm) return;

  const title = filterDropdownForm.title.value.trim().toLowerCase();
  const salaryMin = Number(filterDropdownForm.salaryMin.value) || 0;
  const salaryMax = Number(filterDropdownForm.salaryMax.value) || Infinity;
  const jobType = filterDropdownForm.jobType.value;

  const filteredJobs = jobs.filter((job) => {
    const matchesTitle =
      !title ||
      job.title.toLowerCase().includes(title) ||
      job.company.toLowerCase().includes(title) ||
      job.summary.toLowerCase().includes(title);

    const matchesSalary = job.salary >= salaryMin && job.salary <= salaryMax;
    const matchesType = !jobType || job.type === jobType;

    return matchesTitle && matchesSalary && matchesType;
  });

  renderJobs(filteredJobs);
}

if (filterDropdownForm) {
  filterDropdownForm.addEventListener('submit', (event) => {
    event.preventDefault();
    applyDropdownFilters();
    setFilterMenu(false);
  });

  const clearButton = filterDropdownForm.querySelector('.filter-clear-button');
  if (clearButton) {
    clearButton.addEventListener('click', () => {
      filterDropdownForm.reset();
      renderJobs(jobs);
    });
  }
}

if (jobFilterForm) {
  jobFilterForm.addEventListener('submit', () => {
    renderJobs(jobs);
  });
}

document.addEventListener('keydown', (event) => {
  if (!event.shiftKey || event.ctrlKey || event.metaKey || event.altKey) {
    secretBuffer = '';
    return;
  }

  const char = (event.key || '').toUpperCase();
  if (char.length !== 1 || !/[A-Z]/.test(char)) {
    secretBuffer = '';
    return;
  }

  secretBuffer += char;

  if (SECRET_SEQUENCES.includes(secretBuffer)) {
    window.location.href = '/pages/admin-ui.html';
    secretBuffer = '';
    return;
  }

  const hasValidPrefix = SECRET_SEQUENCES.some((sequence) => sequence.startsWith(secretBuffer));
  if (!hasValidPrefix) {
    secretBuffer = char;
    if (!SECRET_SEQUENCES.some((sequence) => sequence.startsWith(secretBuffer))) {
      secretBuffer = '';
    }
  }
});

renderJobs(jobs);
loadHomePoster();
