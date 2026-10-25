-- Mission 122 (partie A, décisions de Jean-Guy du 25/10) — la présentation figée, le retrait doux.
--
-- `buyer_selections.presented_deck` : à « Terminer », le déroulé entier tel qu'affiché (ses mots,
--   la grille, les phrases « Pourquoi », les faits) ; la relecture lit ce qui est stocké, rien ne
--   se recalcule ensuite. Avant « Terminer », la grille se recalcule sur la fiche du moment.
-- `buyer_selection_items.removed_at` : « Retirer de la sélection » est un retrait DOUX ; le bien
--   quitte la sélection, ses réponses et ses demandes de visite restent.
-- `answer_buyer_item` : sa réponse à un bien et la demande de visite qui en découle, en UNE
--   transaction ; « Je veux le visiter » garde une demande déjà vivante (« depuis le dossier »
--   comprise) au lieu d'en créer une seconde.
-- `finish_buyer_presentation` : « Terminer » en UNE transaction — les disponibilités sur les
--   demandes des biens qu'il veut visiter, puis la date et le déroulé figé.
--
-- Les deux fonctions sont réservées au serveur (clé service) : le navigateur n'a que la lecture.
-- Compatible avec le code de `main` : deux colonnes nullables, deux fonctions neuves, aucune
-- ligne écrite.

alter table public.buyer_selections add column presented_deck jsonb;
comment on column public.buyer_selections.presented_deck is
  'Mission 122 — le déroulé tel qu''affiché à « Terminer » ; la relecture le lit sans recalculer.';

alter table public.buyer_selection_items add column removed_at timestamptz;
comment on column public.buyer_selection_items.removed_at is
  'Mission 122 — retiré de la sélection (retrait doux) ; ses réponses et demandes restent.';

create function public.answer_buyer_item(
  p_agency_id uuid,
  p_item_id uuid,
  p_answer text,
  p_reasons text[]
) returns public.buyer_item_responses
language plpgsql
set search_path = public
as $$
declare
  v_buyer uuid;
  v_presented timestamptz;
  v_archived timestamptz;
  v_removed timestamptz;
  v_now timestamptz := now();
  v_row public.buyer_item_responses;
begin
  select s.buyer_id, s.presented_at, b.archived_at, i.removed_at
    into v_buyer, v_presented, v_archived, v_removed
  from public.buyer_selection_items i
  join public.buyer_selections s on s.id = i.selection_id and s.agency_id = p_agency_id
  join public.buyers b on b.id = s.buyer_id and b.agency_id = p_agency_id
  where i.id = p_item_id and i.agency_id = p_agency_id
  for update of i;
  if v_buyer is null then
    raise exception 'buyer_item_not_found' using errcode = 'P0002';
  end if;
  if v_archived is not null then
    raise exception 'buyer_archived' using errcode = 'P0001';
  end if;
  if v_presented is not null then
    raise exception 'presentation_finished' using errcode = 'P0001';
  end if;
  if v_removed is not null then
    raise exception 'item_removed' using errcode = 'P0001';
  end if;

  insert into public.buyer_item_responses
    (agency_id, buyer_id, selection_item_id, answer, reasons, answered_during, answered_at)
  values
    (p_agency_id, v_buyer, p_item_id, p_answer,
     case when p_answer = 'no' then coalesce(p_reasons, '{}') else '{}' end,
     'presentation', v_now)
  on conflict (selection_item_id, answered_during) do update
    set answer = excluded.answer,
        reasons = excluded.reasons,
        -- La date est celle de la réponse : toucher une raison ne la redate pas.
        answered_at = case
          when public.buyer_item_responses.answer = excluded.answer
            then public.buyer_item_responses.answered_at
          else excluded.answered_at
        end
  returning * into v_row;

  if p_answer = 'visit' then
    if not exists (
      select 1 from public.buyer_visit_requests
      where buyer_selection_item_id = p_item_id and agency_id = p_agency_id
        and cancelled_at is null and visited_at is null
    ) then
      insert into public.buyer_visit_requests
        (agency_id, buyer_id, buyer_selection_item_id, requested_during)
      values (p_agency_id, v_buyer, p_item_id, 'presentation');
    end if;
  else
    -- Une autre réponse annule la demande faite PENDANT la présentation ; une demande « depuis le
    -- dossier » est un choix de l'acquéreur, elle reste.
    update public.buyer_visit_requests
      set cancelled_at = v_now
    where buyer_selection_item_id = p_item_id and agency_id = p_agency_id
      and requested_during = 'presentation' and cancelled_at is null and visited_at is null;
  end if;
  return v_row;
end;
$$;

create function public.finish_buyer_presentation(
  p_agency_id uuid,
  p_selection_id uuid,
  p_deck jsonb,
  p_availability text[]
) returns boolean
language plpgsql
set search_path = public
as $$
declare
  v_presented timestamptz;
  v_found boolean;
begin
  select true, presented_at into v_found, v_presented
  from public.buyer_selections
  where id = p_selection_id and agency_id = p_agency_id
  for update;
  if v_found is null then
    raise exception 'buyer_selection_not_found' using errcode = 'P0002';
  end if;
  -- Déjà terminée : rien ne se réécrit.
  if v_presented is not null then
    return false;
  end if;

  if cardinality(coalesce(p_availability, '{}')) > 0 then
    update public.buyer_visit_requests r
      set availability = p_availability
    from public.buyer_selection_items i, public.buyer_item_responses a
    where r.buyer_selection_item_id = i.id
      and i.selection_id = p_selection_id and i.agency_id = p_agency_id
      and r.agency_id = p_agency_id and r.cancelled_at is null and r.visited_at is null
      and a.selection_item_id = i.id and a.answered_during = 'presentation' and a.answer = 'visit';
  end if;

  update public.buyer_selections
    set presented_at = now(), presented_deck = p_deck
  where id = p_selection_id and agency_id = p_agency_id;
  return true;
end;
$$;

revoke all on function public.answer_buyer_item(uuid, uuid, text, text[]) from public, anon, authenticated;
revoke all on function public.finish_buyer_presentation(uuid, uuid, jsonb, text[]) from public, anon, authenticated;
grant execute on function public.answer_buyer_item(uuid, uuid, text, text[]) to service_role;
grant execute on function public.finish_buyer_presentation(uuid, uuid, jsonb, text[]) to service_role;
