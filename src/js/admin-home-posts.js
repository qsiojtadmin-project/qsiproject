import { request } from './api.js';
import { escapeHtml } from './utils.js';

const listEl = document.getElementById('home-posts-list');

function hoursAgo(dateValue) {
  const ms = Date.now() - new Date(dateValue).getTime();
  const h = Math.max(1, Math.floor(ms / 3600000));
  return `Posted ${h} hour${h > 1 ? 's' : ''} ago`;
}

async function loadPosts() {
  try {
    const rows = await request('/jobs');
    if (!rows.length) {
      listEl.innerHTML = '<article class="home-post-card"><div class="home-post-meta-row"><span class="muted">No published posts yet.</span></div></article>';
      return;
    }

    listEl.innerHTML = rows.map((row) => `
      <article class="home-post-card">
        <div class="home-post-banner">
          <h3>${escapeHtml(row.title)}</h3>
          <p>${escapeHtml(row.description || 'Hiring now')}</p>
          <p class="home-post-details">${escapeHtml(row.type || 'Full-time')} &bull; ${escapeHtml(row.location || 'Remote')} &bull; ${escapeHtml(row.salary || '$120k-$160k')}</p>
        </div>
        <div class="home-post-meta-row">
          <div class="home-post-meta-left">
            <span class="muted">${hoursAgo(row.created_at || new Date().toISOString())}</span>
            <span class="home-post-badge">Published</span>
          </div>
          <div class="home-post-actions">
            <a class="btn btn-secondary" href="/pages/admin-jobs.html">Edit</a>
            <button class="btn home-post-delete" type="button" data-id="${row.id}">Delete</button>
          </div>
        </div>
      </article>
    `).join('');
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
