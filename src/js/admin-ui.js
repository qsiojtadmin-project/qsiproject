// Combined admin UI script: sidebar, tabs, applicants, users, job preview, settings
document.addEventListener('DOMContentLoaded', () => {
    const SUPABASE_CONFIG = {
        url: window.__SUPABASE_URL__ || 'https://ilbneblzkvzebuklyzgn.supabase.co',
        anonKey: window.__SUPABASE_ANON_KEY__ || ''
    };
    const origin = window.location.origin && window.location.origin !== 'null'
        ? window.location.origin
        : '';
    const API_BASE = origin.includes(':5000')
        ? 'http://localhost:5000/api'
        : (origin ? `${origin}/api` : '/api');
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const adminLayout = document.getElementById('admin-layout');
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const tabButtons = document.getElementById('tabButtons');
    const toastContainer = document.getElementById('toast-container');
    const postContextMenu = document.getElementById('post-context-menu');
    const applicantContextMenu = document.getElementById('applicant-context-menu');
    const notificationToggle = document.getElementById('notification-toggle');
    const notifyPanel = document.getElementById('notify-panel');
    const notifyList = document.getElementById('notify-list');
    const notifyBadge = document.getElementById('notify-badge');
    const notifyClear = document.getElementById('notify-clear');
    const profileModal = document.getElementById('profile-modal');
    const profileModalClose = document.getElementById('profile-modal-close');
    const profileModalDone = document.getElementById('profile-modal-done');
    const profileModalEdit = document.getElementById('profile-modal-edit');
    const profileModalRestrict = document.getElementById('profile-modal-restrict');
    const settingsSaveBtn = document.getElementById('settings-save-btn');
    const settingsLogReset = document.getElementById('settings-log-reset');
    const logsClearBtn = document.getElementById('logs-clear-btn');
    const logsExportBtn = document.getElementById('logs-export-btn');
    const createAdminUserBtn = document.getElementById('create-admin-user-btn');
    const logThemeSetting = document.getElementById('log-theme-setting');
    const logFontSetting = document.getElementById('log-font-setting');
    const logDensitySetting = document.getElementById('log-density-setting');
    const logWrapSetting = document.getElementById('log-wrap-setting');
    const FORGOT_REQUESTS_KEY = 'qs_forgot_requests';
    const ACCOUNT_AUDIT_LOG_KEY = 'qs_account_audit_logs';
    let homePostsCache = [];
    let activeContextPostId = null;
    let activeApplicantId = null;
    let currentEditingPostId = null;
    const dashboardStats = {
        totalApplicants: document.getElementById('total-applicants-count'),
        registeredUsers: document.getElementById('registered-users-count'),
        activeJobs: document.getElementById('active-jobs-count'),
        interviews: document.getElementById('interviews-count'),
        totalHires: document.getElementById('total-hires-count')
    };
    const dashboardCreatedAccounts = document.getElementById('dashboard-created-accounts');
    const dashboardStatusSummary = document.getElementById('dashboard-status-summary');
    const dashboardNeedsInterview = document.getElementById('dashboard-needs-interview');

    function hasSupabaseConfig() {
        return Boolean(SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey);
    }

    function getSupabaseHeaders(prefer = '') {
        const headers = {
            apikey: SUPABASE_CONFIG.anonKey,
            Authorization: `Bearer ${SUPABASE_CONFIG.anonKey}`,
            'Content-Type': 'application/json'
        };

        if (prefer) headers.Prefer = prefer;
        return headers;
    }

    function setDashboardStat(key, value) {
        const node = dashboardStats[key];
        if (!node) return;
        node.textContent = Number.isFinite(Number(value)) ? Number(value).toLocaleString() : '0';
    }

    async function countSupabaseRows(path) {
        if (!hasSupabaseConfig()) return null;

        const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/${path}`, {
            method: 'HEAD',
            headers: {
                ...getSupabaseHeaders(),
                Prefer: 'count=exact'
            }
        });

        if (!response.ok) return null;

        const range = response.headers.get('content-range') || '';
        const count = Number.parseInt(range.split('/').pop(), 10);
        return Number.isFinite(count) ? count : null;
    }

    async function firstCount(paths) {
        for (const path of paths) {
            try {
                const count = await countSupabaseRows(path);
                if (count !== null) return count;
            } catch (error) {
                continue;
            }
        }
        return null;
    }

    async function loadDashboardStats() {
        const fallbackCounts = {
            totalApplicants: applicantsData.length,
            registeredUsers: usersData.length,
            activeJobs: homePostsCache.filter((post) => post.status === 'published').length || homePostsCache.length,
            interviews: applicantsData.filter((row) => getApplicantStatusClass(row.status) === 'interview').length,
            totalHires: applicantsData.filter((row) => ['hired', 'accepted'].includes(getApplicantStatusClass(row.status))).length
        };

        try {
            const [totalApplicants, registeredUsers, activeJobs, interviews, totalHires] = await Promise.all([
                firstCount([
                    'profiles?select=user_id&role=eq.applicant'
                ]),
                firstCount([
                    'profiles?select=user_id&role=in.(admin,system-admin,employer)',
                    'admins?select=id',
                    'users?select=id'
                ]),
                firstCount([
                    'jobs?select=id&is_active=eq.true',
                    'job_templates?select=id&status=eq.published',
                    'jobs?select=id'
                ]),
                firstCount([
                    'interviews?select=id',
                    'applications?select=id&status=in.(interview,Interview)'
                ]),
                firstCount([
                    'applications?select=id&status=in.(accepted,Hired,hired)'
                ])
            ]);

            setDashboardStat('totalApplicants', totalApplicants ?? fallbackCounts.totalApplicants);
            setDashboardStat('registeredUsers', registeredUsers ?? fallbackCounts.registeredUsers);
            setDashboardStat('activeJobs', activeJobs ?? fallbackCounts.activeJobs);
            setDashboardStat('interviews', interviews ?? fallbackCounts.interviews);
            setDashboardStat('totalHires', totalHires ?? fallbackCounts.totalHires);
            renderDashboardOverview();
        } catch (error) {
            console.error(error);
            setDashboardStat('totalApplicants', fallbackCounts.totalApplicants);
            setDashboardStat('registeredUsers', fallbackCounts.registeredUsers);
            setDashboardStat('activeJobs', fallbackCounts.activeJobs);
            setDashboardStat('interviews', fallbackCounts.interviews);
            setDashboardStat('totalHires', fallbackCounts.totalHires);
            renderDashboardOverview();
        }
    }

    function normalizeJobTemplate(row) {
        return {
            id: row.id,
            title: row.title || '',
            logo: '/assets/logo2.png',
            backgroundImageUrl: row.background_image_url || '',
            requirements: Array.isArray(row.requirements) ? row.requirements : [],
            benefits: Array.isArray(row.benefits) ? row.benefits : [],
            description: Array.isArray(row.description_items) ? row.description_items : [],
            email: row.email || '',
            phone: row.phone || '',
            website: row.website || '',
            location: row.location || '',
            type: row.job_type || 'Full-time',
            status: row.status || 'draft',
            published_at: row.published_at || '',
            updated_at: row.updated_at || '',
            created_at: row.created_at || ''
        };
    }

    // Sidebar Toggle Logic
    sidebarToggle?.addEventListener('click', () => {
        if (window.innerWidth <= 980) {
            adminLayout.classList.toggle('sidebar-mobile-open');
        } else {
            adminLayout.classList.toggle('collapsed');
        }
    });

    // Close mobile sidebar when clicking outside on mobile
    document.addEventListener('click', (e) => {
        if (window.innerWidth <= 980 && 
            adminLayout?.classList.contains('sidebar-mobile-open') && 
            !e.target.closest('#sidebar') && 
            !e.target.closest('#sidebar-toggle')) {
            adminLayout.classList.remove('sidebar-mobile-open');
        }
    });

    document.querySelectorAll('[data-settings-tab]').forEach((button) => {
        button.addEventListener('click', () => {
            const target = button.dataset.settingsTab;
            document.querySelectorAll('[data-settings-tab]').forEach((item) => {
                item.classList.toggle('is-active', item === button);
            });
            document.querySelectorAll('[data-settings-panel]').forEach((panel) => {
                panel.classList.toggle('is-active', panel.dataset.settingsPanel === target);
            });
        });
    });

    settingsSaveBtn?.addEventListener('click', () => {
        const settings = {};
        document.querySelectorAll('#settings-panel input, #settings-panel select').forEach((field) => {
            const key = field.closest('label')?.querySelector('span')?.textContent || field.id || field.name;
            settings[key] = field.type === 'checkbox' ? field.checked : field.value;
        });
        localStorage.setItem('qs_admin_settings', JSON.stringify(settings));
        showToast('Settings saved locally.');
    });

    function getLogSettings() {
        try {
            return JSON.parse(localStorage.getItem('qs_admin_log_design') || '{}');
        } catch (error) {
            return {};
        }
    }

    function applyLogDesign(settings = getLogSettings()) {
        const terminal = document.getElementById('settings-log-terminal');
        if (!terminal) return;
        const theme = settings.theme || 'dark';
        const font = settings.font || 'small';
        const density = settings.density || 'compact';
        const wrap = settings.wrap || 'nowrap';

        terminal.classList.remove(
            'log-theme-dark',
            'log-theme-green',
            'log-theme-light',
            'log-font-small',
            'log-font-medium',
            'log-font-large',
            'log-density-compact',
            'log-density-comfortable',
            'log-wrap-nowrap',
            'log-wrap-wrap'
        );
        terminal.classList.add(
            `log-theme-${theme}`,
            `log-font-${font}`,
            `log-density-${density}`,
            `log-wrap-${wrap}`
        );

        if (logThemeSetting) logThemeSetting.value = theme;
        if (logFontSetting) logFontSetting.value = font;
        if (logDensitySetting) logDensitySetting.value = density;
        if (logWrapSetting) logWrapSetting.value = wrap;
    }

    function saveLogDesign() {
        const settings = {
            theme: logThemeSetting?.value || 'dark',
            font: logFontSetting?.value || 'small',
            density: logDensitySetting?.value || 'compact',
            wrap: logWrapSetting?.value || 'nowrap'
        };
        localStorage.setItem('qs_admin_log_design', JSON.stringify(settings));
        applyLogDesign(settings);
    }

    [logThemeSetting, logFontSetting, logDensitySetting, logWrapSetting].forEach((control) => {
        control?.addEventListener('change', saveLogDesign);
    });

    function getAuditLogs() {
        try {
            const parsed = JSON.parse(localStorage.getItem(ACCOUNT_AUDIT_LOG_KEY) || '[]');
            return Array.isArray(parsed) ? parsed : [];
        } catch (error) {
            return [];
        }
    }

    function saveAuditLogs(logs) {
        localStorage.setItem(ACCOUNT_AUDIT_LOG_KEY, JSON.stringify(logs.slice(0, 100)));
    }

    function getCurrentAdminName() {
        const raw = localStorage.getItem('qs_admin_session') || sessionStorage.getItem('qs_admin_session_temp');
        if (!raw) return 'Current Admin';
        try {
            const session = JSON.parse(raw);
            const user = session.admin || session.user || session;
            return getUserDisplayName(user?.user_metadata || user) || user?.email || 'Current Admin';
        } catch (error) {
            return 'Current Admin';
        }
    }

    function addAuditLog(entry) {
        const logs = getAuditLogs();
        logs.unshift({
            at: entry.at || new Date().toISOString(),
            actor: entry.actor || getCurrentAdminName(),
            action: String(entry.action || 'INFO').toUpperCase(),
            detail: entry.detail || 'Updated account audit log',
            scope: String(entry.scope || 'ADMIN').toUpperCase()
        });
        saveAuditLogs(logs);
        renderAuditLogs();
    }

    function formatAuditTime(value) {
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return 'Unknown';
        return date.toLocaleString();
    }

    function renderAuditLogs() {
        const terminal = document.getElementById('settings-log-terminal');
        if (!terminal) return;
        const logs = getAuditLogs();

        if (!logs.length) {
            terminal.innerHTML = '<div><time>No logs</time><span>System</span><strong>INFO</strong><em>No login or account creation activity recorded yet</em><code>OK</code></div>';
            return;
        }

        terminal.innerHTML = logs.map((log) => `
            <div>
                <time>${escapeDashboardText(formatAuditTime(log.at))}</time>
                <span>${escapeDashboardText(log.actor)}</span>
                <strong>${escapeDashboardText(log.action)}</strong>
                <em>${escapeDashboardText(log.detail)}</em>
                <code>${escapeDashboardText(log.scope)}</code>
            </div>
        `).join('');
    }

    settingsLogReset?.addEventListener('click', () => {
        localStorage.removeItem('qs_admin_log_design');
        applyLogDesign({ theme: 'dark', font: 'small', density: 'compact', wrap: 'nowrap' });
        showToast('Log design reset.');
    });

    logsClearBtn?.addEventListener('click', () => {
        localStorage.removeItem(ACCOUNT_AUDIT_LOG_KEY);
        renderAuditLogs();
        showToast('Log view cleared.');
    });

    logsExportBtn?.addEventListener('click', () => {
        const logs = getAuditLogs();
        const rows = logs.map((log) => [
            formatAuditTime(log.at),
            log.actor,
            log.action,
            log.detail,
            log.scope
        ].join(' | '));
        const blob = new Blob([rows.join('\n')], { type: 'text/plain;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = 'account-logs.txt';
        link.click();
        URL.revokeObjectURL(link.href);
    });

    // Tab & Navigation Logic
    const config = {
        dashboard: 'Dashboard',
        applicants: 'Applicants',
        users: 'Users',
        jobs: 'Job Templates',
        posts: 'Home Posts',
        analytics: 'Analytics',
        logs: 'Logs',
        settings: 'Settings'
    };

    function switchTab(id) {
        const panels = document.querySelectorAll('.admin-section');
        const activePanel = document.getElementById(`${id}-panel`) || document.getElementById('placeholder-panel');
        panels.forEach((panel) => {
            const isActive = panel === activePanel;
            panel.hidden = !isActive;
            panel.classList.toggle('is-active', isActive);
        });
        if (activePanel === document.getElementById('placeholder-panel')) {
            activePanel.querySelector('h2').textContent = config[id] || id;
        }

        sidebarLinks.forEach(link => link.classList.toggle('active', link.dataset.tab === id));
        updateTabBar(id);
        if (window.innerWidth <= 980) adminLayout?.classList.remove('sidebar-mobile-open');

        if (id === 'posts') renderHomePosts();
    }

    function updateTabBar(id) {
        if (!tabButtons) return;
        let existingTab = document.querySelector(`.tab-item[data-tab-id="${id}"]`);
        document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
        if (!existingTab) {
            const tab = document.createElement('div');
            tab.className = 'tab-item active';
            tab.dataset.tabId = id;
            tab.innerHTML = `<span>${config[id]}</span><i class="fa-solid fa-xmark close"></i>`;
            tab.addEventListener('click', (e) => {
                if (e.target.classList.contains('close')) removeTab(id, tab);
                else switchTab(id);
            });
            tabButtons.appendChild(tab);
        } else {
            existingTab.classList.add('active');
        }
    }

    function removeTab(id, tabElement) {
        const tabs = document.querySelectorAll('.tab-item');
        if (tabs.length === 1) return;
        const isActive = tabElement.classList.contains('active');
        tabElement.remove();
        if (isActive) {
            const remainingTabs = document.querySelectorAll('.tab-item');
            const nextTabId = remainingTabs[remainingTabs.length - 1].dataset.tabId;
            switchTab(nextTabId);
        }
    }

    sidebarLinks.forEach(link => link.addEventListener('click', (e) => {
        e.preventDefault();
        const target = link.dataset.tab;
        window.location.hash = target;
        switchTab(target);
    }));
    switchTab('dashboard');

    function getForgotRequests() {
        try {
            const raw = localStorage.getItem(FORGOT_REQUESTS_KEY) || '[]';
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }

    function formatRequestTime(value) {
        if (!value) return '';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '';
        return date.toLocaleString();
    }

    function renderNotifications() {
        if (!notifyList || !notifyBadge) return;
        const items = getForgotRequests();
        const count = items.length;
        notifyBadge.hidden = count === 0;
        notifyBadge.textContent = count > 9 ? '9+' : String(count);

        if (!items.length) {
            notifyList.innerHTML = '<p class="notify-empty">No requests yet.</p>';
            return;
        }

        notifyList.innerHTML = items.map((item) => {
            const email = String(item?.email || '').trim();
            const reason = String(item?.reason || 'Cannot login').trim();
            const time = formatRequestTime(item?.requested_at);
            const reasonMarkup = reason ? `<div class="notify-reason">${reason}</div>` : '';
            const timeMarkup = time ? `<small>${time}</small>` : '';
            return `<div class="notify-item"><strong>${email || 'Unknown email'}</strong>${reasonMarkup}${timeMarkup}</div>`;
        }).join('');
    }

    function setNotificationsOpen(open) {
        if (!notifyPanel || !notificationToggle) return;
        notifyPanel.classList.toggle('is-open', open);
        notifyPanel.setAttribute('aria-hidden', String(!open));
        notificationToggle.setAttribute('aria-expanded', String(open));
    }

    notificationToggle?.addEventListener('click', (event) => {
        event.stopPropagation();
        setNotificationsOpen(!notifyPanel.classList.contains('is-open'));
    });

    notifyClear?.addEventListener('click', () => {
        localStorage.removeItem(FORGOT_REQUESTS_KEY);
        renderNotifications();
    });

    document.addEventListener('click', (event) => {
        if (!notifyPanel?.classList.contains('is-open')) return;
        if (notifyPanel.contains(event.target) || notificationToggle?.contains(event.target)) return;
        setNotificationsOpen(false);
    });

    window.addEventListener('storage', (event) => {
        if (event.key === FORGOT_REQUESTS_KEY) renderNotifications();
    });

    renderNotifications();

    // --- Rest of UI logic: applicants, users ---
    const navLogout = document.getElementById('nav-logout');

    let applicantsData = [];

    const ADMIN_ROLE_ALLOWLIST = new Set(['system-admin', 'admin']);
    let usersData = [];

    function getRoleSlug(role) {
        return String(role || '')
            .trim()
            .toLowerCase()
            .replace(/[\s_]+/g, '-')
            .replace(/[^a-z0-9-]/g, '');
    }

    function getUserDisplayName(row) {
        const first = String(row?.First_Name || row?.first_name || row?.firstName || '').trim();
        const middle = String(row?.Middle_Name || row?.middle_name || row?.middleName || '').trim();
        const last = String(row?.Last_Name || row?.last_name || row?.lastName || '').trim();
        const combined = [first, middle, last].filter(Boolean).join(' ').trim();
        return combined || row?.full_name || row?.fullName || row?.name || row?.username || row?.email || 'Admin';
    }
// --- Dynamic User Profile Fetching ---
    function renderCurrentUserProfile() {
        const profileEl = document.querySelector('.user-profile');
        if (!profileEl) return;

        const sessionRaw = localStorage.getItem('qs_admin_session') || sessionStorage.getItem('qs_admin_session_temp');
        
        // If no session exists (e.g., local UI testing), keep it visible so you can see the design
        if (!sessionRaw) {
            profileEl.style.display = 'flex';
            return;
        }

        try {
            const session = JSON.parse(sessionRaw);
            const user = session.admin || session.user || session;
            
            // Extract role from Supabase metadata
            const metaRole = user?.user_metadata?.role || user?.user_metadata?.role_type || user?.app_metadata?.role;
            
            // 👇 CHANGED: Prioritize the database column "role_type" BEFORE the default Supabase "user.role"
            const rawRole = metaRole || user.role_type || user.roleType || user.role || 'admin';
            
            let roleSlug = getRoleSlug(rawRole);
            
            // Supabase defaults users to 'authenticated', we treat them as admin for UI dev if not specified
            if (roleSlug === 'authenticated') {
                roleSlug = 'admin'; 
            }

            // Check if role is system-admin or admin
            if (ADMIN_ROLE_ALLOWLIST.has(roleSlug)) {
                const name = getUserDisplayName(user?.user_metadata || user) || 'Admin';
                
                // Display "System Admin" if roleSlug matches, else "Admin"
                const roleDisplay = roleSlug === 'system-admin' ? 'System Admin' : 'Admin';
                
                profileEl.querySelector('.avatar').textContent = name.charAt(0).toUpperCase();
                profileEl.querySelector('.user-name').textContent = name;
                profileEl.querySelector('.user-role').textContent = roleDisplay;
                profileEl.style.display = 'flex';
            } else {
                // ONLY hide the profile if we confirm a non-admin is actively logged in
                profileEl.style.display = 'none';
            }
        } catch (e) {
            // If error parsing, leave it visible for safety
            profileEl.style.display = 'flex';
        }
    }

    function normalizeAdminUser(row) {
        const defaultAdminEmail = String(window.__ADMIN_DEFAULT_EMAIL__ || '').trim().toLowerCase();
        const email = String(row?.email || row?.Email || row?.user_email || '').trim();
        const username = String(row?.username || row?.user_name || row?.Username || '').trim();
        const displayKey = email || username || String(row?.id || row?.user_id || '').trim();
        const roleRaw = row?.role_type || row?.role || row?.roleType || '';
        const roleFromTable = getRoleSlug(roleRaw || '');
        const role = defaultAdminEmail && email.toLowerCase() === defaultAdminEmail
            ? 'system-admin'
            : (ADMIN_ROLE_ALLOWLIST.has(roleFromTable) ? roleFromTable : 'admin');
        return {
            id: row?.id || row?.user_id || row?.userId || '',
            name: getUserDisplayName(row),
            email: displayKey,
            username,
            role,
            created_at: row?.created_at || row?.createdAt || row?.registered_at || ''
        };
    }

    function filterAdminUsers(rows) {
        return rows;
    }

    function formatRoleLabel(role) {
        return String(role || '')
            .replace(/[-_]+/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase());
    }

    function formatProfileDate(value) {
        if (!value) return '-';
        const date = new Date(value);
        if (Number.isNaN(date.getTime())) return '-';
        return date.toLocaleDateString(undefined, {
            year: 'numeric',
            month: 'short',
            day: 'numeric'
        });
    }

    function escapeDashboardText(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function getStatusCount(statuses) {
        const allowed = new Set(statuses);
        return applicantsData.filter((row) => allowed.has(getApplicantStatusClass(row.status))).length;
    }

    function renderDashboardOverview() {
        if (dashboardCreatedAccounts) {
            const accountRows = [
                ...usersData.map((user) => ({
                    name: user.name || user.email || 'User',
                    email: user.email || 'No email',
                    role: formatRoleLabel(user.role || 'User'),
                    date: user.created_at || ''
                })),
                ...applicantsData.map((applicant) => ({
                    name: applicant.name || 'Applicant',
                    email: applicant.email || 'No email',
                    role: 'Applicant',
                    date: applicant.date || ''
                }))
            ].sort((a, b) => {
                const aTime = new Date(a.date || 0).getTime() || 0;
                const bTime = new Date(b.date || 0).getTime() || 0;
                return bTime - aTime;
            }).slice(0, 6);

            dashboardCreatedAccounts.innerHTML = accountRows.length
                ? accountRows.map((row) => `
                    <div class="dashboard-table-row">
                        <div class="dashboard-person">
                            <strong>${escapeDashboardText(row.name)}</strong>
                            <span>${escapeDashboardText(row.email)}</span>
                        </div>
                        <span class="dashboard-role">${escapeDashboardText(row.role)}</span>
                        <time>${escapeDashboardText(formatProfileDate(row.date))}</time>
                    </div>
                `).join('')
                : '<p class="dashboard-empty">No account activity yet.</p>';
        }

        if (dashboardStatusSummary) {
            const statusItems = [
                { label: 'Pending / Review', icon: 'fa-hourglass-half', count: getStatusCount(['pending', 'under-review', 'registered', 'reviewing', 'started']) },
                { label: 'Need Interview', icon: 'fa-calendar-check', count: getStatusCount(['interview', 'for-interview', 'scheduled']) },
                { label: 'Hired', icon: 'fa-handshake', count: getStatusCount(['hired', 'accepted']) },
                { label: 'Rejected / Archived', icon: 'fa-box-archive', count: getStatusCount(['rejected', 'archived']) }
            ];

            dashboardStatusSummary.innerHTML = statusItems.map((item) => `
                <div class="dashboard-status-item">
                    <span><i class="fa-solid ${item.icon}"></i>${item.label}</span>
                    <strong>${item.count}</strong>
                </div>
            `).join('');
        }

        if (dashboardNeedsInterview) {
            const followUpStatuses = new Set(['pending', 'under-review', 'registered', 'reviewing', 'started', 'interview', 'for-interview', 'scheduled']);
            const followUps = applicantsData
                .filter((row) => followUpStatuses.has(getApplicantStatusClass(row.status)))
                .slice(0, 6);

            dashboardNeedsInterview.innerHTML = followUps.length
                ? followUps.map((row) => `
                    <div class="dashboard-follow-row">
                        <div>
                            <strong>${escapeDashboardText(row.name)}</strong>
                            <span>${escapeDashboardText(row.title || 'Applicant')}</span>
                        </div>
                        <span class="status ${getApplicantStatusClass(row.status)}">${escapeDashboardText(formatApplicantStatus(row.status))}</span>
                        <time>${escapeDashboardText(formatProfileDate(row.date))}</time>
                    </div>
                `).join('')
                : '<p class="dashboard-empty">No pending applicants right now.</p>';
        }

    }

    function setProfileField(id, value) {
        const node = document.getElementById(id);
        if (!node) return;
        node.textContent = value || '-';
    }

    function openProfileModal(profile) {
        if (!profileModal) return;
        const name = profile.name || 'User';
        const role = formatRoleLabel(profile.role || 'applicant');
        const initial = name.trim().charAt(0).toUpperCase() || 'U';

        setProfileField('profile-modal-avatar', initial);
        setProfileField('profile-modal-type', profile.type || 'Profile');
        setProfileField('profile-modal-name', name);
        setProfileField('profile-modal-role', role);
        setProfileField('profile-modal-email', profile.email);
        setProfileField('profile-modal-title', profile.title || profile.position || profile.role);
        setProfileField('profile-modal-status', profile.status || role);
        setProfileField('profile-modal-date', formatProfileDate(profile.date || profile.created_at));

        profileModal.classList.add('is-open');
        profileModal.setAttribute('aria-hidden', 'false');
        document.body.style.overflow = 'hidden';
    }

    function closeProfileModal() {
        if (!profileModal) return;
        profileModal.classList.remove('is-open');
        profileModal.setAttribute('aria-hidden', 'true');
        document.body.style.overflow = '';
    }

    function formatApplicantStatus(status) {
        return String(status || '')
            .replace(/[-_]+/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase());
    }

    function getApplicantStatusClass(status) {
        return String(status || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-');
    }

    function getApplicantName(row) {
        const full = String(row?.full_name || row?.fullName || '').trim();
        if (full) return full;
        const first = String(row?.first_name || row?.firstName || '').trim();
        const last = String(row?.last_name || row?.lastName || '').trim();
        const combined = `${first} ${last}`.trim();
        return combined || row?.name || row?.email || 'Applicant';
    }

    function normalizeApplicant(row) {
        return {
            id: row?.id || row?.user_id || row?.applicant_id || '',
            name: getApplicantName(row),
            email: row?.email || row?.user_email || row?.contact_number || row?.phone || row?.applicant_id || row?.user_id || '',
            resume: row?.resume || row?.resume_url || row?.resume_link || row?.resume_file || row?.cv || row?.resume_path || 'N/A',
            title: row?.position || row?.job_title || row?.title || row?.applied_position || 'Applicant',
            status: row?.status || 'Under Review',
            date: row?.created_at || row?.createdAt || ''
        };
    }

    async function fetchSupabaseJson(path) {
        if (!hasSupabaseConfig()) return null;
        const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/${path}`, {
            headers: getSupabaseHeaders()
        });
        if (!response.ok) return null;
        return response.json();
    }

    async function loadSupabaseApplicants() {
        if (!hasSupabaseConfig()) return null;

        const profiles = await fetchSupabaseJson(
            'profiles?select=user_id,full_name,contact_number,resume_document_id,created_at&role=eq.applicant&order=created_at.desc'
        );
        const applications = await fetchSupabaseJson(
            'applications?select=id,applicant_id,status,created_at,resume_document_id,jobs(title)&order=created_at.desc'
        );

        if (!Array.isArray(profiles) && !Array.isArray(applications)) return null;

        const profileRows = Array.isArray(profiles) ? profiles : [];
        const applicationRows = Array.isArray(applications) ? applications : [];
        const userIds = [...new Set([
            ...profileRows.map((row) => row.user_id),
            ...applicationRows.map((row) => row.applicant_id)
        ].filter(Boolean))];
        const resumeIds = [...new Set([
            ...profileRows.map((row) => row.resume_document_id),
            ...applicationRows.map((row) => row.resume_document_id)
        ].filter(Boolean))];

        let users = [];
        if (userIds.length) {
            users = await fetchSupabaseJson(`users?select=id,email,username,full_name,role,role_type,created_at&id=in.(${userIds.join(',')})`) || [];
        }

        let documents = [];
        if (resumeIds.length) {
            documents = await fetchSupabaseJson(`documents?select=id,path&id=in.(${resumeIds.join(',')})`) || [];
        }

        const profilesByUser = new Map(profileRows.map((row) => [row.user_id, row]));
        const usersById = new Map(users.map((row) => [row.id, row]));
        const docsById = new Map(documents.map((row) => [row.id, row]));
        const applicationUserIds = new Set(applicationRows.map((row) => row.applicant_id));

        const applicationApplicants = applicationRows.map((application) => {
            const profile = profilesByUser.get(application.applicant_id) || {};
            const user = usersById.get(application.applicant_id) || {};
            const resume = docsById.get(application.resume_document_id || profile.resume_document_id);
            return normalizeApplicant({
                id: application.id,
                applicant_id: application.applicant_id,
                full_name: profile.full_name || user.full_name || user.username,
                email: user.email,
                contact_number: profile.contact_number,
                resume_path: resume?.path,
                title: application.jobs?.title,
                status: application.status,
                created_at: application.created_at
            });
        });

        const registeredApplicants = profileRows
            .filter((profile) => !applicationUserIds.has(profile.user_id))
            .map((profile) => {
                const user = usersById.get(profile.user_id) || {};
                const resume = docsById.get(profile.resume_document_id);
                return normalizeApplicant({
                    id: profile.user_id,
                    user_id: profile.user_id,
                    full_name: profile.full_name || user.full_name || user.username,
                    email: user.email,
                    contact_number: profile.contact_number,
                    resume_path: resume?.path,
                    title: 'Applicant Profile',
                    status: 'Registered',
                    created_at: profile.created_at
                });
            });

        return [...applicationApplicants, ...registeredApplicants];
    }

    function renderApplicants(rows = applicantsData) {
        const body = document.getElementById('applicants-body');
        if (!body) return;
        body.innerHTML = rows.map((row, idx) => `
            <tr class="applicant-row" data-applicant-id="${idx}">
                <td>${row.name}</td>
                <td>${row.email}</td>
                <td>${row.resume}</td>
                <td>${row.title}</td>
                <td><span class="status ${getApplicantStatusClass(row.status)}">${formatApplicantStatus(row.status)}</span></td>
            </tr>
        `).join('');
    }

    async function loadApplicants() {
        try {
            const supabaseApplicants = await loadSupabaseApplicants();
            if (Array.isArray(supabaseApplicants) && supabaseApplicants.length) {
                applicantsData = supabaseApplicants;
                renderApplicants();
                loadDashboardStats();
                return;
            }
        } catch (error) {
            console.error(error);
        }

        const endpoints = [
            `${API_BASE}/applicants`,
            `${API_BASE}/admin/applicants`
        ];

        for (const url of endpoints) {
            try {
                const resp = await fetch(url, { headers: { 'Content-Type': 'application/json' } });
                if (!resp.ok) continue;
                const data = await resp.json();
                const list = Array.isArray(data)
                    ? data
                    : Array.isArray(data?.data)
                        ? data.data
                        : Array.isArray(data?.users)
                            ? data.users
                            : Array.isArray(data?.applicants)
                                ? data.applicants
                                : null;

                if (!list) continue;
                applicantsData = list.map(normalizeApplicant);
                renderApplicants();
                loadDashboardStats();
                return;
            } catch (error) {
                continue;
            }
        }
    }

    function openApplicantContextMenu(applicantId, x, y) {
        if (!applicantContextMenu) return;
        activeApplicantId = applicantId;
        applicantContextMenu.classList.add('active');
        applicantContextMenu.setAttribute('aria-hidden', 'false');

        const menuWidth = 208;
        const menuHeight = 148;
        const left = Math.min(x, window.innerWidth - menuWidth - 16);
        const top = Math.min(y, window.innerHeight - menuHeight - 16);
        applicantContextMenu.style.left = `${Math.max(12, left)}px`;
        applicantContextMenu.style.top = `${Math.max(12, top)}px`;
    }

    function closeApplicantContextMenu() {
        if (!applicantContextMenu) return;
        applicantContextMenu.classList.remove('active');
        applicantContextMenu.setAttribute('aria-hidden', 'true');
        activeApplicantId = null;
    }

    function getApplicantById(applicantId) {
        const index = Number.parseInt(applicantId, 10);
        if (!Number.isFinite(index)) return null;
        return applicantsData[index] || null;
    }

    function viewApplicantProfile(applicantId) {
        const applicant = getApplicantById(applicantId);
        if (!applicant) return;
        closeApplicantContextMenu();
        openProfileModal({
            type: 'Applicant Profile',
            name: applicant.name,
            email: applicant.email,
            role: 'applicant',
            title: applicant.title,
            status: formatApplicantStatus(applicant.status),
            date: applicant.date
        });
    }

    function archiveApplicant(applicantId) {
        const applicant = getApplicantById(applicantId);
        if (!applicant) return;
        applicant.status = 'Archived';
        renderApplicants();
        renderDashboardOverview();
        closeApplicantContextMenu();
        showToast(`${applicant.name} archived.`);
    }

    function startApplicant(applicantId) {
        const applicant = getApplicantById(applicantId);
        if (!applicant) return;
        applicant.status = 'Started';
        renderApplicants();
        renderDashboardOverview();
        closeApplicantContextMenu();
        showToast(`${applicant.name} started.`);
    }

    function renderUsers(rows = usersData) {
        const body = document.getElementById('users-body');
        if (!body) return;
        const filtered = filterAdminUsers(rows);
        if (!filtered.length) {
            body.innerHTML = '<tr><td data-label="Users" colspan="4" class="muted">No users found in Supabase yet.</td></tr>';
            return;
        }
        body.innerHTML = filtered.map((user) => {
            const roleSlug = getRoleSlug(user.role) || 'admin';
            const roleLabel = formatRoleLabel(roleSlug);
            const userKey = user.id || user.email || user.username || user.name;
            return `
            <tr>
                <td data-label="Name">${String(user.name || '').toUpperCase()}</td>
                <td data-label="Email">${user.email}</td>
                <td data-label="Role"><span class="role-pill ${roleSlug}">${roleLabel}</span></td>
                <td data-label="Action">
                    <div class="action-menu" data-user-key="${userKey}">
                        <button class="action-trigger" type="button" aria-label="Open actions" aria-expanded="false">
                            <i class="fa-solid fa-ellipsis-vertical"></i>
                        </button>
                        <div class="action-dropdown" role="menu">
                            <button class="action-item" type="button" data-action="view">View profile</button>
                            <button class="action-item" type="button" data-action="edit">Edit</button>
                            <button class="action-item" type="button" data-action="restrict">Restrict</button>
                            <button class="action-item" type="button" data-action="block">Block</button>
                            <button class="action-item danger" type="button" data-action="delete">Delete</button>
                        </div>
                    </div>
                </td>
            </tr>
        `;
        }).join('');

        body.querySelectorAll('.action-trigger').forEach(btn => {
            btn.addEventListener('click', (event) => {
                event.stopPropagation();
                const menu = btn.closest('.action-menu');
                if (!menu) return;
                const isOpen = menu.classList.contains('is-open');
                closeUserActionMenus();
                menu.classList.toggle('is-open', !isOpen);
                btn.setAttribute('aria-expanded', String(!isOpen));
            });
        });

        body.querySelectorAll('.action-item').forEach(btn => {
            btn.addEventListener('click', async (event) => {
                event.stopPropagation();
                const action = String(btn.dataset.action || '').trim();
                const menu = btn.closest('.action-menu');
                const userKey = String(menu?.dataset.userKey || '').trim();
                if (!userKey || !action) return;
                const selectedUser = usersData.find((user) => {
                    return [user.id, user.email, user.username, user.name]
                        .map((value) => String(value || '').trim().toLowerCase())
                        .includes(userKey.toLowerCase());
                });
                const label = selectedUser?.email || selectedUser?.username || selectedUser?.name || userKey;

                if (action === 'view') {
                    openProfileModal({
                        type: 'Admin User',
                        name: selectedUser?.name || label,
                        email: label,
                        role: selectedUser?.role || 'admin',
                        title: 'Admin account',
                        status: formatRoleLabel(selectedUser?.role || 'admin'),
                        date: selectedUser?.created_at
                    });
                    closeUserActionMenus();
                    return;
                }

                if (action === 'delete') {
                    if (hasSupabaseConfig()) {
                        try {
                            btn.disabled = true;
                            const deleteColumn = selectedUser?.id ? 'id' : selectedUser?.username ? 'username' : 'email';
                            const deleteValue = selectedUser?.id || selectedUser?.username || selectedUser?.email;
                            const resp = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/users?${deleteColumn}=eq.${encodeURIComponent(deleteValue)}` , {
                                method: 'DELETE',
                                headers: getSupabaseHeaders('return=representation')
                            });
                            if (!resp.ok) {
                                showToast && showToast('Failed to delete user');
                                btn.disabled = false;
                                return;
                            }
                        } catch (error) {
                            showToast && showToast('Failed to delete user');
                            btn.disabled = false;
                            return;
                        }
                    }

                    usersData = usersData.filter((user) => user !== selectedUser);
                    renderUsers(usersData);
                    addAuditLog({
                        action: 'DELETE',
                        actor: getCurrentAdminName(),
                        detail: `Deleted admin user ${label}`,
                        scope: 'ADMIN'
                    });
                    showToast && showToast('User deleted');
                    return;
                }

                const actionLabel = action.charAt(0).toUpperCase() + action.slice(1);
                showToast && showToast(`${actionLabel} requested for ${label}`);
                closeUserActionMenus();
            });
        });

        if (!body.dataset.actionMenuBound) {
            document.addEventListener('click', () => {
                closeUserActionMenus();
            });
            body.dataset.actionMenuBound = 'true';
        }
    }

    function closeUserActionMenus() {
        document.querySelectorAll('.action-menu.is-open').forEach((menu) => {
            menu.classList.remove('is-open');
            const trigger = menu.querySelector('.action-trigger');
            if (trigger) trigger.setAttribute('aria-expanded', 'false');
        });
    }

    async function insertSupabaseAdminUser(payloads) {
        let lastError = null;
        for (const payload of payloads) {
            try {
                const resp = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/users`, {
                    method: 'POST',
                    headers: getSupabaseHeaders('return=representation'),
                    body: JSON.stringify(payload)
                });
                if (resp.ok) return resp.json().catch(() => []);
                lastError = await resp.text();
            } catch (error) {
                lastError = error.message;
            }
        }
        throw new Error(lastError || 'Failed to create admin user');
    }

    async function createAdminUser() {
        if (!hasSupabaseConfig()) {
            showToast('Set window.__SUPABASE_ANON_KEY__ before creating users.');
            return;
        }

        const name = String(prompt('Admin full name:') || '').trim();
        if (!name) return;
        const usernameOrEmail = String(prompt('Admin username or email:') || '').trim().toLowerCase();
        if (!usernameOrEmail) return;
        const password = String(prompt('Temporary password:') || '').trim();
        if (!password) return;
        const username = usernameOrEmail.includes('@') ? usernameOrEmail.split('@')[0] : usernameOrEmail;

        createAdminUserBtn.disabled = true;
        try {
            await insertSupabaseAdminUser([
                {
                    name,
                    full_name: name,
                    username,
                    email: usernameOrEmail.includes('@') ? usernameOrEmail : '',
                    password,
                    role: 'admin',
                    role_type: 'admin'
                },
                { username, password, full_name: name, role: 'admin' },
                { username, password, full_name: name },
                { name, email: usernameOrEmail, password, role: 'admin' },
                { name, email: usernameOrEmail, password }
            ]);
            addAuditLog({
                action: 'CREATE',
                actor: getCurrentAdminName(),
                detail: `Created admin user ${username}`,
                scope: 'ADMIN'
            });
            showToast('Admin user created.');
            await loadUsers();
        } catch (error) {
            console.error(error);
            showToast(error.message || 'Failed to create admin user.');
        } finally {
            createAdminUserBtn.disabled = false;
        }
    }

    async function loadUsers() {
        if (!hasSupabaseConfig()) {
            renderUsers(usersData);
            loadDashboardStats();
            return;
        }

        try {
            const resp = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/users?select=*`, {
                headers: getSupabaseHeaders()
            });
            if (!resp.ok) {
                renderUsers(usersData);
                loadDashboardStats();
                return;
            }
            const rows = await resp.json().catch(() => []);
            if (!Array.isArray(rows)) {
                renderUsers(usersData);
                loadDashboardStats();
                return;
            }
            usersData = rows.map(normalizeAdminUser);
            renderUsers(usersData);
            loadDashboardStats();
        } catch (error) {
            renderUsers(usersData);
            loadDashboardStats();
            return;
        }
    }

    createAdminUserBtn?.addEventListener('click', createAdminUser);

    if (navLogout) navLogout.addEventListener('click', () => {
        localStorage.removeItem('qs_admin_session');
        sessionStorage.removeItem('qs_admin_session_temp');
        window.location.href = '/index.html';
    });

    // --- ENHANCED JOB BUILDER LOGIC ---
    function syncPreview() {
        const title = document.getElementById('field-position').value || 'Production Operator';
        const email = document.getElementById('field-email').value || 'hr@questserv.com';
        const website = document.getElementById('field-website').value || 'www.questserv.com';
        const phone = document.getElementById('field-phone')?.value || '+1 (555) 123-4567';
        const logoSrc = '/assets/logo2.png';
        const backgroundSrc = document.getElementById('p-bg-preview')?.src || '';

        const previewContainer = document.getElementById('preview-poster');
        if (!previewContainer) return;

        previewContainer.className = `recruitment-poster ${document.querySelector('.device-btn.active')?.dataset.device === 'mobile' ? 'mobile' : ''}`;

        previewContainer.innerHTML = `
            ${backgroundSrc ? `<div class="poster-bg has-image" style="background-image: url('${backgroundSrc}')"></div>` : ''}
            <div class="poster-watermark">QUESTSERV SOLUTIONS</div>
            <div class="poster-top-row">
                <div class="poster-brand">
                    <img class="p-logo-mini" src="${logoSrc}">
                </div>
                <div class="hiring-banner">
                    <span>WE ARE</span>
                    <strong>HIRING</strong>
                </div>
            </div>
            
            <div class="poster-middle">
                <h1 class="poster-job-title">${title.toUpperCase()}</h1>
                <p class="poster-job-sub">For position</p>
            </div>

            <div class="poster-sections">
                <div class="poster-col">
                    <div class="poster-card">
                        <h6>Requirements</h6>
                        <ul>${renderList('p-req')}</ul>
                    </div>
                    <div class="poster-card">
                        <h6>Benefits</h6>
                        <ul>${renderList('p-ben')}</ul>
                    </div>
                </div>
                <div class="poster-divider"></div>
                <div class="poster-col">
                    <div class="poster-card">
                        <h6>Job Description</h6>
                        <ul>${renderList('p-desc')}</ul>
                    </div>
                    <div class="poster-card">
                        <h6>Submit Resume</h6>
                        <ul>
                            <li>Send your resume to:</li>
                            <li class="email-highlight">${email}</li>
                            <li>${phone}</li>
                            <li>Subject line: Application - ${title}</li>
                        </ul>
                    </div>
                </div>
            </div>

            <div class="poster-footer-bar">
                <div class="footer-info">
                    <div>${phone}</div>
                    <div>${website}</div>
                    <div>${email}</div>
                </div>
                <div class="foot-right">
                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${website}" style="width:100%; height:100%;" alt="QR">
                </div>
            </div>
        `;
    }

    function renderList(textareaId) {
        const val = document.getElementById(textareaId)?.value;
        if (!val) return '<li>Update this content...</li>';
        return val.split('\n').filter(l => l.trim()).map(l => `<li>${l.trim()}</li>`).join('');
    }

    const fieldIds = ['field-position', 'field-email', 'field-phone', 'field-website', 'p-req', 'p-desc', 'p-ben'];
    fieldIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                syncPreview();
                if (el.tagName === 'TEXTAREA') {
                    el.style.height = 'auto';
                    el.style.height = (el.scrollHeight) + 'px';
                    const counter = el.parentElement.querySelector('.char-counter');
                    if (counter) counter.textContent = `${el.value.length} / 1000`;
                }
            });
        }
    });

    // Device Toggle
    document.querySelectorAll('.device-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.device-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            syncPreview();
        });
    });

    // Upload Previews
    function setupUpload(triggerId, inputId, previewId) {
        const trigger = document.getElementById(triggerId);
        const input = document.getElementById(inputId);
        const preview = document.getElementById(previewId);

        trigger?.addEventListener('click', () => input.click());
        input?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (re) => {
                    if (preview) preview.src = re.target.result;
                    trigger?.classList.add('has-file');
                    const title = trigger?.querySelector('p');
                    const hint = trigger?.querySelector('span');
                    if (title) title.textContent = file.name;
                    if (hint) hint.textContent = 'Image ready for the template';
                    syncPreview();
                };
                reader.readAsDataURL(file);
            }
        });
    }
    setupUpload('background-trigger', 'background-input', 'p-bg-preview');

    // ═══════════════════════════════════════════════════════
    //  VIEW TEMPLATE MODAL LOGIC
    // ═══════════════════════════════════════════════════════

    const vtModal   = document.getElementById('vt-modal');
    const vtClose   = document.getElementById('vt-close-btn');
    const vtSelect  = document.getElementById('vt-select-btn');
    const vtPrint   = document.getElementById('vt-print-btn');
    const vtTrigger = document.getElementById('view-template-btn');
    const vtPosterWrap = document.getElementById('vt-poster-wrap');

    /** Read current form values and hydrate the VT modal poster */
    function hydrateViewTemplate() {
        const title   = document.getElementById('field-position')?.value.trim() || 'Production Operator';
        const email   = document.getElementById('field-email')?.value.trim()    || 'hr@questserv.com';
        const phone   = document.getElementById('field-phone')?.value.trim()    || '+1 (555) 123-4567';
        const website = document.getElementById('field-website')?.value.trim()  || 'www.questserv.com';
        const logoSrc = '/assets/logo1.png';
        const backgroundSrc = document.getElementById('p-bg-preview')?.src      || '';

        // Title & logo
        const el = (id) => document.getElementById(id);
        if (el('vt-title'))        el('vt-title').textContent = title.toUpperCase();
        if (el('vt-logo'))         el('vt-logo').src = logoSrc;
        if (el('vt-bg')) {
            el('vt-bg').style.backgroundImage = backgroundSrc ? `url("${backgroundSrc}")` : '';
            el('vt-bg').hidden = !backgroundSrc;
        }

        // Lists
        const buildList = (textareaId) => {
            const raw = el(textareaId)?.value || '';
            const lines = raw.split('\n').map(l => l.trim()).filter(Boolean);
            return lines.length
                ? lines.map(l => `<li>${l}</li>`).join('')
                : '<li>Update this content...</li>';
        };

        if (el('vt-req-list'))     el('vt-req-list').innerHTML  = buildList('p-req');
        if (el('vt-ben-list'))     el('vt-ben-list').innerHTML  = buildList('p-ben');
        if (el('vt-desc-list'))    el('vt-desc-list').innerHTML = buildList('p-desc');

        // Contact block
        if (el('vt-email'))         el('vt-email').textContent       = email;
        if (el('vt-phone-li'))      el('vt-phone-li').textContent     = phone;
        if (el('vt-subject-li'))    el('vt-subject-li').textContent   = `Subject line: Application – ${title}`;

        // Footer
        if (el('vt-footer-phone'))  el('vt-footer-phone').textContent = phone;
        if (el('vt-footer-web'))    el('vt-footer-web').textContent   = website;
        if (el('vt-footer-email'))  el('vt-footer-email').textContent = email;

        // QR code
        if (el('vt-qr')) {
            el('vt-qr').innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=110x110&data=${encodeURIComponent(website)}" alt="QR">`;
        }
    }

    function openViewTemplate() {
        hydrateViewTemplate();
        vtModal?.classList.add('active');
        document.body.style.overflow = 'hidden';
    }

    function closeViewTemplate() {
        vtModal?.classList.remove('active');
        document.body.style.overflow = '';
    }

    function printViewTemplate() {
        const poster = document.getElementById('vt-poster');
        if (!poster) return;

        hydrateViewTemplate();

        let printRoot = document.getElementById('print-export-root');
        if (printRoot) printRoot.remove();

        printRoot = document.createElement('div');
        printRoot.id = 'print-export-root';
        printRoot.setAttribute('aria-hidden', 'true');

        const printPoster = poster.cloneNode(true);
        printRoot.appendChild(printPoster);
        document.body.appendChild(printRoot);
        document.body.classList.add('print-template-active');

        const cleanupPrint = () => {
            document.body.classList.remove('print-template-active');
            printRoot?.remove();
            window.removeEventListener('afterprint', cleanupPrint);
        };

        window.addEventListener('afterprint', cleanupPrint);

        setTimeout(() => {
            window.print();
        }, 150);
    }

    vtTrigger?.addEventListener('click', openViewTemplate);
    vtClose?.addEventListener('click', closeViewTemplate);

    // Close on backdrop click
    vtModal?.addEventListener('click', (e) => {
        if (e.target === vtModal) closeViewTemplate();
    });

    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && vtModal?.classList.contains('active')) closeViewTemplate();
    });

    // Print / Save as PDF
    vtPrint?.addEventListener('click', () => {
        printViewTemplate();
    });

    // ═══════════════════════════════════════════════════════
    //  HOME POSTS LOGIC
    // ═══════════════════════════════════════════════════════

    function renderHomePosts() {
        const container = document.getElementById('home-posts-container');
        if (!container) return;
        const posts = homePostsCache;
        if (!posts.length) {
            container.innerHTML = `<div class="placeholder-content" style="grid-column: 1/-1;"><h2>Feed is empty</h2><p>Published posters will appear here.</p></div>`;
            return;
        }

        const buildPostList = (value, fallback) => {
            const source = Array.isArray(value) ? value : `${value || ''}`.split('\n');
            const lines = source
                .map((line) => line.trim())
                .filter(Boolean);
            return lines.length
                ? lines.slice(0, 3).map((line) => `<li>${line}</li>`).join('')
                : `<li>${fallback}</li>`;
        };

        container.innerHTML = posts.map((post, index) => `
            <article class="post-card home-post-card" data-post-id="${post.id}">
                <div class="recruitment-poster home-post-poster">
                    <div class="home-post-poster-frame">
                        <div class="vt-poster">
                            ${(post.backgroundImageUrl || post.background) ? `<div class="vt-bg" style="background-image: url('${post.backgroundImageUrl || post.background}')"></div>` : ''}
                            <div class="vt-watermark">QUESTSERV SOLUTIONS</div>
                            <div class="vt-top">
                                <div class="vt-brand">
                                    <img class="vt-logo" src="${post.logo || '/assets/logo2.png'}" alt="QuestServ logo">
                                    <div class="vt-brand-text"></div>
                                </div>
                                <div class="vt-hire-badge">
                                    <span class="we-are">WE ARE</span>
                                    <span class="hiring">HIRING</span>
                                </div>
                            </div>
                            <div class="vt-hero">
                                <h1 class="vt-hero-title">${(post.title || '').toUpperCase()}</h1>
                                <p class="vt-hero-sub">For position</p>
                            </div>
                            <div class="vt-body">
                                <div class="vt-col">
                                    <div class="vt-sec">
                                        <h6 class="vt-sec-title">Requirements</h6>
                                        <ul class="vt-sec-list">${buildPostList(post.requirements || post.reqs, 'Update this content...')}</ul>
                                    </div>
                                    <div class="vt-sec">
                                        <h6 class="vt-sec-title">Benefits</h6>
                                        <ul class="vt-sec-list">${buildPostList(post.benefits, 'Update this content...')}</ul>
                                    </div>
                                </div>
                                <div class="vt-divider"></div>
                                <div class="vt-col">
                                    <div class="vt-sec">
                                        <h6 class="vt-sec-title">Job Description</h6>
                                        <ul class="vt-sec-list">${buildPostList(post.description, 'Update this content...')}</ul>
                                    </div>
                                    <div class="vt-sec">
                                        <h6 class="vt-sec-title">Submit Resume</h6>
                                        <ul class="vt-sec-list">
                                            <li>Send your resume to:</li>
                                            <li><span class="vt-email-hl">${post.email || 'hr@questserv.com'}</span></li>
                                            <li>${post.phone || '+1 (555) 123-4567'}</li>
                                            <li>Subject line: Application - ${post.title || 'Position'}</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>
                            <div class="vt-footer">
                                <div class="vt-footer-info">
                                    <span class="hl">${post.phone || '+1 (555) 123-4567'}</span>
                                    <span>${post.website || 'www.questserv.com'}</span>
                                    <span>${post.email || 'hr@questserv.com'}</span>
                                </div>
                                <div class="vt-qr">
                                    <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(post.website || 'www.questserv.com')}" alt="QR">
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="home-post-meta">
                    <span class="home-post-index">${post.title || `Template ${index + 1}`}</span>
                    <span class="home-post-hint">${[post.type, post.location].filter(Boolean).join(' • ') || 'Position details'}</span>
                </div>
            </article>
        `).join('');
    }

    function setUploadZoneState(triggerId, title, hint) {
        const trigger = document.getElementById(triggerId);
        if (!trigger) return;

        const titleEl = trigger.querySelector('p');
        const hintEl = trigger.querySelector('span');
        trigger.classList.toggle('has-file', Boolean(title));
        if (titleEl) titleEl.textContent = title || 'Upload Background';
        if (hintEl) hintEl.textContent = hint || 'Shows on the poster only after you choose an image';
    }

    function fillBuilderFormFromPost(post) {
        currentEditingPostId = post.id;
        document.getElementById('field-position').value = post.title || '';
        document.getElementById('field-email').value = post.email || '';
        document.getElementById('field-phone').value = post.phone || '';
        document.getElementById('field-website').value = post.website || '';
        document.getElementById('field-location').value = post.location || '';
        document.getElementById('field-type').value = post.type || 'Full-time';
        document.getElementById('p-req').value = Array.isArray(post.requirements) ? post.requirements.join('\n') : '';
        document.getElementById('p-ben').value = Array.isArray(post.benefits) ? post.benefits.join('\n') : '';
        document.getElementById('p-desc').value = Array.isArray(post.description) ? post.description.join('\n') : '';

        const bgPreview = document.getElementById('p-bg-preview');
        if (bgPreview) {
            if (post.backgroundImageUrl) {
                bgPreview.src = post.backgroundImageUrl;
                setUploadZoneState('background-trigger', 'Background selected', 'Image ready for the template');
            } else {
                bgPreview.removeAttribute('src');
                setUploadZoneState('background-trigger');
            }
        }

        document.querySelectorAll('textarea').forEach((el) => {
            el.style.height = 'auto';
            el.style.height = `${el.scrollHeight}px`;
            const counter = el.parentElement?.querySelector('.char-counter');
            if (counter) counter.textContent = `${el.value.length} / 1000`;
        });

        syncPreview();
    }

    function viewPostTemplate(postId) {
        const post = homePostsCache.find((item) => String(item.id) === String(postId));
        if (!post) return;

        const previousState = {
            editingId: currentEditingPostId,
            position: document.getElementById('field-position').value,
            email: document.getElementById('field-email').value,
            phone: document.getElementById('field-phone').value,
            website: document.getElementById('field-website').value,
            location: document.getElementById('field-location').value,
            type: document.getElementById('field-type').value,
            req: document.getElementById('p-req').value,
            ben: document.getElementById('p-ben').value,
            desc: document.getElementById('p-desc').value,
            bg: document.getElementById('p-bg-preview')?.getAttribute('src') || ''
        };

        fillBuilderFormFromPost(post);
        openViewTemplate();

        document.getElementById('field-position').value = previousState.position;
        document.getElementById('field-email').value = previousState.email;
        document.getElementById('field-phone').value = previousState.phone;
        document.getElementById('field-website').value = previousState.website;
        document.getElementById('field-location').value = previousState.location;
        document.getElementById('field-type').value = previousState.type;
        document.getElementById('p-req').value = previousState.req;
        document.getElementById('p-ben').value = previousState.ben;
        document.getElementById('p-desc').value = previousState.desc;
        currentEditingPostId = previousState.editingId;
        const bgPreview = document.getElementById('p-bg-preview');
        if (bgPreview) {
            if (previousState.bg) bgPreview.src = previousState.bg;
            else bgPreview.removeAttribute('src');
        }
        setUploadZoneState(
            'background-trigger',
            previousState.bg ? 'Background selected' : '',
            previousState.bg ? 'Image ready for the template' : ''
        );
        syncPreview();
    }

    function editPostTemplate(postId) {
        const post = homePostsCache.find((item) => String(item.id) === String(postId));
        if (!post) return;
        fillBuilderFormFromPost(post);
        switchTab('jobs');
        window.location.hash = '#jobs';
        closePostContextMenu();
        showToast('Template loaded for editing.');
    }

    async function deletePostTemplate(postId) {
        if (String(postId) === 'local-draft') {
            removeDraftLocally();
            homePostsCache = homePostsCache.filter((item) => String(item.id) !== 'local-draft');
            renderHomePosts();
            closePostContextMenu();
            showToast('Draft deleted.');
            return;
        }

        if (!hasSupabaseConfig()) {
            showToast('Set window.__SUPABASE_ANON_KEY__ before deleting posts.');
            return;
        }

        try {
            const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/job_templates?id=eq.${postId}`, {
                method: 'DELETE',
                headers: getSupabaseHeaders()
            });
            if (!response.ok) throw new Error('Failed to delete template');
            homePostsCache = homePostsCache.filter((item) => String(item.id) !== String(postId));
            renderHomePosts();
            closePostContextMenu();
            showToast('Template deleted.');
        } catch (error) {
            console.error(error);
            showToast('Failed to delete template.');
        }
    }

    function openPostContextMenu(postId, x, y) {
        if (!postContextMenu) return;
        activeContextPostId = postId;
        postContextMenu.classList.add('active');
        postContextMenu.setAttribute('aria-hidden', 'false');

        const menuWidth = 190;
        const menuHeight = 148;
        const left = Math.min(x, window.innerWidth - menuWidth - 16);
        const top = Math.min(y, window.innerHeight - menuHeight - 16);
        postContextMenu.style.left = `${Math.max(12, left)}px`;
        postContextMenu.style.top = `${Math.max(12, top)}px`;
    }

    function closePostContextMenu() {
        if (!postContextMenu) return;
        postContextMenu.classList.remove('active');
        postContextMenu.setAttribute('aria-hidden', 'true');
        activeContextPostId = null;
    }

    const jobForm      = document.getElementById('job-form');
    const confirmModal = document.getElementById('confirm-publish-modal');
    const successModal = document.getElementById('success-modal');
    const successMsg   = document.getElementById('success-modal-msg');
    
    function showSuccess(msg) {
        if (successMsg) successMsg.textContent = msg;
        successModal?.classList.add('active');
    }

    document.getElementById('success-modal-ok')?.addEventListener('click', () => {
        successModal?.classList.remove('active');
    });

    function openPublishConfirm() {
        confirmModal?.classList.add('active');
    }

    async function loadHomePosts() {
        const localDraft = normalizeLocalDraft(loadDraftLocally());

        if (!hasSupabaseConfig()) {
            homePostsCache = localDraft ? [localDraft] : [];
            renderHomePosts();
            loadDashboardStats();
            return;
        }

        try {
            const response = await fetch(
                `${SUPABASE_CONFIG.url}/rest/v1/job_templates?status=eq.published&select=*&order=published_at.desc.nullslast,updated_at.desc`,
                { headers: getSupabaseHeaders() }
            );
            if (!response.ok) throw new Error('Failed to load job templates');
            const rows = await response.json();
            homePostsCache = [
                ...(localDraft ? [localDraft] : []),
                ...rows.map(normalizeJobTemplate)
            ];
            renderHomePosts();
            loadDashboardStats();
        } catch (error) {
            console.error(error);
            homePostsCache = localDraft ? [localDraft] : [];
            renderHomePosts();
            loadDashboardStats();
            showToast('Could not load published templates from Supabase.');
        }
    }

    function buildTemplateRequestBody(status = 'published') {
        return {
            title: document.getElementById('field-position').value,
            email: document.getElementById('field-email').value || 'hr@questserv.com',
            phone: document.getElementById('field-phone').value || '+1 (555) 123-4567',
            website: document.getElementById('field-website').value || 'www.questserv.com',
            subject: 'JOB HIRING',
            location: document.getElementById('field-location')?.value || 'Cavite',
            job_type: document.getElementById('field-type')?.value || 'Full-time',
            company_name: 'QuestServ Solutions Inc.',
            background_image_url: document.getElementById('p-bg-preview')?.src || '',
            requirements: document.getElementById('p-req').value.split('\n').map((v) => v.trim()).filter(Boolean),
            benefits: document.getElementById('p-ben').value.split('\n').map((v) => v.trim()).filter(Boolean),
            description_items: document.getElementById('p-desc').value.split('\n').map((v) => v.trim()).filter(Boolean),
            description_text: document.getElementById('p-desc').value.split('\n').map((v) => v.trim()).filter(Boolean).join(' '),
            status
        };
    }

    function buildLocalDraftSnapshot() {
        return {
            title: document.getElementById('field-position').value || '',
            category: document.getElementById('field-category')?.value || 'Production',
            type: document.getElementById('field-type')?.value || 'Full-time',
            salary: document.getElementById('field-salary')?.value || '',
            location: document.getElementById('field-location')?.value || '',
            email: document.getElementById('field-email').value || '',
            phone: document.getElementById('field-phone').value || '',
            website: document.getElementById('field-website').value || '',
            description: document.getElementById('p-desc').value || '',
            requirements: document.getElementById('p-req').value || '',
            benefits: document.getElementById('p-ben').value || '',
            backgroundImageUrl: document.getElementById('p-bg-preview')?.getAttribute('src') || '',
            updatedAt: new Date().toISOString()
        };
    }

    function saveDraftLocally() {
        localStorage.setItem('qs_job_template_draft', JSON.stringify(buildLocalDraftSnapshot()));
    }

    function removeDraftLocally() {
        localStorage.removeItem('qs_job_template_draft');
    }

    function loadDraftLocally() {
        try {
            const raw = localStorage.getItem('qs_job_template_draft');
            if (!raw) return null;
            return JSON.parse(raw);
        } catch (error) {
            console.error(error);
            return null;
        }
    }

    function normalizeLocalDraft(draft) {
        if (!draft) return null;

        return {
            id: 'local-draft',
            title: draft.title || 'Untitled Draft',
            logo: '/assets/logo2.png',
            backgroundImageUrl: draft.backgroundImageUrl || '',
            requirements: `${draft.requirements || ''}`.split('\n').map((v) => v.trim()).filter(Boolean),
            benefits: `${draft.benefits || ''}`.split('\n').map((v) => v.trim()).filter(Boolean),
            description: `${draft.description || ''}`.split('\n').map((v) => v.trim()).filter(Boolean),
            email: draft.email || '',
            phone: draft.phone || '',
            website: draft.website || '',
            location: draft.location || '',
            type: draft.type || 'Draft',
            status: 'draft',
            updated_at: draft.updatedAt || '',
            created_at: draft.updatedAt || ''
        };
    }

    function applyDraftToBuilder(draft) {
        if (!draft) return;

        document.getElementById('field-position').value = draft.title || '';
        document.getElementById('field-category').value = draft.category || 'Production';
        document.getElementById('field-type').value = draft.type || 'Full-time';
        document.getElementById('field-salary').value = draft.salary || '';
        document.getElementById('field-location').value = draft.location || '';
        document.getElementById('field-email').value = draft.email || '';
        document.getElementById('field-phone').value = draft.phone || '';
        document.getElementById('field-website').value = draft.website || '';
        document.getElementById('p-desc').value = draft.description || '';
        document.getElementById('p-req').value = draft.requirements || '';
        document.getElementById('p-ben').value = draft.benefits || '';

        const bgPreview = document.getElementById('p-bg-preview');
        if (bgPreview) {
            if (draft.backgroundImageUrl) {
                bgPreview.src = draft.backgroundImageUrl;
                setUploadZoneState('background-trigger', 'Background selected', 'Image ready for the template');
            } else {
                bgPreview.removeAttribute('src');
                setUploadZoneState('background-trigger');
            }
        }

        document.querySelectorAll('textarea').forEach((el) => {
            el.style.height = 'auto';
            el.style.height = `${el.scrollHeight}px`;
            const counter = el.parentElement?.querySelector('.char-counter');
            if (counter) counter.textContent = `${el.value.length} / 1000`;
        });

        syncPreview();
    }

    async function publishTemplate() {
        if (!hasSupabaseConfig()) {
            showToast('Set window.__SUPABASE_ANON_KEY__ before publishing.');
            return;
        }

        const payload = buildTemplateRequestBody('published');
        payload.published_at = new Date().toISOString();
        payload.updated_at = new Date().toISOString();

        try {
            const isEditing = Boolean(currentEditingPostId);
            const response = await fetch(
                isEditing
                    ? `${SUPABASE_CONFIG.url}/rest/v1/job_templates?id=eq.${currentEditingPostId}`
                    : `${SUPABASE_CONFIG.url}/rest/v1/job_templates`,
                {
                method: isEditing ? 'PATCH' : 'POST',
                headers: getSupabaseHeaders('return=representation'),
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(errorData.message || 'Failed to publish template');
            }

            confirmModal.classList.remove('active');
            closeViewTemplate();
            currentEditingPostId = null;
            removeDraftLocally();
            showSuccess('Your job template has been published!');
            await loadHomePosts();
            
            setTimeout(() => {
                window.location.hash = '#posts';
                switchTab('posts');
            }, 1500);
        } catch (error) {
            console.error(error);
            showToast(error.message || 'Failed to publish template.');
        }
    }

    jobForm?.addEventListener('submit', (e) => {
        e.preventDefault();
        openPublishConfirm();
    });

    document.getElementById('save-draft-btn')?.addEventListener('click', () => {
        try {
            saveDraftLocally();
            currentEditingPostId = 'local-draft';
            loadHomePosts();
            window.location.hash = '#posts';
            switchTab('posts');
            showSuccess('Your draft has been saved successfully!');
        } catch (error) {
            console.error(error);
            showToast('Failed to save draft.');
        }
    });

    vtSelect?.addEventListener('click', openPublishConfirm);
    document.getElementById('close-modal')?.addEventListener('click', () => confirmModal.classList.remove('active'));
    document.getElementById('final-publish-btn')?.addEventListener('click', publishTemplate);

    document.getElementById('clear-posts')?.addEventListener('click', async () => {
        if (!confirm('Clear feed?')) return;
        if (!hasSupabaseConfig()) {
            removeDraftLocally();
            homePostsCache = [];
            renderHomePosts();
            showToast('Set window.__SUPABASE_ANON_KEY__ before clearing posts.');
            return;
        }

        try {
            removeDraftLocally();
            await Promise.all(homePostsCache.map((post) =>
                String(post.id) === 'local-draft'
                    ? Promise.resolve()
                    : fetch(`${SUPABASE_CONFIG.url}/rest/v1/job_templates?id=eq.${post.id}`, {
                    method: 'DELETE',
                    headers: getSupabaseHeaders()
                })
            ));
            homePostsCache = [];
            renderHomePosts();
        } catch (error) {
            console.error(error);
            showToast('Failed to clear feed.');
        }
    });

    document.getElementById('clear-builder')?.addEventListener('click', () => {
        jobForm.reset();
        currentEditingPostId = null;
        const bgPreview = document.getElementById('p-bg-preview');
        bgPreview?.removeAttribute('src');
        setUploadZoneState('background-trigger');
        syncPreview();
    });

    document.getElementById('home-posts-container')?.addEventListener('contextmenu', (e) => {
        const card = e.target.closest('[data-post-id]');
        if (!card) return;
        e.preventDefault();
        openPostContextMenu(card.dataset.postId, e.clientX, e.clientY);
    });

    postContextMenu?.addEventListener('click', async (e) => {
        const item = e.target.closest('[data-action]');
        if (!item || !activeContextPostId) return;

        const action = item.dataset.action;
        if (action === 'view') viewPostTemplate(activeContextPostId);
        if (action === 'edit') editPostTemplate(activeContextPostId);
        if (action === 'delete') await deletePostTemplate(activeContextPostId);
        if (action !== 'delete') closePostContextMenu();
    });

    document.getElementById('applicants-body')?.addEventListener('contextmenu', (e) => {
        const row = e.target.closest('[data-applicant-id]');
        if (!row) return;
        e.preventDefault();
        openApplicantContextMenu(row.dataset.applicantId, e.clientX, e.clientY);
    });

    applicantContextMenu?.addEventListener('click', (e) => {
        const item = e.target.closest('[data-action]');
        if (!item || activeApplicantId === null) return;

        const action = item.dataset.action;
        if (action === 'view') viewApplicantProfile(activeApplicantId);
        if (action === 'archive') archiveApplicant(activeApplicantId);
        if (action === 'start') startApplicant(activeApplicantId);
        if (action !== 'archive' && action !== 'start') closeApplicantContextMenu();
    });

    profileModalClose?.addEventListener('click', closeProfileModal);
    profileModalDone?.addEventListener('click', closeProfileModal);
    profileModal?.addEventListener('click', (e) => {
        if (e.target === profileModal) closeProfileModal();
    });
    profileModalEdit?.addEventListener('click', () => {
        showToast('Edit profile coming soon.');
    });
    profileModalRestrict?.addEventListener('click', () => {
        showToast('Restrict action ready for backend connection.');
    });

    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeProfileModal();
    });

    document.addEventListener('keydown', (e) => {
        if (!e.shiftKey || e.key.toLowerCase() !== 'u') return;
        const activeField = e.target.closest('input, textarea, select, [contenteditable="true"]');
        if (activeField) return;

        e.preventDefault();
        window.location.hash = '#users';
        switchTab('users');
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('#post-context-menu')) closePostContextMenu();
        if (!e.target.closest('#applicant-context-menu')) closeApplicantContextMenu();
    });

    document.addEventListener('scroll', () => {
        closePostContextMenu();
        closeApplicantContextMenu();
    }, true);

    // Init Logic
    loadHomePosts();
    applyDraftToBuilder(loadDraftLocally());
    syncPreview();

    // --- SHARED UI HELPERS ---
    function showToast(message) {
        const toast = document.createElement('div');
        toast.className = 'toast';
        toast.innerHTML = `<i class="fa-solid fa-circle-check"></i> <span>${message}</span>`;
        toastContainer?.appendChild(toast);
        setTimeout(() => {
            toast.classList.add('hide');
            setTimeout(() => toast.remove(), 400);
        }, 3000);
    }

    // Ripple Effect
    document.addEventListener('click', (e) => {
        if (e.target.closest('.btn')) {
            const btn = e.target.closest('.btn');
            const ripple = document.createElement('span');
            ripple.className = 'ripple';
            const rect = btn.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height);
            ripple.style.width = ripple.style.height = `${size}px`;
            ripple.style.left = `${e.clientX - rect.left - size/2}px`;
            ripple.style.top = `${e.clientY - rect.top - size/2}px`;
            btn.appendChild(ripple);
            setTimeout(() => ripple.remove(), 600);
        }
    });

    // Panels and hash navigation
    const tabPanels = Array.from(document.querySelectorAll('[data-tab-panel]'));
    function setActiveTab(tabId) {
        const targetId = tabId || 'dashboard';
        sidebarLinks.forEach((link) => link.classList.toggle('active', link.dataset.tab === targetId));
        switchTab(targetId);
    }

    window.addEventListener('hashchange', () => setActiveTab(window.location.hash.replace('#', '') || 'dashboard'));
    if (window.location.hash) setActiveTab(window.location.hash.replace('#', ''));

    renderApplicants();
    loadApplicants();
    renderUsers();
    loadUsers();
    syncPreview();
    loadHomePosts();
    applyLogDesign();
    renderAuditLogs();
    loadDashboardStats();
    renderCurrentUserProfile();
});
