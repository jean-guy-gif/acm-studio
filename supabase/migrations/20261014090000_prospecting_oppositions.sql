-- Mission 98 — « Ne plus solliciter » : la liste d'opposition d'une agence.
--
-- Une personne qui demande à ne plus être contactée ne doit plus l'être, dans AUCUN dossier de
-- l'agence, présent ou futur. La liste porte sur l'adresse NORMALISÉE du bien (la clé calculée
-- par `addressKey`, src/features/prospecting/services/address-key.ts) : aucun nom, aucun lien
-- vers un concurrent — la ligne survit donc à l'effacement de ce concurrent
-- (docs/PROCEDURE_EFFACEMENT.md), qui l'alimente lui aussi.
--
-- Compatible avec le code de `main` : une table NEUVE, que `main` ne lit ni n'écrit. En fin de
-- fichier, une recopie unique d'adresses confirmées entre copies d'un même bien : des colonnes
-- que `main` lit déjà, avec des valeurs qu'il sait lire (0 ligne prévue sur la base partagée).
--
-- Droits : les membres non retirés de l'agence LISENT et AJOUTENT ; personne ne modifie ni ne
-- retire une ligne depuis le navigateur (une opposition ne s'annule pas d'un clic). L'ajout ne
-- choisit ni la date ni l'origine : seules trois colonnes sont ouvertes à l'insertion.

create table public.prospecting_oppositions (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  address_key text not null
    check (address_key ~ '^[a-z0-9]+( [a-z0-9]+)*$' and char_length(address_key) <= 300),
  -- La date de la demande : « Ne plus solliciter (demandé le JJ/MM) ».
  requested_at timestamptz not null default now(),
  -- 'advisor' : le bouton de la carte ; 'erasure' : la procédure d'effacement.
  source text not null default 'advisor' check (source in ('advisor', 'erasure')),
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (agency_id, address_key)
);

comment on table public.prospecting_oppositions is
  'Liste « Ne plus solliciter » d''une agence, sur l''adresse normalisée du bien (mission 98).';

alter table public.prospecting_oppositions enable row level security;

create policy prospecting_oppositions_agency_read
  on public.prospecting_oppositions
  for select
  to authenticated
  using (agency_id = public.get_current_agency_id());

create policy prospecting_oppositions_agency_insert
  on public.prospecting_oppositions
  for insert
  to authenticated
  with check (agency_id = public.get_current_agency_id() and created_by = auth.uid());

revoke all on public.prospecting_oppositions from anon;
revoke all on public.prospecting_oppositions from authenticated;
grant select on public.prospecting_oppositions to authenticated;
grant insert (agency_id, address_key, created_by) on public.prospecting_oppositions to authenticated;

-- ---------------------------------------------------------------------------------------------
-- Recopie UNIQUE de l'adresse confirmée vers les copies de la même carte qui n'en ont pas.
--
-- Une carte de Prospection, c'est un bien : le même concurrent retenu dans plusieurs mandats
-- signés. Depuis la mission 98, confirmer une adresse l'écrit sur toutes les copies ; ce rattrapage
-- aligne les copies d'AVANT. Seules les copies liées par l'identité publiée de leur annonce
-- (portail + dernier segment du chemin, la règle d'`extractListingKey`) sont concernées : celles
-- que lie leur adresse confirmée en ont, par définition, déjà une.
--
-- Prudence : rien n'est recopié quand les copies confirmées d'une même annonce ne disent pas la
-- même adresse (on ne choisit pas à la place du conseiller), et une copie déjà confirmée n'est
-- jamais réécrite. Mesuré sur la base partagée le 11/10 : 56 copies à prospecter, 11 avec une
-- annonce reconnue, aucune annonce retenue deux fois → prédiction : 0 ligne modifiée.
-- ---------------------------------------------------------------------------------------------
do $$
declare
  v_rows int;
begin
  with open_copies as (
    select c.id, c.agency_id, c.updated_at,
           nullif(btrim(c.locator_address), '') as address,
           lower(substring(btrim(c.listing_url) from '^https?://([^/:?#]+)')) as host,
           (regexp_match(
              rtrim(regexp_replace(split_part(split_part(btrim(c.listing_url), '#', 1), '?', 1),
                                   '^https?://[^/]+', ''), '/'),
              '([^/]+)$'))[1] as listing_key,
           c.locator_confirmed is true as confirmed
    from public.comparables c
    join public.projects p on p.id = c.project_id and p.status = 'meeting_completed'
    join public.project_meeting_conclusions m on m.project_id = c.project_id and m.outcome = 'signed'
    where c.is_selected
  ), keyed as (
    select *, case
        when host ~ '(^|\.)seloger\.com$' then 'seloger'
        when host ~ '(^|\.)bienici\.com$' then 'bienici'
        when host ~ '(^|\.)green-acres\.fr$' then 'greenacres'
        when host ~ '(^|\.)maisonsetappartements\.fr$' then 'maisonsetappartements'
      end as portal
    from open_copies
  ), sources as (
    -- Une seule adresse confirmée par annonce et par agence ; la copie la plus récente la porte.
    select distinct on (agency_id, portal, listing_key) agency_id, portal, listing_key, id
    from keyed k
    where portal is not null and char_length(listing_key) >= 3 and confirmed and address is not null
      and (select count(distinct lower(o.address)) from keyed o
            where o.agency_id = k.agency_id and o.portal = k.portal
              and o.listing_key = k.listing_key and o.confirmed and o.address is not null) = 1
    order by agency_id, portal, listing_key, updated_at desc
  )
  update public.comparables target
  set locator_address = source.locator_address,
      locator_confirmed = true,
      locator_source = source.locator_source,
      locator_label = source.locator_label,
      locator_label_key = source.locator_label_key,
      locator_state = source.locator_state,
      locator_latitude = source.locator_latitude,
      locator_longitude = source.locator_longitude,
      locator_property_id = source.locator_property_id,
      locator_analyzed_at = source.locator_analyzed_at,
      updated_at = now()
  from keyed k
  join sources s on s.agency_id = k.agency_id and s.portal = k.portal and s.listing_key = k.listing_key
  join public.comparables source on source.id = s.id
  where target.id = k.id and not (k.confirmed and k.address is not null);

  get diagnostics v_rows = row_count;
  raise notice 'Mission 98 — adresses recopiées vers des copies de la même carte : %', v_rows;
end $$;
