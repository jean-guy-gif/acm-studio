-- Mission 122 (partie B) — la réponse de l'acquéreur depuis le lien du dossier, en UNE transaction.
--
-- `submit_buyer_dossier_answers` : sur la sélection du lien, les réponses « depuis le lien »
-- (visiter, peut-être, pas pour moi et ses raisons) et, pour chaque « Je veux le visiter », la
-- demande de visite avec ses créneaux — une demande déjà vivante (pendant la présentation, par
-- exemple) reçoit les créneaux en plus, sans doublon, jamais en écrasement ; sinon une demande
-- « depuis le dossier » naît. Une seule réponse : si la sélection a déjà une réponse « depuis le
-- lien », tout est refusé (« Merci, j'ai bien reçu votre réponse »). Un acquéreur archivé, un bien
-- retiré ou hors de la sélection : refusé. La sélection est verrouillée le temps de l'écriture.
--
-- Réservée au serveur (clé service), après la vérification du jeton : le navigateur n'a que la
-- lecture. Compatible avec le code de `main` : une fonction neuve, aucune ligne écrite.

create function public.submit_buyer_dossier_answers(
  p_agency_id uuid,
  p_selection_id uuid,
  p_answers jsonb,
  p_availability text[]
) returns integer
language plpgsql
set search_path = public
as $$
declare
  v_buyer uuid;
  v_archived timestamptz;
  v_answer jsonb;
  v_item uuid;
  v_kind text;
  v_reasons text[];
  v_slots text[];
  v_count integer := 0;
begin
  select s.buyer_id, b.archived_at into v_buyer, v_archived
  from public.buyer_selections s
  join public.buyers b on b.id = s.buyer_id and b.agency_id = p_agency_id
  where s.id = p_selection_id and s.agency_id = p_agency_id
  for update of s;
  if v_buyer is null then
    raise exception 'buyer_selection_not_found' using errcode = 'P0002';
  end if;
  if v_archived is not null then
    raise exception 'buyer_archived' using errcode = 'P0001';
  end if;
  if exists (
    select 1
    from public.buyer_item_responses r
    join public.buyer_selection_items i on i.id = r.selection_item_id
    where i.selection_id = p_selection_id and r.answered_during = 'dossier'
  ) then
    raise exception 'already_answered' using errcode = 'P0001';
  end if;
  if p_answers is null or jsonb_typeof(p_answers) <> 'array' or jsonb_array_length(p_answers) = 0 then
    raise exception 'no_answer' using errcode = 'P0001';
  end if;

  -- Les créneaux, dans l'ordre de la liste fermée, sans doublon.
  v_slots := array(
    select slot
    from unnest(array['sat_morning', 'sat_afternoon', 'sunday', 'weekday_day', 'weekday_evening']::text[])
      with ordinality as slots(slot, rank)
    where slot = any(coalesce(p_availability, '{}'))
    order by rank
  );

  for v_answer in select value from jsonb_array_elements(p_answers) loop
    v_item := (v_answer ->> 'itemId')::uuid;
    v_kind := v_answer ->> 'answer';
    v_reasons := case
      when v_kind = 'no' and jsonb_typeof(v_answer -> 'reasons') = 'array'
        then array(select jsonb_array_elements_text(v_answer -> 'reasons'))
      else '{}'
    end;
    if not exists (
      select 1 from public.buyer_selection_items
      where id = v_item and selection_id = p_selection_id and agency_id = p_agency_id
        and removed_at is null
    ) then
      raise exception 'item_not_in_selection' using errcode = 'P0001';
    end if;

    insert into public.buyer_item_responses
      (agency_id, buyer_id, selection_item_id, answer, reasons, answered_during)
    values (p_agency_id, v_buyer, v_item, v_kind, v_reasons, 'dossier');

    if v_kind = 'visit' then
      update public.buyer_visit_requests r
        set availability = array(
          select slot
          from unnest(array['sat_morning', 'sat_afternoon', 'sunday', 'weekday_day', 'weekday_evening']::text[])
            with ordinality as slots(slot, rank)
          where slot = any(r.availability || v_slots)
          order by rank
        )
      where r.buyer_selection_item_id = v_item and r.agency_id = p_agency_id
        and r.cancelled_at is null and r.visited_at is null;
      if not found then
        insert into public.buyer_visit_requests
          (agency_id, buyer_id, buyer_selection_item_id, requested_during, availability)
        values (p_agency_id, v_buyer, v_item, 'dossier', v_slots);
      end if;
    end if;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

revoke all on function public.submit_buyer_dossier_answers(uuid, uuid, jsonb, text[]) from public, anon, authenticated;
grant execute on function public.submit_buyer_dossier_answers(uuid, uuid, jsonb, text[]) to service_role;
