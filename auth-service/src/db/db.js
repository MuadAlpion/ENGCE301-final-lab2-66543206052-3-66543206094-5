const { Pool } = require('pg');
const fs   = require('fs');
const path = require('path');

const pool = new Pool({
  host:     process.env.DB_HOST     || 'auth-db',
  port:     5432,
  database: process.env.DB_NAME     || 'auth_db',
  user:     process.env.DB_USER     || 'auth_user',
  password: process.env.DB_PASSWORD || 'auth_secret',
});

async function initDB() {
  const sql = fs.readFileSync(path.join(__dirname, 'init.sql'), 'utf8');
  await pool.query(sql);
  console.log('[auth-db] Tables initialized');
}

module.exports = { pool, initDB };