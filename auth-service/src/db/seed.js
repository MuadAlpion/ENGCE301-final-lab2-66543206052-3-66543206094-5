const { pool } = require('./db');

async function seedUsers() {
  try {
    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, role) VALUES
        ('alice', 'alice@lab.local', '$2a$12$4Rv3.OiM5PR2Eg//uOUHDeZ8D0w3MKNnNzV5q5n24msgmF1sEEfEG', 'member'),
        ('bob', 'bob@lab.local', '$2a$12$p9K/2LjdCEd5Q9Bf37Z8Fu6tYyxzMNol3WFieQ7BDMMfjMlsp5A3.', 'member'),
        ('admin', 'admin@lab.local', '$2a$12$YkaHUxHl/Gbu0IL/fxnvxOonHqeoVsXmxuA2qWx9j9vyoRTsaPSYS', 'admin')
      ON CONFLICT DO NOTHING`
    );
    console.log(`[auth-service] Seeded ${result.rowCount || 0} users`);
  } catch (err) {
    console.error('[auth-service] Seed failed:', err.message);
    throw err;
  }
}

module.exports = { seedUsers };