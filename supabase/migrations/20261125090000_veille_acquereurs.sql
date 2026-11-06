-- Mission 136 — La veille des acquéreurs.
--
-- Chaque nuit, le serveur cherche sur le marché (la recherche des biens idéaux, M118) pour les
-- acquéreurs « Prêts à visiter », une fois par semaine chacun, et ne garde que les biens vus sur le
-- marché depuis le passage précédent. La veille a son propre plafond mensuel, pris DANS le budget de
-- recherche de l'agence (M100) : elle ne dépense jamais plus que le plus petit des deux restes, et
-- les conseillers gardent tout le budget, comme avant.
--
--   1. `agencies.buyer_watch_cap_cents` : le plafond de la veille, 10 € par défaut (une annonce =
--      un centime, M100), réglé par le manager par une action serveur après son garde ; la colonne
--      n'entre pas dans les colonnes que le navigateur modifie (M88, M114).
--   2. `stream_estate_usage.buyer_watch` et `buyer_id` : une consommation de la veille, comptée
--      dans le budget de l'agence comme toute recherche, et à part pour le plafond de la veille.
--      L'ancienne réservation écrit `false` : le code de `main` ne change pas.
--   3. `buyer_watch_runs` : un passage de la veille pour un acquéreur — sa date (celle de la base),
--      son état, la borne « vus depuis », les annonces facturées, ce qui a été trouvé (données de
--      carte, relues par liste d'autorisation au serveur, M101). Lue par l'agence, écrite par le
--      serveur seul ; l'agence de la fiche vérifiée par la base.
--      La veille ne prend jamais plus de la MOITIÉ du plafond de l'agence, quel que soit son propre
--      plafond : un plafond de veille réglé haut, ou un plafond d'agence baissé ensuite, ne prive
--      jamais les conseillers de l'autre moitié.
--   4. `start_buyer_watch` : réserve le budget ET ouvre le passage en une seule opération, sous le
--      verrou de la réservation de l'agence (M105) : un second déclenchement du cron la même
--      semaine est refusé, deux passages simultanés ne franchissent ni le plafond de l'agence ni
--      celui de la veille. Le règlement reste `settle_stream_estate_budget`.
--
-- Compatible avec le code de `main` : deux colonnes à valeur par défaut, une colonne nulle, une
-- table et une fonction neuves qu'il ne connaît pas ; aucune ligne modifiée.

-- 1. Le plafond de la veille.
alter table public.agencies
  add column buyer_watch_cap_cents integer not null default 1000
    check (buyer_watch_cap_cents between 0 and 100000);

-- 2. La consommation de la veille.
alter table public.stream_estate_usage
  add column buyer_watch boolean not null default false,
  add column buyer_id uuid references public.buyers (id) on delete set null;

create index stream_estate_usage_buyer on public.stream_estate_usage (buyer_id);

-- 3. Les passages.
create table public.buyer_watch_runs (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  buyer_id uuid not null references public.buyers (id) on delete cascade,
  ran_at timestamptz not null default now(),
  -- `running` : réservé, en cours ; `done` : terminé ; `failed` : la recherche a échoué (le budget
  -- est rendu, l'acquéreur sera repris la nuit suivante).
  status text not null default 'running' check (status in ('running', 'done', 'failed')),
  -- Les biens gardés sont ceux vus sur le marché depuis cet instant.
  seen_since timestamptz not null,
  adverts integer not null default 0 check (adverts >= 0),
  found_count integer not null default 0 check (found_count >= 0),
  finds jsonb not null default '[]'::jsonb check (jsonb_typeof(finds) = 'array')
);

create index buyer_watch_runs_buyer on public.buyer_watch_runs (buyer_id, ran_at desc);
create index buyer_watch_runs_agency on public.buyer_watch_runs (agency_id, ran_at desc);

comment on table public.buyer_watch_runs is
  'Mission 136 — un passage de la veille pour un acquéreur prêt à visiter ; écrit par le serveur seul.';

-- L'agence de la fiche ; l'acquéreur et l'agence d'un passage ne changent plus.
create function public.check_buyer_watch_run()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (select 1 from public.buyers b where b.id = new.buyer_id and b.agency_id = new.agency_id) then
    raise exception 'buyer_watch_runs : la fiche n''est pas de cette agence' using errcode = 'check_violation';
  end if;
  if tg_op = 'UPDATE' then
    new.agency_id := old.agency_id;
    new.buyer_id := old.buyer_id;
    new.ran_at := old.ran_at;
    new.seen_since := old.seen_since;
  end if;
  return new;
end $$;

revoke all on function public.check_buyer_watch_run() from public, anon, authenticated;

create trigger buyer_watch_runs_check
  before insert or update on public.buyer_watch_runs
  for each row execute function public.check_buyer_watch_run();

alter table public.buyer_watch_runs enable row level security;
create policy buyer_watch_runs_agency_read on public.buyer_watch_runs
  for select to authenticated
  using (agency_id = public.get_current_agency_id());
revoke all on public.buyer_watch_runs from anon, authenticated;
grant select on public.buyer_watch_runs to authenticated;

-- 4. Réserver et ouvrir le passage, d'un seul geste.
--    Refusé (aucune ligne rendue) : fiche absente, archivée ou d'une autre agence ; un passage
--    `running` ou `done` de moins de 6 jours (le code juge les 7 jours en jours de Paris, la base
--    arrête le double déclenchement) ; rien de réservable.
create function public.start_buyer_watch(
  p_agency_id uuid,
  p_buyer_id uuid,
  p_wanted integer,
  p_since timestamptz,
  p_default_cap_cents integer,
  p_seen_since timestamptz
) returns table (run_id uuid, reservation_id uuid, adverts integer)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_cap integer;
  v_watch_cap integer;
  v_spent bigint;
  v_watch_spent bigint;
  v_allowed integer;
  v_reservation uuid;
  v_run uuid;
begin
  if p_wanted is null or p_wanted <= 0 or p_seen_since is null then
    return;
  end if;
  -- Le même verrou que `reserve_stream_estate_budget` : une réservation à la fois par agence.
  perform pg_advisory_xact_lock(hashtextextended('stream_estate_budget:' || p_agency_id::text, 0));

  if not exists (
    select 1 from public.buyers b
    where b.id = p_buyer_id and b.agency_id = p_agency_id and b.archived_at is null
  ) then
    return;
  end if;
  if exists (
    select 1 from public.buyer_watch_runs r
    where r.buyer_id = p_buyer_id and r.status in ('running', 'done')
      and r.ran_at > now() - interval '6 days'
  ) then
    return;
  end if;

  select coalesce(
           (select b.monthly_cap_cents from public.agency_search_budgets b
             where b.agency_id = p_agency_id),
           p_default_cap_cents)
    into v_cap;
  select a.buyer_watch_cap_cents into v_watch_cap
    from public.agencies a where a.id = p_agency_id;
  select coalesce(sum(u.adverts), 0),
         coalesce(sum(u.adverts) filter (where u.buyer_watch), 0)
    into v_spent, v_watch_spent
    from public.stream_estate_usage u
    where u.agency_id = p_agency_id and u.created_at >= p_since;

  v_allowed := least(
    p_wanted,
    greatest(0, v_cap - v_spent),
    greatest(0, least(coalesce(v_watch_cap, 0), v_cap / 2) - v_watch_spent)
  )::integer;
  if v_allowed <= 0 then
    return;
  end if;

  insert into public.stream_estate_usage (agency_id, user_id, adverts, reserved, buyer_watch, buyer_id)
  values (p_agency_id, null, v_allowed, true, true, p_buyer_id)
  returning id into v_reservation;
  insert into public.buyer_watch_runs (agency_id, buyer_id, seen_since)
  values (p_agency_id, p_buyer_id, p_seen_since)
  returning id into v_run;

  run_id := v_run;
  reservation_id := v_reservation;
  adverts := v_allowed;
  return next;
end;
$$;

revoke all on function public.start_buyer_watch(uuid, uuid, integer, timestamptz, integer, timestamptz)
  from public, anon, authenticated;
grant execute on function public.start_buyer_watch(uuid, uuid, integer, timestamptz, integer, timestamptz)
  to service_role;
