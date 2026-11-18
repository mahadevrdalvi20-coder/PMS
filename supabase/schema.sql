-- =============================================================================
-- Stride PMS — database schema
-- Run this whole file once in the Supabase SQL Editor (Dashboard → SQL Editor).
--
-- Authentication model
--   Users sign in with Clerk. Supabase is configured to trust Clerk session
--   tokens (Dashboard → Authentication → Sign In / Providers → Third-Party Auth
--   → Clerk). Inside Postgres the signed-in Clerk user id is therefore
--   available as  auth.jwt() ->> 'sub'  and every Row Level Security policy
--   below is written in terms of that.
--
-- Design notes
--   * ONE employees table. A manager is just an employee whom other rows point
--     to through manager_id. "Manager" capabilities are derived from the
--     hierarchy, not from a separate table.
--   * Goals are the PLAN, goal_ratings are the OUTCOME. They are separate
--     tables so a goal can exist (and be approved) before anyone rates it.
--   * reviews has exactly one row per employee per cycle; its status column is
--     the workflow (not_started → self_submitted → manager_reviewed → completed).
--   * Status transitions and "who may edit which column" are enforced by
--     triggers, so a hand-crafted API request cannot skip a step.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------
do $$ begin
  create type public.app_role      as enum ('employee', 'manager', 'hr_admin');
  create type public.cycle_status  as enum ('draft', 'open', 'closed');
  create type public.goal_status   as enum ('draft', 'submitted', 'approved', 'sent_back');
  create type public.review_status as enum ('not_started', 'self_submitted', 'manager_reviewed', 'completed');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

-- Every person in the company. manager_id is a self-reference: when someone
-- changes manager we update one uuid and every screen follows.
create table if not exists public.employees (
  id               uuid primary key default gen_random_uuid(),
  clerk_user_id    text unique,                       -- filled on first sign-in
  full_name        text not null check (length(trim(full_name)) > 0),
  email            text not null,
  designation      text,
  department       text,
  date_of_joining  date,
  manager_id       uuid references public.employees(id) on delete set null,
  role             public.app_role not null default 'employee',
  is_active        boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint employees_not_own_manager check (manager_id is null or manager_id <> id)
);
create unique index if not exists employees_email_lower_key on public.employees (lower(email));
create index if not exists employees_manager_idx on public.employees (manager_id);

-- A time-bound appraisal period, e.g. "FY 2026–27 Annual".
create table if not exists public.review_cycles (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  start_date  date not null,
  end_date    date not null,
  status      public.cycle_status not null default 'draft',
  created_by  uuid references public.employees(id) on delete set null,
  created_at  timestamptz not null default now(),
  constraint review_cycles_dates check (end_date > start_date)
);
-- Only one cycle may be open at a time.
create unique index if not exists review_cycles_one_open on public.review_cycles ((true)) where status = 'open';

-- What an employee commits to achieve in a cycle. Linked to the cycle so next
-- year's goals never mix with this year's.
create table if not exists public.goals (
  id               uuid primary key default gen_random_uuid(),
  employee_id      uuid not null references public.employees(id) on delete cascade,
  cycle_id         uuid not null references public.review_cycles(id) on delete cascade,
  title            text not null check (length(trim(title)) > 0),
  description      text,
  weightage        numeric(5,2) not null check (weightage > 0 and weightage <= 100),
  target_date      date,
  status           public.goal_status not null default 'draft',
  manager_comment  text,
  submitted_at     timestamptz,
  approved_at      timestamptz,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists goals_employee_cycle_idx on public.goals (employee_id, cycle_id);

-- One appraisal per employee per cycle. This row IS the workflow.
create table if not exists public.reviews (
  id                      uuid primary key default gen_random_uuid(),
  employee_id             uuid not null references public.employees(id) on delete cascade,
  manager_id              uuid references public.employees(id) on delete set null, -- reviewer snapshot
  cycle_id                uuid not null references public.review_cycles(id) on delete cascade,
  status                  public.review_status not null default 'not_started',
  overall_self_rating     smallint check (overall_self_rating between 1 and 5),
  self_summary            text,
  overall_manager_rating  smallint check (overall_manager_rating between 1 and 5),
  manager_summary         text,
  submitted_at            timestamptz,   -- self-appraisal submitted
  reviewed_at             timestamptz,   -- manager review submitted
  completed_at            timestamptz,
  created_at              timestamptz not null default now(),
  updated_at              timestamptz not null default now(),
  constraint reviews_one_per_cycle unique (employee_id, cycle_id)
);
create index if not exists reviews_cycle_idx on public.reviews (cycle_id);
create index if not exists reviews_manager_idx on public.reviews (manager_id);

-- The line items behind a review: one row per goal.
create table if not exists public.goal_ratings (
  id               uuid primary key default gen_random_uuid(),
  review_id        uuid not null references public.reviews(id) on delete cascade,
  goal_id          uuid not null references public.goals(id) on delete cascade,
  self_comment     text,
  self_rating      smallint check (self_rating between 1 and 5),
  manager_comment  text,
  manager_rating   smallint check (manager_rating between 1 and 5),
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  constraint goal_ratings_one_per_goal unique (review_id, goal_id)
);

-- Who changed what, when. Written only by triggers.
create table if not exists public.audit_log (
  id           bigint generated always as identity primary key,
  actor_id     uuid references public.employees(id) on delete set null,
  entity       text not null,              -- 'goal' | 'review' | 'cycle'
  entity_id    uuid not null,
  employee_id  uuid references public.employees(id) on delete cascade, -- whose record
  action       text not null,              -- e.g. 'status:submitted→approved'
  note         text,
  created_at   timestamptz not null default now()
);
create index if not exists audit_log_created_idx on public.audit_log (created_at desc);

-- ---------------------------------------------------------------------------
-- Identity helpers (SECURITY DEFINER so they can read employees without
-- recursing into the employees RLS policy).
-- ---------------------------------------------------------------------------
create or replace function public.current_employee_id()
returns uuid language sql stable security definer set search_path = public as $$
  select id from public.employees
  where clerk_user_id = (auth.jwt() ->> 'sub') and is_active
  limit 1
$$;

create or replace function public.is_hr()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.employees
    where clerk_user_id = (auth.jwt() ->> 'sub') and is_active and role = 'hr_admin'
  )
$$;

-- True when the signed-in user is the CURRENT line manager of emp.
create or replace function public.is_manager_of(emp uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.employees e
    where e.id = emp and e.manager_id is not null
      and e.manager_id = public.current_employee_id()
  )
$$;

-- "Service" = the SQL editor or the server-side service-role key (no end user).
create or replace function public.is_service()
returns boolean language sql stable as $$
  select coalesce(auth.jwt() ->> 'role', '') = 'service_role'
      or (auth.jwt() is null and session_user <> 'authenticator')
$$;

-- ---------------------------------------------------------------------------
-- Generic updated_at trigger
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at := now(); return new; end $$;

drop trigger if exists employees_touch on public.employees;
create trigger employees_touch before update on public.employees
  for each row execute function public.touch_updated_at();
drop trigger if exists goals_touch on public.goals;
create trigger goals_touch before update on public.goals
  for each row execute function public.touch_updated_at();
drop trigger if exists reviews_touch on public.reviews;
create trigger reviews_touch before update on public.reviews
  for each row execute function public.touch_updated_at();
drop trigger if exists goal_ratings_touch on public.goal_ratings;
create trigger goal_ratings_touch before update on public.goal_ratings
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- Employees: block reporting loops (A → B → A)
-- ---------------------------------------------------------------------------
create or replace function public.employees_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare loop_found boolean;
begin
  new.email := lower(trim(new.email));
  if new.manager_id is not null then
    with recursive chain as (
      select id, manager_id, 1 as depth from public.employees where id = new.manager_id
      union all
      select e.id, e.manager_id, c.depth + 1 from public.employees e
      join chain c on e.id = c.manager_id where c.depth < 50
    )
    select exists (select 1 from chain where id = new.id) into loop_found;
    if loop_found then
      raise exception 'Invalid manager: this would create a reporting loop';
    end if;
  end if;
  return new;
end $$;

drop trigger if exists employees_guard on public.employees;
create trigger employees_guard before insert or update on public.employees
  for each row execute function public.employees_guard();

-- ---------------------------------------------------------------------------
-- Goals: who may change what, and when
-- ---------------------------------------------------------------------------
create or replace function public.goals_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  me uuid := public.current_employee_id();
  cycle_open boolean;
begin
  if tg_op = 'UPDATE' and (new.employee_id <> old.employee_id or new.cycle_id <> old.cycle_id) then
    raise exception 'A goal cannot be moved to another employee or cycle';
  end if;
  if tg_op = 'UPDATE' and new.status = 'submitted' and old.status <> 'submitted' then new.submitted_at := now(); end if;
  if tg_op = 'UPDATE' and new.status = 'approved'  and old.status <> 'approved'  then new.approved_at  := now(); end if;

  if public.is_service() then return new; end if;

  select status = 'open' into cycle_open from public.review_cycles where id = new.cycle_id;

  if tg_op = 'INSERT' then
    if new.employee_id = me then
      if not coalesce(cycle_open, false) then raise exception 'Goals can only be changed while the review cycle is open'; end if;
      new.status := 'draft';
      new.manager_comment := null;
      return new;
    end if;
    if public.is_hr() then return new; end if;
    raise exception 'You can only create your own goals';
  end if;

  -- UPDATE ------------------------------------------------------------------
  if old.employee_id = me then
    -- Owner: may edit only while draft / sent back, and may only move it to submitted.
    if not coalesce(cycle_open, false) then raise exception 'Goals can only be changed while the review cycle is open'; end if;
    if old.status not in ('draft', 'sent_back') then
      raise exception 'This goal is locked (status: %)', old.status;
    end if;
    if new.status not in ('draft', 'sent_back', 'submitted') then
      raise exception 'You cannot approve your own goal';
    end if;
    if new.manager_comment is distinct from old.manager_comment then
      raise exception 'Only the manager can write the manager comment';
    end if;
    return new;
  end if;

  if public.is_manager_of(old.employee_id) then
    if not coalesce(cycle_open, false) then raise exception 'Goals can only be changed while the review cycle is open'; end if;
    if (new.title, new.description, new.weightage, new.target_date)
       is distinct from (old.title, old.description, old.weightage, old.target_date) then
      raise exception 'Managers cannot edit the content of an employee goal';
    end if;
    if not (old.status in ('submitted', 'approved') and new.status in ('approved', 'sent_back')) then
      raise exception 'Invalid goal status change % → %', old.status, new.status;
    end if;
    if new.status = 'sent_back' and coalesce(trim(new.manager_comment), '') = '' then
      raise exception 'A comment is required when sending a goal back';
    end if;
    return new;
  end if;

  if public.is_hr() then return new; end if;  -- HR can act as approver of last resort
  raise exception 'Not allowed';
end $$;

drop trigger if exists goals_guard on public.goals;
create trigger goals_guard before insert or update on public.goals
  for each row execute function public.goals_guard();

-- Owners may only delete drafts / sent-back goals in an open cycle.
create or replace function public.goals_delete_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if public.is_service() or public.is_hr() then return old; end if;
  if old.status not in ('draft', 'sent_back') then
    raise exception 'Only draft or sent-back goals can be deleted';
  end if;
  if not exists (select 1 from public.review_cycles where id = old.cycle_id and status = 'open') then
    raise exception 'Goals can only be changed while the review cycle is open';
  end if;
  return old;
end $$;

drop trigger if exists goals_delete_guard on public.goals;
create trigger goals_delete_guard before delete on public.goals
  for each row execute function public.goals_delete_guard();

-- ---------------------------------------------------------------------------
-- Reviews: the workflow state machine
-- ---------------------------------------------------------------------------
create or replace function public.reviews_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  me uuid := public.current_employee_id();
  cycle_open boolean;
  approved_total numeric;
  unapproved int;
  missing int;
begin
  select status = 'open' into cycle_open from public.review_cycles where id = new.cycle_id;

  if tg_op = 'INSERT' then
    if not public.is_service() and new.employee_id <> me and not public.is_hr() then
      raise exception 'You can only start your own review';
    end if;
    if not coalesce(cycle_open, false) then
      raise exception 'Reviews can only be started in an open cycle';
    end if;
    new.status := 'not_started';
    new.manager_id := (select manager_id from public.employees where id = new.employee_id);
    return new;
  end if;

  -- UPDATE ----------------------------------------------------------------
  if new.employee_id <> old.employee_id or new.cycle_id <> old.cycle_id then
    raise exception 'A review cannot be moved';
  end if;

  if public.is_service() then
    null;
  elsif old.employee_id = me then
    -- The employee: may only fill in and submit their own self-appraisal.
    if not coalesce(cycle_open, false) then raise exception 'This review cycle is not open'; end if;
    if old.status <> 'not_started' then raise exception 'Your self-appraisal has already been submitted'; end if;
    if new.status not in ('not_started', 'self_submitted') then raise exception 'Invalid status change'; end if;
    if (new.overall_manager_rating, new.manager_summary, new.manager_id)
       is distinct from (old.overall_manager_rating, old.manager_summary, old.manager_id) then
      raise exception 'You cannot edit manager fields';
    end if;
  elsif public.is_manager_of(old.employee_id) or public.is_hr() then
    -- The reviewer (line manager, or HR when there is no manager).
    if not coalesce(cycle_open, false) and not public.is_hr() then raise exception 'This review cycle is not open'; end if;
    if (new.overall_self_rating, new.self_summary) is distinct from (old.overall_self_rating, old.self_summary) then
      raise exception 'You cannot edit the self-appraisal';
    end if;
    if not (
      (old.status = new.status) or
      (old.status = 'self_submitted'   and new.status = 'manager_reviewed') or
      (old.status = 'manager_reviewed' and new.status = 'completed') or
      (old.status = 'manager_reviewed' and new.status = 'self_submitted')   -- reviewer re-opens own draft
    ) then
      raise exception 'Invalid status change % → %', old.status, new.status;
    end if;
    if old.status in ('not_started', 'completed') and
       (new.overall_manager_rating, new.manager_summary) is distinct from (old.overall_manager_rating, old.manager_summary) then
      raise exception 'The review is not open for manager input (status: %)', old.status;
    end if;
  else
    raise exception 'Not allowed';
  end if;

  -- Completeness checks apply to everyone.
  if new.status = 'self_submitted' and old.status = 'not_started' then
    select coalesce(sum(weightage) filter (where status = 'approved'), 0),
           count(*) filter (where status <> 'approved')
      into approved_total, unapproved
      from public.goals where employee_id = new.employee_id and cycle_id = new.cycle_id;
    if unapproved > 0 or approved_total <> 100 then
      raise exception 'All goals must be approved and total 100%% before the self-appraisal';
    end if;
    select count(*) into missing from public.goals g
      left join public.goal_ratings gr on gr.goal_id = g.id and gr.review_id = new.id
      where g.employee_id = new.employee_id and g.cycle_id = new.cycle_id
        and (gr.self_rating is null or coalesce(trim(gr.self_comment), '') = '');
    if missing > 0 or new.overall_self_rating is null then
      raise exception 'Rate and comment on every goal, and give an overall self-rating';
    end if;
    new.submitted_at := now();
  end if;

  if new.status = 'manager_reviewed' and old.status <> 'manager_reviewed' then
    select count(*) into missing from public.goal_ratings
      where review_id = new.id and (manager_rating is null or coalesce(trim(manager_comment), '') = '');
    if missing > 0 or new.overall_manager_rating is null or coalesce(trim(new.manager_summary), '') = '' then
      raise exception 'Rate and comment on every goal, and give an overall rating with a summary';
    end if;
    new.reviewed_at := now();
    if new.manager_id is null then new.manager_id := me; end if;
  end if;

  if new.status = 'completed' and old.status <> 'completed' then
    if old.status <> 'manager_reviewed' then
      raise exception 'Only a manager-reviewed appraisal can be completed';
    end if;
    new.completed_at := now();
  end if;

  return new;
end $$;

drop trigger if exists reviews_guard on public.reviews;
create trigger reviews_guard before insert or update on public.reviews
  for each row execute function public.reviews_guard();

-- ---------------------------------------------------------------------------
-- Goal ratings: employee writes self_*, manager writes manager_*
-- ---------------------------------------------------------------------------
create or replace function public.goal_ratings_guard()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  me uuid := public.current_employee_id();
  r public.reviews%rowtype;
  cycle_open boolean;
begin
  select * into r from public.reviews where id = new.review_id;
  if not exists (select 1 from public.goals where id = new.goal_id and employee_id = r.employee_id and cycle_id = r.cycle_id) then
    raise exception 'Goal does not belong to this review';
  end if;
  if public.is_service() then return new; end if;
  select status = 'open' into cycle_open from public.review_cycles where id = r.cycle_id;

  if r.employee_id = me then
    if not coalesce(cycle_open, false) then raise exception 'This review cycle is not open'; end if;
    if r.status <> 'not_started' then raise exception 'Your self-appraisal is locked'; end if;
    if tg_op = 'INSERT' then
      new.manager_comment := null; new.manager_rating := null;
    elsif (new.manager_comment, new.manager_rating) is distinct from (old.manager_comment, old.manager_rating) then
      raise exception 'You cannot edit manager ratings';
    end if;
    return new;
  end if;

  if public.is_manager_of(r.employee_id) or public.is_hr() then
    if not coalesce(cycle_open, false) and not public.is_hr() then raise exception 'This review cycle is not open'; end if;
    if r.status not in ('self_submitted', 'manager_reviewed') then
      raise exception 'The review is not open for manager input (status: %)', r.status;
    end if;
    if tg_op = 'INSERT' then raise exception 'Self-appraisal row missing'; end if;
    if (new.self_comment, new.self_rating) is distinct from (old.self_comment, old.self_rating) then
      raise exception 'You cannot edit the self-appraisal';
    end if;
    return new;
  end if;

  raise exception 'Not allowed';
end $$;

drop trigger if exists goal_ratings_guard on public.goal_ratings;
create trigger goal_ratings_guard before insert or update on public.goal_ratings
  for each row execute function public.goal_ratings_guard();

-- ---------------------------------------------------------------------------
-- Audit trail (status changes only)
-- ---------------------------------------------------------------------------
create or replace function public.audit_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  n jsonb := to_jsonb(new);           -- generic access: works for any of the three tables
  old_status text := case when tg_op = 'UPDATE' then to_jsonb(old) ->> 'status' end;
begin
  if tg_op = 'UPDATE' and (n ->> 'status') is not distinct from old_status then return new; end if;
  insert into public.audit_log (actor_id, entity, entity_id, employee_id, action, note)
  values (
    public.current_employee_id(),
    case tg_table_name when 'goals' then 'goal' when 'reviews' then 'review' else 'cycle' end,
    (n ->> 'id')::uuid,
    (n ->> 'employee_id')::uuid,
    case when tg_op = 'INSERT' then 'created:' || (n ->> 'status')
         else 'status:' || old_status || '→' || (n ->> 'status') end,
    coalesce(n ->> 'title', n ->> 'name')
  );
  return new;
end $$;

drop trigger if exists goals_audit on public.goals;
create trigger goals_audit after insert or update of status on public.goals
  for each row execute function public.audit_status_change();
drop trigger if exists reviews_audit on public.reviews;
create trigger reviews_audit after update of status on public.reviews
  for each row execute function public.audit_status_change();
drop trigger if exists cycles_audit on public.review_cycles;
create trigger cycles_audit after insert or update of status on public.review_cycles
  for each row execute function public.audit_status_change();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.employees     enable row level security;
alter table public.review_cycles enable row level security;
alter table public.goals         enable row level security;
alter table public.reviews       enable row level security;
alter table public.goal_ratings  enable row level security;
alter table public.audit_log     enable row level security;

-- Employees: the directory (names, titles, reporting lines) is visible to any
-- active, signed-in employee. Only HR can change it.
drop policy if exists employees_select on public.employees;
create policy employees_select on public.employees for select to authenticated
  using (public.current_employee_id() is not null);
drop policy if exists employees_hr_write on public.employees;
create policy employees_hr_write on public.employees for all to authenticated
  using (public.is_hr()) with check (public.is_hr());

-- Cycles: everyone can see them, HR manages them.
drop policy if exists cycles_select on public.review_cycles;
create policy cycles_select on public.review_cycles for select to authenticated
  using (public.current_employee_id() is not null);
drop policy if exists cycles_hr_write on public.review_cycles;
create policy cycles_hr_write on public.review_cycles for all to authenticated
  using (public.is_hr()) with check (public.is_hr());

-- Goals: me, my current manager, HR.
drop policy if exists goals_select on public.goals;
create policy goals_select on public.goals for select to authenticated
  using (employee_id = public.current_employee_id() or public.is_manager_of(employee_id) or public.is_hr());
drop policy if exists goals_insert on public.goals;
create policy goals_insert on public.goals for insert to authenticated
  with check (employee_id = public.current_employee_id() or public.is_hr());
drop policy if exists goals_update on public.goals;
create policy goals_update on public.goals for update to authenticated
  using (employee_id = public.current_employee_id() or public.is_manager_of(employee_id) or public.is_hr())
  with check (employee_id = public.current_employee_id() or public.is_manager_of(employee_id) or public.is_hr());
drop policy if exists goals_delete on public.goals;
create policy goals_delete on public.goals for delete to authenticated
  using (employee_id = public.current_employee_id() or public.is_hr());

-- Reviews: me, my current manager (or the reviewer recorded on the row), HR.
drop policy if exists reviews_select on public.reviews;
create policy reviews_select on public.reviews for select to authenticated
  using (employee_id = public.current_employee_id()
         or manager_id = public.current_employee_id()
         or public.is_manager_of(employee_id)
         or public.is_hr());
drop policy if exists reviews_insert on public.reviews;
create policy reviews_insert on public.reviews for insert to authenticated
  with check (employee_id = public.current_employee_id() or public.is_hr());
drop policy if exists reviews_update on public.reviews;
create policy reviews_update on public.reviews for update to authenticated
  using (employee_id = public.current_employee_id() or public.is_manager_of(employee_id) or public.is_hr())
  with check (employee_id = public.current_employee_id() or public.is_manager_of(employee_id) or public.is_hr());
drop policy if exists reviews_hr_delete on public.reviews;
create policy reviews_hr_delete on public.reviews for delete to authenticated
  using (public.is_hr());

-- Goal ratings inherit visibility from their review (RLS on reviews applies
-- inside the sub-query).
drop policy if exists goal_ratings_select on public.goal_ratings;
create policy goal_ratings_select on public.goal_ratings for select to authenticated
  using (exists (select 1 from public.reviews r where r.id = review_id));
drop policy if exists goal_ratings_insert on public.goal_ratings;
create policy goal_ratings_insert on public.goal_ratings for insert to authenticated
  with check (exists (select 1 from public.reviews r where r.id = review_id
                      and (r.employee_id = public.current_employee_id() or public.is_hr())));
drop policy if exists goal_ratings_update on public.goal_ratings;
create policy goal_ratings_update on public.goal_ratings for update to authenticated
  using (exists (select 1 from public.reviews r where r.id = review_id
                 and (r.employee_id = public.current_employee_id() or public.is_manager_of(r.employee_id) or public.is_hr())));

-- Audit log: HR reads everything; employees read entries about themselves.
drop policy if exists audit_select on public.audit_log;
create policy audit_select on public.audit_log for select to authenticated
  using (public.is_hr() or employee_id = public.current_employee_id());

-- Nothing is readable by anonymous (signed-out) requests: no policies exist
-- for the anon role, so RLS denies everything.
