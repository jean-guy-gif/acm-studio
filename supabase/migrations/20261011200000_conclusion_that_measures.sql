-- Mission 90 — Une conclusion qui mesure.
--
-- La bêta doit pouvoir dire combien de rendez-vous finissent en mandat, dont combien en
-- EXCLUSIF, et à quel prix. Quatre changements, aucune ligne écrite :
--   1. `mandate_type` : le type de NOTRE mandat (exclusif ou simple), posé quand l'issue est
--      « mandat signé ». Vide pour les dossiers déjà conclus : aucun type n'est inventé. À ne
--      pas confondre avec l'exclusivité d'un concurrent (comparables.exclusivity, M83).
--   2. `signed_at` : la date de signature, écrite UNE fois, au premier passage en « mandat
--      signé ». Les mandats déjà signés n'en ont pas : aucune date n'est inventée non plus.
--   3. `concluded_at` (la date du rendez-vous) n'est plus réécrit après la première conclusion :
--      corriger une issue ne falsifie plus cette date.
--   4. Le motif (colonne `follow_up_reason`, nom gardé) est permis pour « à relancer », « vendu
--      ailleurs » et « retiré de la vente » — plus seulement pour « à relancer ».
--
-- Le prix de commercialisation peut désormais être posé ou corrigé à la conclusion et au
-- changement d'issue (un vendeur qui signe après une relance) : un prix fourni remplace
-- l'ancien ; sans prix fourni, l'ancien est gardé.
--
-- Compatible avec le code de `main` : il appelle `conclude_meeting` avec 12 arguments nommés et
-- `change_meeting_outcome` avec 4 ; les nouveaux paramètres ont une valeur par défaut. Il ne
-- fournit ni type de mandat ni prix à la conclusion : la base n'en exige pas (c'est l'action
-- serveur qui les exige, côté nouveau code).

alter table public.project_meeting_conclusions
  add column mandate_type text
    check (mandate_type is null or mandate_type in ('exclusive', 'simple')),
  add column signed_at timestamptz,
  -- Un type de mandat n'a de sens que pour un mandat signé.
  add constraint pmc_mandate_type_only_signed
    check (mandate_type is null or outcome = 'signed'),
  -- Le motif n'est plus réservé à « à relancer » ; un mandat signé n'en porte pas.
  drop constraint pmc_reason_only_follow_up,
  add constraint pmc_reason_not_signed
    check (follow_up_reason is null or outcome is distinct from 'signed');

comment on column public.project_meeting_conclusions.mandate_type is
  'Type de notre mandat quand l''issue est « mandat signé » : exclusive ou simple. Null = non renseigné.';
comment on column public.project_meeting_conclusions.signed_at is
  'Date du premier passage en « mandat signé ». Écrite une fois ; null pour les mandats signés avant la mission 90.';

-- ---------------------------------------------------------------------------------------------
-- conclude_meeting — un paramètre de plus (le type de mandat), donc une nouvelle signature :
-- on remplace la fonction (drop + create) pour ne pas laisser deux candidates à un appel nommé.
-- ---------------------------------------------------------------------------------------------
drop function public.conclude_meeting(
  uuid, uuid, text, text, numeric, numeric, numeric, numeric, numeric, numeric, integer, integer);

create function public.conclude_meeting(
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
  p_mandate_type text default null
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
begin
  if p_outcome not in ('signed', 'follow_up', 'sold_elsewhere', 'withdrawn') then
    raise exception 'conclude_meeting: issue invalide %', p_outcome;
  end if;
  if p_mandate_type is not null and p_mandate_type not in ('exclusive', 'simple') then
    raise exception 'conclude_meeting: type de mandat invalide %', p_mandate_type;
  end if;
  -- Le motif vaut pour tout sauf un mandat signé ; le type de mandat, pour lui seul.
  v_reason := case when p_outcome = 'signed' then null else nullif(btrim(p_reason), '') end;
  v_mandate_type := case when p_outcome = 'signed' then p_mandate_type else null end;

  -- Mission 85 — la note du vendeur, lue ici à l'instant du figeage. Absente reste absente.
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
     outcome, follow_up_reason, mandate_type, signed_at, concluded_at, outcome_changed_at)
  values
    (p_project_id, p_agency_id, p_price, p_market_computed, p_advisor_analysis, p_advisor_price,
     p_seller_wanted, p_seller_perceived, p_retained, p_exploitable,
     -- Durée CALCULÉE ici, à l'instant du figeage, depuis les horodatages courants.
     public.meeting_duration_seconds(p_project_id),
     v_readiness_first, v_readiness_last, v_readiness_missing,
     p_outcome, v_reason, v_mandate_type,
     case when p_outcome = 'signed' then now() end, now(), now())
  on conflict (project_id) do update set
    -- La signature se date UNE fois, au premier passage d'une autre issue (ou d'aucune) à
    -- « mandat signé ». Lue AVANT le changement d'issue (c.outcome est l'ancienne valeur).
    signed_at = coalesce(
      c.signed_at,
      case when excluded.outcome = 'signed' and c.outcome is distinct from 'signed' then now() end),
    outcome = excluded.outcome,
    follow_up_reason = excluded.follow_up_reason,
    -- Un type fourni remplace l'ancien ; sans type fourni, un mandat déjà typé le garde.
    mandate_type = case
      when excluded.outcome = 'signed' then coalesce(excluded.mandate_type, c.mandate_type)
      else null
    end,
    -- Un prix fourni à la conclusion remplace l'ancien ; sinon l'ancien est gardé.
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
    -- La date du rendez-vous ne se réécrit plus : corriger une issue ne la falsifie pas.
    concluded_at = coalesce(c.concluded_at, now()),
    outcome_changed_at = now(),
    updated_at = now();

  update public.projects
    set status = 'meeting_completed', updated_at = now()
    where id = p_project_id
      and agency_id = p_agency_id
      and status in ('draft', 'ready_for_meeting');
  get diagnostics v_updated = row_count;

  return v_updated > 0;
end;
$$;

revoke all on function public.conclude_meeting(
  uuid, uuid, text, text, numeric, numeric, numeric, numeric, numeric, numeric, integer, integer, text)
  from public, anon, authenticated;
grant execute on function public.conclude_meeting(
  uuid, uuid, text, text, numeric, numeric, numeric, numeric, numeric, numeric, integer, integer, text)
  to service_role;

-- ---------------------------------------------------------------------------------------------
-- change_meeting_outcome — l'acte normal du Suivi. Deux paramètres de plus : le type de mandat
-- et le prix de commercialisation (un vendeur relancé qui signe). Il ne touche toujours ni les
-- montants figés, ni la date du rendez-vous, ni `projects.status`.
-- ---------------------------------------------------------------------------------------------
drop function public.change_meeting_outcome(uuid, uuid, text, text);

create function public.change_meeting_outcome(
  p_project_id uuid,
  p_agency_id uuid,
  p_outcome text,
  p_reason text,
  p_mandate_type text default null,
  p_price numeric default null
) returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_updated int;
begin
  if p_outcome not in ('signed', 'follow_up', 'sold_elsewhere', 'withdrawn') then
    raise exception 'change_meeting_outcome: issue invalide %', p_outcome;
  end if;
  if p_mandate_type is not null and p_mandate_type not in ('exclusive', 'simple') then
    raise exception 'change_meeting_outcome: type de mandat invalide %', p_mandate_type;
  end if;

  update public.project_meeting_conclusions c
    set signed_at = coalesce(
          c.signed_at,
          case when p_outcome = 'signed' and c.outcome is distinct from 'signed' then now() end),
        outcome = p_outcome,
        follow_up_reason = case when p_outcome = 'signed' then null else nullif(btrim(p_reason), '') end,
        mandate_type = case
          when p_outcome = 'signed' then coalesce(p_mandate_type, c.mandate_type)
          else null
        end,
        commercialization_price = coalesce(p_price, c.commercialization_price),
        outcome_changed_at = now(),
        updated_at = now()
    where c.project_id = p_project_id
      and c.agency_id = p_agency_id;
  get diagnostics v_updated = row_count;

  return v_updated > 0;
end;
$$;

revoke all on function public.change_meeting_outcome(uuid, uuid, text, text, text, numeric)
  from public, anon, authenticated;
grant execute on function public.change_meeting_outcome(uuid, uuid, text, text, text, numeric)
  to service_role;
