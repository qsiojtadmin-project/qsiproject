import { request } from './api.js';

async function loadFeaturedJobs() {
  const list = document.getElementById('featured-jobs');
  if (!list) return;

  try {
    const jobs = await request('/jobs/featured');
    if (!jobs.length) {
      list.innerHTML = '<p class="muted">No open roles yet.</p>';
      return;
    }

    list.innerHTML = jobs.map((job) => `
      <article class="job-card">
        <h3>${job.title}</h3>
        <div class="job-meta">
          <span class="tag">${job.location}</span>
          <span class="tag">${job.type}</span>
        </div>
        <p class="muted">${job.description.slice(0, 110)}...</p>
        <a class="btn btn-secondary" href="/pages/job-details.html?id=${job.id}">View Details</a>
      </article>
    `).join('');
  } catch (error) {
    list.innerHTML = `<p class="notice error">${error.message}</p>`;
  }
}

loadFeaturedJobs();

// Mock Data (In a real app, this would come from your Admin Form)
const jobData = {
    position: "Production Operator",
    gender: "Male",
    requirements: [
        "High School graduate (Junior or Senior).",
        "18–35 years old.",
        "With or without experience.",
        "Valid ID and NBI Clearance (Required)."
    ],
    description: [
        "Operate production machines efficiently.",
        "Quality control and inspection.",
        "Maintain clean work environment (5S)."
    ],
    benefits: [
        "Free Shuttle Service.",
        "Attendance Bonus & Overtime Pay.",
        "COMPLETE Benefits (SSS, PhilHealth)."
    ],
    email: "carmonaqsi@gmail.com",
    subject: "MALE PROD OPERATOR",
    phone: "+1 (555) 123-4567",
    website: "facebook.com/spot.carmona"
};

function renderPoster(data) {
    // Basic Text
    document.getElementById('p-position-display').textContent = `${data.gender} ${data.position}`;
    document.getElementById('p-email-display').textContent = data.email;
    document.getElementById('p-subject-display').textContent = data.subject;
    document.getElementById('p-phone-display').textContent = data.phone;
    document.getElementById('p-website-display').textContent = data.website;

    // Lists
    const renderList = (id, items) => {
        const el = document.getElementById(id);
        el.innerHTML = items.map(item => `<li>${item}</li>`).join('');
    };

    renderList('p-req-list', data.requirements);
    renderList('p-desc-list', data.description);
    renderList('p-ben-list', data.benefits);
}

// Initial Run
document.addEventListener('DOMContentLoaded', () => {
    renderPoster(jobData);
});