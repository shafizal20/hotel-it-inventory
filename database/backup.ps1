# Daily backup (Windows). Schedule with Task Scheduler. Adjust paths/credentials; keep this file private.
$dest = "C:\backups\inventory"; New-Item -ItemType Directory -Force $dest | Out-Null
$file = "$dest\it_asset_invenotry-$(Get-Date -Format yyyyMMdd-HHmm).sql"
& "C:\xampp\mysql\bin\mysqldump.exe" --single-transaction --hex-blob -u backup_user "-p$env:BACKUP_DB_PASSWORD" it_asset_invenotry | Out-File -Encoding utf8 $file
Get-ChildItem $dest -Filter *.sql | Where-Object LastWriteTime -lt (Get-Date).AddDays(-30) | Remove-Item
