const sidebar = document.getElementById('sidebar');
const mobileToggle = document.getElementById('mobile-toggle');
const navLogout = document.getElementById('nav-logout');
const sidebarLinks = Array.from(document.querySelectorAll('.sidebar-link[href^="#"]'));
const tabPanels = Array.from(document.querySelectorAll('[data-tab-panel]'));

const applicantToggle = document.getElementById('toggle-filters');
const applicantFiltersPanel = document.getElementById('applicant-filters-panel');
const searchApplicants = document.getElementById('search-applicants');
const statusFilter = document.getElementById('status-filter');
const positionFilter = document.getElementById('position-filter');
const sortFilter = document.getElementById('sort-filter');
const applicantsBody = document.getElementById('applicants-body');

const createUserForm = document.getElementById('create-user-form');
const usersBody = document.getElementById('users-body');
const userSearch = document.getElementById('user-search');
const userRoleFilter = document.getElementById('user-role-filter');
const userFeedback = document.getElementById('user-feedback');
const totalUsersEl = document.getElementById('um-total-users');
const adminCountEl = document.getElementById('um-admin-count');
const userCountEl = document.getElementById('um-user-count');

const jobForm = document.getElementById('job-form');
const feedback = document.getElementById('feedback');
const jobAlert = document.getElementById('job-alert');
const jobAlertTitle = document.getElementById('job-alert-title');
const jobAlertMessage = document.getElementById('job-alert-message');
const jobAlertOk = document.getElementById('job-alert-ok');
const reqList = document.getElementById('req-list');
const descList = document.getElementById('desc-list');
const benList = document.getElementById('ben-list');

const positionDisplay = document.getElementById('p-position-display');
const emailDisplay = document.getElementById('p-email-display');
const subjectDisplay = document.getElementById('p-subject-display');
const phoneDisplay = document.getElementById('p-phone-display');
const websiteDisplay = document.getElementById('p-website-display');

const settingsForm = document.getElementById('settings-form');
const settingsFeedback = document.getElementById('settings-feedback');
const adminSearch = document.getElementById('admin-search');

const applicantsData = [
	{ name: 'Sarah Johnson', email: 'sarah@email.com', resume: 'sarah_resume.pdf', title: 'Senior Developer', status: 'Under Review', date: '2026-04-28' },
	{ name: 'Michael Chen', email: 'michael@email.com', resume: 'michael_cv.pdf', title: 'Product Manager', status: 'Shortlisted', date: '2026-04-29' },
	{ name: 'Emily Davis', email: 'emily@email.com', resume: 'emily_resume.pdf', title: 'UX Designer', status: 'Interview', date: '2026-05-01' },
	{ name: 'James Wilson', email: 'james@email.com', resume: 'james_cv.pdf', title: 'Data Analyst', status: 'Under Review', date: '2026-05-02' },
];

const usersData = [
	{ name: 'Alice Rivera', email: 'alice@questserv.com', role: 'admin' },
	{ name: 'John Santos', email: 'john@questserv.com', role: 'user' },
	{ name: 'Monica Cruz', email: 'monica@questserv.com', role: 'user' },
];

function setNotice(el, message, type = 'success') {
	if (!el) return;
	el.className = `notice ${type}`;
	el.textContent = message;
}

function statusClass(status) {
	return String(status).toLowerCase().replace(/\s+/g, '-');
}

function renderApplicants(rows = applicantsData) {
	if (!applicantsBody) return;

	applicantsBody.innerHTML = rows.map((row) => `
		<tr>
			<td>${row.name}</td>
			<td>${row.email}</td>
			<td>${row.resume}</td>
			<td>${row.title}</td>
			<td><span class="status ${statusClass(row.status)}">${row.status}</span></td>
		</tr>
	`).join('');
}

function filterApplicants() {
	const query = (searchApplicants?.value || '').trim().toLowerCase();
	const status = statusFilter?.value || '';
	const position = positionFilter?.value || '';

	let rows = applicantsData.filter((row) => {
		const haystack = `${row.name} ${row.email} ${row.resume} ${row.title}`.toLowerCase();
		return (!query || haystack.includes(query)) && (!status || row.status === status) && (!position || row.title === position);
	});

	if (sortFilter?.value === 'name-asc') rows = [...rows].sort((a, b) => a.name.localeCompare(b.name));
	if (sortFilter?.value === 'name-desc') rows = [...rows].sort((a, b) => b.name.localeCompare(a.name));
	if (sortFilter?.value === 'status') rows = [...rows].sort((a, b) => a.status.localeCompare(b.status));
	if (sortFilter?.value === 'oldest') rows = [...rows].sort((a, b) => a.date.localeCompare(b.date));
	if (sortFilter?.value === 'newest') rows = [...rows].sort((a, b) => b.date.localeCompare(a.date));

	renderApplicants(rows);
}

function renderUsers(rows = usersData) {
	if (!usersBody) return;

	usersBody.innerHTML = rows.map((user) => `
		<tr>
			<td>${user.name}</td>
			<td>${user.email}</td>
			<td>${user.role === 'admin' ? '<span class="role-pill admin">Admin</span>' : '<span class="role-pill">User</span>'}</td>
			<td><strong>Remove</strong></td>
		</tr>
	`).join('');

	const total = rows.length;
	const admins = rows.filter((user) => user.role === 'admin').length;
	if (totalUsersEl) totalUsersEl.textContent = String(total);
	if (adminCountEl) adminCountEl.textContent = String(admins);
	if (userCountEl) userCountEl.textContent = String(total - admins);
}

function filterUsers() {
	const query = (userSearch?.value || '').trim().toLowerCase();
	const role = userRoleFilter?.value || 'all';
	const rows = usersData.filter((user) => {
		const haystack = `${user.name} ${user.email}`.toLowerCase();
		const matchesRole = role === 'all' || user.role === role;
		return (!query || haystack.includes(query)) && matchesRole;
	});
	renderUsers(rows);
}

if (mobileToggle && sidebar) {
	mobileToggle.addEventListener('click', () => sidebar.classList.toggle('open'));
}

if (navLogout) {
	navLogout.addEventListener('click', () => {
		window.location.href = '/index.html';
	});
}

if (applicantToggle && applicantFiltersPanel) {
	applicantToggle.addEventListener('click', () => {
		applicantFiltersPanel.classList.toggle('hidden');
	});
}

[searchApplicants, statusFilter, positionFilter, sortFilter].forEach((control) => {
	control?.addEventListener('input', filterApplicants);
	control?.addEventListener('change', filterApplicants);
});

[userSearch, userRoleFilter].forEach((control) => {
	control?.addEventListener('input', filterUsers);
	control?.addEventListener('change', filterUsers);
});

createUserForm?.addEventListener('submit', (event) => {
	event.preventDefault();
	const data = Object.fromEntries(new FormData(createUserForm).entries());
	if ((data.password || '').length < 6) {
		setNotice(userFeedback, 'Password must be at least 6 characters.', 'error');
		return;
	}

	usersData.unshift({ name: String(data.name || ''), email: String(data.email || ''), role: String(data.role || 'user') });
	createUserForm.reset();
	renderUsers(usersData);
	setNotice(userFeedback, 'User created successfully.', 'success');
});

function syncPreview() {
	const title = document.getElementById('field-position');
	const email = document.getElementById('field-email');
	const subject = document.getElementById('field-subject');
	const phone = document.getElementById('field-phone');
	const website = document.getElementById('field-website');

	if (positionDisplay && title) positionDisplay.textContent = title.value || 'Production Operator';
	if (emailDisplay && email) emailDisplay.textContent = email.value || 'carmonaqsi@gmail.com';
	if (subjectDisplay && subject) subjectDisplay.textContent = subject.value || 'JOB HIRING';
	if (phoneDisplay && phone) phoneDisplay.textContent = phone.value || '+1 (555) 123-4567';
	if (websiteDisplay && website) websiteDisplay.textContent = website.value || 'Visit our website';

	const fillList = (el, value) => {
		if (!el) return;
		const items = String(value || '')
			.split('\n')
			.map((line) => line.trim())
			.filter(Boolean)
			.map((line) => `<li>${line}</li>`)
			.join('');
		el.innerHTML = items || '<li>Update this template content.</li>';
	};

	fillList(reqList, document.getElementById('p-req')?.value);
	fillList(descList, document.getElementById('p-desc')?.value);
	fillList(benList, document.getElementById('p-ben')?.value);
}

['field-position', 'field-email', 'field-subject', 'field-phone', 'field-website', 'p-req', 'p-desc', 'p-ben'].forEach((id) => {
	document.getElementById(id)?.addEventListener('input', syncPreview);
});

jobForm?.addEventListener('submit', (event) => {
	event.preventDefault();
	setNotice(feedback, 'Job template published.', 'success');
	if (jobAlert && jobAlertTitle && jobAlertMessage) {
		jobAlert.classList.remove('hidden');
		jobAlertTitle.textContent = 'Job template published';
		jobAlertMessage.textContent = 'The merged admin workspace updated the preview poster.';
	}
});

document.getElementById('save-draft-btn')?.addEventListener('click', () => {
	setNotice(feedback, 'Draft saved locally.', 'success');
});

jobAlertOk?.addEventListener('click', () => {
	jobAlert?.classList.add('hidden');
});

settingsForm?.addEventListener('submit', (event) => {
	event.preventDefault();
	setNotice(settingsFeedback, 'Admin settings updated.', 'success');
});

if (adminSearch) {
	adminSearch.addEventListener('input', () => {
		const query = adminSearch.value.trim().toLowerCase();
		document.querySelectorAll('.admin-section, .admin-card, .um-stat, .um-card, .home-post-card, .panel').forEach((node) => {
			if (!query) {
				node.style.outline = '';
				return;
			}
			const text = node.textContent?.toLowerCase() || '';
			node.style.outline = text.includes(query) ? '2px solid rgba(10,93,60,0.18)' : '';
		});
	});
}

function setActiveTab(tabId) {
	const targetId = tabId || 'dashboard';

	tabPanels.forEach((panel) => {
		const isActive = panel.id === targetId;
		panel.hidden = !isActive;
		panel.classList.toggle('is-active', isActive);
	});

	sidebarLinks.forEach((link) => {
		link.classList.toggle('active', link.getAttribute('href') === `#${targetId}`);
	});

	window.scrollTo({ top: 0, behavior: 'smooth' });
}

sidebarLinks.forEach((link) => {
	link.addEventListener('click', (event) => {
		event.preventDefault();
		const targetId = link.getAttribute('href')?.slice(1);
		if (!targetId) return;
		history.replaceState(null, '', `#${targetId}`);
		setActiveTab(targetId);
		// Add tab when sidebar item is clicked
		addTab(targetId);
	});
});

window.addEventListener('hashchange', () => {
	setActiveTab(window.location.hash.replace('#', '') || 'dashboard');
});

setActiveTab(window.location.hash.replace('#', '') || 'dashboard');

renderApplicants();
renderUsers();
syncPreview();


/*FOR THE TABS*/
let activeTab = null;
let loadedTabs = {};

// Define tab configurations with their PHP files
const tabConfigs = {
    dashboard: {
        title: 'Dashboard',
        file: 'dashboard.php',
        icon: '📊',
        color: '#0a5d3c'
    },
    applicants: {
        title: 'Applicants',
        file: 'applicants.php',
        icon: '👥',
        color: '#0a5d3c'
    },
    users: {
        title: 'User Management',
        file: 'users.php',
        icon: '🆔',
        color: '#0a5d3c'
    },
    jobs: {
        title: 'Job Hire Templates',
        file: 'jobs.php',
        icon: '💼',
        color: '#0a5d3c'
    },
    posts: {
        title: 'Home Posts',
        file: 'posts.php',
        icon: '🏠',
        color: '#0a5d3c'
    },
    settings: {
        title: 'Settings',
        file: 'settings.php',
        icon: '⚙️',
        color: '#0a5d3c'
    },
    accounting: {
        title: 'Accounting',
        file: 'accounting.php',
        icon: '📊',
        color: '#28a745'
    },
    reports: {
        title: 'Reports',
        file: 'reports.php',
        icon: '📈',
        color: '#ffc107'
    }
};

document.addEventListener('DOMContentLoaded', () => {
    // Add event listeners for each add button
    document.getElementById('addAccountingTab').addEventListener('click', () => {
        addTab('accounting');
    });
    
    document.getElementById('addSettingsTab').addEventListener('click', () => {
        addTab('settings');
    });
    
    document.getElementById('addReportsTab').addEventListener('click', () => {
        addTab('reports');
    });
    
    document.getElementById('addUsersTab').addEventListener('click', () => {
        addTab('users');
    });
});

function addTab(tabType) {
    const config = tabConfigs[tabType];
    if (!config) return;
    
    // Check if a tab of this type already exists
    const existingTab = document.querySelector(`.tab-btn[data-type="${tabType}"]`);
    if (existingTab) {
        // Switch to existing tab instead of creating new one
        const tabId = existingTab.dataset.tab;
        activateTab(tabId);
        return;
    }
    
    const tabId = tabType; // Use tabType as ID (no numbers)
    const uniqueFileId = `${tabType}-${Date.now()}`;
    
    // Store tab info
    loadedTabs[tabId] = {
        type: tabType,
        fileId: uniqueFileId,
        config: config
    };
    
    // Create tab button
    const tabBtn = document.createElement('button');
    tabBtn.className = 'tab-btn';
    tabBtn.dataset.tab = tabId;
    tabBtn.dataset.type = tabType;
    tabBtn.style.borderLeft = `3px solid ${config.color}`;
    
    // Add icon
    const icon = document.createElement('span');
    icon.className = 'tab-icon';
    icon.textContent = config.icon;
    tabBtn.appendChild(icon);
    
    // Add title (no number)
    const titleSpan = document.createElement('span');
    titleSpan.textContent = config.title;
    titleSpan.className = 'tab-title';
    tabBtn.appendChild(titleSpan);
    
    // Create delete button
    const deleteBtn = document.createElement('span');
    deleteBtn.textContent = '✕';
    deleteBtn.className = 'delete-tab';
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteTab(tabId, tabBtn);
    };
    
    tabBtn.appendChild(deleteBtn);
    tabBtn.onclick = () => activateTab(tabId);
    document.getElementById('tabButtons').appendChild(tabBtn);
    
    // Create content panel
    const content = document.createElement('div');
    content.className = 'tab-pane';
    content.id = tabId;
    content.innerHTML = `
        <div class="tab-content-area">
            <div class="loading-spinner">Loading ${config.title}...</div>
            <iframe 
                src="${config.file}?id=${uniqueFileId}&t=${Date.now()}" 
                class="tab-iframe"
                style="display: none;"
                frameborder="0"
            ></iframe>
        </div>
    `;
    
    document.getElementById('tabContent').appendChild(content);
    
    // Load iframe content
    const iframe = content.querySelector('iframe');
    const spinner = content.querySelector('.loading-spinner');
    
    iframe.onload = () => {
        spinner.style.display = 'none';
        iframe.style.display = 'block';
    };
    
    activateTab(tabId);
}

function activateTab(tabId) {
    // Remove active class from all tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Remove active class from all content panes
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    
    // Add active class to selected tab button
    const selectedBtn = document.querySelector(`[data-tab="${tabId}"]`);
    if (selectedBtn) {
        selectedBtn.classList.add('active');
    }
    
    // Add active class to selected content pane
    const selectedPane = document.getElementById(tabId);
    if (selectedPane) {
        selectedPane.classList.add('active');
    }
    
    activeTab = tabId;
}

function deleteTab(tabId, tabBtn) {
    const allTabs = document.querySelectorAll('.tab-btn');
    if (allTabs.length === 0) {
        return;
    }
    
    // Remove the tab button
    tabBtn.remove();
    
    // Remove the content panel
    const contentPane = document.getElementById(tabId);
    if (contentPane) {
        contentPane.remove();
    }
    
    // Remove from loaded tabs
    delete loadedTabs[tabId];
    
    // Activate the first remaining tab if the deleted tab was active
    if (activeTab === tabId) {
        const remainingTabs = document.querySelectorAll('.tab-btn');
        if (remainingTabs.length > 0) {
            const firstTabId = remainingTabs[0].dataset.tab;
            activateTab(firstTabId);
        }
    }
}