import { request } from './api.js';

const totalApplicants = document.getElementById('total-applicants');
const openJobs = document.getElementById('open-jobs');
const hiredCount = document.getElementById('hired-count');
const messages = document.getElementById('messages-list');

async function loadOverview() {
  try {
    const data = await request('/admin/overview');
    totalApplicants.textContent = data.totalApplicants;
    openJobs.textContent = data.openJobs;
    hiredCount.textContent = data.hiredCount;
  } catch (error) {
    messages.innerHTML = `<li class="notice error">${error.message}</li>`;
  }
}

async function loadMessages() {
  try {
    const rows = await request('/admin/messages');
    if (!rows.length) {
      messages.innerHTML = '<li><span class="dot"></span><div><strong>No recent activity</strong><span class="muted">You are all caught up.</span></div></li>';
      return;
    }
    messages.innerHTML = rows.slice(0, 5).map((m) => `
      <li>
        <span class="dot"></span>
        <div>
          <strong>${m.text}</strong>
          <span class="muted">${new Date(m.created_at).toLocaleString()}</span>
        </div>
      </li>
    `).join('');
  } catch (error) {
    messages.innerHTML = `<li><span class="dot"></span><div><strong>Unable to load activity</strong><span class="muted">${error.message}</span></div></li>`;
  }
}

loadOverview();
loadMessages();
