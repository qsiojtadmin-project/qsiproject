const express = require('express');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');
const uploadResume = require('../middleware/upload');

const router = express.Router();

router.post('/', authenticate, authorize('user'), (req, res) => {
  uploadResume.single('resume')(req, res, async (uploadErr) => {
    try {
      if (uploadErr) {
        return res.status(400).json({ message: uploadErr.message });
      }

      const { job_id, phone, address } = req.body;
      if (!job_id || !phone || !address || !req.file) {
        return res.status(400).json({ message: 'Job, phone, address, and resume are required' });
      }

      const jobResult = await pool.query('SELECT id FROM jobs WHERE id = $1', [job_id]);
      if (!jobResult.rows.length) {
        return res.status(404).json({ message: 'Selected job does not exist' });
      }

      const existing = await pool.query(
        'SELECT id FROM applications WHERE user_id = $1 AND job_id = $2',
        [req.user.id, job_id]
      );
      if (existing.rows.length) {
        return res.status(409).json({ message: 'You already applied for this job' });
      }

      await pool.query(
        `INSERT INTO applications (user_id, job_id, phone, address, resume, status)
         VALUES ($1, $2, $3, $4, $5, 'Pending')`,
        [req.user.id, job_id, phone.trim(), address.trim(), req.file.filename]
      );

      return res.status(201).json({ message: 'Application submitted successfully' });
    } catch (error) {
      return res.status(500).json({ message: 'Application failed', error: error.message });
    }
  });
});

router.get('/my', authenticate, authorize('user'), async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id, a.status, a.created_at, j.title, j.location, j.type
       FROM applications a
       JOIN jobs j ON j.id = a.job_id
       WHERE a.user_id = $1
       ORDER BY a.created_at DESC`,
      [req.user.id]
    );
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch applications', error: error.message });
  }
});

module.exports = router;
