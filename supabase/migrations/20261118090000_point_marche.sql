-- Mission 127 — Le point marché (décision de Jean-Guy du 29/10).
--
-- A. Le prix du rendez-vous ne s'efface plus. À la PREMIÈRE conclusion d'un rendez-vous
--    (`conclude_meeting`), chaque concurrent retenu reçoit son prix et ses jours de
--    commercialisation au rendez-vous, figés : `meeting_price`, `meeting_days_on_market`,
--    `meeting_frozen_at`, `meeting_price_source`. La relecture des annonces (M105) continue d'écrire
--    `price` et les observations datées ; elle ne touche jamais ces colonnes. Un changement d'issue
--    ne refige rien ; un concurrent retenu APRÈS la conclusion n'a pas de prix du rendez-vous (il
--    n'était pas là).
-- B. Chaque mise à jour laisse un point daté (`project_market_updates`) : les lignes par
--    concurrent, les trois lignes de prix et ce qui a été trouvé, dans `summary` (relu par le
--    serveur à la lecture) ; et chaque point peut partir par un lien (`project_market_update_links`),
--    sur le modèle de la synthèse (M110) : le jeton n'est jamais gardé, seulement son condensat.
-- C. Reprise des dossiers déjà conclus, dans cette transaction : le prix du rendez-vous est, dans
--    l'ordre, le prix révélé au Live (figé par la base à la devinette, M96), sinon la dernière
--    observation datée au plus tard à la conclusion (`listing_observations`, même portail et même
--    identifiant publié, M47), sinon le prix actuel — la ligne porte alors `'current'` pour que le
--    document dise « prix au rendez-vous non relu » au lieu d'une baisse de 0 %.
--
-- Compatible avec le code de `main` : quatre colonnes nulles, deux tables que `main` ne connaît
-- pas, la fonction `conclude_meeting` garde sa signature ; `main` ne lit ni n'écrit rien de nouveau.
-- Comptage sur la vraie base avant (29/10, lecture seule) : 13 conclusions, 68 concurrents retenus
-- de dossiers conclus (58 avec une annonce, 35 avec un prix révélé), 111 observations, 0 point.
-- Prédiction : 68 concurrents reçoivent un prix du rendez-vous (35 « revealed », le reste
-- « observation » ou « current » selon les observations), 0 point, 0 lien ; aucune autre ligne.

-- ---------------------------------------------------------------------------------------------
-- 1. Le prix du rendez-vous sur chaque concurrent.
-- ---------------------------------------------------------------------------------------------
alter table public.comparables
  add column meeting_price numeric check (meeting_price is null or meeting_price >= 0),
  add column meeting_days_on_market integer check (meeting_days_on_market is null or meeting_days_on_market >= 0),
  add column meeting_frozen_at timestamptz,
  add column meeting_price_source text
    check (meeting_price_source is null
           or meeting_price_source in ('conclusion', 'revealed', 'observation', 'current'));

comment on column public.comparables.meeting_price is
  'Mission 127 — le prix affiché du concurrent au jour du rendez-vous, figé à la première conclusion ; jamais réécrit par la relecture.';
comment on column public.comparables.meeting_price_source is
  'conclusion : figé à la conclusion ; revealed : prix révélé au Live (reprise) ; observation : dernière observation avant la conclusion (reprise) ; current : prix actuel faute de mieux (reprise) — le document dit alors « non relu ».';

-- ---------------------------------------------------------------------------------------------
-- 2. Les points datés, et leurs liens.
-- ---------------------------------------------------------------------------------------------
create table public.project_market_updates (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  made_by uuid references public.profiles (id) on delete set null,
  made_at timestamptz not null default now(),
  -- Les lignes par concurrent, les trois lignes de prix, les nouveaux venus : un objet, relu par
  -- le serveur à la lecture (liste d'autorisation, M101).
  summary jsonb not null default '{}'::jsonb check (jsonb_typeof(summary) = 'object')
);

create index project_market_updates_project on public.project_market_updates (project_id, made_at desc);

alter table public.project_market_updates enable row level security;

-- Le manager et le conseiller de l'agence lisent ses points ; le serveur seul écrit, après le
-- garde (dossier conclu de l'agence).
create policy project_market_updates_agency_read on public.project_market_updates
  for select
  to authenticated
  using (agency_id = public.get_current_agency_id());

revoke all on public.project_market_updates from anon, authenticated;
grant select on public.project_market_updates to authenticated;

-- Le dossier d'un point appartient à son agence : la base le vérifie, quel que soit le chemin.
create function public.check_market_update_agency() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.projects p where p.id = new.project_id and p.agency_id = new.agency_id
  ) then
    raise exception 'project_market_updates: le dossier n''est pas à cette agence';
  end if;
  return new;
end;
$$;

create trigger project_market_updates_agency
  before insert or update on public.project_market_updates
  for each row execute function public.check_market_update_agency();

create table public.project_market_update_links (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  update_id uuid not null references public.project_market_updates (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null default (now() + interval '30 days')
);

create index project_market_update_links_update on public.project_market_update_links (update_id);

alter table public.project_market_update_links enable row level security;

create policy project_market_update_links_agency_read on public.project_market_update_links
  for select
  to authenticated
  using (agency_id = public.get_current_agency_id());

revoke all on public.project_market_update_links from anon, authenticated;
grant select on public.project_market_update_links to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 3. `conclude_meeting` : même signature (M111), plus le gel du prix du rendez-vous à la PREMIÈRE
--    conclusion seulement.
-- ---------------------------------------------------------------------------------------------
create or replace function public.conclude_meeting(
  p_project_id uuid,
  p_agency_id uuid,
  p_outcome text,
  p_reason text,
  p_price numeric,
  p_market_computed numeric,
  p_advisor_analysis numeric,
  p_advisor_price numeric,
  p_seller_wanted numeric default null,
  p_seller_perceived numeric default null,
  p_retained integer default null,
  p_exploitable integer default null,
  p_mandate_type text default null,
  p_follow_up_motive text default null,
  p_follow_up_motive_detail text default null,
  p_next_follow_up_on date default null,
  p_objections text[] default null,
  p_objection_note text default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
  v_readiness_first smallint;
  v_readiness_last smallint;
  v_readiness_missing text;
  v_reason text;
  v_mandate_type text;
  v_motive text;
  v_motive_detail text;
  v_next date;
  v_note text;
  v_first_conclusion boolean;
begin
  if p_outcome not in ('signed', 'follow_up', 'sold_elsewhere', 'withdrawn') then
    raise exception 'conclude_meeting: issue invalide %', p_outcome;
  end if;
  if p_mandate_type is not null and p_mandate_type not in ('exclusive', 'simple') then
    raise exception 'conclude_meeting: type de mandat invalide %', p_mandate_type;
  end if;
  if p_follow_up_motive is not null and p_follow_up_motive not in (
       'price_accepted', 'thinking_price', 'consulting_relative', 'awaiting_estimate',
       'undated_project', 'other') then
    raise exception 'conclude_meeting: motif de relance invalide %', p_follow_up_motive;
  end if;
  v_reason := case when p_outcome = 'signed' then null else nullif(btrim(p_reason), '') end;
  v_mandate_type := case when p_outcome = 'signed' then p_mandate_type else null end;
  v_motive := case when p_outcome = 'follow_up' then p_follow_up_motive end;
  v_motive_detail := case when v_motive = 'other'
    then nullif(left(btrim(p_follow_up_motive_detail), 200), '') end;
  v_next := case when p_outcome = 'follow_up' then p_next_follow_up_on end;
  v_note := nullif(left(btrim(p_objection_note), 200), '');

  -- Mission 127 — la première conclusion de ce rendez-vous ? (une ligne créée par la seule saisie
  -- du prix au Live n'a pas de date de conclusion : elle compte comme première conclusion)
  v_first_conclusion := not exists (
    select 1 from public.project_meeting_conclusions m
    where m.project_id = p_project_id and m.concluded_at is not null
  );

  select s.seller_launch_readiness_first, s.seller_launch_readiness_last,
         s.seller_launch_readiness_missing
    into v_readiness_first, v_readiness_last, v_readiness_missing
    from public.live_seller_summary s
    where s.project_id = p_project_id and s.agency_id = p_agency_id;

  insert into public.project_meeting_conclusions as c
    (project_id, agency_id, commercialization_price, frozen_market_computed,
     frozen_advisor_analysis, frozen_advisor_price, frozen_seller_wanted_price,
     frozen_seller_perceived_price, frozen_retained_competitors, frozen_exploitable_competitors,
     frozen_meeting_duration_seconds,
     frozen_launch_readiness_first, frozen_launch_readiness_last, frozen_launch_readiness_missing,
     outcome, follow_up_reason, follow_up_motive, follow_up_motive_detail, next_follow_up_on,
     objections, objection_note, first_outcome, went_through_follow_up,
     mandate_type, signed_at, concluded_at, outcome_changed_at)
  values
    (p_project_id, p_agency_id, p_price, p_market_computed, p_advisor_analysis, p_advisor_price,
     p_seller_wanted, p_seller_perceived, p_retained, p_exploitable,
     public.meeting_duration_seconds(p_project_id),
     v_readiness_first, v_readiness_last, v_readiness_missing,
     p_outcome, v_reason, v_motive, v_motive_detail, v_next,
     coalesce(p_objections, '{}'), v_note, p_outcome, p_outcome = 'follow_up',
     v_mandate_type,
     case when p_outcome = 'signed' then now() end, now(), now())
  on conflict (project_id) do update set
    signed_at = coalesce(
      c.signed_at,
      case when excluded.outcome = 'signed' and c.outcome is distinct from 'signed' then now() end),
    outcome = excluded.outcome,
    follow_up_reason = excluded.follow_up_reason,
    follow_up_motive = case
      when excluded.outcome = 'follow_up' then coalesce(excluded.follow_up_motive, c.follow_up_motive)
      else null
    end,
    follow_up_motive_detail = case
      when excluded.outcome <> 'follow_up' then null
      when excluded.follow_up_motive is not null then excluded.follow_up_motive_detail
      else c.follow_up_motive_detail
    end,
    next_follow_up_on = case
      when excluded.outcome = 'follow_up' then coalesce(excluded.next_follow_up_on, c.next_follow_up_on)
      else null
    end,
    -- Mission 110 — des objections fournies remplacent les anciennes ; sans objections fournies
    -- (code d'avant), celles qui sont posées restent.
    objections = case when p_objections is null then c.objections else excluded.objections end,
    objection_note = case when p_objections is null then c.objection_note else excluded.objection_note end,
    -- Mission 110 — le parcours : la première issue ne se réécrit jamais ; le passage par « à
    -- relancer » ne s'efface jamais.
    -- Mission 111 — une ligne créée par la seule saisie du prix au Live n'a pas encore d'issue :
    -- la première issue enregistrée est alors celle de cette conclusion.
    first_outcome = coalesce(c.first_outcome, case when c.outcome is null then excluded.outcome end),
    went_through_follow_up = c.went_through_follow_up or excluded.outcome = 'follow_up',
    mandate_type = case
      when excluded.outcome = 'signed' then coalesce(excluded.mandate_type, c.mandate_type)
      else null
    end,
    commercialization_price = coalesce(excluded.commercialization_price, c.commercialization_price),
    frozen_market_computed  = coalesce(c.frozen_market_computed, excluded.frozen_market_computed),
    frozen_advisor_analysis = coalesce(c.frozen_advisor_analysis, excluded.frozen_advisor_analysis),
    frozen_advisor_price    = coalesce(c.frozen_advisor_price, excluded.frozen_advisor_price),
    frozen_seller_wanted_price = coalesce(c.frozen_seller_wanted_price, excluded.frozen_seller_wanted_price),
    frozen_seller_perceived_price = coalesce(c.frozen_seller_perceived_price, excluded.frozen_seller_perceived_price),
    frozen_retained_competitors = coalesce(c.frozen_retained_competitors, excluded.frozen_retained_competitors),
    frozen_exploitable_competitors = coalesce(c.frozen_exploitable_competitors, excluded.frozen_exploitable_competitors),
    frozen_meeting_duration_seconds = coalesce(c.frozen_meeting_duration_seconds, public.meeting_duration_seconds(p_project_id)),
    frozen_launch_readiness_first = coalesce(c.frozen_launch_readiness_first, excluded.frozen_launch_readiness_first),
    frozen_launch_readiness_last = coalesce(c.frozen_launch_readiness_last, excluded.frozen_launch_readiness_last),
    frozen_launch_readiness_missing = coalesce(c.frozen_launch_readiness_missing, excluded.frozen_launch_readiness_missing),
    concluded_at = coalesce(c.concluded_at, now()),
    outcome_changed_at = now(),
    updated_at = now();

  -- Mission 127 — le prix du rendez-vous ne s'efface plus : à la première conclusion, chaque
  -- concurrent retenu reçoit son prix affiché et ses jours de commercialisation (depuis la date
  -- de publication quand elle est connue, sinon les jours lus à l'import plus les jours écoulés),
  -- figés ; jamais réécrits ensuite.
  if v_first_conclusion then
    update public.comparables c set
      meeting_price = c.price,
      meeting_price_source = 'conclusion',
      meeting_days_on_market = case
        when c.listing_published_at is not null
          then greatest(0, current_date - c.listing_published_at::date)
        when c.days_on_market is not null
          then c.days_on_market + greatest(0, current_date - c.created_at::date)
      end,
      meeting_frozen_at = now()
    where c.project_id = p_project_id and c.agency_id = p_agency_id and c.is_selected
      and c.meeting_frozen_at is null;
  end if;

  -- Inchangé depuis la M111 : seule la bascule vers le Suivi compte comme « passé dans le
  -- Suivi » ; corriger la conclusion d'un dossier conclu ne touche pas `projects.updated_at`.
  update public.projects
    set status = 'meeting_completed', updated_at = now()
    where id = p_project_id
      and agency_id = p_agency_id
      and status in ('draft', 'ready_for_meeting');
  get diagnostics v_updated = row_count;

  return v_updated > 0;
end;
$$;

revoke all on function public.conclude_meeting(uuid, uuid, text, text, numeric, numeric, numeric, numeric, numeric, numeric, integer, integer, text, text, text, date, text[], text)
  from public, anon, authenticated;
grant execute on function public.conclude_meeting(uuid, uuid, text, text, numeric, numeric, numeric, numeric, numeric, numeric, integer, integer, text, text, text, date, text[], text)
  to service_role;

-- ---------------------------------------------------------------------------------------------
-- 4. Reprise des dossiers déjà conclus : rien n'est inventé — prix révélé au Live, sinon
--    observation datée avant la conclusion, sinon le prix actuel dit « current ». L'identité
--    d'une annonce se lit comme `extractListingKey` : le portail par le suffixe de l'hôte, la clé
--    par le dernier segment du chemin (3 caractères au moins).
-- ---------------------------------------------------------------------------------------------
with conclu as (
  select c.id, c.agency_id, c.price, c.listing_url, c.listing_published_at, c.days_on_market,
         c.created_at, m.concluded_at
  from public.comparables c
  join public.project_meeting_conclusions m on m.project_id = c.project_id
  where c.is_selected and m.concluded_at is not null and c.meeting_frozen_at is null
),
identite as (
  select x.id,
    case
      when h.host = 'seloger.com' or h.host like '%.seloger.com' then 'seloger'
      when h.host = 'bienici.com' or h.host like '%.bienici.com' then 'bienici'
      when h.host = 'green-acres.fr' or h.host like '%.green-acres.fr' then 'greenacres'
      when h.host = 'maisonsetappartements.fr' or h.host like '%.maisonsetappartements.fr'
        then 'maisonsetappartements'
      when h.host = 'annonces.demonstration.invalid' or h.host like '%.annonces.demonstration.invalid'
        then 'demonstration'
    end as portal,
    (regexp_match(coalesce(h.path, ''), '([^/]+)/*$'))[1] as listing_key
  from conclu x
  cross join lateral (
    select lower(substring(x.listing_url from '^[a-zA-Z][a-zA-Z0-9+.-]*://([^/?#:]+)')) as host,
           substring(x.listing_url from '^[a-zA-Z][a-zA-Z0-9+.-]*://[^/?#]+([^?#]*)') as path
  ) h
),
revele as (
  select r.comparable_id, max(r.revealed_listing_price) as price
  from public.live_seller_responses r
  where r.revealed_listing_price is not null
  group by r.comparable_id
),
observe as (
  select x.id,
    (select o.price from public.listing_observations o
      where o.agency_id = x.agency_id and o.portal = i.portal and o.listing_key = i.listing_key
        and o.observed_on <= x.concluded_at::date
      order by o.observed_on desc limit 1) as price
  from conclu x join identite i on i.id = x.id
  where i.portal is not null and length(coalesce(i.listing_key, '')) >= 3
)
update public.comparables c set
  meeting_price = coalesce(rv.price, ob.price, x.price),
  meeting_price_source = case
    when rv.price is not null then 'revealed'
    when ob.price is not null then 'observation'
    else 'current'
  end,
  meeting_days_on_market = case
    when x.listing_published_at is not null
      then greatest(0, x.concluded_at::date - x.listing_published_at::date)
    when x.days_on_market is not null
      then x.days_on_market + greatest(0, x.concluded_at::date - x.created_at::date)
  end,
  meeting_frozen_at = x.concluded_at
from conclu x
left join revele rv on rv.comparable_id = x.id
left join observe ob on ob.id = x.id
where c.id = x.id;
