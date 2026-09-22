-- Mission 53 — La conclusion du rendez-vous, et le Suivi.
--
-- Le parcours devient Préparation → Live → Suivi. `projects.status` porte la POSITION
-- dans le parcours (M52) : `meeting_completed` = « conclu, en Suivi ». L'ISSUE d'un
-- rendez-vous (signé / à relancer), son motif, le prix convenu et les montants figés sont
-- des FAITS — ils vivent ici, pas dans l'enum.
--
-- 1:1 avec le projet (UNIQUE(project_id)), même patron de sécurité que
-- project_price_positionings : RLS n'expose que la LECTURE à l'agence ; aucune écriture
-- directe (pas de policy write, privilèges révoqués) ; les écritures passent par deux
-- fonctions SECURITY DEFINER réservées au service role, appelées depuis un Server Action
-- APRÈS authentification + autorisation agence/projet.

create table public.project_meeting_conclusions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  agency_id uuid not null references public.agencies (id),

  -- ④ Le prix de commercialisation CONVENU avec le vendeur, saisi au dernier écran du
  -- Live (vide à l'ouverture, jamais pré-rempli). Absent tant que le vendeur n'a pas parlé.
  commercialization_price numeric check (commercialization_price is null or commercialization_price > 0),

  -- Les montants FIGÉS à l'instant de la conclusion — des copies, jamais recalculées.
  -- ① le marché CALCULÉ par l'outil à partir des concurrents (central de la fourchette).
  frozen_market_computed numeric check (frozen_market_computed is null or frozen_market_computed > 0),
  -- ② l'analyse comparative de marché SAISIE À LA MAIN par le conseiller (jamais calculée).
  frozen_advisor_analysis numeric check (frozen_advisor_analysis is null or frozen_advisor_analysis > 0),
  -- ③ le prix conseillé VALIDÉ au positionnement.
  frozen_advisor_price numeric check (frozen_advisor_price is null or frozen_advisor_price > 0),

  -- L'ISSUE, côté conseiller — JAMAIS montrée au vendeur.
  outcome text check (outcome is null or outcome in ('signed', 'follow_up')),
  -- Le motif « qu'est-ce qui retient le vendeur ? » : note de travail, seulement pour « à relancer ».
  follow_up_reason text check (follow_up_reason is null or char_length(follow_up_reason) <= 2000),
  concluded_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint pmc_project_unique unique (project_id),
  -- Un motif n'a de sens que pour « à relancer ».
  constraint pmc_reason_only_follow_up check (follow_up_reason is null or outcome = 'follow_up')
);

create index idx_pmc_agency_id on public.project_meeting_conclusions (agency_id);
create index idx_pmc_outcome on public.project_meeting_conclusions (outcome);

-- =====================================================================
-- Row Level Security : lecture pour l'agence du projet, aucune écriture directe.
-- =====================================================================
alter table public.project_meeting_conclusions enable row level security;

create policy pmc_select_agency_isolation on public.project_meeting_conclusions
  for select
  to authenticated
  using (agency_id = public.get_current_agency_id());

-- Pas de policy write → écriture directe refusée par RLS. Révocation des privilèges par
-- défaut comme seconde ligne (TRUNCATE contourne RLS, révoqué aussi).
revoke insert, update, delete, truncate on public.project_meeting_conclusions from authenticated;
revoke all on public.project_meeting_conclusions from anon;

-- =====================================================================
-- Étape 1 — le dernier écran du Live : enregistrer le prix de commercialisation, et
-- FIGER ①②③ à cet instant (§7.1). Le figeage est DÉFINITIF : COALESCE garde la première
-- copie, une ré-écriture du prix ne recalcule jamais les montants. Ne touche PAS au
-- status — le dossier reste dans le Live tant qu'il n'est pas conclu (§2).
-- =====================================================================
create or replace function public.save_commercialization_price(
  p_project_id uuid,
  p_agency_id uuid,
  p_price numeric,
  p_market_computed numeric,
  p_advisor_analysis numeric,
  p_advisor_price numeric
) returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.project_meeting_conclusions
    (project_id, agency_id, commercialization_price,
     frozen_market_computed, frozen_advisor_analysis, frozen_advisor_price)
  values
    (p_project_id, p_agency_id, p_price, p_market_computed, p_advisor_analysis, p_advisor_price)
  on conflict (project_id) do update set
    commercialization_price = excluded.commercialization_price,
    frozen_market_computed  = coalesce(project_meeting_conclusions.frozen_market_computed, excluded.frozen_market_computed),
    frozen_advisor_analysis = coalesce(project_meeting_conclusions.frozen_advisor_analysis, excluded.frozen_advisor_analysis),
    frozen_advisor_price    = coalesce(project_meeting_conclusions.frozen_advisor_price, excluded.frozen_advisor_price),
    updated_at = now();
end;
$$;

-- =====================================================================
-- Étape 2 — l'écran conseiller : consigner l'ISSUE et faire passer le dossier en Suivi.
-- UNE SEULE TRANSACTION (le corps de fonction) : `status = 'meeting_completed'` ET l'issue
-- sont écrits ensemble. Un dossier en meeting_completed sans conclusion serait « en Suivi
-- sans issue » — l'équivalent du dossier invisible (M52). On fige ①②③④ si l'étape 1 ne
-- l'a pas déjà fait (cas « à relancer » sans prix saisi). La bascule du status est gardée
-- sur `ready_for_meeting`. Retourne true si le dossier vient d'entrer en Suivi.
-- =====================================================================
create or replace function public.conclude_meeting(
  p_project_id uuid,
  p_agency_id uuid,
  p_outcome text,
  p_reason text,
  p_price numeric,
  p_market_computed numeric,
  p_advisor_analysis numeric,
  p_advisor_price numeric
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
begin
  if p_outcome not in ('signed', 'follow_up') then
    raise exception 'conclude_meeting: issue invalide %', p_outcome;
  end if;

  insert into public.project_meeting_conclusions
    (project_id, agency_id, commercialization_price, frozen_market_computed,
     frozen_advisor_analysis, frozen_advisor_price, outcome, follow_up_reason, concluded_at)
  values
    (p_project_id, p_agency_id, p_price, p_market_computed, p_advisor_analysis, p_advisor_price,
     p_outcome, case when p_outcome = 'follow_up' then p_reason else null end, now())
  on conflict (project_id) do update set
    outcome = excluded.outcome,
    follow_up_reason = case when excluded.outcome = 'follow_up' then excluded.follow_up_reason else null end,
    -- ④ on garde le prix déjà saisi au Live s'il existe, sinon celui fourni ici.
    commercialization_price = coalesce(project_meeting_conclusions.commercialization_price, excluded.commercialization_price),
    frozen_market_computed  = coalesce(project_meeting_conclusions.frozen_market_computed, excluded.frozen_market_computed),
    frozen_advisor_analysis = coalesce(project_meeting_conclusions.frozen_advisor_analysis, excluded.frozen_advisor_analysis),
    frozen_advisor_price    = coalesce(project_meeting_conclusions.frozen_advisor_price, excluded.frozen_advisor_price),
    concluded_at = now(),
    updated_at = now();

  update public.projects
    set status = 'meeting_completed', updated_at = now()
    where id = p_project_id
      and agency_id = p_agency_id
      and status = 'ready_for_meeting';
  get diagnostics v_updated = row_count;

  return v_updated > 0;
end;
$$;

-- Exécution réservée au service role (les écritures passent par le Server Action, après
-- autorisation). Ni le navigateur (`authenticated`/`anon`) ne peut appeler ces fonctions.
revoke all on function public.save_commercialization_price(uuid, uuid, numeric, numeric, numeric, numeric) from public, anon, authenticated;
revoke all on function public.conclude_meeting(uuid, uuid, text, text, numeric, numeric, numeric, numeric) from public, anon, authenticated;
grant execute on function public.save_commercialization_price(uuid, uuid, numeric, numeric, numeric, numeric) to service_role;
grant execute on function public.conclude_meeting(uuid, uuid, text, text, numeric, numeric, numeric, numeric) to service_role;
