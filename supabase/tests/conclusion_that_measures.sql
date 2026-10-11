-- Mission 90 — la conclusion qui mesure, prouvée à la SOURCE DE VÉRITÉ.
--   §1 un mandat signé garde son type (exclusif ou simple), et date sa signature ;
--   §2 `signed_at` est écrit UNE fois : ni une correction, ni un aller-retour ne le réécrivent ;
--   §3 `concluded_at` (la date du rendez-vous) ne bouge plus après la première conclusion ;
--   §4 le prix se pose ou se corrige à la conclusion et au changement d'issue ; sans prix
--      fourni, l'ancien est gardé ;
--   §5 le motif vaut pour « à relancer », « vendu ailleurs » et « retiré » ; jamais pour un
--      mandat signé ; le type de mandat tombe quand le mandat n'est plus signé ;
--   §6 un « à relancer » qui signe depuis le Suivi date sa signature, sans toucher au rendez-vous ;
--   §7 les appels du code de `main` (12 et 4 arguments nommés) passent toujours ;
--   §8 compléter le type d'un mandat signé AVANT la mission n'invente pas de date de signature.
--
--   docker exec -i supabase_db_acm-studio psql -U postgres -d postgres \
--     -v ON_ERROR_STOP=1 < supabase/tests/conclusion_that_measures.sql
-- Une transaction annulée. Chaque assertion RAISE en cas d'échec.

begin;

insert into auth.users (id, email) values ('00000000-0000-0000-0000-000000009001', 'm90@a.test');
insert into public.agencies (id, name) values ('aaaaaaaa-9090-0000-0000-000000000000', 'Agence 90');
insert into public.profiles (id, agency_id, first_name, last_name, email, role) values
  ('00000000-0000-0000-0000-000000009001', 'aaaaaaaa-9090-0000-0000-000000000000', 'M', 'N', 'm90@a.test', 'manager');
insert into public.projects (id, agency_id, advisor_id, seller_name, status)
select ('90000000-0000-0000-0000-00000000000' || n)::uuid, 'aaaaaaaa-9090-0000-0000-000000000000',
       '00000000-0000-0000-0000-000000009001', 'dossier ' || n, 'ready_for_meeting'
from generate_series(1, 5) n;

-- Le temps avance entre deux gestes : on recule les dates déjà écrites pour le voir.
create function pg_temp.age_by(p_project uuid, p_days int) returns void language sql as $$
  update public.project_meeting_conclusions
    set concluded_at = concluded_at - make_interval(days => p_days),
        signed_at = signed_at - make_interval(days => p_days),
        outcome_changed_at = outcome_changed_at - make_interval(days => p_days)
    where project_id = p_project;
$$;

-- =====================================================================
-- §1 à §5 — dossier 1 : signé en exclusif à la conclusion, puis corrigé.
-- =====================================================================
do $$
declare
  r public.project_meeting_conclusions%rowtype;
  v_concluded timestamptz;
  v_signed timestamptz;
  p constant uuid := '90000000-0000-0000-0000-000000000001';
  a constant uuid := 'aaaaaaaa-9090-0000-0000-000000000000';
begin
  perform public.conclude_meeting(p, a, 'signed', 'motif ignoré', 315000, 300000, null, 300000,
    p_mandate_type => 'exclusive');
  select * into r from public.project_meeting_conclusions where project_id = p;
  if r.mandate_type is distinct from 'exclusive' or r.signed_at is null
     or r.commercialization_price <> 315000 or r.follow_up_reason is not null then
    raise exception 'FAIL §1 : % / % / % / %', r.mandate_type, r.signed_at,
      r.commercialization_price, r.follow_up_reason;
  end if;

  perform pg_temp.age_by(p, 10);
  select concluded_at, signed_at into v_concluded, v_signed
    from public.project_meeting_conclusions where project_id = p;

  -- Correction de l'issue par l'écran de conclusion : simple au lieu d'exclusif, sans prix.
  perform public.conclude_meeting(p, a, 'signed', null, null, null, null, null,
    p_mandate_type => 'simple');
  select * into r from public.project_meeting_conclusions where project_id = p;
  if r.concluded_at is distinct from v_concluded then
    raise exception 'FAIL §3 : concluded_at réécrit par une correction';
  end if;
  if r.signed_at is distinct from v_signed then
    raise exception 'FAIL §2 : signed_at réécrit par une correction';
  end if;
  if r.mandate_type <> 'simple' or r.commercialization_price <> 315000 then
    raise exception 'FAIL §4 : type % / prix % (le prix devait être gardé)', r.mandate_type,
      r.commercialization_price;
  end if;

  -- Aller-retour depuis le Suivi : retiré (avec motif), puis de nouveau signé.
  perform public.change_meeting_outcome(p, a, 'withdrawn', '  projet reporté  ');
  select * into r from public.project_meeting_conclusions where project_id = p;
  if r.follow_up_reason is distinct from 'projet reporté' or r.mandate_type is not null then
    raise exception 'FAIL §5 : motif « % », type % après « retiré »', r.follow_up_reason,
      r.mandate_type;
  end if;
  perform public.change_meeting_outcome(p, a, 'sold_elsewhere', 'chez un confrère');
  if (select follow_up_reason from public.project_meeting_conclusions where project_id = p)
     is distinct from 'chez un confrère' then
    raise exception 'FAIL §5 : motif refusé pour « vendu ailleurs »';
  end if;
  perform public.change_meeting_outcome(p, a, 'signed', 'ignoré', 'exclusive', 320000);
  select * into r from public.project_meeting_conclusions where project_id = p;
  if r.signed_at is distinct from v_signed then
    raise exception 'FAIL §2 : signed_at réécrit par un second passage en « signé »';
  end if;
  if r.concluded_at is distinct from v_concluded then
    raise exception 'FAIL §3 : concluded_at réécrit par un changement d''issue';
  end if;
  if r.mandate_type <> 'exclusive' or r.commercialization_price <> 320000
     or r.follow_up_reason is not null then
    raise exception 'FAIL §4/§5 : % / % / %', r.mandate_type, r.commercialization_price,
      r.follow_up_reason;
  end if;
end $$;

-- =====================================================================
-- §6 — dossier 2 : « à relancer » sans prix, qui signe plus tard depuis le Suivi.
-- =====================================================================
do $$
declare
  r public.project_meeting_conclusions%rowtype;
  v_concluded timestamptz;
  p constant uuid := '90000000-0000-0000-0000-000000000002';
  a constant uuid := 'aaaaaaaa-9090-0000-0000-000000000000';
begin
  perform public.conclude_meeting(p, a, 'follow_up', 'réfléchit', null, 300000, null, 300000);
  select * into r from public.project_meeting_conclusions where project_id = p;
  if r.signed_at is not null or r.mandate_type is not null or r.follow_up_reason <> 'réfléchit' then
    raise exception 'FAIL §6 : un « à relancer » porte une signature ou un type';
  end if;
  perform pg_temp.age_by(p, 21);
  select concluded_at into v_concluded from public.project_meeting_conclusions where project_id = p;

  perform public.change_meeting_outcome(p, a, 'signed', null, 'simple', 298000);
  select * into r from public.project_meeting_conclusions where project_id = p;
  if r.signed_at is null or r.signed_at < v_concluded + interval '20 days' then
    raise exception 'FAIL §6 : signature non datée au passage en « signé » (%)', r.signed_at;
  end if;
  if r.concluded_at is distinct from v_concluded then
    raise exception 'FAIL §6 : la date du rendez-vous a bougé';
  end if;
  if r.mandate_type <> 'simple' or r.commercialization_price <> 298000 then
    raise exception 'FAIL §6 : % / %', r.mandate_type, r.commercialization_price;
  end if;
end $$;

-- =====================================================================
-- §7 — les appels du code de `main` : 12 et 4 arguments nommés, sans type ni prix.
-- =====================================================================
do $$
declare
  r public.project_meeting_conclusions%rowtype;
  p constant uuid := '90000000-0000-0000-0000-000000000003';
  a constant uuid := 'aaaaaaaa-9090-0000-0000-000000000000';
begin
  perform public.conclude_meeting(
    p_project_id => p, p_agency_id => a, p_outcome => 'signed', p_reason => null,
    p_price => null, p_market_computed => 300000, p_advisor_analysis => null,
    p_advisor_price => 300000, p_seller_wanted => null, p_seller_perceived => 310000,
    p_retained => 3, p_exploitable => 3);
  select * into r from public.project_meeting_conclusions where project_id = p;
  if r.outcome <> 'signed' or r.mandate_type is not null or r.signed_at is null then
    raise exception 'FAIL §7 : conclusion par le code de main (%, %, %)', r.outcome,
      r.mandate_type, r.signed_at;
  end if;
  if (select status from public.projects where id = p) <> 'meeting_completed' then
    raise exception 'FAIL §7 : le dossier n''est pas entré dans le Suivi';
  end if;
  perform public.change_meeting_outcome(
    p_project_id => p, p_agency_id => a, p_outcome => 'follow_up', p_reason => 'hésite');
  select * into r from public.project_meeting_conclusions where project_id = p;
  if r.outcome <> 'follow_up' or r.follow_up_reason <> 'hésite' then
    raise exception 'FAIL §7 : changement d''issue par le code de main';
  end if;
end $$;

-- =====================================================================
-- §8 — dossier 4 : mandat signé AVANT la mission (ni type, ni date de signature).
-- =====================================================================
do $$
declare
  r public.project_meeting_conclusions%rowtype;
  p constant uuid := '90000000-0000-0000-0000-000000000004';
  a constant uuid := 'aaaaaaaa-9090-0000-0000-000000000000';
begin
  insert into public.project_meeting_conclusions
    (project_id, agency_id, commercialization_price, outcome, concluded_at)
    values (p, a, 400000, 'signed', now() - interval '30 days');
  update public.projects set status = 'meeting_completed' where id = p;

  perform public.change_meeting_outcome(p, a, 'signed', null, 'exclusive', null);
  select * into r from public.project_meeting_conclusions where project_id = p;
  if r.mandate_type <> 'exclusive' then
    raise exception 'FAIL §8 : type non complété';
  end if;
  if r.signed_at is not null then
    raise exception 'FAIL §8 : une date de signature a été inventée (%)', r.signed_at;
  end if;
  if r.commercialization_price <> 400000 or r.concluded_at > now() - interval '29 days' then
    raise exception 'FAIL §8 : prix ou date du rendez-vous modifiés';
  end if;
end $$;

-- Garde-fous de la base : un type hors liste, un type sur une autre issue, sont refusés.
do $$
declare
  p constant uuid := '90000000-0000-0000-0000-000000000005';
  a constant uuid := 'aaaaaaaa-9090-0000-0000-000000000000';
begin
  begin
    perform public.conclude_meeting(p, a, 'signed', null, null, null, null, null,
      p_mandate_type => 'co-exclusif');
    raise exception 'FAIL : type de mandat hors liste accepté';
  exception when raise_exception then
    if sqlerrm like 'FAIL%' then raise; end if;
  end;
  perform public.conclude_meeting(p, a, 'follow_up', null, null, null, null, null);
  begin
    update public.project_meeting_conclusions set mandate_type = 'simple' where project_id = p;
    raise exception 'FAIL : type de mandat posé sur un « à relancer »';
  exception when check_violation then null;
  end;
end $$;

rollback;
