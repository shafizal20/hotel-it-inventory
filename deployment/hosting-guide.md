# Hosting guide (no Docker)

Not yet deployed or verified on any real host. Follow the checklist at the end and test each step.
**The PostgreSQL database on your PC is for development only.** Production needs its own PostgreSQL server (or a managed one). Create it by running `pg_dump -Fc it_asset_inventory > inventory.dump` on your PC and restoring it on the server with `pg_restore`.

## 1. Build
```
cd frontend && npm install && npm run build      # creates frontend/dist
```
The backend automatically serves `frontend/dist` and the API from one origin, so there is no CORS or cross-site cookie problem. Set `APP_ENV=production` (disables /docs, enables Secure cookies) and `FRONTEND_ORIGIN=https://your-domain`.

## 2. Option A - Linux VPS (recommended; Ubuntu example)
```
sudo apt install python3-venv mariadb-server caddy
sudo mkdir -p /opt/inventory /etc/inventory && sudo chown $USER /opt/inventory   # copy the project here
cd /opt/inventory/backend && python3 -m venv .venv && .venv/bin/pip install -r requirements.txt
sudo mariadb < ../database/app_user.sql          # edit the password first; import your data dump too
cp ../.env.example /etc/inventory/.env && chmod 600 /etc/inventory/.env     # fill in real values
set -a; . /etc/inventory/.env; set +a; .venv/bin/python create_admin.py
```
`/etc/systemd/system/inventory.service`:
```
[Unit]
Description=Hotel IT Inventory
After=network.target mariadb.service
[Service]
User=www-data
WorkingDirectory=/opt/inventory/backend
EnvironmentFile=/etc/inventory/.env
ExecStart=/opt/inventory/backend/.venv/bin/uvicorn app.main:app --host 127.0.0.1 --port 8000 --workers 2
Restart=always
RestartSec=3
[Install]
WantedBy=multi-user.target
```
`sudo systemctl enable --now inventory`. Note: the login rate limiter is per-process memory, so with several workers the limit is per worker; use `--workers 1` for strict limiting.

Caddy (`/etc/caddy/Caddyfile`) gives automatic HTTPS:
```
inventory.example.com {
    request_body { max_size 10MB }
    reverse_proxy 127.0.0.1:8000
}
```
Firewall: allow only 22, 80, 443 (`ufw`). Keep PostgreSQL bound to 127.0.0.1 (`listen_addresses = 'localhost'` in `postgresql.conf`). Do not expose port 5432.

## 3. Option B - Windows VPS
Install Python, PostgreSQL, Node (for the build), and Caddy or IIS (ARR) as the HTTPS reverse proxy. Run the backend as a service with NSSM:
```
nssm install HotelInventory C:\inventory\backend\.venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000
nssm set HotelInventory AppDirectory C:\inventory\backend
nssm set HotelInventory AppEnvironmentExtra APP_ENV=production DB_USER=... DB_PASSWORD=... SESSION_SECRET=... FRONTEND_ORIGIN=https://your-domain
nssm set HotelInventory AppExit Default Restart
```

## 4. Option C - Shared hosting
Only if the provider supports a persistent Python (ASGI) app and a local PostgreSQL database. PHP-only plans will not work.

## 5. pgAdmin
Do not expose pgAdmin (or port 5432) publicly in production. Prefer an SSH tunnel or an IP allow-list, or remove it from the server.

## 6. Backups and restore
`database/backup.sh` (Linux cron) or `database/backup.ps1` (Windows Task Scheduler) take a daily `pg_dump -Fc` dump (images included, since they are stored as bytea) and keep 30 days. Use a separate read-only backup DB user (e.g. `GRANT pg_read_all_data TO backup_user;` on PostgreSQL 14+). Copy dumps off the server.
Restore test (do this on a scratch DB before you need it):
```
createdb -U postgres restore_test
pg_restore -U postgres -d restore_test it_asset_inventory-YYYYMMDD-HHMM.dump
```

## 7. Monitoring
Point an uptime monitor at `https://your-domain/health` (200 ok, 503 if the database is down). Logs: `journalctl -u inventory -f`.

## 8. Production deployment checklist
- [ ] Database backed up; restore tested
- [ ] `inventory_app` user has only SELECT/INSERT/UPDATE/DELETE
- [ ] `.env` outside web root, permissions 600, long random SESSION_SECRET
- [ ] `APP_ENV=production`, HTTPS working, HTTP redirects to HTTPS
- [ ] Admin created with `create_admin.py` (strong password)
- [ ] Port 5432 and 8000 not reachable from the internet
- [ ] pgAdmin restricted or removed
- [ ] Service restarts on failure and on reboot
- [ ] `/health` monitored; backups scheduled and copied off-site
- [ ] Login, CRUD, image upload, reports checked on the live site
