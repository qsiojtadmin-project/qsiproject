const express = require('express');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const { keyword = '', location = '', type = '' } = req.query;
    const result = await pool.query(
      `SELECT id, title, description, location, type, created_at
       FROM jobs
       WHERE title ILIKE $1
         AND location ILIKE $2
         AND type ILIKE $3
       ORDER BY created_at DESC`,
      [`%${keyword}%`, `%${location}%`, `%${type}%`]
    );
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch jobs', error: error.message });
  }
});

router.get('/featured', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, title, description, location, type, created_at
       FROM jobs
       ORDER BY created_at DESC
       LIMIT 6`
    );
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch featured jobs', error: error.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM jobs WHERE id = $1', [req.params.id]);
    if (!result.rows.length) {
      return res.status(404).json({ message: 'Job not found' });
    }
    return res.json(result.rows[0]);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch job details', error: error.message });
  }
});

router.post('/', authenticate, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { title, description, location, type } = req.body;
    if (!title || !description || !location || !type) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const result = await pool.query(
      'INSERT INTO jobs (title, description, location, type) VALUES ($1, $2, $3, $4) RETURNING id',
      [title.trim(), description.trim(), location.trim(), type.trim()]
    );

    return res.status(201).json({ message: 'Job created', jobId: result.rows[0].id });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to create job', error: error.message });
  }
});

router.put('/:id', authenticate, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { title, description, location, type } = req.body;
    if (!title || !description || !location || !type) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    const result = await pool.query(
      'UPDATE jobs SET title = $1, description = $2, location = $3, type = $4 WHERE id = $5',
      [title.trim(), description.trim(), location.trim(), type.trim(), req.params.id]
    );

    if (!result.rowCount) {
      return res.status(404).json({ message: 'Job not found' });
    }

    return res.json({ message: 'Job updated' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update job', error: error.message });
  }
});

router.delete('/:id', authenticate, authorize('admin', 'staff'), async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM jobs WHERE id = $1', [req.params.id]);
    if (!result.rowCount) {
      return res.status(404).json({ message: 'Job not found' });
    }
    return res.json({ message: 'Job deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete job', error: error.message });
  }
});

module.exports = router;
