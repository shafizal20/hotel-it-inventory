# Daily backup (Windows). Schedule with Task Scheduler. Adjust paths/version/credentials; keep this file private.
# Set BACKUP_DB_PASSWORD as an environment variable for the account that runs the task.
$dest = "C:\backups\inventory"; New-Item -ItemType Directory -Force $dest | Out-Null
$file = "$dest\it_asset_inventory-$(Get-Date -Format yyyyMMdd-HHmm).dump"
$env:PGPASSWORD = $env:BACKUP_DB_PASSWORD
& "C:\Program Files\PostgreSQL\16\bin\pg_dump.exe" -h 127.0.0.1 -U backup_user -Fc -f $file it_asset_inventory
Get-ChildItem $dest -Filter *.dump | Where-Object LastWriteTime -lt (Get-Date).AddDays(-30) | Remove-Item
