const loginToggleBtn = document.getElementById('login-toggle-btn');
const loginDropdownMenu = document.getElementById('login-dropdown-menu');
const loginForm = document.getElementById('inline-login-form');
const jobFilterForm = document.getElementById('home-job-filter');
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
  });
}

const jobs = [
  {
    title: 'Production Staff',
    company: 'QuestServ Solutions',
    type: 'Full-time',
    location: 'Cavite',
    posted: 'Just now',
    summary: 'Support daily operations for manufacturing and warehouse clients across key Metro Manila sites.',
  },
  {
    title: 'Recruitment Coordinator',
    company: 'QuestServ Solutions',
    type: 'Hybrid',
    location: 'Mandaluyong',
    posted: '1 day ago',
    summary: 'Coordinate interviews, candidate screening, and hiring logistics for active client accounts.',
  },
  {
    title: 'Client Success Associate',
    company: 'QuestServ Solutions',
    type: 'On-site',
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