-- Mission 131 — La présentation directe.
--
-- Le conseiller choisit, pour un dossier, la façon de présenter : le Live interactif (défaut,
-- comme aujourd'hui), la présentation directe (le même Live, sans rien demander au vendeur : chaque
-- concurrent arrive avec son prix affiché d'emblée), ou le document seul (l'« Étude de marché »,
-- sans Live). Il peut passer en directe en cours de route, et revenir.
--
--   1. `projects.live_presentation_mode` : le choix du dossier ET le mode courant du Live ; il ne se
--      change plus sur un dossier conclu ou archivé, et « document » n'est plus possible une fois
--      le Live commencé.
--   2. `live_seller_responses.shown_directly_at` : le concurrent a été montré en directe (son prix
--      livré sans devinette). Posé une fois, jamais réécrit ni vidé (M92) ; refusé hors du mode
--      direct, ou après une devinette ou un « Non » ; une devinette arrivée ensuite est ignorée.
--      Le prix révélé est figé à cet instant, comme à la devinette (M96) : le Suivi, la synthèse et
--      le Point marché (« prix au rendez-vous ») marchent sans rien changer.
--   3. `live_seller_summary.advisor_closest_comparable_id` : « le concurrent le plus proche de votre
--      bien », proposé par le CONSEILLER en directe ; il n'est jamais lu comme le choix du vendeur
--      (`seller_most_dangerous_comparable_id`, M96, M113, M129, n'est jamais écrit en directe).
--      Le verrou du Live conclu (M109) laisse passer son vidage quand ce concurrent est supprimé,
--      comme celui du plus dangereux (leçon de la migration 20261028).
--   4. `market_study_links` : le lien de partage de l'« Étude de marché », sur le modèle de
--      `project_market_update_links` (M127) — le jeton n'est jamais gardé, seulement son condensat ;
--      lu par l'agence, écrit par le serveur seul, cloisonné, supprimé avec le dossier.
--   5. `projects.demo_stage` accepte « direct » : le dossier de démo en présentation directe.
--
-- Compatible avec le code de `main` : des colonnes avec défaut ou nulles, une table que `main` ne
-- connaît pas ; `main` n'écrit jamais `shown_directly_at` ni le mode, ses écritures passent comme
-- avant (le mode reste « interactive »). Aucune ligne existante n'est modifiée.

-- ---------------------------------------------------------------------------------------------
-- 1. Le mode de présentation du dossier.
-- ---------------------------------------------------------------------------------------------
alter table public.projects
  add column live_presentation_mode text not null default 'interactive'
    check (live_presentation_mode in ('interactive', 'direct', 'document'));

comment on column public.projects.live_presentation_mode is
  'Mission 131 — interactive : le Live demande au vendeur ; direct : le Live sans rien lui demander, prix affichés d''emblée ; document : pas de Live, l''Étude de marché seule. Le choix du dossier et le mode courant du Live.';

create function public.guard_live_presentation_mode() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.live_presentation_mode is distinct from old.live_presentation_mode then
    if old.status in ('meeting_completed', 'archived') then
      raise exception 'projects: le rendez-vous est conclu, la façon de présenter ne change plus'
        using errcode = '42501';
    end if;
    if new.live_presentation_mode = 'document' and public.live_has_started(new.id) then
      raise exception 'projects: le Live a commencé, il ne devient pas un document seul'
        using errcode = '42501';
    end if;
  end if;
  return new;
end;
$$;

create trigger projects_guard_live_presentation_mode
  before update of live_presentation_mode on public.projects
  for each row execute function public.guard_live_presentation_mode();

-- ---------------------------------------------------------------------------------------------
-- 2. Un concurrent montré en directe.
-- ---------------------------------------------------------------------------------------------
alter table public.live_seller_responses
  add column shown_directly_at timestamptz;

comment on column public.live_seller_responses.shown_directly_at is
  'Mission 131 — le concurrent a été montré en présentation directe : son prix livré sans devinette. Posé une fois, jamais réécrit ni vidé.';

-- Déclencheur nommé pour passer AVANT `live_seller_responses_freeze_revealed_price` (ordre
-- alphabétique des déclencheurs BEFORE) : le gel du prix voit déjà le fait « montré ».
create function public.keep_shown_directly() returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_mode text;
begin
  if tg_op = 'UPDATE' and old.shown_directly_at is not null then
    -- Montré en directe : le fait ne bouge plus, et aucune devinette ne s'y ajoute.
    new.shown_directly_at := old.shown_directly_at;
    new.seller_estimated_listing_price := old.seller_estimated_listing_price;
    new.seller_estimated_days_on_market := old.seller_estimated_days_on_market;
    return new;
  end if;
  if new.shown_directly_at is null then
    return new;
  end if;
  -- On le pose : le dossier doit être en directe, et le concurrent ni deviné ni écarté par « Non ».
  select p.live_presentation_mode into v_mode from public.projects p where p.id = new.project_id;
  if v_mode is distinct from 'direct' then
    raise exception 'live: le dossier n''est pas en présentation directe' using errcode = '42501';
  end if;
  if tg_op = 'UPDATE'
     and (old.seller_estimated_listing_price is not null
          or old.seller_serious_competitor = 'no') then
    raise exception 'live: ce concurrent a déjà sa réponse du vendeur' using errcode = '42501';
  end if;
  if new.seller_estimated_listing_price is not null or new.seller_serious_competitor = 'no' then
    raise exception 'live: un concurrent montré en directe n''a pas de devinette' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger live_seller_responses_direct_shown
  before insert or update on public.live_seller_responses
  for each row execute function public.keep_shown_directly();

-- Le prix révélé se fige aussi quand le concurrent est montré en directe (M96).
create or replace function public.freeze_revealed_listing_price() returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_comparable_id uuid;
begin
  if tg_op = 'UPDATE' then
    -- Déjà figé, ou devinette déjà donnée (Live d'avant la mission) : rien ne bouge.
    if old.revealed_listing_price is not null or old.seller_estimated_listing_price is not null then
      new.revealed_listing_price := old.revealed_listing_price;
      return new;
    end if;
    -- Le rattachement d'une réponse est figé (M92) : on lit l'ancien.
    v_comparable_id := old.comparable_id;
  else
    v_comparable_id := new.comparable_id;
  end if;

  new.revealed_listing_price := null;
  if (new.seller_estimated_listing_price is not null or new.shown_directly_at is not null)
     and v_comparable_id is not null then
    select c.price into new.revealed_listing_price
      from public.comparables c
      where c.id = v_comparable_id and c.agency_id = new.agency_id;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- 3. Le concurrent le plus proche, proposé par le conseiller.
-- ---------------------------------------------------------------------------------------------
alter table public.live_seller_summary
  add column advisor_closest_comparable_id uuid
    references public.comparables (id) on delete set null;

create index live_seller_summary_advisor_closest
  on public.live_seller_summary (advisor_closest_comparable_id);

comment on column public.live_seller_summary.advisor_closest_comparable_id is
  'Mission 131 — en présentation directe, le concurrent que le CONSEILLER propose comme « le plus proche de votre bien » ; jamais le choix du vendeur.';

-- Le concurrent proposé appartient au dossier du résumé.
create function public.check_advisor_closest() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.advisor_closest_comparable_id is not null and not exists (
    select 1 from public.comparables c
    where c.id = new.advisor_closest_comparable_id and c.project_id = new.project_id
  ) then
    raise exception 'live: ce concurrent n''est pas du dossier' using errcode = '42501';
  end if;
  return new;
end;
$$;

create trigger live_seller_summary_advisor_closest
  before insert or update of advisor_closest_comparable_id on public.live_seller_summary
  for each row execute function public.check_advisor_closest();

-- Le verrou du Live conclu (M109) : le vidage de l'un ou l'autre concurrent désigné, quand il
-- vient d'être supprimé (`on delete set null`), passe ; rien d'autre ne change.
create or replace function public.refuse_live_write_after_conclusion()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_status text;
begin
  select p.status into v_status from public.projects p where p.id = new.project_id;
  if v_status is null or v_status not in ('meeting_completed', 'archived') then
    return new;
  end if;
  -- (Des « if » imbriqués : PL/pgSQL n'évalue pas un « and » en court-circuit, et la table des
  -- réponses n'a pas ces colonnes.)
  if tg_table_name = 'live_seller_summary' and tg_op = 'UPDATE' then
    if old.seller_most_dangerous_comparable_id is not null
       and new.seller_most_dangerous_comparable_id is null
       and (to_jsonb(new) - 'seller_most_dangerous_comparable_id' - 'updated_at')
           = (to_jsonb(old) - 'seller_most_dangerous_comparable_id' - 'updated_at')
       and not exists (select 1 from public.comparables c
                       where c.id = old.seller_most_dangerous_comparable_id) then
      return new;
    end if;
    if old.advisor_closest_comparable_id is not null
       and new.advisor_closest_comparable_id is null
       and (to_jsonb(new) - 'advisor_closest_comparable_id' - 'updated_at')
           = (to_jsonb(old) - 'advisor_closest_comparable_id' - 'updated_at')
       and not exists (select 1 from public.comparables c
                       where c.id = old.advisor_closest_comparable_id) then
      return new;
    end if;
  end if;
  raise exception 'live: le dossier % est conclu ou archivé, le Live ne change plus', new.project_id
    using errcode = '42501';
end;
$$;

revoke all on function public.refuse_live_write_after_conclusion() from public, anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 4. Le lien de partage de l'Étude de marché.
-- ---------------------------------------------------------------------------------------------
create table public.market_study_links (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null default (now() + interval '30 days')
);

create index market_study_links_project on public.market_study_links (project_id);

comment on table public.market_study_links is
  'Mission 131 — les liens de l''Étude de marché remise au vendeur : le condensat du jeton seul, 30 jours.';

alter table public.market_study_links enable row level security;

create policy market_study_links_agency_read on public.market_study_links
  for select
  to authenticated
  using (agency_id = public.get_current_agency_id());

revoke all on public.market_study_links from anon, authenticated;
grant select on public.market_study_links to authenticated;

create function public.check_market_study_link_agency() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.projects p where p.id = new.project_id and p.agency_id = new.agency_id
  ) then
    raise exception 'market_study_links: le dossier n''est pas à cette agence';
  end if;
  return new;
end;
$$;

create trigger market_study_links_agency
  before insert or update on public.market_study_links
  for each row execute function public.check_market_study_link_agency();

-- ---------------------------------------------------------------------------------------------
-- 5. Le dossier de démo en présentation directe.
-- ---------------------------------------------------------------------------------------------
alter table public.projects drop constraint projects_demo_stage_check;
alter table public.projects
  add constraint projects_demo_stage_check
    check (demo_stage is null or demo_stage in ('to_prepare', 'ready', 'signed', 'follow_up', 'direct'));
