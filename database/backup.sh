#!/bin/sh
# Linux daily backup via cron: 0 2 * * * /opt/inventory/database/backup.sh
# Credentials: create ~postgres-or-service-user/.pgpass (chmod 600):  127.0.0.1:5432:it_asset_inventory:backup_user:PASSWORD
set -e; D=/var/backups/inventory; mkdir -p "$D"
pg_dump -h 127.0.0.1 -U backup_user -Fc it_asset_inventory > "$D/it_asset_inventory-$(date +%Y%m%d-%H%M).dump"
find "$D" -name '*.dump' -mtime +30 -delete
