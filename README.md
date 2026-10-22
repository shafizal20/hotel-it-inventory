# Hotel IT Inventory - backend foundation (Windows, no Docker)

## Setup
1. Install PostgreSQL (16+ recommended) and make sure the service is running (default port 5432).
2. Create the database once: `psql -U postgres -c "CREATE DATABASE it_asset_inventory;"`, then load the tables and data:
   `psql -U postgres -d it_asset_inventory -f database/it_asset_inventory.sql`
3. Edit the password in `database/app_user.sql`, then run it: `psql -U postgres -d it_asset_inventory -f database/app_user.sql`; confirm the image columns are `bytea`.
4. `copy .env.example .env` (project root); fill in DB_PORT (5432), DB_PASSWORD (same as in app_user.sql), SESSION_SECRET.
5. PowerShell, in `backend`:

    python -m venv .venv
    .\.venv\Scripts\Activate.ps1
    python -m pip install -r requirements.txt
    python create_admin.py
    python -m uvicorn app.main:app --reload --port 8000

6. Open http://127.0.0.1:8000/docs. Log in via `/api/v1/auth/login`; send header `X-Requested-With: XMLHttpRequest` on POST/PUT/DELETE.

## Done so far
Config, models for all 5 tables (BLOBs deferred), Argon2id login/logout/me, login rate limiting, signed HttpOnly SameSite=Strict cookie, CSRF header check, Pillow image validation, full General CRUD (search, filter, sort, pagination, image endpoint).

## Features
Auth, CRUD + images for all four tables, dashboard, CSV and PDF reports (`/api/v1/reports/{name}?format=csv|pdf`, `/reports/export?name=..`), dark mode, breadcrumbs, `/health`.

## Tests
`cd backend; python -m pytest tests` (17 tests; use an in-memory SQLite database, never your real PostgreSQL data).

## Frontend
`cd frontend`, `npm install`, `npm run dev`, then open http://localhost:5173. Vite proxies /api to port 8000, so keep the backend running.

## Production
`npm run build` in frontend, then run the backend with APP_ENV=production; it serves frontend/dist. See `deployment/hosting-guide.md`.

## Troubleshooting
- 401 everywhere: log in again (session lasts 8 h).
- Cannot connect to DB: check the PostgreSQL service is running, DB_PORT=5432, DB_PASSWORD matches app_user.sql, and that app_user.sql ran.
- `Activate.ps1` blocked: use `.venv\Scripts\activate.bat` in cmd.
- Upload rejected: JPEG/PNG/WebP only, max MAX_UPLOAD_SIZE_MB.
