import { request } from './api.js';
import { escapeHtml } from './utils.js';

const listEl = document.getElementById('home-posts-list');

function hoursAgo(dateValue) {
  const ms = Date.now() - new Date(dateValue).getTime();
  const h = Math.max(1, Math.floor(ms / 3600000));
  return `Posted ${h} hour${h > 1 ? 's' : ''} ago`;
}

function renderList(items = []) {
  const values = Array.isArray(items) ? items.filter(Boolean) : [];
  return values.map((item) => `<li>${escapeHtml(item)}</li>`).join('');
}

function renderPoster(row) {
  const position = `${row.gender ? `${row.gender} ` : ''}${row.title || 'Production Operator'}`;
  const bgStyle = row.backgroundImageUrl
    ? `style="background-image:url('${escapeHtml(row.backgroundImageUrl)}');"`
    : '';

  return `
    <article class="home-post-card">
      <div class="home-post-poster-shell">
        <div class="home-post-poster">
          <div class="home-post-poster-header">
            <div class="home-post-brand">
              <img class="home-post-brand-logo" src="/assets/logo1.png.png" alt="QuestServ logo" />
              <div>
                <div class="home-post-brand-title">QUESTSERV</div>
                <div class="home-post-brand-sub">SOLUTIONS INC.</div>
              </div>
            </div>
            <div class="home-post-badge-panel">
              <span>JOB</span>
              <span>HIRING</span>
            </div>
          </div>

          <div class="home-post-hero">
            <div class="home-post-hero-bg ${row.backgroundImageUrl ? 'has-image' : ''}" ${bgStyle}></div>
            <div class="home-post-side-shape left"></div>
            <div class="home-post-side-shape right"></div>
            <h2 class="home-post-hero-title">JOB<br />HIRING</h2>
            <p class="home-post-hero-sub">For <strong>${escapeHtml(position)}</strong> Position</p>
          </div>

          <div class="home-post-content-grid">
            <div class="home-post-column">
              <h3>Requirements:</h3>
              <ul>${renderList(row.requirements)}</ul>
              <h3>Benefits:</h3>
              <ul>${renderList(row.benefits)}</ul>
            </div>
            <div class="home-post-column">
              <h3>Job Description:</h3>
              <ul>${renderList(row.description)}</ul>
              <h3>Submit Resume:</h3>
              <div class="home-post-submit-box">
                <p>Send to <strong>${escapeHtml(row.email || 'carmonaqsi@gmail.com')}</strong>.</p>
                <p>Put "<strong>${escapeHtml(row.subject || row.title || 'JOB HIRING')}</strong>" as the email subject.</p>
              </div>
            </div>
          </div>

          <div class="home-post-poster-footer">
            <div class="home-post-footer-item">${escapeHtml(row.phone || '+1 (555) 123-4567')}</div>
            <div class="home-post-footer-item">${escapeHtml(row.website || 'Visit our website')}</div>
            <div class="home-post-footer-qr">QR</div>
          </div>
        </div>
      </div>

      <div class="home-post-summary">
        <h3 class="home-post-summary-title">${escapeHtml(row.title || 'Job Hiring')}</h3>
        <p class="home-post-summary-meta">${escapeHtml(row.phone || '+1 (555) 123-4567')}</p>
      </div>

      <div class="home-post-meta-row">
        <div class="home-post-meta-left">
          <span class="muted">${hoursAgo(row.created_at || new Date().toISOString())}</span>
          <span class="home-post-badge ${row.status === 'draft' ? 'is-draft' : ''}">${escapeHtml(row.status === 'draft' ? 'Draft' : 'Published')}</span>
        </div>
        <div class="home-post-actions">
          <a class="btn btn-secondary" href="/pages/admin-jobs.html?id=${row.id}">Edit</a>
          <button class="btn home-post-delete" type="button" data-id="${row.id}">Delete</button>
        </div>
      </div>
    </article>
  `;
}

async function loadPosts() {
  try {
    const rows = await request('/admin/jobs');
    if (!rows.length) {
      listEl.innerHTML = '<article class="home-post-card"><div class="home-post-meta-row"><span class="muted">No job templates saved yet.</span></div></article>';
      return;
    }

    listEl.innerHTML = rows.map(renderPoster).join('');
  } catch (error) {
    listEl.innerHTML = `<article class="home-post-card"><div class="home-post-meta-row"><span class="notice error">${escapeHtml(error.message)}</span></div></article>`;
  }
}

listEl?.addEventListener('click', async (e) => {
  const btn = e.target.closest('button[data-id]');
  if (!btn) return;

  const ok = confirm('Delete this post?');
  if (!ok) return;

  try {
    await request(`/jobs/${btn.dataset.id}`, { method: 'DELETE' });
    loadPosts();
  } catch (error) {
    alert(error.message);
  }
});

loadPosts();
