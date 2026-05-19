// Combined admin UI script: sidebar, tabs, applicants, users, job preview, settings
document.addEventListener('DOMContentLoaded', () => {
    const SUPABASE_CONFIG = {
        url: window.__SUPABASE_URL__ || 'https://ilbneblzkvzebuklyzgn.supabase.co',
        anonKey: window.__SUPABASE_ANON_KEY__ || ''
    };
    const sidebarToggle = document.getElementById('sidebar-toggle');
    const adminLayout = document.getElementById('admin-layout');
    const sidebarLinks = document.querySelectorAll('.sidebar-link');
    const tabButtons = document.getElementById('tabButtons');
    const toastContainer = document.getElementById('toast-container');
    const postContextMenu = document.getElementById('post-context-menu');
    const applicantContextMenu = document.getElementById('applicant-context-menu');
    let homePostsCache = [];
    let activeContextPostId = null;
    let activeApplicantId = null;
    let currentEditingPostId = null;

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

    // Tab & Navigation Logic
    const config = {
        dashboard: 'Dashboard',
        applicants: 'Applicants',
        users: 'Users',
        jobs: 'Job Templates',
        posts: 'Home Posts',
        settings: 'Settings'
    };

    function switchTab(id) {
        const panels = document.querySelectorAll('.admin-section');
        const activePanel = document.getElementById(`${id}-panel`) || document.getElementById('placeholder-panel');
        panels.forEach(p => p.classList.remove('is-active'));
        if (activePanel === document.getElementById('placeholder-panel')) {
            activePanel.querySelector('h2').textContent = config[id] || id;
        }
        activePanel?.classList.add('is-active');

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

    sidebarLinks.forEach(link => link.addEventListener('click', (e) => { e.preventDefault(); switchTab(link.dataset.tab); }));
    switchTab('dashboard');

    // --- Rest of UI logic: applicants, users ---
    const navLogout = document.getElementById('nav-logout');

    let applicantsData = [
        { name: 'Sarah Johnson', email: 'sarah@email.com', resume: 'sarah_resume.pdf', title: 'Senior Developer', status: 'Under Review', date: '2026-04-28' },
        { name: 'Michael Chen', email: 'michael@email.com', resume: 'michael_cv.pdf', title: 'Product Manager', status: 'Shortlisted', date: '2026-04-29' },
        { name: 'Emily Davis', email: 'emily@email.com', resume: 'emily_resume.pdf', title: 'UX Designer', status: 'Interview', date: '2026-05-01' },
        { name: 'James Wilson', email: 'james@email.com', resume: 'james_cv.pdf', title: 'Data Analyst', status: 'Under Review', date: '2026-05-02' },
    ];

    const usersData = [
        { name: 'System Admin', email: 'system.admin@questserv.com', role: 'system-admin' },
        { name: 'Alice Rivera', email: 'alice@questserv.com', role: 'admin' },
        { name: 'John Santos', email: 'john@questserv.com', role: 'user' },
        { name: 'Monica Cruz', email: 'monica@questserv.com', role: 'user' },
    ];

    function formatRoleLabel(role) {
        return String(role || '')
            .replace(/[-_]+/g, ' ')
            .replace(/\b\w/g, (char) => char.toUpperCase());
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
        showToast(`Profile: ${applicant.name} - ${applicant.title}`);
    }

    function archiveApplicant(applicantId) {
        const applicant = getApplicantById(applicantId);
        if (!applicant) return;
        applicant.status = 'Archived';
        renderApplicants();
        closeApplicantContextMenu();
        showToast(`${applicant.name} archived.`);
    }

    function startApplicant(applicantId) {
        const applicant = getApplicantById(applicantId);
        if (!applicant) return;
        applicant.status = 'Started';
        renderApplicants();
        closeApplicantContextMenu();
        showToast(`${applicant.name} started.`);
    }

    function renderUsers(rows = usersData) {
        const body = document.getElementById('users-body');
        if (!body) return;
        body.innerHTML = rows.map((user, idx) => `
            <tr>
                <td data-label="Name">${String(user.name || '').toUpperCase()}</td>
                <td data-label="Email">${user.email}</td>
                <td data-label="Role"><span class="role-pill ${user.role}">${formatRoleLabel(user.role)}</span></td>
                <td data-label="Action"><button class="action-btn" data-index="${idx}" title="Remove user">Remove</button></td>
            </tr>
        `).join('');

        // attach simple removal handlers (works on local demo data)
        body.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const i = parseInt(btn.dataset.index, 10);
                if (!Number.isFinite(i)) return;
                rows.splice(i, 1);
                renderUsers(rows);
                showToast && showToast('User removed');
            });
        });
    }

    if (navLogout) navLogout.addEventListener('click', () => { window.location.href = '/index.html'; });

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
        } catch (error) {
            console.error(error);
            homePostsCache = localDraft ? [localDraft] : [];
            renderHomePosts();
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
        tabPanels.forEach((panel) => {
            const isActive = panel.id === (targetId + '-panel');
            panel.hidden = !isActive;
            panel.classList.toggle('is-active', isActive);
        });
        sidebarLinks.forEach((link) => link.classList.toggle('active', link.dataset.tab === targetId));
        switchTab(targetId);
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    window.addEventListener('hashchange', () => setActiveTab(window.location.hash.replace('#', '') || 'dashboard'));
    if (window.location.hash) setActiveTab(window.location.hash.replace('#', ''));

    renderApplicants(); renderUsers(); syncPreview(); loadHomePosts();
});
