const express = require('express');
const { pool } = require('../db/db');
const { verifyToken } = require('../jwtUtils');

const router = express.Router();

function requireAuth(req, res, next) {
  const header = req.headers['authorization'] || '';
  const token  = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Unauthorized: No token' });
  try {
    req.user = verifyToken(token);
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Unauthorized: ' + err.message });
  }
}

async function logEvent({ level, event, userId, message, meta }) {
  try {
    await pool.query(
      'INSERT INTO logs (level, event, user_id, message, meta) VALUES ($1,$2,$3,$4,$5)',
      [level, event, userId, message, meta || null]
    );
  } catch (_) {}
}

router.use(requireAuth);

router.get('/profile', async (req, res) => {
  const userId = req.user.sub;
  try {
    const result = await pool.query(
      'SELECT * FROM user_profiles WHERE user_id = $1',
      [userId]
    );
    if (!result.rows[0]) {
      const insert = await pool.query(
        'INSERT INTO user_profiles (user_id, display_name) VALUES ($1,$2) RETURNING *',
        [userId, req.user.username || null]
      );
      return res.json({ profile: insert.rows[0] });
    }
    res.json({ profile: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.put('/profile', async (req, res) => {
  const userId = req.user.sub;
  const { display_name, bio, avatar_url } = req.body;
  try {
    const result = await pool.query(
      `INSERT INTO user_profiles (user_id, display_name, bio, avatar_url)
       VALUES ($1,$2,$3,$4)
       ON CONFLICT (user_id)
       DO UPDATE SET display_name = EXCLUDED.display_name,
                     bio          = EXCLUDED.bio,
                     avatar_url   = EXCLUDED.avatar_url,
                     updated_at   = NOW()
       RETURNING *`,
      [userId, display_name || null, bio || null, avatar_url || null]
    );
    await logEvent({
      level: 'INFO',
      event: 'PROFILE_UPDATED',
      userId,
      message: 'User profile updated',
      meta: { user_id: userId }
    });
    res.json({ profile: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/all', async (_req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM user_profiles ORDER BY id ASC'
    );
    res.json({ users: result.rows, count: result.rowCount });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.delete('/:id', async (req, res) => {
  const targetId = parseInt(req.params.id, 10);
  if (Number.isNaN(targetId)) {
    return res.status(400).json({ error: 'Invalid id' });
  }
  try {
    const result = await pool.query(
      'DELETE FROM user_profiles WHERE user_id = $1 RETURNING *',
      [targetId]
    );
    if (!result.rows[0]) {
      return res.status(404).json({ error: 'User profile not found' });
    }
    await logEvent({
      level: 'INFO',
      event: 'PROFILE_DELETED',
      userId: req.user.sub,
      message: `Profile deleted for user_id=${targetId}`,
      meta: { deleted_user_id: targetId }
    });
    res.json({ message: 'User profile deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'user-service', time: new Date() });
});

module.exports = router;

