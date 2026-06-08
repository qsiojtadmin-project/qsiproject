INSERT INTO admin (id, created_at)
VALUES (
    'id:bigint',
    'created_at:timestamp with time zone'
  );-- PostgreSQL / Supabase schema

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(120) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  role VARCHAR(20) NOT NULL DEFAULT 'applicant' CHECK (role IN ('applicant', 'admin')),
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

INSERT INTO users (name, email, password, role)
VALUES ('Questserv Admin', 'admin@questserv.com', '$2a$10$u03gr5tUsN3.ckTSXJCUAOFXz.3vQF4x82LG4f5Xwez6/VA3bbleC', 'admin')
ON CONFLICT (email) DO NOTHING;

INSERT INTO jobs (title, description, location, type)
VALUES
('Frontend Developer', 'Build and maintain user interfaces for internal and client-facing platforms.', 'Makati', 'Full-time'),
('HR Associate', 'Handle recruitment coordination, onboarding, and employee records.', 'Quezon City', 'On-site'),
('Technical Support Engineer', 'Provide Tier 1 and Tier 2 technical support to customers.', 'Remote', 'Full-time')
ON CONFLICT DO NOTHING;

DROP TABLE IF EXISTS admin;

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS name VARCHAR(120),
  ADD COLUMN IF NOT EXISTS email VARCHAR(120),
  ADD COLUMN IF NOT EXISTS password VARCHAR(255),
  ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'user';

ALTER TABLE users
  ALTER COLUMN email SET NOT NULL,
  ALTER COLUMN password SET NOT NULL,
  ALTER COLUMN role SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'users_email_key'
  ) THEN
    ALTER TABLE users ADD CONSTRAINT users_email_key UNIQUE (email);
  END IF;
END $$;

ALTER TABLE users
  DROP CONSTRAINT IF EXISTS users_role_check;

ALTER TABLE users
  ADD CONSTRAINT users_role_check CHECK (role IN ('user', 'admin'));
