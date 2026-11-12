-- Mission 151 (partie B) — les citations que la veille garde avec ses passages
-- (`buyer_watch_runs.finds`, le jugement de ce qui compte pour l'acquéreur et sa citation courte)
-- suivent la purge à 3 ans du texte des annonces (M152 B), par la même fonction de nuit (décision
-- de Jean-Guy, 12/11) : 3 ans après le passage, chaque citation devient vide, le jugement reste.
-- Une fonction modifiée, rien d'autre : ni table, ni colonne, ni droit, ni tâche planifiée nouvelle
-- (la tâche « purge-stale-listing-texts » de 3 h 30 appelle déjà cette fonction). Compatible avec
-- le code de `main`, qui n'écrit pas de citation. Fermée au navigateur, comme avant.

set local lock_timeout = '5s';

create or replace function public.purge_stale_listing_texts()
returns integer
language sql
security invoker
set search_path = public
as $$
  with items as (
    update public.buyer_selection_items i
    set snapshot = case
          when i.snapshot is null then null
          else ((i.snapshot #- '{streamEstate,description}'::text[])
                 #- '{streamEstate,originalPhotos}'::text[]) - 'title'::text
        end,
        imported = case
          when i.imported is null then null
          else i.imported - 'listingDescription'::text - 'title'::text - 'address'::text
        end
    where i.created_at < now() - interval '3 years'
      and (
        i.snapshot #> '{streamEstate,description}' is not null
        or i.snapshot #> '{streamEstate,originalPhotos}' is not null
        or i.snapshot ? 'title'
        or i.imported ? 'listingDescription'
        or i.imported ? 'title'
        or i.imported ? 'address'
      )
    returning 1
  ),
  results as (
    delete from public.stream_estate_results r
    where r.updated_at < now() - interval '3 years'
    returning 1
  ),
  texts as (
    update public.comparables c
    set listing_description = null,
        title = null,
        -- Un champ vide ne garde pas sa pastille « À vérifier » (M97).
        fields_to_verify = array_remove(
          array_remove(c.fields_to_verify, 'listing_description'), 'title')
    where (c.listing_description is not null or c.title is not null)
      and greatest(
            c.created_at,
            c.locator_address_at,
            c.prospecting_handed_at,
            c.prospecting_meeting_at,
            c.prospecting_mandate_at,
            c.prospecting_declined_at,
            c.prospecting_collaboration_at,
            c.prospecting_collaboration_declined_at
          ) < now() - interval '3 years'
    returning 1
  ),
  -- 4. (Mission 151 B) Les citations gardées par la veille avec ses passages : 3 ans après le
  --    passage, chaque citation devient vide ; le jugement (« clairement », « avec réserve »…) et
  --    tout le reste du passage restent.
  runs as (
    update public.buyer_watch_runs w
    set finds = (
      select coalesce(jsonb_agg(
               case
                 when jsonb_typeof(f #> '{soft,judgments}') = 'array' then
                   jsonb_set(f, '{soft,judgments}', (
                     select coalesce(jsonb_agg(
                              j || '{"quote": null, "counterQuote": null}'::jsonb
                              order by n), '[]'::jsonb)
                     from jsonb_array_elements(f #> '{soft,judgments}') with ordinality as q(j, n)))
                 else f
               end
               order by o), '[]'::jsonb)
      from jsonb_array_elements(w.finds) with ordinality as e(f, o)
    )
    where w.ran_at < now() - interval '3 years'
      and jsonb_path_exists(
            w.finds,
            '$[*].soft.judgments[*] ? (@.quote != null || @.counterQuote != null)')
    returning 1
  )
  select ((select count(*) from items) + (select count(*) from results) + (select count(*) from texts)
          + (select count(*) from runs))::integer
$$;

revoke all on function public.purge_stale_listing_texts() from public, anon, authenticated;
grant execute on function public.purge_stale_listing_texts() to service_role;
