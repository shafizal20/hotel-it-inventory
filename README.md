# Hotel IT Inventory - backend foundation (Windows, no Docker)

## Setup
1. XAMPP: start MySQL, open phpMyAdmin, export a backup of `it_asset_invenotry`.
2. Run `database/app_user.sql`; confirm the image columns are `longblob`.
3. `copy .env.example .env` (project root); fill in DB_PORT, DB_PASSWORD, SESSION_SECRET.
4. PowerShell, in `backend`:

    python -m venv .venv
    .\.venv\Scripts\Activate.ps1
    python -m pip install -r requirements.txt
    python create_admin.py
    python -m uvicorn app.main:app --reload --port 8000

5. Open http://127.0.0.1:8000/docs. Log in via `/api/v1/auth/login`; send header `X-Requested-With: XMLHttpRequest` on POST/PUT/DELETE.

## Done so far
Config, models for all 5 tables (BLOBs deferred), Argon2id login/logout/me, login rate limiting, signed HttpOnly SameSite=Strict cookie, CSRF header check, Pillow image validation, full General CRUD (search, filter, sort, pagination, image endpoint).

## Features
Auth, CRUD + images for all four tables, dashboard, CSV and PDF reports (`/api/v1/reports/{name}?format=csv|pdf`, `/reports/export?name=..`), dark mode, breadcrumbs, `/health`.

## Tests
`cd backend; python -m pytest tests` (17 tests; use an in-memory SQLite database, never your real MySQL data).

## Frontend
`cd frontend`, `npm install`, `npm run dev`, then open http://localhost:5173. Vite proxies /api to port 8000, so keep the backend running.

## Production
`npm run build` in frontend, then run the backend with APP_ENV=production; it serves frontend/dist. See `deployment/hosting-guide.md`.

## Troubleshooting
- 401 everywhere: log in again (session lasts 8 h).
- Cannot connect to DB: check XAMPP MySQL is running, DB_PORT, and that app_user.sql ran.
- `Activate.ps1` blocked: use `.venv\Scripts\activate.bat` in cmd.
- Upload rejected: JPEG/PNG/WebP only, max MAX_UPLOAD_SIZE_MB.
