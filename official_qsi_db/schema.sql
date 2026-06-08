-- QuestServ platform schema for Supabase
-- Auth source: auth.users (no passwords stored in public schema)

create extension if not exists "pgcrypto";

-- Helper role checks
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role in ('admin', 'system-admin')
  );
$$;

create or replace function public.is_employer()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'employer'
  );
$$;

create or replace function public.is_applicant()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1
    from public.profiles p
    where p.user_id = auth.uid()
      and p.role = 'applicant'
  );
$$;

-- Core tables
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('applicant', 'employer', 'admin', 'system-admin')),
  full_name text,
  birthday date,
  gender text,
  contact_number text,
  address text,
  school text,
  course text,
  skills_text text,
  experience_text text,
  first_time_applying boolean,
  preferred_category_id uuid,
  resume_document_id uuid,
  valid_id_document_id uuid,
  avatar_document_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  requested_role text := coalesce(new.raw_user_meta_data->>'role', 'applicant');
begin
  if requested_role not in ('applicant', 'employer', 'admin', 'system-admin') then
    requested_role := 'applicant';
  end if;

  insert into public.profiles (
    user_id,
    role,
    full_name,
    contact_number
  )
  values (
    new.id,
    requested_role,
    nullif(new.raw_user_meta_data->>'full_name', ''),
    nullif(coalesce(new.raw_user_meta_data->>'phone', new.raw_user_meta_data->>'contact_number'), '')
  )
  on conflict (user_id) do update
    set role = excluded.role,
        full_name = coalesce(excluded.full_name, public.profiles.full_name),
        contact_number = coalesce(excluded.contact_number, public.profiles.contact_number),
        updated_at = now();

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

create table if not exists public.employers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  company_name text not null,
  logo_url text,
  description text,
  industry text,
  website text,
  contact_email text,
  contact_phone text,
  is_approved boolean not null default false,
  is_suspended boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.jobs (
  id uuid primary key default gen_random_uuid(),
  employer_id uuid not null references public.employers(id) on delete cascade,
  title text not null,
  company_name text,
  location text,
  salary_min numeric,
  salary_max numeric,
  work_type text,
  category_id uuid references public.categories(id) on delete set null,
  experience_level text,
  description text,
  requirements text[],
  benefits text[],
  skills_required text[],
  vacancy_count integer default 1,
  hiring_deadline date,
  visibility text not null default 'public' check (visibility in ('public', 'private')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.applications (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs(id) on delete cascade,
  applicant_id uuid not null references auth.users(id) on delete cascade,
  cover_letter text,
  resume_document_id uuid,
  status text not null default 'pending' check (status in ('pending', 'reviewing', 'interview', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.application_status (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  status text not null check (status in ('pending', 'reviewing', 'interview', 'accepted', 'rejected')),
  changed_by uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.interviews (
  id uuid primary key default gen_random_uuid(),
  application_id uuid not null references public.applications(id) on delete cascade,
  scheduled_at timestamptz not null,
  mode text not null check (mode in ('online', 'onsite')),
  location text,
  notes text,
  result text check (result in ('pending', 'passed', 'failed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  sender_id uuid not null references auth.users(id) on delete cascade,
  recipient_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  notif_type text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  application_id uuid references public.applications(id) on delete set null,
  doc_type text not null check (doc_type in ('resume', 'valid_id', 'avatar', 'cover_letter', 'other')),
  bucket text not null,
  path text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.skills (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

create table if not exists public.profile_skills (
  user_id uuid not null references public.profiles(user_id) on delete cascade,
  skill_id uuid not null references public.skills(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, skill_id)
);

create table if not exists public.saved_jobs (
  user_id uuid not null references auth.users(id) on delete cascade,
  job_id uuid not null references public.jobs(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, job_id)
);

-- Indexes
create index if not exists idx_employers_user_id on public.employers(user_id);
create index if not exists idx_jobs_employer_id on public.jobs(employer_id);
create index if not exists idx_jobs_category_id on public.jobs(category_id);
create index if not exists idx_jobs_active on public.jobs(is_active);
create index if not exists idx_applications_job_id on public.applications(job_id);
create index if not exists idx_applications_applicant_id on public.applications(applicant_id);
create index if not exists idx_messages_recipient_id on public.messages(recipient_id);
create index if not exists idx_notifications_user_id on public.notifications(user_id);
create index if not exists idx_documents_owner_id on public.documents(owner_id);

-- RLS
alter table public.profiles enable row level security;
alter table public.employers enable row level security;
alter table public.categories enable row level security;
alter table public.jobs enable row level security;
alter table public.applications enable row level security;
alter table public.application_status enable row level security;
alter table public.interviews enable row level security;
alter table public.messages enable row level security;
alter table public.notifications enable row level security;
alter table public.documents enable row level security;
alter table public.skills enable row level security;
alter table public.profile_skills enable row level security;
alter table public.saved_jobs enable row level security;

-- Profiles policies
create policy "profiles_select_own" on public.profiles
  for select using (user_id = auth.uid() or public.is_admin());

create policy "profiles_insert_own" on public.profiles
  for insert with check (user_id = auth.uid());

create policy "profiles_update_own" on public.profiles
  for update using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy "profiles_delete_admin" on public.profiles
  for delete using (public.is_admin());

-- Employers policies
create policy "employers_select_public" on public.employers
  for select using (true);

create policy "employers_insert_owner" on public.employers
  for insert with check (user_id = auth.uid() and public.is_employer());

create policy "employers_update_owner" on public.employers
  for update using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy "employers_delete_admin" on public.employers
  for delete using (public.is_admin());

-- Categories policies
create policy "categories_select_public" on public.categories
  for select using (true);

create policy "categories_manage_admin" on public.categories
  for all using (public.is_admin()) with check (public.is_admin());

-- Jobs policies
create policy "jobs_select_public" on public.jobs
  for select using (true);

create policy "jobs_insert_employer" on public.jobs
  for insert with check (
    public.is_employer()
    and exists (
      select 1 from public.employers e
      where e.id = employer_id and e.user_id = auth.uid()
    )
  );

create policy "jobs_update_employer" on public.jobs
  for update using (
    public.is_admin()
    or exists (
      select 1 from public.employers e
      where e.id = employer_id and e.user_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.employers e
      where e.id = employer_id and e.user_id = auth.uid()
    )
  );

create policy "jobs_delete_employer" on public.jobs
  for delete using (
    public.is_admin()
    or exists (
      select 1 from public.employers e
      where e.id = employer_id and e.user_id = auth.uid()
    )
  );

-- Applications policies
create policy "applications_select_owner_or_employer" on public.applications
  for select using (
    applicant_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.jobs j
      join public.employers e on e.id = j.employer_id
      where j.id = job_id and e.user_id = auth.uid()
    )
  );

create policy "applications_insert_applicant" on public.applications
  for insert with check (applicant_id = auth.uid() and public.is_applicant());

create policy "applications_update_owner_or_employer" on public.applications
  for update using (
    applicant_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.jobs j
      join public.employers e on e.id = j.employer_id
      where j.id = job_id and e.user_id = auth.uid()
    )
  )
  with check (
    applicant_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.jobs j
      join public.employers e on e.id = j.employer_id
      where j.id = job_id and e.user_id = auth.uid()
    )
  );

create policy "applications_delete_owner" on public.applications
  for delete using (applicant_id = auth.uid() or public.is_admin());

-- Application status policies
create policy "application_status_select" on public.application_status
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.applications a
      where a.id = application_id and a.applicant_id = auth.uid()
    )
    or exists (
      select 1 from public.applications a
      join public.jobs j on j.id = a.job_id
      join public.employers e on e.id = j.employer_id
      where a.id = application_id and e.user_id = auth.uid()
    )
  );

create policy "application_status_insert_employer" on public.application_status
  for insert with check (
    public.is_admin()
    or exists (
      select 1 from public.applications a
      join public.jobs j on j.id = a.job_id
      join public.employers e on e.id = j.employer_id
      where a.id = application_id and e.user_id = auth.uid()
    )
  );

create policy "application_status_delete_admin" on public.application_status
  for delete using (public.is_admin());

-- Interviews policies
create policy "interviews_select" on public.interviews
  for select using (
    public.is_admin()
    or exists (
      select 1 from public.applications a
      where a.id = application_id and a.applicant_id = auth.uid()
    )
    or exists (
      select 1 from public.applications a
      join public.jobs j on j.id = a.job_id
      join public.employers e on e.id = j.employer_id
      where a.id = application_id and e.user_id = auth.uid()
    )
  );

create policy "interviews_insert_employer" on public.interviews
  for insert with check (
    public.is_admin()
    or exists (
      select 1 from public.applications a
      join public.jobs j on j.id = a.job_id
      join public.employers e on e.id = j.employer_id
      where a.id = application_id and e.user_id = auth.uid()
    )
  );

create policy "interviews_update_employer" on public.interviews
  for update using (
    public.is_admin()
    or exists (
      select 1 from public.applications a
      join public.jobs j on j.id = a.job_id
      join public.employers e on e.id = j.employer_id
      where a.id = application_id and e.user_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.applications a
      join public.jobs j on j.id = a.job_id
      join public.employers e on e.id = j.employer_id
      where a.id = application_id and e.user_id = auth.uid()
    )
  );

create policy "interviews_delete_admin" on public.interviews
  for delete using (public.is_admin());

-- Messages policies
create policy "messages_select_owner" on public.messages
  for select using (sender_id = auth.uid() or recipient_id = auth.uid() or public.is_admin());

create policy "messages_insert_sender" on public.messages
  for insert with check (sender_id = auth.uid());

create policy "messages_update_recipient" on public.messages
  for update using (recipient_id = auth.uid() or public.is_admin())
  with check (recipient_id = auth.uid() or public.is_admin());

create policy "messages_delete_sender" on public.messages
  for delete using (sender_id = auth.uid() or public.is_admin());

-- Notifications policies
create policy "notifications_select_owner" on public.notifications
  for select using (user_id = auth.uid() or public.is_admin());

create policy "notifications_insert_owner" on public.notifications
  for insert with check (user_id = auth.uid() or public.is_admin());

create policy "notifications_update_owner" on public.notifications
  for update using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy "notifications_delete_admin" on public.notifications
  for delete using (public.is_admin());

-- Documents policies
create policy "documents_select_owner" on public.documents
  for select using (
    owner_id = auth.uid()
    or public.is_admin()
    or exists (
      select 1 from public.applications a
      join public.jobs j on j.id = a.job_id
      join public.employers e on e.id = j.employer_id
      where a.id = application_id and e.user_id = auth.uid()
    )
  );

create policy "documents_insert_owner" on public.documents
  for insert with check (owner_id = auth.uid());

create policy "documents_update_owner" on public.documents
  for update using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

create policy "documents_delete_owner" on public.documents
  for delete using (owner_id = auth.uid() or public.is_admin());

-- Skills policies
create policy "skills_select_public" on public.skills
  for select using (true);

create policy "skills_manage_admin" on public.skills
  for all using (public.is_admin()) with check (public.is_admin());

-- Profile skills policies
create policy "profile_skills_select_owner" on public.profile_skills
  for select using (user_id = auth.uid() or public.is_admin());

create policy "profile_skills_manage_owner" on public.profile_skills
  for all using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

-- Saved jobs policies
create policy "saved_jobs_select_owner" on public.saved_jobs
  for select using (user_id = auth.uid());

create policy "saved_jobs_manage_owner" on public.saved_jobs
  for all using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Storage buckets
insert into storage.buckets (id, name, public)
values
  ('resumes', 'resumes', false),
  ('ids', 'ids', false),
  ('avatars', 'avatars', true),
  ('documents', 'documents', false)
on conflict (id) do nothing;

-- Storage policies: store files under user_id/filename
create policy "resumes_select_own" on storage.objects
  for select using (
    bucket_id = 'resumes'
    and (
      public.is_admin()
      or (auth.uid()::text = (storage.foldername(name))[1])
    )
  );

create policy "resumes_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'resumes'
    and (auth.uid()::text = (storage.foldername(name))[1])
  );

create policy "resumes_update_own" on storage.objects
  for update using (
    bucket_id = 'resumes'
    and (
      public.is_admin()
      or (auth.uid()::text = (storage.foldername(name))[1])
    )
  );

create policy "resumes_delete_own" on storage.objects
  for delete using (
    bucket_id = 'resumes'
    and (
      public.is_admin()
      or (auth.uid()::text = (storage.foldername(name))[1])
    )
  );

create policy "ids_select_own" on storage.objects
  for select using (
    bucket_id = 'ids'
    and (
      public.is_admin()
      or (auth.uid()::text = (storage.foldername(name))[1])
    )
  );

create policy "ids_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'ids'
    and (auth.uid()::text = (storage.foldername(name))[1])
  );

create policy "ids_update_own" on storage.objects
  for update using (
    bucket_id = 'ids'
    and (
      public.is_admin()
      or (auth.uid()::text = (storage.foldername(name))[1])
    )
  );

create policy "ids_delete_own" on storage.objects
  for delete using (
    bucket_id = 'ids'
    and (
      public.is_admin()
      or (auth.uid()::text = (storage.foldername(name))[1])
    )
  );

create policy "avatars_select_public" on storage.objects
  for select using (bucket_id = 'avatars');

create policy "avatars_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'avatars'
    and (auth.uid()::text = (storage.foldername(name))[1])
  );

create policy "avatars_update_own" on storage.objects
  for update using (
    bucket_id = 'avatars'
    and (
      public.is_admin()
      or (auth.uid()::text = (storage.foldername(name))[1])
    )
  );

create policy "avatars_delete_own" on storage.objects
  for delete using (
    bucket_id = 'avatars'
    and (
      public.is_admin()
      or (auth.uid()::text = (storage.foldername(name))[1])
    )
  );

create policy "documents_select_own" on storage.objects
  for select using (
    bucket_id = 'documents'
    and (
      public.is_admin()
      or (auth.uid()::text = (storage.foldername(name))[1])
    )
  );

create policy "documents_insert_own" on storage.objects
  for insert with check (
    bucket_id = 'documents'
    and (auth.uid()::text = (storage.foldername(name))[1])
  );

create policy "documents_update_own" on storage.objects
  for update using (
    bucket_id = 'documents'
    and (
      public.is_admin()
      or (auth.uid()::text = (storage.foldername(name))[1])
    )
  );

create policy "documents_delete_own" on storage.objects
  for delete using (
    bucket_id = 'documents'
    and (
      public.is_admin()
      or (auth.uid()::text = (storage.foldername(name))[1])
    )
  );
