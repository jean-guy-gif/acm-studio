-- Mission 164 — un Live rouvert oublie le prix qu'il avait enregistré (décision de Jean-Guy, 23/11 :
-- « à la réouverture, le prix enregistré au Live ne doit plus servir au classement »).
--
-- Un opérateur rouvre un Live figé par erreur (M104) : `reopen_live` efface les réponses et le
-- résumé, et remet à zéro l'heure de début et de fin. Mais « Sur quel prix partons-nous ? » avait
-- écrit, par `save_commercialization_price` (M81, M111), une ligne de conclusion SANS ISSUE — le prix
-- et trois repères figés (marché calculé, analyse et prix du conseiller) — que la réouverture
-- laissait en base. L'Étude de marché classait le bien à ce prix, l'écran de fin du Live disait « à ce
-- prix », et la vraie conclusion aurait figé les repères du Live annulé (`coalesce`, M111, M127).
--
-- Ce que fait la migration : `reopen_live` remplacée, rien d'autre. Dans la même transaction, elle
-- SUPPRIME la ligne de conclusion du dossier quand elle n'a pas d'issue (ni `outcome`, ni
-- `concluded_at`) : le dossier retrouve l'état d'avant son Live, « pas de ligne », que le code lit
-- déjà partout ; le prix suivant refait une ligne neuve. Une ligne qui porte une issue n'est jamais
-- touchée (un dossier conclu est refusé plus haut, M104). La trace (`live_reopenings.erased`) gagne
-- une clé, `commercialization_price_removed` (vrai ou faux) : jamais le montant ni les repères.
--
-- Même signature, même retour (`responses`, `summary`), mêmes refus, mêmes droits : compatible avec
-- le code de `main`, qui ne lit ni la clé ni la ligne supprimée. Aucune ligne n'est modifiée à
-- l'application (le 23/11 : 0 réouverture en base, 3 lignes sans issue, qui ne portent que leur prix
-- et leurs trois repères).

set local lock_timeout = '5s';

create or replace function public.reopen_live(
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
  v_price_removed boolean;
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

  -- Mission 164 — le prix enregistré pendant ce Live : la ligne de conclusion sans issue part avec
  -- lui (une ligne par dossier, `pmc_project_unique`). Une ligne qui porte une issue reste.
  delete from public.project_meeting_conclusions c
    where c.project_id = p_project_id
      and c.outcome is null
      and c.concluded_at is null
    returning (c.commercialization_price is not null) into v_price_removed;
  v_price_removed := coalesce(v_price_removed, false);

  v_erased := jsonb_build_object(
    'responses', v_responses,
    'summary', v_summary,
    'live_started_at', v_project.live_started_at,
    'live_ended_at', v_project.live_ended_at,
    'live_rhythm', v_project.live_rhythm,
    'commercialization_price_removed', v_price_removed
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

-- Les droits ne changent pas (`create or replace` les garde) ; redits pour qu'ils se lisent ici.
revoke all on function public.reopen_live(uuid, uuid, text, text) from public, anon, authenticated;
grant execute on function public.reopen_live(uuid, uuid, text, text) to service_role;
