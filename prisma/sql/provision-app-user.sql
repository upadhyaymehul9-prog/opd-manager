-- Provisions the `app_user` Postgres role that the app's runtime DATABASE_URL
-- must connect as for Row Level Security to actually take effect.
--
-- Why this is required: Neon's default `neondb_owner` role has BYPASSRLS=true,
-- which makes every RLS policy (and FORCE ROW LEVEL SECURITY) a no-op for
-- that role -- it silently sees and writes every clinic's rows regardless of
-- the `app.clinic_id` session variable withClinicScope() sets. `app_user` is
-- created NOBYPASSRLS specifically so the policies are actually enforced.
--
-- Run this ONCE per database (dev, each Neon branch, staging, production),
-- authenticated as the privileged owner role (e.g. via DIRECT_URL, not the
-- pooled DATABASE_URL), before pointing the app's DATABASE_URL at app_user's
-- connection string. `prisma migrate deploy` creates the RLS policies but
-- does NOT create this role -- both steps are required.
--
-- Replace <set-a-strong-password> below before running. Do not commit a real
-- password to this file.

CREATE ROLE app_user WITH LOGIN PASSWORD '<set-a-strong-password>' NOBYPASSRLS;
GRANT USAGE ON SCHEMA public TO app_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO app_user;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO app_user;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT USAGE, SELECT ON SEQUENCES TO app_user;
