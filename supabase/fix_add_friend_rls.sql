-- ============================================================
-- FIX: Add Friend cannot find Study IDs (RLS blocks cross-user lookup)
-- ============================================================
-- Problem:
--   study_squad_directory is a VIEW over profiles.
--   The existing RLS policy on profiles only allows users to read
--   their OWN row (auth.uid() = id), so searching another user's
--   study_id always returns 0 rows → "Study ID not found" error.
--
-- Solution:
--   Add a SELECT policy on profiles that lets any authenticated user
--   read the minimum fields needed for friend lookup (id, study_id,
--   display_name, first_name, last_name, nickname) via the
--   study_squad_directory view.  We do this by granting a separate
--   "read for squad lookup" policy scoped to study_id IS NOT NULL.
-- ============================================================

-- 1. Allow any authenticated user to read profiles for squad directory lookups.
--    The view already limits columns; this policy opens the underlying table
--    so the view can resolve rows that belong to other users.
drop policy if exists "Users can read profiles for squad directory" on public.profiles;
create policy "Users can read profiles for squad directory"
on public.profiles
for select
to authenticated
using (
  -- Allow reading any profile that has a study_id set.
  -- This is needed so study_squad_directory can resolve friend lookups.
  study_id is not null
);

-- NOTE: The existing "Users can read own profile" policy is now redundant
-- for SELECT (the new policy is a superset), but we keep it to avoid
-- breaking anything that explicitly relied on it.

-- 2. Ensure the view grants are still correct (idempotent).
grant select on public.study_squad_directory to authenticated;
