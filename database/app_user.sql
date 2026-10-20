-- Run in phpMyAdmin > SQL. Back up the database first. Change the password!
CREATE USER IF NOT EXISTS 'inventory_app'@'127.0.0.1' IDENTIFIED BY 'shafizal123';
CREATE USER IF NOT EXISTS 'inventory_app'@'localhost' IDENTIFIED BY 'shafizal123';
GRANT SELECT, INSERT, UPDATE, DELETE ON it_asset_invenotry.* TO 'inventory_app'@'127.0.0.1';
GRANT SELECT, INSERT, UPDATE, DELETE ON it_asset_invenotry.* TO 'inventory_app'@'localhost';
FLUSH PRIVILEGES;
-- Read-only check of image column types (all four should be longblob):
SELECT TABLE_NAME, COLUMN_NAME, COLUMN_TYPE FROM information_schema.COLUMNS
WHERE TABLE_SCHEMA='it_asset_invenotry' AND COLUMN_NAME IN ('pic','picture');
