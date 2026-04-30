# Questserv Solutions Inc. Recruitment System

Modern, responsive recruitment website with applicant and admin roles.

## Tech Stack
- Frontend: HTML5, CSS3, JavaScript (modular)
- Backend: Node.js + Express
- Database: PostgreSQL (Supabase)
- Auth: JWT + role-based access control
- Uploads: Multer (resume file handling)

## Project Structure
```
.
|-- backend
|   |-- config
|   |   `-- db.js
|   |-- middleware
|   |   |-- auth.js
|   |   `-- upload.js
|   |-- routes
|   |   |-- adminRoutes.js
|   |   |-- applicationRoutes.js
|   |   |-- authRoutes.js
|   |   `-- jobRoutes.js
|   |-- uploads
|   |   `-- resumes
|   |       `-- .gitkeep
|   `-- server.js
|-- database
|   `-- schema.sql
|-- pages
|   |-- admin-applicants.html
|   |-- admin-dashboard.html
|   |-- admin-jobs.html
|   |-- admin-settings.html
|   |-- apply.html
|   |-- job-details.html
|   |-- jobs.html
|   |-- login.html
|   `-- register.html
|-- src
|   |-- js
|   |   |-- admin-applicants.js
|   |   |-- admin-common.js
|   |   |-- admin-dashboard.js
|   |   |-- admin-jobs.js
|   |   |-- admin-settings.js
|   |   |-- api.js
|   |   |-- apply.js
|   |   |-- auth.js
|   |   |-- common.js
|   |   |-- job-details.js
|   |   |-- jobs.js
|   |   `-- main.js
|   `-- styles
|       `-- theme.css
|-- .env.example
|-- index.html
`-- package.json
```

## Database Setup
1. Run schema in Supabase SQL Editor (or psql):
```sql
\i database/schema.sql
```

2. Default seeded admin account:
- Email: `admin@questserv.com`
- Password: `123456789`

## Backend Setup
1. Install dependencies:
```bash
npm install
```

2. Create `.env` from `.env.example`:
```bash
copy .env.example .env
```

3. Update `.env` values for your Supabase PostgreSQL instance.
   You can use either the `DB_*` values or the full `DATABASE_URL`. Both are supported.
4. Set `ADMIN_REGISTER_CODE` in `.env` for secure admin account creation from register page.

5. Start server:
```bash
npm run dev
```

6. Open in browser:
- `http://localhost:5000`

## Core Features
- Public landing page with featured jobs
- Job listing search + location/type filters
- Job details page with Apply CTA
- Applicant registration/login
- Resume upload + application submission
- Applicant application tracking (`My Applications`)
- Admin dashboard overview and notifications
- Admin job CRUD
- Admin applicant status management
- Admin profile settings update

## API Endpoints
### Auth
- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET /api/auth/me`

### Jobs
- `GET /api/jobs`
- `GET /api/jobs/featured`
- `GET /api/jobs/:id`
- `POST /api/jobs` (admin)
- `PUT /api/jobs/:id` (admin)
- `DELETE /api/jobs/:id` (admin)

### Applications
- `POST /api/applications` (applicant)
- `GET /api/applications/my` (applicant)

### Admin
- `GET /api/admin/overview`
- `GET /api/admin/applicants`
- `PUT /api/admin/applicants/:id/status`
- `GET /api/admin/messages`
- `PUT /api/admin/settings/profile`

## Validation and Error Handling
- Frontend required fields + role guards
- Backend validation for required fields, status values, and duplicates
- Secure password hashing (`bcryptjs`)
- JWT-protected endpoints with RBAC middleware
- Upload type/size checks for resumes
