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
