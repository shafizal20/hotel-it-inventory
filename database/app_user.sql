-- Run as the postgres superuser AFTER it_asset_inventory.sql, connected to the it_asset_inventory database:
--   psql -U postgres -d it_asset_inventory -f app_user.sql
-- CHANGE THE PASSWORD and put the same value in DB_PASSWORD in the project's .env.
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'inventory_app') THEN
    CREATE ROLE inventory_app LOGIN PASSWORD 'CHANGE_ME';
  END IF;
END $$;

GRANT CONNECT ON DATABASE it_asset_inventory TO inventory_app;
GRANT USAGE ON SCHEMA public TO inventory_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO inventory_app;
-- Needed so INSERTs can use the SERIAL id sequences:
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO inventory_app;

-- Read-only check: the four image columns should all be bytea
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND column_name IN ('pic', 'picture');
