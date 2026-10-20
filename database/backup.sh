#!/bin/sh
# Linux daily backup via cron: 0 2 * * * /opt/inventory/database/backup.sh
set -e; D=/var/backups/inventory; mkdir -p "$D"
mysqldump --single-transaction --hex-blob --defaults-extra-file=/etc/inventory/backup.cnf it_asset_invenotry | gzip > "$D/it_asset_invenotry-$(date +%Y%m%d-%H%M).sql.gz"
find "$D" -name '*.sql.gz' -mtime +30 -delete
