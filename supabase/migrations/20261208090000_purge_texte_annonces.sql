-- Mission 152 (partie B) — le texte des annonces, gardé pour le conseiller seul (la fiche complète
-- d'un bien), suit la purge à 3 ans (M102), comme l'adresse d'un propriétaire et la copie de
-- l'annonce (décisions de Jean-Guy, 11/11) :
--   1. un bien retenu dans une sélection d'acquéreur perd, 3 ans après sa date dans la sélection,
--      la description, le titre, l'adresse lue sur l'annonce et les adresses des photos d'origine
--      (ce que la recherche en a dit, `snapshot`, et ce que l'import en a lu, `imported`) ; le reste
--      de la ligne (libellé neutre, prix, photos de la recherche, réponses) ne bouge pas, et une
--      nouvelle sélection, qui recopie le bien dans une ligne neuve, fait repartir le délai ;
--   2. le résultat payé d'une recherche gardé sur un dossier (`stream_estate_results`, M105) part
--      3 ans après sa dernière mise à jour ;
--   3. le texte de l'annonce d'un concurrent (`comparables.listing_description`, M49) est vidé quand
--      rien ne s'est passé depuis 3 ans — la même règle que la copie de l'annonce (M152 A).
-- Ni table ni colonne : compatible avec le code de `main`. Lancée chaque nuit par pg_cron, en
-- propriétaire ; fermée au navigateur.

set local lock_timeout = '5s';

create function public.purge_stale_listing_texts()
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
        -- Un champ vide ne garde pas sa pastille « À vérifier » (M97).
        fields_to_verify = array_remove(c.fields_to_verify, 'listing_description')
    where c.listing_description is not null
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
  )
  select ((select count(*) from items) + (select count(*) from results) + (select count(*) from texts))::integer
$$;

revoke all on function public.purge_stale_listing_texts() from public, anon, authenticated;
grant execute on function public.purge_stale_listing_texts() to service_role;

-- Tous les jours à 3 h 30 (UTC), après les purges des adresses (3 h 27), des copies (3 h 28) et des
-- biens démarchés (3 h 29).
select cron.schedule(
  'purge-stale-listing-texts',
  '30 3 * * *',
  $$select public.purge_stale_listing_texts()$$
);
