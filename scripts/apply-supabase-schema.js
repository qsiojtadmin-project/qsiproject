const { Pool } = require('pg');

const password = process.env.SUPABASE_DB_PASSWORD;
if (!password) {
  console.error('Missing SUPABASE_DB_PASSWORD environment variable.');
  process.exit(1);
}

const sql = `
CREATE TABLE IF NOT EXISTS job_templates (
  id BIGSERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  gender TEXT DEFAULT '',
  requirements JSONB NOT NULL DEFAULT '[]'::jsonb,
  description_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  description_text TEXT NOT NULL DEFAULT '',
  benefits JSONB NOT NULL DEFAULT '[]'::jsonb,
  email TEXT DEFAULT '',
  subject TEXT DEFAULT '',
  phone TEXT DEFAULT '',
  website TEXT DEFAULT '',
  location TEXT NOT NULL DEFAULT 'Cavite',
  job_type TEXT NOT NULL DEFAULT 'Full-time',
  company_name TEXT NOT NULL DEFAULT 'QuestServ Solutions Inc.',
  background_image_url TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'published')),
  published_at TIMESTAMPTZ NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_job_templates_status ON job_templates (status);
CREATE INDEX IF NOT EXISTS idx_job_templates_updated_at ON job_templates (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_job_templates_published_at ON job_templates (published_at DESC);
`;

const pool = new Pool({
  host: 'aws-1-ap-northeast-1.pooler.supabase.com',
  port: 5432,
  database: 'postgres',
  user: 'postgres.ilbneblzkvzebuklyzgn',
  password,
  ssl: { rejectUnauthorized: false },
});

(async function main() {
  try {
    await pool.query(sql);
    const check = await pool.query("SELECT to_regclass('public.job_templates') AS table_name");
    console.log('Table check:', check.rows[0].table_name);
  } catch (error) {
    console.error('DB error:', error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
})();
