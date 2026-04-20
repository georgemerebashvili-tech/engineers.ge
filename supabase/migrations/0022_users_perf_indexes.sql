-- 0022_users_perf_indexes.sql
-- Add indexes for the two most-scanned `users` columns in admin UI:
--   1. referred_by_user_id — powers "top referrers" aggregation and
--      `referred users` list on /admin/referrals. Without this index the
--      query scans the whole users table.
--   2. (source, deleted_at) — powers "referred vs organic" filters on
--      /admin/users and `listUsers({source})`. Composite with deleted_at
--      lets soft-delete filtering stay on the index.

CREATE INDEX IF NOT EXISTS users_referred_by_idx
  ON users (referred_by_user_id)
  WHERE referred_by_user_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS users_source_active_idx
  ON users (source, deleted_at)
  WHERE deleted_at IS NULL;

-- Quick verification after running:
--   EXPLAIN SELECT referred_by_user_id, count(*)
--     FROM users
--     WHERE referred_by_user_id IS NOT NULL
--     GROUP BY referred_by_user_id;
-- should show `Index Scan using users_referred_by_idx`.
