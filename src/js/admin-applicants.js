import { request } from './api.js';

const statusFilter = document.getElementById('status-filter');
const positionFilter = document.getElementById('position-filter');
const searchInput = document.getElementById('search-applicants');
const exportBtn = document.getElementById('export-applicants');
const sortFilter = document.getElementById('sort-filter');
const toggleFiltersBtn = document.getElementById('toggle-filters');
const filtersPanel = document.getElementById('applicant-filters-panel');
const bodyEl = document.getElementById('applicants-body');
const SUPABASE_CONFIG = {
  url: window.__SUPABASE_URL__ || 'https://ilbneblzkvzebuklyzgn.supabase.co',
  anonKey: window.__SUPABASE_ANON_KEY__ || 'sb_publishable_UIrAwPGGHGwPavXFV23FwQ_Z1ywfnAg',
};

let allRows = [];
const fallbackRows = [
  {
    id: 1,
    name: 'Sarah Johnson',
    email: 'sarah.j@email.com',
    resume: 'sarah_resume.pdf',
    title: 'Senior Developer',
    status: 'Pending',
  },
  {
    id: 2,
    name: 'Michael Chen',
    email: 'm.chen@email.com',
    resume: 'michael_cv.pdf',
    title: 'Product Manager',
    status: 'Shortlisted',
  },
  {
    id: 3,
    name: 'Emily Davis',
    email: 'emily.d@email.com',
    resume: 'emily_resume.pdf',
    title: 'UX Designer',
    status: 'Interview',
  },
  {
    id: 4,
    name: 'James Wilson',
    email: 'j.wilson@email.com',
    resume: 'james_cv.pdf',
    title: 'Data Analyst',
    status: 'Pending',
  },
];

function normalizeStatus(status) {
  const raw = (status || '').toLowerCase();
  if (raw === 'registered') return 'Registered';
  if (raw === 'pending') return 'Under Review';
  if (raw === 'called' || raw === 'interviewed' || raw === 'interview') return 'Interview';
  if (raw === 'shortlisted') return 'Shortlisted';
  if (raw === 'hired' || raw === 'accepted') return 'Hired';
  if (raw === 'rejected') return 'Rejected';
  return 'Under Review';
}

function statusClass(label) {
  return label.toLowerCase().replace(/\s+/g, '-');
}

function escapeHtml(value = '') {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function hasSupabaseConfig() {
  return Boolean(SUPABASE_CONFIG.url && SUPABASE_CONFIG.anonKey);
}

function getSupabaseHeaders() {
  return {
    apikey: SUPABASE_CONFIG.anonKey,
    Authorization: `Bearer ${SUPABASE_CONFIG.anonKey}`,
    'Content-Type': 'application/json',
  };
}

async function fetchSupabaseJson(path) {
  if (!hasSupabaseConfig()) return null;
  const response = await fetch(`${SUPABASE_CONFIG.url}/rest/v1/${path}`, {
    headers: getSupabaseHeaders(),
  });
  if (!response.ok) return null;
  return response.json();
}

function getApplicantName(row = {}) {
  const full = String(row.full_name || row.fullName || '').trim();
  if (full) return full;
  const first = String(row.first_name || row.firstName || '').trim();
  const last = String(row.last_name || row.lastName || '').trim();
  const combined = `${first} ${last}`.trim();
  return combined || row.name || row.username || row.email || 'Applicant';
}

function normalizeApplicant(row = {}) {
  return {
    id: row.id || row.user_id || row.applicant_id || '',
    name: getApplicantName(row),
    email: row.email || row.user_email || row.contact_number || row.phone || row.applicant_id || row.user_id || '',
    resume: row.resume || row.resume_path || row.resume_url || row.resume_link || row.resume_file || row.cv || 'N/A',
    title: row.position || row.job_title || row.title || row.applied_position || 'Applicant Profile',
    status: row.status || 'Registered',
    created_at: row.created_at || row.createdAt || '',
  };
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
    ...applicationRows.map((row) => row.applicant_id),
  ].filter(Boolean))];
  const resumeIds = [...new Set([
    ...profileRows.map((row) => row.resume_document_id),
    ...applicationRows.map((row) => row.resume_document_id),
  ].filter(Boolean))];

  const users = userIds.length
    ? await fetchSupabaseJson(`users?select=id,email,username,full_name,role,role_type,created_at&id=in.(${userIds.join(',')})`) || []
    : [];
  const documents = resumeIds.length
    ? await fetchSupabaseJson(`documents?select=id,path&id=in.(${resumeIds.join(',')})`) || []
    : [];

  const profilesByUser = new Map(profileRows.map((row) => [row.user_id, row]));
  const usersById = new Map(users.map((row) => [row.id, row]));
  const docsById = new Map(documents.map((row) => [row.id, row]));
  const applicationUserIds = new Set(applicationRows.map((row) => row.applicant_id));

  const appliedRows = applicationRows.map((application) => {
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
      created_at: application.created_at,
    });
  });

  const registeredRows = profileRows
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
        created_at: profile.created_at,
      });
    });

  return [...appliedRows, ...registeredRows];
}

function populatePositionFilter(rows) {
  if (!positionFilter) return;
  const current = positionFilter.value;
  const titles = [...new Set(rows.map((r) => r.title).filter(Boolean))].sort();
  positionFilter.innerHTML = '<option value="">All Positions</option>' +
    titles.map((title) => `<option value="${escapeHtml(title)}">${escapeHtml(title)}</option>`).join('');
  if ([...positionFilter.options].some((opt) => opt.value === current)) {
    positionFilter.value = current;
  }
}

function getFilteredRows() {
  const q = (searchInput?.value || '').trim().toLowerCase();
  const status = statusFilter?.value || '';
  const position = positionFilter?.value || '';

  const rows = allRows.filter((row) => {
    const label = normalizeStatus(row.status);
    const matchesStatus = !status || label === status;
    const matchesPosition = !position || row.title === position;
    const haystack = `${row.name} ${row.email} ${row.title} ${row.resume}`.toLowerCase();
    const matchesQuery = !q || haystack.includes(q);
    return matchesStatus && matchesPosition && matchesQuery;
  });

  const sorted = [...rows];
  switch (sortFilter?.value) {
    case 'oldest':
      sorted.sort((a, b) => Number(a.id || 0) - Number(b.id || 0));
      break;
    case 'name-asc':
      sorted.sort((a, b) => String(a.name || '').localeCompare(String(b.name || '')));
      break;
    case 'name-desc':
      sorted.sort((a, b) => String(b.name || '').localeCompare(String(a.name || '')));
      break;
    case 'status':
      sorted.sort((a, b) => normalizeStatus(a.status).localeCompare(normalizeStatus(b.status)));
      break;
    case 'newest':
    default:
      sorted.sort((a, b) => Number(b.id || 0) - Number(a.id || 0));
      break;
  }
  return sorted;
}

function renderRows(rows) {
  if (!rows.length) {
    bodyEl.innerHTML = '<tr><td colspan="7" class="muted">No applicants found.</td></tr>';
    return;
  }

  bodyEl.innerHTML = rows.map((row, idx) => {
    const statusLabel = normalizeStatus(row.status);
    return `
      <tr>
        <td>${idx + 1}</td>
        <td>${escapeHtml(row.name)}</td>
        <td>${escapeHtml(row.email)}</td>
        <td class="resume-cell">
          <span class="file-name">${escapeHtml(row.resume)}</span>
          <a class="resume-link" href="/uploads/resumes/${encodeURIComponent(row.resume)}" target="_blank" rel="noopener">View</a>
          <span class="muted">|</span>
          <a class="resume-link" href="/uploads/resumes/${encodeURIComponent(row.resume)}" download>Download</a>
        </td>
        <td>${escapeHtml(row.title)}</td>
        <td><span class="applicant-status ${statusClass(statusLabel)}">${statusLabel}</span></td>
        <td>
          <div class="applicant-actions">
            <button class="icon-action-btn view" type="button" title="View">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6-10-6-10-6Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
            </button>
            <button class="icon-action-btn approve" type="button" title="Approve" data-id="${row.id}" data-next="Hired">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9 12 2 2 4-4"></path><path d="M21 12c0 1.2-.4 2.3-1 3.2a9 9 0 1 1 0-6.4c.6.9 1 2 1 3.2Z"></path></svg>
            </button>
            <button class="icon-action-btn reject" type="button" title="Reject" data-id="${row.id}" data-next="Rejected">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m18 6-12 12"></path><path d="m6 6 12 12"></path></svg>
            </button>
          </div>
        </td>
      </tr>
    `;
  }).join('');
}

function renderTable() {
  renderRows(getFilteredRows());
}

async function loadApplicants() {
  try {
    const supabaseRows = await loadSupabaseApplicants();
    allRows = Array.isArray(supabaseRows) && supabaseRows.length
      ? supabaseRows
      : await request('/admin/applicants');
    populatePositionFilter(allRows);
    renderTable();
  } catch (error) {
    allRows = fallbackRows;
    populatePositionFilter(allRows);
    renderTable();
  }
}

statusFilter?.addEventListener('change', renderTable);
positionFilter?.addEventListener('change', renderTable);
searchInput?.addEventListener('input', renderTable);
sortFilter?.addEventListener('change', renderTable);
toggleFiltersBtn?.addEventListener('click', () => {
  const isHidden = filtersPanel?.classList.contains('hidden');
  filtersPanel?.classList.toggle('hidden');
  toggleFiltersBtn.classList.toggle('is-open', Boolean(isHidden));
  toggleFiltersBtn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
});

document.addEventListener('click', (e) => {
  if (!filtersPanel || !toggleFiltersBtn) return;
  if (filtersPanel.classList.contains('hidden')) return;
  const insidePanel = filtersPanel.contains(e.target);
  const onToggle = toggleFiltersBtn.contains(e.target);
  if (insidePanel || onToggle) return;
  filtersPanel.classList.add('hidden');
  toggleFiltersBtn.classList.remove('is-open');
  toggleFiltersBtn.setAttribute('aria-expanded', 'false');
});

bodyEl?.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-id]');
  if (!btn) return;

  const id = btn.dataset.id;
  const status = btn.dataset.next;

  try {
    await request(`/admin/applicants/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify({ status }),
    });
    loadApplicants();
  } catch (error) {
    alert(error.message);
  }
});

exportBtn?.addEventListener('click', () => {
  const rows = getFilteredRows();
  const header = ['No.', 'Name', 'Email Address', 'Resume', 'Position Applying For', 'Status'];
  const csvRows = rows.map((r, i) => [i + 1, r.name, r.email, r.resume, r.title, normalizeStatus(r.status)]);
  const csv = [header, ...csvRows]
    .map((line) => line.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = 'applicants.csv';
  link.click();
  URL.revokeObjectURL(url);
});

loadApplicants();
