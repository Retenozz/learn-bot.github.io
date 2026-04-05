-- ============================================================
-- FIX: Create classroom fails (RLS blocks initial message insert)
-- ============================================================
-- Problem 1:
--   When creating a new classroom, the code does 3 inserts in order:
--     1. INSERT INTO classrooms         → OK (policy: owner_user_id = auth.uid())
--     2. INSERT INTO classroom_members  → OK (policy: auth.uid() = user_id)
--     3. INSERT INTO classroom_messages → ❌ BLOCKED
--   The messages policy uses is_classroom_member() which queries
--   classroom_members. But the Supabase client has NOT committed the
--   classroom_members row yet when the messages insert fires, so
--   is_classroom_member() returns false → new-room creation always fails.
--
-- Problem 2:
--   "Members can read classroom memberships" also uses is_classroom_member,
--   so the owner can't read the member list right after creating the room.
--
-- Solution:
--   Replace is_classroom_member() checks with direct joins / owner checks
--   so that the room owner can always insert/read without needing a prior
--   classroom_members row.
-- ============================================================

-- 1. classroom_messages INSERT:
--    Allow if the user is either a member OR the owner of the classroom.
--    This lets the first system message be inserted right after classrooms insert.
drop policy if exists "Members can create classroom messages" on public.classroom_messages;
create policy "Members can create classroom messages"
on public.classroom_messages
for insert
to authenticated
with check (
  (
    -- user is a member (normal case after joining)
    public.is_classroom_member(classroom_id, auth.uid())
    or
    -- user is the owner (needed for the very first system message on creation)
    exists (
      select 1
      from public.classrooms c
      where c.id = classroom_id
        and c.owner_user_id = auth.uid()
    )
  )
  and (sender_user_id is null or sender_user_id = auth.uid())
);

-- 2. classroom_messages SELECT:
--    Same rule – owner can always read their own room's messages.
drop policy if exists "Members can read classroom messages" on public.classroom_messages;
create policy "Members can read classroom messages"
on public.classroom_messages
for select
to authenticated
using (
  public.is_classroom_member(classroom_id, auth.uid())
  or
  exists (
    select 1
    from public.classrooms c
    where c.id = classroom_id
      and c.owner_user_id = auth.uid()
  )
);

-- 3. classroom_members SELECT:
--    Owner should be able to read the member list of their own room.
drop policy if exists "Members can read classroom memberships" on public.classroom_members;
create policy "Members can read classroom memberships"
on public.classroom_members
for select
to authenticated
using (
  public.is_classroom_member(classroom_id, auth.uid())
  or
  public.is_classroom_owner(classroom_id, auth.uid())
);

-- 4. classrooms UPDATE:
--    Owner can update their own room without needing a member row first.
drop policy if exists "Joined users can update classrooms" on public.classrooms;
create policy "Joined users can update classrooms"
on public.classrooms
for update
to authenticated
using (
  public.is_classroom_member(id, auth.uid())
  or auth.uid() = owner_user_id
)
with check (
  public.is_classroom_member(id, auth.uid())
  or auth.uid() = owner_user_id
);
