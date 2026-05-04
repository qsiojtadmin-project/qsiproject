const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 5000;

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

// In-memory storage (replace with database in production)
let users = [];
let applicants = [];
let jobs = [
  {
    id: 1,
    title: 'Warehouse Associate',
    description: 'Join our team as a warehouse associate. Responsible for picking, packing, and shipping orders.',
    location: 'Los Angeles, CA',
    type: 'Full-time'
  },
  {
    id: 2,
    title: 'Office Administrator',
    description: 'Administrative support role in our office. Handle correspondence, scheduling, and general office tasks.',
    location: 'Remote',
    type: 'Full-time'
  }
];

// Auth routes
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email);

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id, email: user.email, role: user.role }, 'secret-key');
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
app.get('/api/jobs', (req, res) => {
  res.json(jobs);
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

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});