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






const passwordInput = document.getElementById('login-password');
const togglePasswordBtn = document.getElementById('toggle-password');

if (togglePasswordBtn && passwordInput) {
 togglePasswordBtn.addEventListener('click', (event) => {
  event.preventDefault();
  event.stopPropagation();
    const isPassword = passwordInput.type === 'password';

    passwordInput.type = isPassword ? 'text' : 'password';

    togglePasswordBtn.innerHTML = isPassword
      ? '<i class="fa-regular fa-eye-slash"></i>'
      : '<i class="fa-regular fa-eye"></i>';
  });
}

const SUPABASE_CONFIG = {
  url: window.__SUPABASE_URL__ || 'https://ilbneblzkvzebuklyzgn.supabase.co',
  anonKey: window.__SUPABASE_ANON_KEY__ || '',
};

const SECRET_SEQUENCES = ['ADMIN', 'SUPERADMIN'];
let secretBuffer = '';

const ADMIN_ROLE_ALLOWLIST = new Set(['admin', 'system-admin', 'superadmin']);

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function getRoleSlug(value) {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/[^a-z0-9-]/g, '');
}

function getUserRole(user) {
  const metaRole = user?.user_metadata?.role
    || user?.user_metadata?.role_type
    || user?.app_metadata?.role
    || user?.role_type
    || user?.role;

  const slug = getRoleSlug(metaRole);
  return slug || 'user';
}

function isAdminUser(user, email) {
  const role = getUserRole(user);
  if (ADMIN_ROLE_ALLOWLIST.has(role)) return true;

  const defaultAdminEmail = String(window.__ADMIN_DEFAULT_EMAIL__ || '').trim().toLowerCase();
  if (defaultAdminEmail && String(email || '').trim().toLowerCase() === defaultAdminEmail) {
    return true;
  }

  return false;
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
/*
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
}*/

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

  const clickedInsideMenu = loginDropdownMenu.contains(event.target);
  const clickedToggle = loginToggleBtn.contains(event.target);
  const clickedPasswordToggle =
    event.target.closest('#toggle-password');

  if (clickedInsideMenu || clickedToggle || clickedPasswordToggle) {
    return;
  }

  setLoginMenu(false);
});
}

const supabase = window.supabase?.createClient
  ? window.supabase.createClient(SUPABASE_CONFIG.url, SUPABASE_CONFIG.anonKey)
  : null;

if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const loginEmailInput = document.getElementById('login-email');
    const loginPasswordInput = document.getElementById('login-password');
    const rememberCheckbox = loginForm.querySelector('.login-dropdown-checkbox');
    const submitButton = loginForm.querySelector('button[type="submit"]');

    if (!loginEmailInput || !loginPasswordInput || !submitButton) {
      return;
    }

    const identifier = loginEmailInput.value.trim();
    let email = identifier;
    const password = loginPasswordInput.value.trim();

    const alias = identifier.toLowerCase();
    const defaultAdminEmail = String(window.__ADMIN_DEFAULT_EMAIL__ || '').trim();
    if (defaultAdminEmail) {
      const looksLikeEmail = alias.includes('@');
      if (!looksLikeEmail || alias === 'admin' || alias === 'superadmin') {
        email = defaultAdminEmail;
      }
    }

    try {
      if (!supabase || !SUPABASE_CONFIG.url || !SUPABASE_CONFIG.anonKey) {
        alert('Supabase is not configured. Please set the URL and anon key.');
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = 'Logging in...';

      let data = null;
      let error = null;

      if (alias.includes('@') && supabase?.auth?.signInWithPassword) {
        ({ data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        }));
      }

      if (error || !data?.user) {
        let tableQuery = supabase
          .from('users')
          .select('id,email,username,full_name')
          .eq('password', password);

        if (alias.includes('@')) {
          tableQuery = tableQuery.ilike('email', alias);
        } else {
          tableQuery = tableQuery.or(`email.ilike.${alias},username.ilike.${alias}`);
        }

        const { data: tableUser, error: tableError } = await tableQuery.maybeSingle();

        if (tableError || !tableUser) {
          const details = [
            tableError?.message || (!tableUser ? 'No matching user in users table' : '') || error?.message || 'Invalid login credentials',
            tableError?.code ? `table code: ${tableError.code}` : '',
            error?.status ? `status: ${error.status}` : '',
            error?.code ? `code: ${error.code}` : '',
          ].filter(Boolean).join(' | ');
          alert(`Login failed: ${details}`);
          return;
        }

        const defaultAdminEmail = String(window.__ADMIN_DEFAULT_EMAIL__ || '').trim().toLowerCase();
        const roleValue = defaultAdminEmail && String(tableUser.email || '').trim().toLowerCase() === defaultAdminEmail
          ? 'system-admin'
          : 'admin';
        const mockUser = { user_metadata: { role: roleValue }, role_type: roleValue };
        const isAdmin = isAdminUser(mockUser, tableUser.email || email);
        const rememberMe = Boolean(rememberCheckbox?.checked);
        const storage = rememberMe ? localStorage : sessionStorage;
        const sessionKey = isAdmin
          ? (rememberMe ? 'qs_admin_session' : 'qs_admin_session_temp')
          : (rememberMe ? 'qs_user_session' : 'qs_user_session_temp');

        const sessionPayload = {
          auth_type: 'table',
          user: {
            id: tableUser.id,
            email: tableUser.email,
            username: tableUser.username,
            full_name: tableUser.full_name,
            role_type: roleValue,
            user_metadata: {
              username: tableUser.username,
              full_name: tableUser.full_name,
              role: roleValue,
            },
          },
          admin: {
            id: tableUser.id,
            email: tableUser.email,
            username: tableUser.username,
            full_name: tableUser.full_name,
            role_type: roleValue,
            user_metadata: {
              username: tableUser.username,
              full_name: tableUser.full_name,
              role: roleValue,
            },
          },
        };

        storage.setItem(sessionKey, JSON.stringify(sessionPayload));

        if (isAdmin) {
          localStorage.removeItem('qs_user_session');
          sessionStorage.removeItem('qs_user_session_temp');
        } else {
          localStorage.removeItem('qs_admin_session');
          sessionStorage.removeItem('qs_admin_session_temp');
        }

        alert('Login successful!');
        setLoginMenu(false);
        window.location.href = isAdmin ? 'pages/admin-ui.html' : 'pages/user-dashboard.html';
        return;
      }

      if (data?.user) {
        const isAdmin = isAdminUser(data.user, email);
        const rememberMe = Boolean(rememberCheckbox?.checked);
        const storage = rememberMe ? localStorage : sessionStorage;
        const sessionKey = isAdmin
          ? (rememberMe ? 'qs_admin_session' : 'qs_admin_session_temp')
          : (rememberMe ? 'qs_user_session' : 'qs_user_session_temp');

        storage.setItem(sessionKey, JSON.stringify(data.session));

        if (isAdmin) {
          localStorage.removeItem('qs_user_session');
          sessionStorage.removeItem('qs_user_session_temp');
        } else {
          localStorage.removeItem('qs_admin_session');
          sessionStorage.removeItem('qs_admin_session_temp');
        }

        alert('Login successful!');
        setLoginMenu(false);
        window.location.href = isAdmin ? 'pages/admin-ui.html' : 'pages/user-dashboard.html';
      }
    } catch (err) {
      console.error(err);
      alert('Something went wrong.');
    } finally {
      submitButton.disabled = false;
      submitButton.textContent = 'Login';
    }
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
    window.location.href = 'pages/admin-ui.html';
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
