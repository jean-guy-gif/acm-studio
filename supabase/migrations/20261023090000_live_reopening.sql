-- Mission 104 — rouvrir un Live figé PAR ERREUR (un vrai dossier essayé en Live, figé dès le
-- deuxième écran). La méthode reste infalsifiable (M92) : ni un conseiller ni un manager ne le
-- peut. Seul un opérateur (ACM_OPERATOR_EMAILS), par l'action serveur, avec un motif — et la
-- base garde la trace : qui, quand, motif, et les réponses effacées elles-mêmes.
--
--   1. live_reopenings — la trace. Fermée au navigateur (comme le journal d'erreurs, M100) :
--      personne ne la lit ni ne l'écrit depuis le navigateur, pas même son agence. Elle part avec
--      son dossier (un effacement RGPD n'y laisse pas les réponses du vendeur).
--   2. reopen_live(...) — tout en une transaction : relire, tracer, effacer les réponses et le
--      résumé du Live, remettre à zéro l'heure de début et de fin. Seulement pour un dossier en
--      préparation ou prêt : un dossier conclu a figé ses faits à la conclusion, un dossier
--      archivé est fermé. Appelable par le seul serveur.
--   3. keep_live_start_and_rhythm — l'heure de début ne se remet à zéro que DANS reopen_live.
--
-- Compatible avec le code de `main` : une table et une fonction qu'il n'appelle pas ; le
-- déclencheur garde exactement son comportement hors de reopen_live. Aucune donnée modifiée.

-- ---------------------------------------------------------------------------------------------
-- 1. La trace.
-- ---------------------------------------------------------------------------------------------
create table public.live_reopenings (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  operator_id uuid references auth.users (id) on delete set null,
  operator_email text not null check (char_length(operator_email) between 3 and 320),
  reason text not null check (char_length(btrim(reason)) between 5 and 500),
  -- Ce que la réouverture a effacé : les réponses, le résumé, l'heure de début et de fin.
  erased jsonb not null check (jsonb_typeof(erased) = 'object')
);

create index live_reopenings_project_idx on public.live_reopenings (project_id, created_at desc);

alter table public.live_reopenings enable row level security;

-- Une politique qui dit non, écrite : la table n'est pas « sans politique », elle est fermée.
create policy live_reopenings_closed_to_browser on public.live_reopenings
  for all
  to authenticated
  using (false)
  with check (false);

revoke all on public.live_reopenings from anon, authenticated;

-- ---------------------------------------------------------------------------------------------
-- 3. Le début du Live ne se réécrit jamais (M95) — sauf dans reopen_live, qui pose un drapeau
--    local à SA transaction.
-- ---------------------------------------------------------------------------------------------
create or replace function public.keep_live_start_and_rhythm() returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.live_started_at is not null
     and coalesce(current_setting('acm.reopening_live', true), '') <> 'on' then
    new.live_started_at := old.live_started_at;
    new.live_rhythm := old.live_rhythm;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------------------------
-- 2. Rouvrir.
-- ---------------------------------------------------------------------------------------------
create function public.reopen_live(
  p_project_id uuid,
  p_operator_id uuid,
  p_operator_email text,
  p_reason text
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_project public.projects%rowtype;
  v_responses jsonb;
  v_summary jsonb;
  v_erased jsonb;
begin
  if char_length(btrim(coalesce(p_reason, ''))) not between 5 and 500 then
    raise exception 'reopen_live: motif requis (5 à 500 caractères)' using errcode = '22023';
  end if;
  if char_length(coalesce(p_operator_email, '')) < 3 then
    raise exception 'reopen_live: opérateur inconnu' using errcode = '22023';
  end if;

  select * into v_project from public.projects where id = p_project_id for update;
  if not found then
    raise exception 'reopen_live: dossier introuvable' using errcode = 'P0002';
  end if;
  if v_project.status not in ('draft', 'ready_for_meeting') then
    raise exception 'reopen_live: dossier % (%)', p_project_id, v_project.status
      using errcode = 'P0001';
  end if;

  select coalesce(jsonb_agg(to_jsonb(r) order by r.created_at), '[]'::jsonb)
    into v_responses
    from public.live_seller_responses r
    where r.project_id = p_project_id;
  select to_jsonb(s) into v_summary
    from public.live_seller_summary s
    where s.project_id = p_project_id;

  if jsonb_array_length(v_responses) = 0 and v_summary is null
     and v_project.live_started_at is null and v_project.live_ended_at is null then
    raise exception 'reopen_live: rien à rouvrir' using errcode = 'P0001';
  end if;

  v_erased := jsonb_build_object(
    'responses', v_responses,
    'summary', v_summary,
    'live_started_at', v_project.live_started_at,
    'live_ended_at', v_project.live_ended_at,
    'live_rhythm', v_project.live_rhythm
  );

  insert into public.live_reopenings (agency_id, project_id, operator_id, operator_email, reason, erased)
  values (v_project.agency_id, p_project_id, p_operator_id, lower(btrim(p_operator_email)),
          btrim(p_reason), v_erased);

  delete from public.live_seller_responses where project_id = p_project_id;
  delete from public.live_seller_summary where project_id = p_project_id;

  perform set_config('acm.reopening_live', 'on', true);
  update public.projects
    set live_started_at = null, live_ended_at = null
    where id = p_project_id;
  perform set_config('acm.reopening_live', 'off', true);

  return jsonb_build_object(
    'responses', jsonb_array_length(v_responses),
    'summary', v_summary is not null
  );
end;
$$;

revoke all on function public.reopen_live(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.reopen_live(uuid, uuid, text, text) to service_role;
