-- ACM Studio — Enforce coherent display_order per project + transactional move.
-- A concurrency test demonstrated that two simultaneous comparable creations
-- could produce a duplicate (project_id, display_order). This migration:
--   1. fails explicitly if any duplicate already exists (no silent reindex);
--   2. adds a DEFERRABLE UNIQUE constraint on (project_id, display_order);
--   3. adds a transactional move_comparable() RPC that swaps two display_order
--      values atomically (the deferred constraint tolerates the transient swap).

-- 1. Guard: refuse to proceed if real duplicates exist.
do $$
declare
  duplicate_groups integer;
begin
  select count(*)
  into duplicate_groups
  from (
    select project_id, display_order
    from public.comparables
    group by project_id, display_order
    having count(*) > 1
  ) d;

  if duplicate_groups > 0 then
    raise exception
      'Cannot add unique constraint: % duplicate (project_id, display_order) group(s) exist. Resolve them first.',
      duplicate_groups;
  end if;
end $$;

-- 2. Deferred unique constraint (allows in-transaction swaps).
alter table public.comparables
  add constraint comparables_project_display_order_key
  unique (project_id, display_order)
  deferrable initially deferred;

-- 3. Transactional move RPC.
create or replace function public.move_comparable(
  target_project_id uuid,
  target_comparable_id uuid,
  move_direction text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_agency_id uuid;
  v_current_order integer;
  v_neighbor_id uuid;
  v_neighbor_order integer;
begin
  -- Identity from the JWT only.
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if move_direction not in ('up', 'down') then
    raise exception 'Invalid direction' using errcode = '22023';
  end if;

  -- Agency from the caller's profile; never trusted from the client.
  select agency_id into v_agency_id from public.profiles where id = v_uid;
  if v_agency_id is null then
    return;
  end if;

  -- The project must belong to the caller's agency.
  perform 1 from public.projects
  where id = target_project_id and agency_id = v_agency_id;
  if not found then
    return;
  end if;

  -- Lock the current comparable (scoped by project + agency).
  select display_order into v_current_order
  from public.comparables
  where id = target_comparable_id
    and project_id = target_project_id
    and agency_id = v_agency_id
  for update;
  if not found then
    return;
  end if;

  -- Find and lock the neighbour in the requested direction.
  if move_direction = 'up' then
    select id, display_order into v_neighbor_id, v_neighbor_order
    from public.comparables
    where project_id = target_project_id
      and agency_id = v_agency_id
      and display_order < v_current_order
    order by display_order desc
    limit 1
    for update;
  else
    select id, display_order into v_neighbor_id, v_neighbor_order
    from public.comparables
    where project_id = target_project_id
      and agency_id = v_agency_id
      and display_order > v_current_order
    order by display_order asc
    limit 1
    for update;
  end if;

  -- Boundary: no neighbour -> nothing to do.
  if not found then
    return;
  end if;

  -- Swap the two display_order values in this single transaction.
  -- The deferred unique constraint is checked at commit, after the swap.
  update public.comparables
  set display_order = v_neighbor_order
  where id = target_comparable_id
    and project_id = target_project_id
    and agency_id = v_agency_id;

  update public.comparables
  set display_order = v_current_order
  where id = v_neighbor_id
    and project_id = target_project_id
    and agency_id = v_agency_id;
end;
$$;

revoke all on function public.move_comparable(uuid, uuid, text) from public;
revoke all on function public.move_comparable(uuid, uuid, text) from anon;
grant execute on function public.move_comparable(uuid, uuid, text) to authenticated;
