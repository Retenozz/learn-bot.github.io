create extension if not exists pgcrypto;

create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create or replace function public.generate_study_id()
returns text
language plpgsql
as $$
declare
  candidate text;
begin
  loop
    candidate := 'ID' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists (
      select 1
      from public.profiles
      where study_id = candidate
    );
  end loop;

  return candidate;
end;
$$;

create or replace function public.build_study_id_for_user(user_uuid uuid)
returns text
language plpgsql
as $$
begin
  return 'ID' || upper(substr(replace(user_uuid::text, '-', ''), 1, 8));
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  display_name text,
  first_name text,
  last_name text,
  nickname text,
  phone text,
  major text,
  year_level integer,
  study_id text unique not null default public.generate_study_id(),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles
  add column if not exists study_id text;

alter table public.profiles
  alter column study_id set default public.generate_study_id();

update public.profiles
set study_id = public.build_study_id_for_user(id)
where study_id is null or length(trim(study_id)) = 0;

create unique index if not exists profiles_study_id_key
on public.profiles (study_id);

create table if not exists public.user_private_room_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  messages jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_learning_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  attempts jsonb not null default '[]'::jsonb,
  generated_quizzes jsonb not null default '{}'::jsonb,
  generated_flashcards jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_study_squad_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  members jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.user_classroom_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  classrooms jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.classrooms (
  id text primary key,
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  code text not null unique,
  icon text not null,
  materials jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.classroom_members (
  classroom_id text not null references public.classrooms (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  display_name text not null,
  joined_at timestamptz not null default timezone('utc', now()),
  primary key (classroom_id, user_id)
);

create table if not exists public.classroom_messages (
  id text primary key,
  classroom_id text not null references public.classrooms (id) on delete cascade,
  sender_user_id uuid references auth.users (id) on delete set null,
  sender_role text not null check (sender_role in ('me', 'member', 'system', 'assistant')),
  sender_name text not null,
  text text not null,
  attachments jsonb not null default '[]'::jsonb,
  citations jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create index if not exists classrooms_owner_user_id_idx
on public.classrooms (owner_user_id);

create index if not exists classroom_members_user_id_idx
on public.classroom_members (user_id);

create index if not exists classroom_messages_classroom_id_created_at_idx
on public.classroom_messages (classroom_id, created_at);

create table if not exists public.study_squad_connections (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references auth.users (id) on delete cascade,
  friend_user_id uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default timezone('utc', now()),
  unique (owner_user_id, friend_user_id),
  constraint study_squad_no_self_friend check (owner_user_id <> friend_user_id)
);

create table if not exists public.study_squad_requests (
  id uuid primary key default gen_random_uuid(),
  requester_user_id uuid not null references auth.users (id) on delete cascade,
  recipient_user_id uuid not null references auth.users (id) on delete cascade,
  pair_key text not null unique,
  status text not null default 'pending' check (status in ('pending', 'accepted', 'declined', 'cancelled')),
  created_at timestamptz not null default timezone('utc', now()),
  responded_at timestamptz,
  constraint study_squad_requests_no_self check (requester_user_id <> recipient_user_id)
);

create or replace view public.study_squad_directory as
select
  id,
  study_id,
  coalesce(
    nullif(display_name, ''),
    nullif(trim(coalesce(first_name, '') || ' ' || coalesce(last_name, '')), ''),
    nullif(nickname, ''),
    email
  ) as display_name
from public.profiles
where study_id is not null;

create or replace function public.assign_profile_study_id()
returns trigger
language plpgsql
as $$
begin
  if new.study_id is null or length(trim(new.study_id)) = 0 then
    new.study_id := public.build_study_id_for_user(new.id);
  end if;

  return new;
end;
$$;

create or replace function public.is_classroom_member(
  target_classroom_id text,
  target_user_id uuid
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.classroom_members as cm
    where cm.classroom_id = target_classroom_id
      and cm.user_id = target_user_id
  );
$$;

create or replace function public.is_classroom_owner(
  target_classroom_id text,
  target_user_id uuid
)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.classrooms as c
    where c.id = target_classroom_id
      and c.owner_user_id = target_user_id
  );
$$;

create or replace function public.join_classroom_by_code(
  room_code_input text,
  member_display_name_input text default null
)
returns table (
  joined_classroom_id text,
  joined_classroom_name text,
  joined_classroom_code text,
  joined_now boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  target_room public.classrooms%rowtype;
  resolved_display_name text;
  already_member boolean;
begin
  select *
  into target_room
  from public.classrooms
  where code = upper(regexp_replace(room_code_input, '[^A-Za-z0-9]', '', 'g'))
  limit 1;

  if target_room.id is null then
    raise exception 'Room code not found.';
  end if;

  if auth.uid() is null then
    raise exception 'Not authenticated.';
  end if;

  resolved_display_name :=
    coalesce(nullif(trim(member_display_name_input), ''), 'Learner');

  select exists (
    select 1
    from public.classroom_members as cm
    where cm.classroom_id = target_room.id
      and cm.user_id = auth.uid()
  )
  into already_member;

  if not already_member then
    insert into public.classroom_members (
      classroom_id,
      user_id,
      display_name
    )
    values (
      target_room.id,
      auth.uid(),
      resolved_display_name
    )
    on conflict (classroom_id, user_id) do update
    set display_name = excluded.display_name;

    insert into public.classroom_messages (
      id,
      classroom_id,
      sender_user_id,
      sender_role,
      sender_name,
      text,
      attachments,
      citations,
      created_at
    )
    values (
      target_room.id || '-join-' || auth.uid()::text || '-' || extract(epoch from now())::bigint::text,
      target_room.id,
      auth.uid(),
      'system',
      'Learn''Bot',
      resolved_display_name || ' joined this room with code ' || target_room.code || '.',
      '[]'::jsonb,
      '[]'::jsonb,
      timezone('utc', now())
    )
    on conflict (id) do nothing;
  end if;

  return query
  select
    target_room.id,
    target_room.name,
    target_room.code,
    (not already_member);
end;
$$;

drop trigger if exists profiles_assign_study_id on public.profiles;
create trigger profiles_assign_study_id
before insert or update on public.profiles
for each row
execute procedure public.assign_profile_study_id();

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute procedure public.touch_updated_at();

drop trigger if exists private_room_set_updated_at on public.user_private_room_state;
create trigger private_room_set_updated_at
before update on public.user_private_room_state
for each row
execute procedure public.touch_updated_at();

drop trigger if exists learning_state_set_updated_at on public.user_learning_state;
create trigger learning_state_set_updated_at
before update on public.user_learning_state
for each row
execute procedure public.touch_updated_at();

drop trigger if exists study_squad_state_set_updated_at on public.user_study_squad_state;
create trigger study_squad_state_set_updated_at
before update on public.user_study_squad_state
for each row
execute procedure public.touch_updated_at();

drop trigger if exists classroom_state_set_updated_at on public.user_classroom_state;
create trigger classroom_state_set_updated_at
before update on public.user_classroom_state
for each row
execute procedure public.touch_updated_at();

drop trigger if exists classrooms_set_updated_at on public.classrooms;
create trigger classrooms_set_updated_at
before update on public.classrooms
for each row
execute procedure public.touch_updated_at();

alter table public.profiles enable row level security;
alter table public.user_private_room_state enable row level security;
alter table public.user_learning_state enable row level security;
alter table public.user_study_squad_state enable row level security;
alter table public.user_classroom_state enable row level security;
alter table public.classrooms enable row level security;
alter table public.classroom_members enable row level security;
alter table public.classroom_messages enable row level security;
alter table public.study_squad_connections enable row level security;
alter table public.study_squad_requests enable row level security;

drop policy if exists "Users can read own profile" on public.profiles;
create policy "Users can read own profile"
on public.profiles
for select
to authenticated
using (auth.uid() = id);

-- Allow any authenticated user to read profiles that have a study_id.
-- This is required so that study_squad_directory (a VIEW over profiles)
-- can resolve other users' rows during Add Friend lookups.
-- Without this, the strict "own row only" policy blocks all cross-user
-- study_id queries, causing every Add Friend attempt to return "not found".
drop policy if exists "Users can read profiles for squad directory" on public.profiles;
create policy "Users can read profiles for squad directory"
on public.profiles
for select
to authenticated
using (study_id is not null);

drop policy if exists "Users can insert own profile" on public.profiles;
create policy "Users can insert own profile"
on public.profiles
for insert
to authenticated
with check (auth.uid() = id);

drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile"
on public.profiles
for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "Users can read own private room state" on public.user_private_room_state;
create policy "Users can read own private room state"
on public.user_private_room_state
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own private room state" on public.user_private_room_state;
create policy "Users can insert own private room state"
on public.user_private_room_state
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own private room state" on public.user_private_room_state;
create policy "Users can update own private room state"
on public.user_private_room_state
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read own learning state" on public.user_learning_state;
create policy "Users can read own learning state"
on public.user_learning_state
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own learning state" on public.user_learning_state;
create policy "Users can insert own learning state"
on public.user_learning_state
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own learning state" on public.user_learning_state;
create policy "Users can update own learning state"
on public.user_learning_state
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read own study squad state" on public.user_study_squad_state;
create policy "Users can read own study squad state"
on public.user_study_squad_state
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own study squad state" on public.user_study_squad_state;
create policy "Users can insert own study squad state"
on public.user_study_squad_state
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own study squad state" on public.user_study_squad_state;
create policy "Users can update own study squad state"
on public.user_study_squad_state
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read own classroom state" on public.user_classroom_state;
create policy "Users can read own classroom state"
on public.user_classroom_state
for select
to authenticated
using (auth.uid() = user_id);

drop policy if exists "Users can insert own classroom state" on public.user_classroom_state;
create policy "Users can insert own classroom state"
on public.user_classroom_state
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update own classroom state" on public.user_classroom_state;
create policy "Users can update own classroom state"
on public.user_classroom_state
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can read joined classrooms" on public.classrooms;
create policy "Users can read joined classrooms"
on public.classrooms
for select
to authenticated
using (public.is_classroom_member(id, auth.uid()));

drop policy if exists "Users can create own classrooms" on public.classrooms;
create policy "Users can create own classrooms"
on public.classrooms
for insert
to authenticated
with check (auth.uid() = owner_user_id);

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

drop policy if exists "Owners can delete classrooms" on public.classrooms;
create policy "Owners can delete classrooms"
on public.classrooms
for delete
to authenticated
using (auth.uid() = owner_user_id);

drop policy if exists "Members can read classroom memberships" on public.classroom_members;
create policy "Members can read classroom memberships"
on public.classroom_members
for select
to authenticated
using (
  public.is_classroom_member(classroom_id, auth.uid())
  or public.is_classroom_owner(classroom_id, auth.uid())
);

drop policy if exists "Users can join classrooms as themselves" on public.classroom_members;
create policy "Users can join classrooms as themselves"
on public.classroom_members
for insert
to authenticated
with check (auth.uid() = user_id);

drop policy if exists "Users can update their classroom membership" on public.classroom_members;
create policy "Users can update their classroom membership"
on public.classroom_members
for update
to authenticated
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "Users can leave classrooms or owners can remove members" on public.classroom_members;
create policy "Users can leave classrooms or owners can remove members"
on public.classroom_members
for delete
to authenticated
using (
  auth.uid() = user_id
  or public.is_classroom_owner(classroom_id, auth.uid())
);

drop policy if exists "Members can read classroom messages" on public.classroom_messages;
create policy "Members can read classroom messages"
on public.classroom_messages
for select
to authenticated
using (
  public.is_classroom_member(classroom_id, auth.uid())
  or exists (
    select 1 from public.classrooms c
    where c.id = classroom_id and c.owner_user_id = auth.uid()
  )
);

drop policy if exists "Members can create classroom messages" on public.classroom_messages;
create policy "Members can create classroom messages"
on public.classroom_messages
for insert
to authenticated
with check (
  (
    public.is_classroom_member(classroom_id, auth.uid())
    or exists (
      select 1 from public.classrooms c
      where c.id = classroom_id and c.owner_user_id = auth.uid()
    )
  )
  and (sender_user_id is null or sender_user_id = auth.uid())
);

drop policy if exists "Users can read own Study Squad connections" on public.study_squad_connections;
create policy "Users can read own Study Squad connections"
on public.study_squad_connections
for select
to authenticated
using (auth.uid() = owner_user_id);

drop policy if exists "Users can insert own Study Squad connections" on public.study_squad_connections;
create policy "Users can insert own Study Squad connections"
on public.study_squad_connections
for insert
to authenticated
with check (auth.uid() = owner_user_id);

drop policy if exists "Users can delete own Study Squad connections" on public.study_squad_connections;
create policy "Users can delete own Study Squad connections"
on public.study_squad_connections
for delete
to authenticated
using (auth.uid() = owner_user_id);

drop policy if exists "Users can read related Study Squad requests" on public.study_squad_requests;
create policy "Users can read related Study Squad requests"
on public.study_squad_requests
for select
to authenticated
using (auth.uid() = requester_user_id or auth.uid() = recipient_user_id);

drop policy if exists "Users can create own Study Squad requests" on public.study_squad_requests;
create policy "Users can create own Study Squad requests"
on public.study_squad_requests
for insert
to authenticated
with check (auth.uid() = requester_user_id);

drop policy if exists "Users can update related Study Squad requests" on public.study_squad_requests;
create policy "Users can update related Study Squad requests"
on public.study_squad_requests
for update
to authenticated
using (auth.uid() = requester_user_id or auth.uid() = recipient_user_id)
with check (auth.uid() = requester_user_id or auth.uid() = recipient_user_id);

grant select on public.study_squad_directory to authenticated;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'study_squad_requests'
  ) then
    alter publication supabase_realtime add table public.study_squad_requests;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'classrooms'
  ) then
    alter publication supabase_realtime add table public.classrooms;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'classroom_members'
  ) then
    alter publication supabase_realtime add table public.classroom_members;
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'classroom_messages'
  ) then
    alter publication supabase_realtime add table public.classroom_messages;
  end if;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (
    id,
    email,
    display_name,
    first_name,
    last_name,
    nickname,
    study_id
  )
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'display_name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data ->> 'first_name',
    new.raw_user_meta_data ->> 'last_name',
    new.raw_user_meta_data ->> 'nickname',
    public.build_study_id_for_user(new.id)
  )
  on conflict (id) do nothing;

  insert into public.user_private_room_state (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.user_learning_state (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.user_study_squad_state (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  insert into public.user_classroom_state (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();
