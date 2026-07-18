-- ACM Studio — Reorder RETAINED comparables only.
--
-- move_comparable() (Mission 13) swaps a comparable with its immediate
-- display_order neighbour regardless of is_selected. In the Mission 15 UI, which
-- lists retained and rejected comparables separately, that can swap a retained
-- comparable with a rejected one — an action that is invisible in the retained
-- list. This migration adds a dedicated transactional RPC that considers ONLY
-- retained comparables (is_selected = true) when looking for the neighbour.
--
-- move_comparable() is intentionally left untouched: it remains valid for the
-- global ordering behaviour of Mission 13.

create or replace function public.move_selected_comparable(
  p_comparable_id uuid,
  p_direction text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_agency_id uuid;
  v_project_id uuid;
  v_current_order integer;
  v_neighbor_id uuid;
  v_neighbor_order integer;
begin
  -- Identity from the JWT only.
  v_uid := auth.uid();
  if v_uid is null then
    raise exception 'Not authenticated' using errcode = '28000';
  end if;

  if p_direction not in ('up', 'down') then
    raise exception 'Invalid direction' using errcode = '22023';
  end if;

  -- Agency from the caller's profile; never trusted from the client.
  select agency_id into v_agency_id from public.profiles where id = v_uid;
  if v_agency_id is null then
    return;
  end if;

  -- Lock the target. It must exist, belong to the caller's agency, AND be
  -- retained. A rejected or foreign/absent comparable is a controlled no-op.
  select project_id, display_order
    into v_project_id, v_current_order
  from public.comparables
  where id = p_comparable_id
    and agency_id = v_agency_id
    and is_selected = true
  for update;
  if not found then
    return;
  end if;

  -- Neighbour = nearest RETAINED comparable in the same project in that
  -- direction. Rejected comparables (is_selected = false) are ignored entirely,
  -- so they never intercalate between two retained ones.
  if p_direction = 'up' then
    select id, display_order into v_neighbor_id, v_neighbor_order
    from public.comparables
    where project_id = v_project_id
      and agency_id = v_agency_id
      and is_selected = true
      and display_order < v_current_order
    order by display_order desc
    limit 1
    for update;
  else
    select id, display_order into v_neighbor_id, v_neighbor_order
    from public.comparables
    where project_id = v_project_id
      and agency_id = v_agency_id
      and is_selected = true
      and display_order > v_current_order
    order by display_order asc
    limit 1
    for update;
  end if;

  -- Boundary: no retained neighbour -> nothing to do.
  if not found then
    return;
  end if;

  -- Swap the two display_order values in this single transaction. The DEFERRABLE
  -- INITIALLY DEFERRED unique constraint (project_id, display_order) tolerates
  -- the transient collision and is checked at commit. The two FOR UPDATE locks
  -- serialise concurrent moves on the same rows, so no duplicate can persist.
  update public.comparables
  set display_order = v_neighbor_order
  where id = p_comparable_id
    and agency_id = v_agency_id;

  update public.comparables
  set display_order = v_current_order
  where id = v_neighbor_id
    and agency_id = v_agency_id;
end;
$$;

revoke all on function public.move_selected_comparable(uuid, text) from public;
revoke all on function public.move_selected_comparable(uuid, text) from anon;
grant execute on function public.move_selected_comparable(uuid, text) to authenticated;
