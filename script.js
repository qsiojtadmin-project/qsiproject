const APPLICANTS_KEY = 'questserv_applicants';
const ACCOUNTS_KEY = 'questserv_accounts';
const SESSION_KEY = 'questserv_session';
const API_BASE = window.location.origin.includes(':5000')
  ? '/api'
  : 'http://localhost:5000/api';

// Secret admin shortcut: Hold Shift and type SUPERADMIN
const SECRET_SEQUENCE = 'SUPERADMIN';
const SECRET_BYPASS_KEY = 'questserv_secret_bypass';
let secretBuffer = '';

document.addEventListener('keydown', (e) => {
  // Only count letter keys when Shift is held
  if (!e.shiftKey || e.ctrlKey || e.metaKey || e.altKey) {
    secretBuffer = '';
    return;
  }

  // Get the uppercase character
  const char = (e.key || '').toUpperCase();
  
  // Only process single letters
  if (char.length === 1 && /[A-Z]/.test(char)) {
    secretBuffer += char;
    
    if (secretBuffer === SECRET_SEQUENCE) {
      // Set bypass flag and navigate to admin UI
      sessionStorage.setItem(SECRET_BYPASS_KEY, 'true');
      window.location.href = '/pages/admin-ui.html';
      secretBuffer = '';
    } else if (!SECRET_SEQUENCE.startsWith(secretBuffer)) {
      // Reset if it doesn't match the beginning of the sequence
      secretBuffer = char;
      if (!SECRET_SEQUENCE.startsWith(secretBuffer)) {
        secretBuffer = '';
      }
    }
  } else {
    // Reset on non-letter keys
    secretBuffer = '';
  }
});

const pathName = window.location.pathname.toLowerCase();
const isAdminPage = pathName.endsWith('/pages/admin-ui.html') || pathName.endsWith('admin-ui.html');
const isUserPage = pathName.endsWith('/pages/user-ui.html') || pathName.endsWith('user-ui.html');
const isStaffPage = pathName.endsWith('/pages/staff-ui.html') || pathName.endsWith('staff-ui.html');
const isRolePage = isAdminPage || isUserPage || isStaffPage;

const year = document.getElementById('year');
const loginForm = document.getElementById('login-form');
const registerForm = document.getElementById('register-form');
const logoutBtn = document.getElementById('logout-btn');
const sessionLabel = document.getElementById('session-label');
const loginMessage = document.getElementById('login-message');
const registerMessage = document.getElementById('register-message');
const showRegisterBtn = document.getElementById('show-register-btn');
const hideRegisterBtn = document.getElementById('hide-register-btn');
const registerPanel = document.getElementById('register-panel');
const loginPanel = document.getElementById('login-panel');
const registerConfirmPassword = document.getElementById('register-confirm-password');
const registerRole = document.getElementById('register-role');
const loginRoleCopy = document.getElementById('login-role-copy');
const loginQueryRole = new URLSearchParams(window.location.search).get('role') || '';

document.querySelectorAll('[data-password-toggle]').forEach((button) => {
  const targetId = button.dataset.target;
  const input = document.getElementById(targetId);
  if (!input) return;

  button.addEventListener('click', () => {
    const hidden = input.type === 'password';
    input.type = hidden ? 'text' : 'password';
    button.classList.toggle('is-visible', hidden);
    button.setAttribute('aria-label', `${hidden ? 'Hide' : 'Show'} password`);
    button.setAttribute('aria-pressed', hidden ? 'true' : 'false');
  });
});

const applicationForm = document.getElementById('application-form');
const formMessage = document.getElementById('form-message');
const userTableBody = document.getElementById('user-table-body');
const adminTableBody = document.getElementById('admin-table-body');
const staffTableBody = document.getElementById('staff-table-body');
const statTotal = document.getElementById('stat-total');
const statHired = document.getElementById('stat-hired');
const statAccounts = document.getElementById('stat-accounts');
const statAdmins = document.getElementById('stat-admins');
const accountTableBody = document.getElementById('account-table-body');

const userDashboard = document.getElementById('user-dashboard');
const staffDashboard = document.getElementById('staff-dashboard');
const adminDashboard = document.getElementById('admin-dashboard');
const adminNavLinks = Array.from(document.querySelectorAll('.admin-nav-link'));

if (year) {
  year.textContent = new Date().getFullYear();
}

function goToIndexAuth() {
  window.location.href = '/index.html#auth';
}

function goToIndexHome() {
  window.location.href = '/index.html';
}

function redirectToRolePage(role) {
  if (role === 'admin') {
    window.location.href = '/pages/admin-ui.html';
    return;
  }
  if (role === 'user') {
    window.location.href = '/pages/user-ui.html';
    return;
  }
  goToIndexHome();
}

function syncLoginRoleView() {
  if (!loginRoleCopy) return;

  if (loginQueryRole === 'admin') {
    loginRoleCopy.textContent = 'Access your admin account.';
    if (showRegisterBtn) showRegisterBtn.style.display = 'none';
    return;
  }

  loginRoleCopy.textContent = 'Access your account.';
  if (showRegisterBtn) {
    showRegisterBtn.style.display = 'inline-flex';
    showRegisterBtn.setAttribute('href', '/pages/create-account-admin.html');
    showRegisterBtn.textContent = 'Create account';
  }
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function getApplicants() {
  return JSON.parse(localStorage.getItem(APPLICANTS_KEY) || '[]');
}

function saveApplicants(data) {
  localStorage.setItem(APPLICANTS_KEY, JSON.stringify(data));
}

function getAccounts() {
  return JSON.parse(localStorage.getItem(ACCOUNTS_KEY) || '[]');
}

function saveAccounts(data) {
  localStorage.setItem(ACCOUNTS_KEY, JSON.stringify(data));
}

function getSession() {
  return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
}

function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

async function apiRequest(path, options = {}) {
  const session = getSession();
  const headers = { ...(options.headers || {}) };

  if (!(options.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }
  if (options.auth !== false && session?.token) {
    headers.Authorization = `Bearer ${session.token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.message || 'Request failed');
  }
  return data;
}

function ensureDefaultAccounts() {
  const existing = getAccounts();
  if (existing.length) return;

  const defaults = [
    { id: Date.now(), name: 'System Admin', email: 'admin@questserv.com', password: '123456789', role: 'admin' },
  ];
  saveAccounts(defaults);
}

function setStatus(id, status) {
  const applicants = getApplicants().map((item) => {
    if (item.id === id) item.status = status;
    return item;
  });
  saveApplicants(applicants);
  renderAll();
}

function renderUserApplications(session) {
  if (!userTableBody) return;

  if (!session || session.role !== 'user') {
    userTableBody.innerHTML = '<tr><td colspan="3">Login as user to view your applications.</td></tr>';
    return;
  }

  const mine = getApplicants().filter((a) => a.userEmail === session.email);
  if (!mine.length) {
    userTableBody.innerHTML = '<tr><td colspan="3">No applications yet.</td></tr>';
    return;
  }

  userTableBody.innerHTML = mine
    .map(
      (a) => `
      <tr>
        <td>${escapeHtml(a.position)}</td>
        <td><span class="status ${escapeHtml(a.status)}">${escapeHtml(a.status)}</span></td>
        <td>${escapeHtml(a.resumeName)}</td>
      </tr>`
    )
    .join('');
}

function renderAdminTableRows(rows = []) {
  if (!adminTableBody) return;

  if (statTotal) {
    statTotal.textContent = rows.length;
  }
  if (statHired) {
    statHired.textContent = rows.filter((row) => row.status === 'Hired').length;
  }

  if (!rows.length) {
    adminTableBody.innerHTML = '<tr><td colspan="4">No applicants yet.</td></tr>';
    return;
  }

  adminTableBody.innerHTML = rows
    .map(
      (row) => `
      <tr>
        <td>${escapeHtml(row.name)}</td>
        <td>${escapeHtml(row.title)}</td>
        <td>${escapeHtml((row.appliedAt || row.created_at || new Date().toISOString().slice(0, 10)).toString().slice(0, 10))}</td>
        <td><span class="status ${escapeHtml(row.status)}">${escapeHtml(row.status)}</span></td>
        <td>
          <button class="btn btn-outline" data-admin-action="view" data-id="${row.id}">View</button>
        </td>
      </tr>`
    )
    .join('');
}

function renderAccountTableRows(accounts = [], session) {
  if (!accountTableBody) return;

  if (statAccounts) {
    statAccounts.textContent = accounts.length;
  }

  if (!accounts.length) {
    accountTableBody.innerHTML = '<tr><td colspan="4">No accounts found.</td></tr>';
    return;
  }

  accountTableBody.innerHTML = accounts
    .map((account) => {
      return `
        <tr>
          <td>${escapeHtml(account.name)}</td>
          <td>${escapeHtml(account.email)}</td>
          <td><span class="status">user</span></td>
          <td>
            <div class="table-inline-actions">
              <button class="btn btn-outline" data-account-delete="${account.id}">Delete</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join('');
}

async function loadAdminApplicantsFromApi() {
  if (!adminTableBody) return;

  try {
    const rows = await apiRequest('/admin/applicants');
    renderAdminTableRows(rows);
  } catch (error) {
    adminTableBody.innerHTML = `<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`;
  }
}

async function loadAdminUsersFromApi(session) {
  if (!accountTableBody) return;

  try {
    const rows = await apiRequest('/admin/users');
    renderAccountTableRows(rows, session);
    const overview = await apiRequest('/admin/overview');
    if (statAdmins) statAdmins.textContent = overview.totalAdmins;
    if (statTotal) statTotal.textContent = overview.totalApplicants;
    if (statHired) statHired.textContent = overview.hiredCount;
  } catch (error) {
    accountTableBody.innerHTML = `<tr><td colspan="4">${escapeHtml(error.message)}</td></tr>`;
  }
}

function renderStaffTable() {
  if (!staffTableBody) return;

  const applicants = getApplicants();
  if (!applicants.length) {
    staffTableBody.innerHTML = '<tr><td colspan="4">No applicants yet.</td></tr>';
    return;
  }

  staffTableBody.innerHTML = applicants
    .map(
      (a) => `
      <tr>
        <td>${escapeHtml(a.fullName)}</td>
        <td>${escapeHtml(a.position)}</td>
        <td><span class="status ${escapeHtml(a.status)}">${escapeHtml(a.status)}</span></td>
        <td>
          <select data-staff-select="true" data-id="${a.id}">
            <option value="New" ${a.status === 'New' ? 'selected' : ''}>New</option>
            <option value="Called" ${a.status === 'Called' ? 'selected' : ''}>Called</option>
            <option value="Interviewed" ${a.status === 'Interviewed' ? 'selected' : ''}>Interviewed</option>
            <option value="Hired" ${a.status === 'Hired' ? 'selected' : ''}>Hired</option>
            <option value="Rejected" ${a.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
          </select>
        </td>
      </tr>`
    )
    .join('');
}

function renderDashboards(session) {
  if (userDashboard) userDashboard.classList.add('hidden');
  if (staffDashboard) staffDashboard.classList.add('hidden');
  if (adminDashboard) adminDashboard.classList.add('hidden');

  if (!session) {
    if (sessionLabel) sessionLabel.textContent = 'Guest';
    if (logoutBtn) logoutBtn.classList.add('hidden');
    if (isAdminPage && adminDashboard) {
      adminDashboard.classList.remove('hidden');
    }
    return;
  }

  if (sessionLabel) sessionLabel.textContent = `${session.name} (${session.role})`;
  if (logoutBtn) logoutBtn.classList.remove('hidden');

  if (session.role === 'admin') {
    if (adminDashboard) adminDashboard.classList.remove('hidden');
  } else if (session.role === 'staff') {
    if (staffDashboard) staffDashboard.classList.remove('hidden');
  } else if (session.role === 'user') {
    if (userDashboard) userDashboard.classList.remove('hidden');
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    if (fullNameInput) fullNameInput.value = session.name;
    if (emailInput) emailInput.value = session.email;
  }
}

function enforcePageAccess() {
  const session = getSession();
  const secretBypass = sessionStorage.getItem(SECRET_BYPASS_KEY);

  if (!isRolePage) {
    return true;
  }

  // Allow admin page access if secret key was used
  if (secretBypass && isAdminPage) {
    sessionStorage.removeItem(SECRET_BYPASS_KEY);
    return true;
  }

  if (!session) {
    goToIndexAuth();
    return false;
  }

  if (isAdminPage && session.role !== 'admin') {
    redirectToRolePage(session.role);
    return false;
  }
  if (isUserPage && session.role !== 'user') {
    redirectToRolePage(session.role);
    return false;
  }
  if (isStaffPage) {
    redirectToRolePage('admin');
    return false;
  }

  return true;
}

function renderAll() {
  if (!enforcePageAccess()) {
    return;
  }

  const session = getSession();
  renderDashboards(session);
  renderUserApplications(session);
  renderStaffTable();

  if (session?.role === 'admin') {
    loadAdminApplicantsFromApi();
    loadAdminUsersFromApi(session);
  }
}

if (loginForm) {
  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const email = document.getElementById('login-email').value.trim().toLowerCase();
    const password = document.getElementById('login-password').value;

    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({ email, password }),
      });

      saveSession({
        ...data.user,
        token: data.token,
      });

      const roleAllowed = !loginQueryRole
        ? true
        : loginQueryRole === 'user'
          ? data.user.role === 'user'
          : data.user.role === loginQueryRole;

      if (!roleAllowed) {
        clearSession();
        throw new Error(
          loginQueryRole === 'staff'
            ? 'This login is for staff or admin accounts only.'
            : `This login is for ${loginQueryRole} accounts only.`
        );
      }

      loginForm.reset();
      if (loginMessage) {
        loginMessage.textContent = 'Login successful.';
        loginMessage.className = 'form-message success';
      }
      redirectToRolePage(data.user.role);
    } catch (error) {
      if (loginMessage) {
        loginMessage.textContent = error.message;
        loginMessage.className = 'form-message error';
      }
    }
  });
}

if (registerForm) {
  registerForm.addEventListener('submit', async (event) => {
    event.preventDefault();

    const name = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim().toLowerCase();
    const password = document.getElementById('register-password').value;
    const confirmPassword = registerConfirmPassword?.value || '';
    const role = registerRole?.value || 'user';

    if (!name || !email || password.length < 6) {
      if (registerMessage) {
        registerMessage.textContent = 'Please complete all fields. Password must be at least 6 characters.';
        registerMessage.className = 'form-message error';
      }
      return;
    }

    if (password !== confirmPassword) {
      if (registerMessage) {
        registerMessage.textContent = 'Password and Confirm Password must match.';
        registerMessage.className = 'form-message error';
      }
      return;
    }

    try {
      await apiRequest('/auth/register', {
        method: 'POST',
        auth: false,
        body: JSON.stringify({
          name,
          email,
          password,
          role,
        }),
      });

      registerForm.reset();
      if (registerMessage) {
        registerMessage.textContent = 'Account created in Supabase. You can now log in.';
        registerMessage.className = 'form-message success';
      }

      setTimeout(() => {
        registerPanel?.classList.add('hidden');
        loginPanel?.classList.remove('hidden');
        const loginEmail = document.getElementById('login-email');
        if (loginEmail) loginEmail.value = email;
      }, 700);
    } catch (error) {
      if (registerMessage) {
        registerMessage.textContent = error.message;
        registerMessage.className = 'form-message error';
      }
    }
  });
}

if (showRegisterBtn && registerPanel) {
  showRegisterBtn.addEventListener('click', () => {
    registerPanel.classList.remove('hidden');
    if (loginPanel) loginPanel.classList.add('hidden');
    const nameInput = document.getElementById('register-name');
    if (nameInput) nameInput.focus();
  });
}

syncLoginRoleView();

if (hideRegisterBtn && registerPanel) {
  hideRegisterBtn.addEventListener('click', () => {
    registerPanel.classList.add('hidden');
    if (loginPanel) loginPanel.classList.remove('hidden');
    if (registerMessage) {
      registerMessage.textContent = '';
      registerMessage.className = 'form-message';
    }
  });
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    clearSession();
    goToIndexHome();
  });
}

if (applicationForm) {
  applicationForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const session = getSession();
    if (!session || session.role !== 'user') {
      if (formMessage) {
        formMessage.textContent = 'Login with a user account to submit applications.';
        formMessage.className = 'form-message error';
      }
      return;
    }

    const fullName = document.getElementById('fullName').value.trim();
    const email = document.getElementById('email').value.trim().toLowerCase();
    const phone = document.getElementById('phone').value.trim();
    const position = document.getElementById('position').value.trim();
    const resumeFile = document.getElementById('resume').files[0];

    if (!fullName || !email || !phone || !position || !resumeFile) {
      if (formMessage) {
        formMessage.textContent = 'Please complete all required fields.';
        formMessage.className = 'form-message error';
      }
      return;
    }

    const applicants = getApplicants();
    applicants.push({
      id: Date.now(),
      fullName,
      email,
      phone,
      position,
      resumeName: resumeFile.name,
      userEmail: session.email,
      status: 'New',
    });
    saveApplicants(applicants);

    applicationForm.reset();
    const fullNameInput = document.getElementById('fullName');
    const emailInput = document.getElementById('email');
    if (fullNameInput) fullNameInput.value = session.name;
    if (emailInput) emailInput.value = session.email;
    if (formMessage) {
      formMessage.textContent = 'Application submitted successfully.';
      formMessage.className = 'form-message success';
    }
    renderAll();
  });
}

Array.from(document.querySelectorAll('.apply-job-btn')).forEach((button) => {
  button.addEventListener('click', () => {
    const positionInput = document.getElementById('position');
    if (positionInput) {
      positionInput.value = button.dataset.position || '';
    }
    const authSection = document.getElementById('auth');
    if (authSection) {
      authSection.scrollIntoView({ behavior: 'smooth' });
    }
  });
});

if (adminTableBody) {
  adminTableBody.addEventListener('click', async (event) => {
    const btn = event.target.closest('button[data-admin-action]');
    if (!btn) return;

    const session = getSession();
    if (!session || session.role !== 'admin') return;

    const id = Number(btn.dataset.id);
    const action = btn.dataset.adminAction;
    if (action === 'view') {
      return;
    }
    const status = action === 'approve' ? 'Hired' : 'Rejected';

    try {
      await apiRequest(`/admin/applicants/${id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ status }),
      });
      loadAdminApplicantsFromApi();
    } catch (error) {
      alert(error.message);
    }
  });
}

if (staffTableBody) {
  staffTableBody.addEventListener('change', (event) => {
    const select = event.target.closest('select[data-staff-select]');
    if (!select) return;

    const session = getSession();
    if (!session || (session.role !== 'staff' && session.role !== 'admin')) return;

    setStatus(Number(select.dataset.id), select.value);
  });
}

if (accountTableBody) {
  accountTableBody.addEventListener('click', async (event) => {
    const deleteBtn = event.target.closest('button[data-account-delete]');
    const session = getSession();

    if (!session || session.role !== 'admin') return;

    if (deleteBtn) {
      const id = Number(deleteBtn.dataset.accountDelete);
      try {
        await apiRequest(`/admin/users/${id}`, {
          method: 'DELETE',
        });
        loadAdminUsersFromApi(session);
      } catch (error) {
        alert(error.message);
      }
    }
  });
}

if (adminNavLinks.length) {
  const syncAdminNav = () => {
    const hash = window.location.hash || '#overview';
    adminNavLinks.forEach((link) => {
      link.classList.toggle('active', link.getAttribute('href') === hash);
    });
  };

  adminNavLinks.forEach((link) => {
    link.addEventListener('click', () => {
      adminNavLinks.forEach((item) => item.classList.remove('active'));
      link.classList.add('active');
    });
  });

  window.addEventListener('hashchange', syncAdminNav);
  syncAdminNav();
}

const heroSlider = document.getElementById('hero-slider');

if (heroSlider) {
  const heroSection = document.querySelector('.hero');
  const heroVisual = document.getElementById('hero-visual');
  const heroBadge = document.getElementById('hero-badge');
  const heroTitle = document.getElementById('hero-title');
  const heroDescription = document.getElementById('hero-description');
  const heroPrimaryBtn = document.getElementById('hero-primary-btn');
  const heroSecondaryBtn = document.getElementById('hero-secondary-btn');
  const heroCompany = document.getElementById('hero-company');
  const heroCounter = document.getElementById('hero-counter');
  const heroPrevBtn = document.getElementById('hero-prev-btn');
  const heroNextBtn = document.getElementById('hero-next-btn');
  const heroDots = document.getElementById('hero-slider-dots');

  const heroSlides = [
    {
      badge: 'QuestServ Hiring Solutions',
      title: 'Hire Warehouse Teams Faster',
      description: 'Support high-volume recruitment for warehousing, dispatch, and logistics operations with clearer applicant flow and role matching.',
      company: 'QSI Logistics Recruitment',
      primaryLabel: 'View Logistics Jobs',
      primaryHref: '#jobs',
      secondaryLabel: 'Candidate Signup',
      secondaryHref: '/pages/create-account-admin.html',
      image: "linear-gradient(180deg, rgba(6, 82, 51, 0.58), rgba(10, 106, 69, 0.74)), url('https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1600&q=80') center/cover no-repeat",
    },
    {
      badge: 'Staff Recruitment Pipeline',
      title: 'Recruit Office And HR Support',
      description: 'Manage recruitment for coordinators, HR staff, and support teams with a cleaner internal hiring process and applicant review flow.',
      company: 'QSI Staff Recruitment',
      primaryLabel: 'Explore Staff Roles',
      primaryHref: '#jobs',
      secondaryLabel: 'Staff/Admin Access',
      secondaryHref: '/pages/login-only.html?role=staff',
      image: "linear-gradient(180deg, rgba(6, 82, 51, 0.56), rgba(10, 106, 69, 0.72)), url('https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1600&q=80') center/cover no-repeat",
    },
    {
      badge: 'Technical Hiring Workflow',
      title: 'Fill Technical Support Roles',
      description: 'Highlight active openings for technical support, operators, and field teams while giving applicants a better first-screening experience.',
      company: 'QSI Technical Recruitment',
      primaryLabel: 'See Open Positions',
      primaryHref: '#jobs',
      secondaryLabel: 'Apply Now',
      secondaryHref: '/pages/create-account-admin.html',
      image: "linear-gradient(180deg, rgba(6, 82, 51, 0.56), rgba(10, 106, 69, 0.72)), url('https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=1600&q=80') center/cover no-repeat",
    },
  ];

  let currentHeroSlide = 0;
  let heroIntervalId = null;

  function renderHeroDots() {
    if (!heroDots) return;
    heroDots.innerHTML = heroSlides
      .map(
        (_, index) =>
          `<button class="hero-dot-btn${index === currentHeroSlide ? ' active' : ''}" type="button" data-hero-dot="${index}" aria-label="Go to slide ${index + 1}"></button>`
      )
      .join('');
  }

  function updateHeroSlide(index) {
    currentHeroSlide = (index + heroSlides.length) % heroSlides.length;
    const slide = heroSlides[currentHeroSlide];

    if (heroSection) heroSection.style.background = slide.image;
    if (heroVisual) heroVisual.style.background = slide.image;
    if (heroBadge) heroBadge.textContent = slide.badge;
    if (heroTitle) heroTitle.textContent = slide.title;
    if (heroDescription) heroDescription.textContent = slide.description;
    if (heroCompany) heroCompany.textContent = slide.company;
    if (heroCounter) heroCounter.textContent = `${currentHeroSlide + 1} / ${heroSlides.length}`;
    if (heroPrimaryBtn) {
      heroPrimaryBtn.textContent = slide.primaryLabel;
      heroPrimaryBtn.setAttribute('href', slide.primaryHref);
    }
    if (heroSecondaryBtn) {
      heroSecondaryBtn.textContent = slide.secondaryLabel;
      heroSecondaryBtn.setAttribute('href', slide.secondaryHref);
    }

    renderHeroDots();
  }

  function restartHeroInterval() {
    if (heroIntervalId) {
      clearInterval(heroIntervalId);
    }
    heroIntervalId = setInterval(() => {
      updateHeroSlide(currentHeroSlide + 1);
    }, 6000);
  }

  heroPrevBtn?.addEventListener('click', () => {
    updateHeroSlide(currentHeroSlide - 1);
    restartHeroInterval();
  });

  heroNextBtn?.addEventListener('click', () => {
    updateHeroSlide(currentHeroSlide + 1);
    restartHeroInterval();
  });

  heroDots?.addEventListener('click', (event) => {
    const dot = event.target.closest('[data-hero-dot]');
    if (!dot) return;
    updateHeroSlide(Number(dot.dataset.heroDot));
    restartHeroInterval();
  });

  updateHeroSlide(0);
  restartHeroInterval();
}

ensureDefaultAccounts();
renderAll();
