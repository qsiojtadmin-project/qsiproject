const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

const createToken = (user) => jwt.sign(
  { id: user.id, email: user.email, role: user.role, name: user.name },
  process.env.JWT_SECRET,
  { expiresIn: process.env.JWT_EXPIRES_IN || '1d' }
);

router.post('/register', async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      role = 'user',
    } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: 'Name, email, and password are required' });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }
    if (!['user', 'admin'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role selection' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const userExists = await pool.query('SELECT id FROM users WHERE email = $1', [normalizedEmail]);
    const adminExists = await pool.query('SELECT id FROM admins WHERE email = $1', [normalizedEmail]);
    if (userExists.rows.length || adminExists.rows.length) {
      return res.status(409).json({ message: 'Email is already registered' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const table = role === 'admin' ? 'admins' : 'users';
    const result = await pool.query(
      `INSERT INTO ${table} (name, email, password) VALUES ($1, $2, $3) RETURNING id`,
      [name.trim(), normalizedEmail, hashed]
    );

    const account = { id: result.rows[0].id, name: name.trim(), email: normalizedEmail, role };
    const token = createToken(account);

    return res.status(201).json({ message: 'Registration successful', token, user: account });
  } catch (error) {
    return res.status(500).json({ message: 'Registration failed', error: error.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ message: 'Email and password are required' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    let userResult = await pool.query('SELECT id, name, email, password FROM admins WHERE email = $1', [normalizedEmail]);
    let role = 'admin';

    if (!userResult.rows.length) {
      userResult = await pool.query('SELECT id, name, email, password FROM users WHERE email = $1', [normalizedEmail]);
      role = 'user';
    }

    if (!userResult.rows.length) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const user = userResult.rows[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const sessionUser = { id: user.id, name: user.name, email: user.email, role };
    const token = createToken(sessionUser);
    return res.json({
      message: 'Login successful',
      token,
      user: sessionUser,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Login failed', error: error.message });
  }
});

router.get('/me', authenticate, async (req, res) => {
  try {
    const table = req.user.role === 'admin' ? 'admins' : 'users';
    const result = await pool.query(
      `SELECT id, name, email, created_at FROM ${table} WHERE id = $1`,
      [req.user.id]
    );
    if (!result.rows.length) {
      return res.status(404).json({ message: 'User not found' });
    }
    return res.json({
      ...result.rows[0],
      role: req.user.role,
    });
  } catch (error) {
    return res.status(500).json({ message: 'Failed to fetch profile', error: error.message });
  }
});

module.exports = router;
