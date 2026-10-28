-- Mission 120 (partie A, décisions de Jean-Guy du 28/10) — une carte par bien, dans les DEUX sens.
--
-- 1. Quand une annonce déjà démarchée depuis une recherche acquéreur (`buyer_prospects`) est
--    retenue comme concurrent d'un dossier vendeur, le concurrent REPREND les faits de la carte
--    existante — contact, remise, rendez-vous, mandat, « pas intéressé », collaboration, adresse,
--    « Vendu par » et « Exclusivité » avec leur provenance — et la carte reçoit en plus l'origine
--    « Dossier vendeur » : les origines « Recherche acquéreur » passent sur le concurrent, le bien
--    démarché disparaît. Jamais de seconde carte. `absorb_buyer_prospect`, réservée à la clé
--    service, appelée par le serveur après chaque insertion de concurrent (`insertCompetitor`).
--    L'opposition n'a rien à transférer : elle suit l'annonce et l'adresse (M102).
-- 2. « Vendu par » et « Exclusivité » se posent d'un clic sur une carte acquéreur, comme sur un
--    concurrent (M83) : leur provenance se garde (`sold_by_source`, `exclusivity_source`, même
--    liste que `comparables`), pour que le concurrent la reprenne sans rien inventer.
--
-- Compatible avec le code de `main` : deux colonnes nulles, une fonction ; aucune ligne écrite.

alter table public.buyer_prospects
  add column sold_by_source text check (sold_by_source in ('listing_data', 'badge', 'advertiser', 'title', 'description', 'no_mention', 'advisor')),
  add column exclusivity_source text check (exclusivity_source in ('listing_data', 'badge', 'advertiser', 'title', 'description', 'no_mention', 'advisor'));

create function public.absorb_buyer_prospect(
  p_agency_id uuid,
  p_comparable_id uuid,
  p_listing_key text
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_prospect public.buyer_prospects%rowtype;
begin
  select * into v_prospect
  from public.buyer_prospects
  where agency_id = p_agency_id and listing_key = p_listing_key
  for update;
  if not found then
    return 0;
  end if;
  if not exists (
    select 1 from public.comparables where id = p_comparable_id and agency_id = p_agency_id
  ) then
    raise exception 'absorb_buyer_prospect : le concurrent n''est pas de cette agence'
      using errcode = 'check_violation';
  end if;

  -- Le concurrent reprend les faits de la carte ; ce qu'il sait déjà n'est pas écrasé.
  update public.comparables c set
    locator_state = case when c.locator_address is null then v_prospect.locator_state else c.locator_state end,
    locator_label = case when c.locator_address is null then v_prospect.locator_label else c.locator_label end,
    locator_label_key = case when c.locator_address is null then v_prospect.locator_label_key else c.locator_label_key end,
    locator_source = case when c.locator_address is null then v_prospect.locator_source else c.locator_source end,
    locator_confirmed = case when c.locator_address is null then v_prospect.locator_confirmed else c.locator_confirmed end,
    locator_property_id = case when c.locator_address is null then v_prospect.locator_property_id else c.locator_property_id end,
    locator_latitude = case when c.locator_address is null then v_prospect.locator_latitude else c.locator_latitude end,
    locator_longitude = case when c.locator_address is null then v_prospect.locator_longitude else c.locator_longitude end,
    locator_analyzed_at = case when c.locator_address is null then v_prospect.locator_analyzed_at else c.locator_analyzed_at end,
    locator_purged_at = case when c.locator_address is null then v_prospect.locator_purged_at else c.locator_purged_at end,
    locator_address = coalesce(c.locator_address, v_prospect.locator_address),
    prospecting_handed_at = coalesce(c.prospecting_handed_at, v_prospect.prospecting_handed_at),
    prospecting_meeting_at = coalesce(c.prospecting_meeting_at, v_prospect.prospecting_meeting_at),
    prospecting_mandate_at = coalesce(c.prospecting_mandate_at, v_prospect.prospecting_mandate_at),
    prospecting_declined_at = coalesce(c.prospecting_declined_at, v_prospect.prospecting_declined_at),
    prospecting_collaboration_at = coalesce(c.prospecting_collaboration_at, v_prospect.prospecting_collaboration_at),
    prospecting_collaboration_declined_at = coalesce(c.prospecting_collaboration_declined_at, v_prospect.prospecting_collaboration_declined_at),
    sold_by_source = case when c.sold_by is null then v_prospect.sold_by_source else c.sold_by_source end,
    sold_by = coalesce(c.sold_by, v_prospect.sold_by),
    exclusivity_source = case when c.exclusivity is null then v_prospect.exclusivity_source else c.exclusivity_source end,
    exclusivity = coalesce(c.exclusivity, v_prospect.exclusivity),
    updated_at = now()
  where c.id = p_comparable_id;

  -- Les recherches acquéreur et leurs courriers suivent la carte.
  update public.buyer_prospect_origins
  set prospect_id = null, comparable_id = p_comparable_id, updated_at = now()
  where prospect_id = v_prospect.id;

  delete from public.buyer_prospects where id = v_prospect.id;
  return 1;
end $$;

revoke all on function public.absorb_buyer_prospect(uuid, uuid, text) from public, anon, authenticated;
grant execute on function public.absorb_buyer_prospect(uuid, uuid, text) to service_role;
