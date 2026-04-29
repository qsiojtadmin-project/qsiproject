-- PostgreSQL / Supabase schema

CREATE TABLE IF NOT EXISTS admins (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS staffs (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS jobs (
  id BIGSERIAL PRIMARY KEY,
  title VARCHAR(150) NOT NULL,
  description TEXT NOT NULL,
  location VARCHAR(120) NOT NULL,
  type VARCHAR(60) NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS applications (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  job_id BIGINT NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  phone VARCHAR(30) NOT NULL,
  address VARCHAR(255) NOT NULL,
  resume VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Interview', 'Hired', 'Rejected')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, job_id)
);

INSERT INTO admins (name, email, password)
VALUES ('Questserv Admin', 'admin@questserv.com', '$2a$10$u03gr5tUsN3.ckTSXJCUAOFXz.3vQF4x82LG4f5Xwez6/VA3bbleC')
ON CONFLICT (email) DO NOTHING;

INSERT INTO jobs (title, description, location, type)
VALUES
('Frontend Developer', 'Build and maintain user interfaces for internal and client-facing platforms.', 'Makati', 'Full-time'),
('HR Associate', 'Handle recruitment coordination, onboarding, and employee records.', 'Quezon City', 'On-site'),
('Technical Support Engineer', 'Provide Tier 1 and Tier 2 technical support to customers.', 'Remote', 'Full-time')
ON CONFLICT DO NOTHING;
