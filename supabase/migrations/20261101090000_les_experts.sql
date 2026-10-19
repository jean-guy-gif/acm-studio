-- Mission 110, partie C — les experts. Trois ajouts, aucune ligne existante modifiée :
--   1. le MODE EXPERT d'un conseiller (`profiles.expert_mode`), réglé dans « Mon profil » et écrit
--      par le serveur seul : la colonne n'entre pas dans la liste des colonnes modifiables (M88) ;
--   2. l'ORDRE des concurrents au Live (`comparables.display_order`, déjà là) se réordonne d'un coup
--      (`reorder_retained_comparables`, le glisser-déposer) et ne bouge plus une fois le Live
--      commencé, comme le rythme (M95) — la base garde l'ancien ;
--   3. les RECHERCHES NOMMÉES (`saved_searches`) : secteur, élargissement et critères, par
--      conseiller ; jamais un prix, des pièces ni une surface — la base le refuse.
--
-- Compatible avec le code de `main` : il ne lit ni n'écrit la colonne ni la table nouvelles ; tout
-- conseiller reste hors du mode expert ; les flèches de `main` ne déplacent plus un concurrent
-- d'un dossier dont le Live a commencé (sans erreur : l'ordre reste).

-- ---------------------------------------------------------------------------------------------
-- 1. Le mode expert.
-- ---------------------------------------------------------------------------------------------
alter table public.profiles
  add column expert_mode boolean not null default false;

comment on column public.profiles.expert_mode is
  'Mode expert du conseiller (mission 110) : aides masquées, ordre du Live, export. Écrit par le serveur seul.';

-- ---------------------------------------------------------------------------------------------
-- 2. L'ordre des concurrents au Live : celui des concurrents retenus (`display_order`), que le
--    conseiller change par les flèches, ou par glisser-déposer en mode expert. Une fois le Live
--    commencé (heure de début relevée ou réponse du vendeur enregistrée), il ne bouge plus : la
--    reprise compte sur lui (M89, M92). La base garde l'ancien, comme pour le rythme (M95).
-- ---------------------------------------------------------------------------------------------
create function public.keep_live_order_once_started() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.display_order is distinct from old.display_order and exists (
    select 1 from public.projects p
    where p.id = old.project_id
      and (p.live_started_at is not null
           or exists (select 1 from public.live_seller_responses r where r.project_id = p.id))
  ) then
    new.display_order := old.display_order;
  end if;
  return new;
end;
$$;

create trigger comparables_keep_live_order_once_started
  before update of display_order on public.comparables
  for each row execute function public.keep_live_order_once_started();

-- Le glisser-déposer : les concurrents RETENUS du dossier, dans l'ordre voulu, d'un seul coup. Ils
-- reprennent entre eux les mêmes rangs (les écartés ne bougent pas) ; la liste doit être
-- exactement celle des retenus. Droits de l'appelant (les règles de `comparables` s'appliquent) ;
-- refusé une fois le Live commencé.
create function public.reorder_retained_comparables(p_project_id uuid, p_ids uuid[])
returns void
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_retained uuid[];
  v_slots integer[];
begin
  if exists (
    select 1 from public.projects p
    where p.id = p_project_id
      and (p.live_started_at is not null
           or exists (select 1 from public.live_seller_responses r where r.project_id = p.id))
  ) then
    raise exception 'live_started';
  end if;

  perform 1 from public.comparables c
    where c.project_id = p_project_id and c.is_selected
    for update;
  select array_agg(c.id order by c.id), array_agg(c.display_order order by c.display_order)
    into v_retained, v_slots
    from public.comparables c
    where c.project_id = p_project_id and c.is_selected;

  if v_retained is null
     or cardinality(p_ids) <> cardinality(v_retained)
     or (select array_agg(x order by x) from unnest(p_ids) as x) <> v_retained then
    raise exception 'not_the_retained_list';
  end if;

  set constraints comparables_project_display_order_key deferred;
  update public.comparables c
    set display_order = v_slots[w.position]
    from unnest(p_ids) with ordinality as w(id, position)
    where c.id = w.id and c.project_id = p_project_id;
end;
$$;

revoke all on function public.reorder_retained_comparables(uuid, uuid[]) from public, anon;
grant execute on function public.reorder_retained_comparables(uuid, uuid[]) to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 3. Les recherches nommées.
-- ---------------------------------------------------------------------------------------------
create table public.saved_searches (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  owner_id uuid not null references public.profiles (id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 60),
  settings jsonb not null
    check (jsonb_typeof(settings) = 'object'
           and pg_column_size(settings) <= 4000
           -- Leçon de la M109 : jamais un prix, des pièces ni une surface.
           and not (settings ?| array['price', 'rooms', 'surface']))
);

create unique index saved_searches_owner_name on public.saved_searches (owner_id, lower(btrim(name)));

alter table public.saved_searches enable row level security;

-- Chacun lit ses propres recherches, dans son agence, tant qu'il n'est pas retiré ; seul le
-- serveur les écrit et les retire.
create policy saved_searches_owner_read on public.saved_searches
  for select
  to authenticated
  using (agency_id = public.get_current_agency_id() and owner_id = auth.uid());

revoke all on public.saved_searches from anon, authenticated;
grant select on public.saved_searches to authenticated;
