const loginToggleBtn = document.getElementById('login-toggle-btn');
const loginDropdownMenu = document.getElementById('login-dropdown-menu');
const loginForm = document.getElementById('inline-login-form');
const jobFilterForm = document.getElementById('home-job-filter');
const filterDropdownForm = document.getElementById('filter-dropdown-form');
const filterToggleBtn = document.getElementById('filter-toggle-btn');
const filterDropdownMenu = document.getElementById('filter-dropdown-menu');
const filterDropdownClose = document.querySelector('.filter-dropdown-close');
const recommendedJobsList = document.getElementById('recommended-jobs-list');
const jobsTotalCount = document.getElementById('jobs-total-count');
const jobsPaginationText = document.getElementById('jobs-pagination-text');

const SECRET_SEQUENCES = ['ADMIN', 'SUPERADMIN'];
let secretBuffer = '';

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
  if (!recommendedJobsList) return;

  recommendedJobsList.innerHTML = list
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

  if (jobsTotalCount) {
    jobsTotalCount.textContent = `${list.length} Total`;
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