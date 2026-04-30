const express = require('express');
const bcrypt = require('bcryptjs');
const pool = require('../config/db');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate, authorize('admin'));

router.get('/overview', async (req, res) => {
  try {
    const totalUsersResult = await pool.query('SELECT COUNT(*)::int AS total_users FROM users');
    const totalAdminsResult = await pool.query('SELECT COUNT(*)::int AS total_admins FROM admins');
    const hiredCountResult = await pool.query("SELECT COUNT(*)::int AS hired_count FROM applications WHERE status = 'Hired'");

    return res.json({
      totalApplicants: totalUsersResult.rows[0].total_users,
      totalAdmins: totalAdminsResult.rows[0].total_admins,
      hiredCount: hiredCountResult.rows[0].hired_count,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to load overview', error: error.message });
  }
});

router.get('/applicants', async (req, res) => {
  try {
    const { status = '' } = req.query;
    const result = await pool.query(
      `SELECT a.id, a.status, a.phone, a.address, a.resume, a.created_at,
              u.id AS user_id, u.name, u.email,
              j.id AS job_id, j.title, j.location, j.type
       FROM applications a
       JOIN users u ON u.id = a.user_id
       JOIN jobs j ON j.id = a.job_id
       WHERE a.status ILIKE $1
       ORDER BY a.created_at DESC`,
      [`%${status}%`]
    );
    return res.json(result.rows);
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch applicants', error: error.message });
  }
});

router.put('/applicants/:id/status', async (req, res) => {
  try {
    const { status } = req.body;
    const allowed = ['Pending', 'Interview', 'Hired', 'Rejected'];
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid status value' });
    }

    const result = await pool.query('UPDATE applications SET status = $1 WHERE id = $2', [status, req.params.id]);
    if (!result.rowCount) {
      return res.status(404).json({ message: 'Application not found' });
    }

    return res.json({ message: 'Status updated' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update status', error: error.message });
  }
});

router.get('/users', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, name, email, created_at
       FROM users
       ORDER BY created_at DESC, id DESC`
    );
    return res.json(result.rows.map((row) => ({ ...row, role: 'user' })));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch users', error: error.message });
  }
});

router.delete('/users/:id', async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1', [req.params.id]);
    if (!result.rowCount) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({ message: 'User deleted' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to delete user', error: error.message });
  }
});

router.get('/messages', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.id, a.status, a.created_at, u.name, j.title
       FROM applications a
       JOIN users u ON u.id = a.user_id
       JOIN jobs j ON j.id = a.job_id
       ORDER BY a.created_at DESC
       LIMIT 10`
    );

    return res.json(result.rows.map((item) => ({
      id: item.id,
      text: `${item.name} applied for ${item.title}`,
      status: item.status,
      created_at: item.created_at,
    })));
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch messages', error: error.message });
  }
});

router.put('/settings/profile', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const existingAdmin = await pool.query('SELECT id FROM admins WHERE email = $1 AND id <> $2', [normalizedEmail, req.user.id]);
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    if (existingAdmin.rows.length || existingUser.rows.length) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    if (password) {
      if (password.length < 6) {
        return res.status(400).json({ message: 'Password must be at least 6 characters' });
      }
      const hashed = await bcrypt.hash(password, 10);
      await pool.query('UPDATE admins SET name = $1, email = $2, password = $3 WHERE id = $4', [name.trim(), normalizedEmail, hashed, req.user.id]);
    } else {
      await pool.query('UPDATE admins SET name = $1, email = $2 WHERE id = $3', [name.trim(), normalizedEmail, req.user.id]);
    }

    return res.json({ message: 'Profile updated' });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to update profile', error: error.message });
  }
});

module.exports = router;
