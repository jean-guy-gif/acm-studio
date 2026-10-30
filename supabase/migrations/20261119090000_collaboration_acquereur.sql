-- Mission 120 (partie B) — la collaboration au confrère, et ce que la partie A a laissé ouvert.
--
-- 1. `detach_buyer_origins` : le miroir de `absorb_buyer_prospect` (M120 A, décision du 29/10).
--    Un concurrent qui cesse de porter une carte de Prospection — son mandat signé passé « vendu
--    ailleurs » ou « retiré », retiré des retenus, archivé, ou supprimé — ne laisse jamais une
--    origine « Recherche acquéreur » sans carte :
--    - avec une autre copie du même bien qui porte encore la carte (M98), les origines y passent ;
--    - sinon, le bien redevient un bien démarché (`buyer_prospects`) avec tous ses faits — annonce,
--      faits publiés (relus par le serveur, liste d'autorisation), adresse et sa provenance,
--      contact, remise, rendez-vous, mandat, collaboration, « Vendu par » et « Exclusivité » avec
--      leur provenance —, et les origines et leurs courriers passent sur lui.
--    Le concurrent garde ses propres faits ; si le mandat redevient signé, l'absorption repasse.
--    Réservée à la clé service, appelée par le serveur seul. `locator_address_at` n'est pas
--    recopiée : le déclencheur la redate (M102), comme à l'absorption ; `locator_purged_at` l'est.
--    Les CHECK de M115 sont identiques des deux côtés : la copie les satisfait.
-- 2. `comparables.first_seen_on` (noté le 30/10, M127 B) : le jour où la recherche des nouveaux
--    venus a vu le bien sur le marché (le `createdAt` de Stream Estate, jour de Paris), posé une
--    fois par le serveur quand un nouveau venu est retenu. Nulle par défaut ; les 3 nouveaux venus
--    déjà retenus n'en ont pas (la date n'a pas été gardée, rien n'est reconstitué, M56).
--
-- Compatible avec le code de `main` : deux colonnes nulles qu'il ne lit pas, une fonction qu'il
-- n'appelle pas ; aucune ligne écrite.

alter table public.comparables
  add column first_seen_on date check (first_seen_on >= date '2000-01-01');

comment on column public.comparables.first_seen_on is
  'Mission 120 B — le jour où la recherche des nouveaux venus a vu ce bien sur le marché (date de Stream Estate, jour de Paris) ; posé une fois par le serveur à la retenue.';

-- 3. Le dossier de collaboration au confrère d'une recherche acquéreur (M120 B) : sa question
--    (« Votre mandat est-il ouvert à la collaboration pour une visite de mon acquéreur ? ») est
--    modifiable, comme le titre, la lettre et l'accroche ; seul ce qui diffère du texte proposé est
--    gardé (M84). Nulle par défaut ; `letter_version` accepte déjà 'colleague'.
alter table public.buyer_prospect_origins
  add column letter_question text check (length(letter_question) <= 300);

create function public.detach_buyer_origins(
  p_agency_id uuid,
  p_comparable_id uuid,
  p_listing_key text,
  p_facts jsonb,
  p_target_comparable_id uuid default null
)
returns integer
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_comparable public.comparables%rowtype;
  v_prospect_id uuid;
  v_moved integer;
begin
  select * into v_comparable
  from public.comparables
  where id = p_comparable_id and agency_id = p_agency_id;
  if not found then
    raise exception 'detach_buyer_origins : le concurrent n''est pas de cette agence'
      using errcode = 'check_violation';
  end if;

  perform 1 from public.buyer_prospect_origins
  where comparable_id = p_comparable_id and agency_id = p_agency_id
  for update;
  if not found then
    return 0;
  end if;

  -- Une autre copie du même bien porte encore la carte : les origines y passent, c'est tout.
  if p_target_comparable_id is not null then
    -- La cible est une autre copie RETENUE de la même annonce, dans la même agence (relecture du
    -- gardien-sql : une cible qui ne porte pas de carte recréerait l'origine sans carte).
    if p_target_comparable_id = p_comparable_id or not exists (
      select 1 from public.comparables
      where id = p_target_comparable_id
        and agency_id = p_agency_id
        and is_selected
        and listing_url is not distinct from v_comparable.listing_url
        and listing_url is not null
    ) then
      raise exception 'detach_buyer_origins : la copie cible n''est pas une copie retenue de la même annonce'
        using errcode = 'check_violation';
    end if;
    update public.buyer_prospect_origins
    set comparable_id = p_target_comparable_id, updated_at = now()
    where comparable_id = p_comparable_id and agency_id = p_agency_id;
    get diagnostics v_moved = row_count;
    return v_moved;
  end if;

  if v_comparable.listing_url is null or v_comparable.listing_url !~ '^https?://'
     or length(v_comparable.listing_url) > 2000 then
    raise exception 'detach_buyer_origins : un concurrent sans annonce garde ses origines'
      using errcode = 'check_violation';
  end if;
  if p_facts is null or jsonb_typeof(p_facts) <> 'object' then
    raise exception 'detach_buyer_origins : les faits sont un objet'
      using errcode = 'check_violation';
  end if;

  -- Le bien redevient un bien démarché, avec tous ses faits. S'il en existe déjà un pour cette
  -- annonce (une carte par bien et par agence), il garde ce qu'il sait et reçoit du concurrent ce
  -- qui lui manque — comme l'absorption, dans l'autre sens ; une annonce différente sous la même
  -- clé est refusée (relecture du gardien-sql).
  insert into public.buyer_prospects (
    agency_id, listing_url, listing_key, facts,
    sold_by, sold_by_source, exclusivity, exclusivity_source,
    locator_state, locator_label, locator_label_key, locator_address, locator_source,
    locator_confirmed, locator_property_id, locator_latitude, locator_longitude,
    locator_analyzed_at, locator_purged_at,
    prospecting_handed_at, prospecting_meeting_at, prospecting_mandate_at,
    prospecting_declined_at, prospecting_collaboration_at, prospecting_collaboration_declined_at
  ) values (
    p_agency_id, v_comparable.listing_url, p_listing_key, p_facts,
    v_comparable.sold_by, v_comparable.sold_by_source,
    v_comparable.exclusivity, v_comparable.exclusivity_source,
    v_comparable.locator_state, v_comparable.locator_label, v_comparable.locator_label_key,
    v_comparable.locator_address, v_comparable.locator_source, v_comparable.locator_confirmed,
    v_comparable.locator_property_id, v_comparable.locator_latitude, v_comparable.locator_longitude,
    v_comparable.locator_analyzed_at, v_comparable.locator_purged_at,
    v_comparable.prospecting_handed_at, v_comparable.prospecting_meeting_at,
    v_comparable.prospecting_mandate_at, v_comparable.prospecting_declined_at,
    v_comparable.prospecting_collaboration_at, v_comparable.prospecting_collaboration_declined_at
  )
  on conflict (agency_id, listing_key) do nothing
  returning id into v_prospect_id;

  if v_prospect_id is null then
    select id into v_prospect_id
    from public.buyer_prospects
    where agency_id = p_agency_id and listing_key = p_listing_key and listing_url = v_comparable.listing_url
    for update;
    if v_prospect_id is null then
      raise exception 'detach_buyer_origins : un autre bien démarché porte cette clé'
        using errcode = 'check_violation';
    end if;
    update public.buyer_prospects p set
      locator_state = case when p.locator_address is null then v_comparable.locator_state else p.locator_state end,
      locator_label = case when p.locator_address is null then v_comparable.locator_label else p.locator_label end,
      locator_label_key = case when p.locator_address is null then v_comparable.locator_label_key else p.locator_label_key end,
      locator_source = case when p.locator_address is null then v_comparable.locator_source else p.locator_source end,
      locator_confirmed = case when p.locator_address is null then v_comparable.locator_confirmed else p.locator_confirmed end,
      locator_property_id = case when p.locator_address is null then v_comparable.locator_property_id else p.locator_property_id end,
      locator_latitude = case when p.locator_address is null then v_comparable.locator_latitude else p.locator_latitude end,
      locator_longitude = case when p.locator_address is null then v_comparable.locator_longitude else p.locator_longitude end,
      locator_analyzed_at = case when p.locator_address is null then v_comparable.locator_analyzed_at else p.locator_analyzed_at end,
      locator_purged_at = case when p.locator_address is null then v_comparable.locator_purged_at else p.locator_purged_at end,
      locator_address = coalesce(p.locator_address, v_comparable.locator_address),
      prospecting_handed_at = coalesce(p.prospecting_handed_at, v_comparable.prospecting_handed_at),
      prospecting_meeting_at = coalesce(p.prospecting_meeting_at, v_comparable.prospecting_meeting_at),
      -- Jamais un mandat rentré à côté d'une collaboration obtenue (CHECK de M115).
      prospecting_mandate_at = case when p.prospecting_collaboration_at is not null then p.prospecting_mandate_at
        else coalesce(p.prospecting_mandate_at, v_comparable.prospecting_mandate_at) end,
      prospecting_declined_at = coalesce(p.prospecting_declined_at, v_comparable.prospecting_declined_at),
      prospecting_collaboration_at = case
        when p.prospecting_collaboration_at is null and p.prospecting_collaboration_declined_at is null
          and p.prospecting_mandate_at is null and coalesce(p.prospecting_handed_at, v_comparable.prospecting_handed_at) is not null
        then v_comparable.prospecting_collaboration_at else p.prospecting_collaboration_at end,
      prospecting_collaboration_declined_at = case
        when p.prospecting_collaboration_at is null and p.prospecting_collaboration_declined_at is null
          and coalesce(p.prospecting_handed_at, v_comparable.prospecting_handed_at) is not null
        then v_comparable.prospecting_collaboration_declined_at else p.prospecting_collaboration_declined_at end,
      sold_by_source = case when p.sold_by is null then v_comparable.sold_by_source else p.sold_by_source end,
      sold_by = coalesce(p.sold_by, v_comparable.sold_by),
      exclusivity_source = case when p.exclusivity is null then v_comparable.exclusivity_source else p.exclusivity_source end,
      exclusivity = coalesce(p.exclusivity, v_comparable.exclusivity),
      updated_at = now()
    where p.id = v_prospect_id;
  end if;

  update public.buyer_prospect_origins
  set comparable_id = null, prospect_id = v_prospect_id, updated_at = now()
  where comparable_id = p_comparable_id and agency_id = p_agency_id;
  get diagnostics v_moved = row_count;
  return v_moved;
end $$;

revoke all on function public.detach_buyer_origins(uuid, uuid, text, jsonb, uuid) from public, anon, authenticated;
grant execute on function public.detach_buyer_origins(uuid, uuid, text, jsonb, uuid) to service_role;
