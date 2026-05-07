const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');
const { Pool } = require('pg');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'secret-key';
const localJobStorePath = path.join(__dirname, 'data', 'job-templates.json');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));

// File upload configuration
const upload = multer({
  dest: 'uploads/',
  fileFilter: (req, file, cb) => {
    const allowedTypes = /pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only PDF, DOC, and DOCX files are allowed'));
    }
  }
});

const pool = createPool();

function createPool() {
  if (process.env.DATABASE_URL) {
    return new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: process.env.DB_SSL === 'false' ? false : { rejectUnauthorized: false }
    });
  }

  if (process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD && process.env.DB_NAME) {
    return new Pool({
      host: process.env.DB_HOST,
      port: Number(process.env.DB_PORT || 5432),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME,
      ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false
    });
  }

  return null;
}

function hasDb() {
  return Boolean(pool);
}

async function query(text, params = []) {
  if (!pool) {
    throw new Error('Database is not configured. Add DATABASE_URL or DB_* values to .env.');
  }
  return pool.query(text, params);
}

function ensureLocalJobStore() {
  const dir = path.dirname(localJobStorePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (!fs.existsSync(localJobStorePath)) {
    fs.writeFileSync(localJobStorePath, '[]', 'utf8');
  }
}

function readLocalJobs() {
  ensureLocalJobStore();
  try {
    const raw = fs.readFileSync(localJobStorePath, 'utf8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalJobs(jobs) {
  ensureLocalJobStore();
  fs.writeFileSync(localJobStorePath, JSON.stringify(jobs, null, 2), 'utf8');
}

function normalizeTemplateRow(row) {
  if (!row) return null;

  const descriptionItems = Array.isArray(row.description_items) ? row.description_items : [];
  const requirements = Array.isArray(row.requirements) ? row.requirements : [];
  const benefits = Array.isArray(row.benefits) ? row.benefits : [];

  return {
    id: row.id,
    title: row.title,
    gender: row.gender || '',
    requirements,
    description: descriptionItems,
    descriptionText: row.description_text || descriptionItems.join(' '),
    benefits,
    email: row.email || '',
    subject: row.subject || '',
    phone: row.phone || '',
    website: row.website || '',
    location: row.location || 'Cavite',
    type: row.job_type || 'Full-time',
    company: row.company_name || 'QuestServ Solutions Inc.',
    status: row.status,
    backgroundImageUrl: row.background_image_url || '',
    created_at: row.created_at,
    updated_at: row.updated_at,
    published_at: row.published_at
  };
}

function buildTemplatePayload(body = {}) {
  const descriptionItems = Array.isArray(body.description) ? body.description.filter(Boolean) : [];
  const requirements = Array.isArray(body.requirements) ? body.requirements.filter(Boolean) : [];
  const benefits = Array.isArray(body.benefits) ? body.benefits.filter(Boolean) : [];
  const title = `${body.title || ''}`.trim();
  const status = body.status === 'draft' ? 'draft' : 'published';

  if (!title) {
    const error = new Error('Position title is required');
    error.status = 400;
    throw error;
  }

  return {
    title,
    gender: `${body.gender || ''}`.trim(),
    requirements,
    descriptionItems,
    descriptionText: descriptionItems.join(' '),
    benefits,
    email: `${body.email || ''}`.trim(),
    subject: `${body.subject || ''}`.trim(),
    phone: `${body.phone || ''}`.trim(),
    website: `${body.website || ''}`.trim(),
    location: `${body.location || 'Cavite'}`.trim() || 'Cavite',
    jobType: `${body.type || 'Full-time'}`.trim() || 'Full-time',
    companyName: `${body.company || 'QuestServ Solutions Inc.'}`.trim() || 'QuestServ Solutions Inc.',
    backgroundImageUrl: `${body.backgroundImageUrl || ''}`.trim(),
    status
  };
}

async function listPublishedJobs(filters = {}) {
  if (!hasDb()) {
    let jobs = readLocalJobs().filter((job) => job.status === 'published');

    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      jobs = jobs.filter((job) =>
        (job.title || '').toLowerCase().includes(keyword) ||
        (job.descriptionText || '').toLowerCase().includes(keyword)
      );
    }
    if (filters.location) {
      const location = filters.location.toLowerCase();
      jobs = jobs.filter((job) => (job.location || '').toLowerCase().includes(location));
    }
    if (filters.type) {
      jobs = jobs.filter((job) => (job.type || '') === filters.type);
    }

    return jobs.sort((a, b) => new Date(b.published_at || b.created_at || 0) - new Date(a.published_at || a.created_at || 0));
  }

  const clauses = [`status = 'published'`];
  const params = [];

  if (filters.keyword) {
    params.push(`%${filters.keyword}%`);
    clauses.push(`(title ILIKE $${params.length} OR description_text ILIKE $${params.length})`);
  }
  if (filters.location) {
    params.push(`%${filters.location}%`);
    clauses.push(`location ILIKE $${params.length}`);
  }
  if (filters.type) {
    params.push(filters.type);
    clauses.push(`job_type = $${params.length}`);
  }

  const sql = `
    SELECT *
    FROM job_templates
    WHERE ${clauses.join(' AND ')}
    ORDER BY COALESCE(published_at, created_at) DESC, updated_at DESC
  `;
  const { rows } = await query(sql, params);
  return rows.map(normalizeTemplateRow);
}

async function listAdminJobs() {
  if (!hasDb()) {
    return readLocalJobs().sort((a, b) => new Date(b.updated_at || b.created_at || 0) - new Date(a.updated_at || a.created_at || 0));
  }

  const { rows } = await query(`
    SELECT *
    FROM job_templates
    ORDER BY updated_at DESC, created_at DESC
  `);
  return rows.map(normalizeTemplateRow);
}

async function getJobById(id, includeDraft = false) {
  if (!hasDb()) {
    const job = readLocalJobs().find((item) => String(item.id) === String(id));
    if (!job) return null;
    if (!includeDraft && job.status !== 'published') return null;
    return job;
  }

  const params = [id];
  const where = includeDraft ? 'id = $1' : `id = $1 AND status = 'published'`;
  const { rows } = await query(`SELECT * FROM job_templates WHERE ${where} LIMIT 1`, params);
  return normalizeTemplateRow(rows[0]);
}

async function saveJobTemplate(id, payload) {
  if (!hasDb()) {
    const jobs = readLocalJobs();
    const existingIndex = id ? jobs.findIndex((item) => String(item.id) === String(id)) : -1;
    const now = new Date().toISOString();

    if (existingIndex >= 0) {
      const existing = jobs[existingIndex];
      const next = {
        ...existing,
        title: payload.title,
        gender: payload.gender,
        requirements: payload.requirements,
        description: payload.descriptionItems,
        descriptionText: payload.descriptionText,
        benefits: payload.benefits,
        email: payload.email,
        subject: payload.subject,
        phone: payload.phone,
        website: payload.website,
        location: payload.location,
        type: payload.jobType,
        company: payload.companyName,
        backgroundImageUrl: payload.backgroundImageUrl,
        status: payload.status,
        published_at: payload.status === 'published' ? (existing.published_at || now) : null,
        updated_at: now
      };
      jobs[existingIndex] = next;
      writeLocalJobs(jobs);
      return next;
    }

    const created = {
      id: Date.now(),
      title: payload.title,
      gender: payload.gender,
      requirements: payload.requirements,
      description: payload.descriptionItems,
      descriptionText: payload.descriptionText,
      benefits: payload.benefits,
      email: payload.email,
      subject: payload.subject,
      phone: payload.phone,
      website: payload.website,
      location: payload.location,
      type: payload.jobType,
      company: payload.companyName,
      backgroundImageUrl: payload.backgroundImageUrl,
      status: payload.status,
      created_at: now,
      updated_at: now,
      published_at: payload.status === 'published' ? now : null
    };
    jobs.unshift(created);
    writeLocalJobs(jobs);
    return created;
  }

  const params = [
    payload.title,
    payload.gender,
    JSON.stringify(payload.requirements),
    JSON.stringify(payload.descriptionItems),
    payload.descriptionText,
    JSON.stringify(payload.benefits),
    payload.email,
    payload.subject,
    payload.phone,
    payload.website,
    payload.location,
    payload.jobType,
    payload.companyName,
    payload.backgroundImageUrl,
    payload.status
  ];

  if (id) {
    params.push(id);
    const { rows } = await query(`
      UPDATE job_templates
      SET title = $1,
          gender = $2,
          requirements = $3::jsonb,
          description_items = $4::jsonb,
          description_text = $5,
          benefits = $6::jsonb,
          email = $7,
          subject = $8,
          phone = $9,
          website = $10,
          location = $11,
          job_type = $12,
          company_name = $13,
          background_image_url = $14,
          status = $15,
          published_at = CASE
            WHEN $15 = 'published' AND published_at IS NULL THEN NOW()
            WHEN $15 = 'draft' THEN NULL
            ELSE published_at
          END,
          updated_at = NOW()
      WHERE id = $16
      RETURNING *
    `, params);
    return normalizeTemplateRow(rows[0]);
  }

  const { rows } = await query(`
    INSERT INTO job_templates (
      title,
      gender,
      requirements,
      description_items,
      description_text,
      benefits,
      email,
      subject,
      phone,
      website,
      location,
      job_type,
      company_name,
      background_image_url,
      status,
      published_at
    ) VALUES (
      $1, $2, $3::jsonb, $4::jsonb, $5, $6::jsonb, $7, $8, $9, $10, $11, $12, $13, $14, $15,
      CASE WHEN $15 = 'published' THEN NOW() ELSE NULL END
    )
    RETURNING *
  `, params);
  return normalizeTemplateRow(rows[0]);
}

function handleError(res, error) {
  const status = error.status || 500;
  res.status(status).json({ message: error.message || 'Server error' });
}

// In-memory storage for non-job features
let users = [];
let applicants = [];

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, JWT_SECRET);
    res.json({ user: { id: user.id, name: user.name, email: user.email, role: user.role }, token });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

app.post('/api/auth/register', async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (users.find(u => u.email === email)) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = {
      id: Date.now(),
      name,
      email,
      password: hashedPassword,
      role: role || 'user'
    };

    users.push(user);
    res.json({ message: 'User registered successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Job routes
app.get('/api/jobs', async (req, res) => {
  try {
    const jobs = await listPublishedJobs({
      keyword: req.query.keyword?.trim(),
      location: req.query.location?.trim(),
      type: req.query.type?.trim()
    });
    res.json(jobs);
  } catch (error) {
    handleError(res, error);
  }
});

app.get('/api/jobs/:id', async (req, res) => {
  try {
    const job = await getJobById(req.params.id, false);
    if (!job) {
      return res.status(404).json({ message: 'Job not found' });
    }
    res.json(job);
  } catch (error) {
    handleError(res, error);
  }
});

app.get('/api/admin/jobs', async (req, res) => {
  try {
    const jobs = await listAdminJobs();
    res.json(jobs);
  } catch (error) {
    handleError(res, error);
  }
});

app.get('/api/admin/jobs/:id', async (req, res) => {
  try {
    const job = await getJobById(req.params.id, true);
    if (!job) {
      return res.status(404).json({ message: 'Job template not found' });
    }
    res.json(job);
  } catch (error) {
    handleError(res, error);
  }
});

app.post('/api/jobs', async (req, res) => {
  try {
    const payload = buildTemplatePayload(req.body);
    const job = await saveJobTemplate(null, payload);
    res.status(201).json(job);
  } catch (error) {
    handleError(res, error);
  }
});

app.put('/api/jobs/:id', async (req, res) => {
  try {
    const existing = await getJobById(req.params.id, true);
    if (!existing) {
      return res.status(404).json({ message: 'Job template not found' });
    }
    const payload = buildTemplatePayload(req.body);
    const job = await saveJobTemplate(req.params.id, payload);
    res.json(job);
  } catch (error) {
    handleError(res, error);
  }
});

app.delete('/api/jobs/:id', async (req, res) => {
  try {
    if (!hasDb()) {
      const jobs = readLocalJobs();
      const next = jobs.filter((job) => String(job.id) !== String(req.params.id));
      if (next.length === jobs.length) {
        return res.status(404).json({ message: 'Job template not found' });
      }
      writeLocalJobs(next);
      return res.json({ message: 'Job template deleted' });
    }

    const result = await query('DELETE FROM job_templates WHERE id = $1', [req.params.id]);
    if (!result.rowCount) {
      return res.status(404).json({ message: 'Job template not found' });
    }
    res.json({ message: 'Job template deleted' });
  } catch (error) {
    handleError(res, error);
  }
});

// Application routes
app.post('/api/applications', upload.single('resume'), (req, res) => {
  try {
    const { fullName, email, phone, position } = req.body;
    const application = {
      id: Date.now(),
      fullName,
      email,
      phone,
      position,
      resumeName: req.file ? req.file.originalname : null,
      status: 'New',
      appliedAt: new Date().toISOString()
    };

    applicants.push(application);
    res.json({ message: 'Application submitted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin routes
app.get('/api/admin/applicants', (req, res) => {
  res.json(applicants);
});

app.put('/api/admin/applicants/:id/status', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const applicant = applicants.find(a => a.id == id);
  if (!applicant) {
    return res.status(404).json({ message: 'Applicant not found' });
  }

  applicant.status = status;
  res.json({ message: 'Status updated' });
});

app.get('/api/admin/users', (req, res) => {
  res.json(users.map(u => ({ id: u.id, name: u.name, email: u.email, role: u.role })));
});

app.delete('/api/admin/users/:id', (req, res) => {
  const { id } = req.params;
  users = users.filter(u => u.id != id);
  res.json({ message: 'User deleted' });
});

app.get('/api/admin/overview', (req, res) => {
  res.json({
    totalApplicants: applicants.length,
    hiredCount: applicants.filter(a => a.status === 'Hired').length,
    totalAdmins: users.filter(u => u.role === 'admin').length
  });
});

// Create uploads directory if it doesn't exist
if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}

ensureLocalJobStore();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  if (!hasDb()) {
    console.warn('Database is not configured. Job template APIs require DATABASE_URL or DB_* values.');
  }
});
