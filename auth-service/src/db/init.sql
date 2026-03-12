-- ═══════════════════════════════════════════════
--  USERS TABLE (auth-service ใช้)
-- ═══════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  username      VARCHAR(50)  UNIQUE NOT NULL,
  email         VARCHAR(100) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role          VARCHAR(20)  DEFAULT 'member',   -- 'member' | 'admin'
  created_at    TIMESTAMP    DEFAULT NOW(),
  last_login    TIMESTAMP
);

CREATE TABLE IF NOT EXISTS logs (
  id         SERIAL PRIMARY KEY,
  level      VARCHAR(10)  NOT NULL,
  event      VARCHAR(100) NOT NULL,
  user_id    INTEGER,
  message    TEXT,
  meta       JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Seed users
INSERT INTO users (username, email, password_hash, role) VALUES
  (
    'alice',
    'alice@lab.local',
    '$2a$12$4Rv3.OiM5PR2Eg//uOUHDeZ8D0w3MKNnNzV5q5n24msgmF1sEEfEG',
    -- plain-text password: alice123
    'member'
  ),
  (
    'bob',
    'bob@lab.local',
    '$2a$12$p9K/2LjdCEd5Q9Bf37Z8Fu6tYyxzMNol3WFieQ7BDMMfjMlsp5A3.',
    -- plain-text password: bob456
    'member'
  ),
  (
    'admin',
    'admin@lab.local',
    '$2a$12$YkaHUxHl/Gbu0IL/fxnvxOonHqeoVsXmxuA2qWx9j9vyoRTsaPSYS',
    -- plain-text password: adminpass
    'admin'
  )
ON CONFLICT DO NOTHING;