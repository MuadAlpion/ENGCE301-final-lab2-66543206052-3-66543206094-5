const express  = require('express');
const bcrypt   = require('bcryptjs');
const { pool } = require('../db/db');
const { generateToken, verifyToken } = require('../middleware/jwtUtils');

const router = express.Router();

async function logEvent({ level, event, userId, message, meta }) {
  try {
    await pool.query(
      'INSERT INTO logs (level, event, user_id, message, meta) VALUES ($1,$2,$3,$4,$5)',
      [level, event, userId, message, meta || null]
    );
  } catch (_) {
    // ignore logging errors
  }
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'กรุณากรอก username, email และ password' });
  }
  try {
    const hash = await bcrypt.hash(password, 12);
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1,$2,$3) RETURNING id, username, email, role, created_at',
      [username, email.toLowerCase(), hash]
    );
    const user = result.rows[0];
    await logEvent({
      level: 'INFO',
      event: 'REGISTER_SUCCESS',
      userId: user.id,
      message: `User ${user.username} registered`,
      meta: { username: user.username, email: user.email }
    });
    res.status(201).json({ user });
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Username หรือ Email ถูกใช้ไปแล้ว' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  const ip = req.headers['x-real-ip'] || req.ip;

  if (!email || !password) {
    return res.status(400).json({ error: 'กรุณากรอก email และ password' });
  }

  try {
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1', [email.toLowerCase()]
    );
    const user = result.rows[0];

    // Timing attack prevention
    const dummyHash = '$2b$10$invalidhashpaddinginvalidhashpaddinginvalidhashpadding00';
    const passwordHash = user ? user.password_hash : dummyHash;
    const isValid = await bcrypt.compare(password, passwordHash);

    if (!user || !isValid) {
      await logEvent({ level:'WARN', event:'LOGIN_FAILED',
        ip, method:'POST', path:'/api/auth/login', statusCode:401,
        message: `Login failed for: ${email}`, meta: { email } });
      return res.status(401).json({ error: 'Email หรือ Password ไม่ถูกต้อง' });
    }

    // อัปเดต last_login
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = generateToken({ sub: user.id, email: user.email, role: user.role, username: user.username });

    await logEvent({ level:'INFO', event:'LOGIN_SUCCESS', userId: user.id,
      ip, method:'POST', path:'/api/auth/login', statusCode:200,
      message: `User ${user.username} logged in`, meta: { username: user.username, role: user.role } });

    res.json({
      message: 'Login สำเร็จ',
      token,
      user: { id: user.id, username: user.username, email: user.email, role: user.role }
    });

  } catch (err) {
    console.error('[AUTH] Login error:', err.message);
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/auth/verify
router.get('/verify', (req, res) => {
  const token = (req.headers['authorization'] || '').split(' ')[1];
  if (!token) return res.status(401).json({ valid: false, error: 'No token' });
  try {
    const decoded = verifyToken(token);
    res.json({ valid: true, user: decoded });
  } catch (err) {
    res.status(401).json({ valid: false, error: err.message });
  }
});

// GET /api/auth/me (ต้องมี JWT)
router.get('/me', async (req, res) => {
  const token = (req.headers['authorization'] || '').split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = verifyToken(token);
    const result  = await pool.query(
      'SELECT id, username, email, role, created_at, last_login FROM users WHERE id = $1',
      [decoded.sub]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

// GET /api/auth/health
router.get('/health', (_, res) => res.json({ status:'ok', service:'auth-service', time: new Date() }));

module.exports = router;