-- Mission 102 — Une prospection irréprochable.
--
-- Compatible avec le code de `main` : des colonnes NOUVELLES et nullables, une contrainte
-- desserrée, une fonction et une tâche planifiée. `main` continue d'inscrire une opposition par
-- sa clé d'adresse (`address_key` renseignée, `listing_key` absente) ; une ligne qui ne porte
-- qu'une annonce (`address_key` nulle) lui est simplement invisible.
--
--   1. prospecting_oppositions.listing_key — l'opposition suit le BIEN : la liste garde aussi
--      l'identité publiée de son annonce (portail + numéro, M47). Une ligne porte l'une des deux
--      clés, jamais les deux.
--   2. agency_branding — qui a délivré la carte professionnelle, et la garantie financière.
--   3. comparables.locator_address_at — depuis quand l'adresse du bien est connue ; un
--      déclencheur la date, le code n'y écrit pas. Et locator_purged_at, posée par la purge.
--   4. purge_stale_owner_addresses() — chaque nuit, une adresse sans contact ni statut depuis
--      3 ans est effacée (même purge nocturne que le journal des erreurs, M100).
--
-- Comptage sur la base partagée, le 12/10/2026 : 0 opposition, 8 adresses (la plus ancienne du
-- 11/10/2026), 0 carte professionnelle. Prédiction : 8 lignes datées au point 3, 0 adresse purgée.

-- ---------------------------------------------------------------------------------------------
-- 1. L'opposition par l'annonce.
-- ---------------------------------------------------------------------------------------------
alter table public.prospecting_oppositions
  add column listing_key text
    check (listing_key is null
           or (listing_key ~ '^[a-z]+:\S+$' and char_length(listing_key) between 5 and 200)),
  alter column address_key drop not null,
  add constraint prospecting_oppositions_one_key_check
    check (num_nonnulls(address_key, listing_key) = 1);

create unique index prospecting_oppositions_listing_key_idx
  on public.prospecting_oppositions (agency_id, listing_key)
  where listing_key is not null;

comment on column public.prospecting_oppositions.listing_key is
  'Identité publiée de l''annonce du bien (portail:numéro) : l''opposition suit le bien dans un futur dossier (mission 102).';
comment on table public.prospecting_oppositions is
  'Liste « Ne plus solliciter » d''une agence : la clé d''adresse de l''immeuble, ou l''identité de l''annonce du bien (missions 98 et 102).';

-- L'ajout ne choisit toujours ni la date ni l'origine.
grant insert (listing_key) on public.prospecting_oppositions to authenticated;

-- ---------------------------------------------------------------------------------------------
-- 2. Les mentions de l'agence. Écrites par le serveur (clé service) après le garde de rôle (M88).
-- ---------------------------------------------------------------------------------------------
alter table public.agency_branding
  add column professional_card_issuer text,
  add column financial_guarantee text,
  add constraint agency_branding_professional_card_issuer_check
    check (professional_card_issuer is null or char_length(professional_card_issuer) <= 80),
  add constraint agency_branding_financial_guarantee_check
    check (financial_guarantee is null or char_length(financial_guarantee) <= 160);

comment on column public.agency_branding.professional_card_issuer is
  'La CCI ou la préfecture qui a délivré la carte professionnelle. Exigée, avec le numéro, pour imprimer un courrier de prospection.';
comment on column public.agency_branding.financial_guarantee is
  'Garantie financière de l''agence. Null : les courriers portent « Ne peut recevoir aucun fonds ».';

-- ---------------------------------------------------------------------------------------------
-- 3. Depuis quand l'adresse du bien est connue. Le déclencheur date toute adresse qui apparaît
--    ou change, d'où qu'elle vienne (Localisateur, conseiller) : le code de `main`, qui ignore la
--    colonne, la tient à jour sans le savoir.
-- ---------------------------------------------------------------------------------------------
alter table public.comparables
  add column locator_address_at timestamptz,
  add column locator_purged_at timestamptz;

comment on column public.comparables.locator_purged_at is
  'Date à laquelle la purge a effacé l''adresse (3 ans sans contact). Renseignée : le Localisateur n''est plus interrogé pour ce concurrent (mission 102).';

comment on column public.comparables.locator_address_at is
  'Date à laquelle l''adresse localisée a été connue ou modifiée. Départ de la durée de conservation (mission 102).';

-- Les adresses d'avant : la date de l'analyse du Localisateur, sinon la dernière écriture de la
-- ligne. `updated_at` n'est pas touché.
update public.comparables
set locator_address_at = coalesce(locator_analyzed_at, updated_at, created_at)
where nullif(btrim(locator_address), '') is not null;

create function public.stamp_locator_address_at()
returns trigger
language plpgsql
as $$
begin
  if nullif(btrim(new.locator_address), '') is null then
    new.locator_address_at := null;
  elsif tg_op = 'INSERT' or new.locator_address is distinct from old.locator_address then
    new.locator_address_at := now();
  end if;
  return new;
end $$;

create trigger comparables_stamp_locator_address_at
  before insert or update of locator_address on public.comparables
  for each row execute function public.stamp_locator_address_at();

-- ---------------------------------------------------------------------------------------------
-- 4. Conservation : 3 ans sans contact ni statut. Le dernier fait connu est le plus récent de :
--    l'adresse connue ou corrigée, le dossier remis, le rendez-vous, le mandat, le refus. Passé
--    3 ans, tout ce qui situe le bien est effacé ; l'annonce et ses caractéristiques restent,
--    et le Localisateur n'est plus interrogé pour ce concurrent (`locator_purged_at`).
--    La liste « Ne plus solliciter » n'est PAS purgée : elle ne garde que des clés, et c'est
--    elle qui fait tenir l'opposition après l'effacement.
-- ---------------------------------------------------------------------------------------------
create function public.purge_stale_owner_addresses()
returns integer
language sql
security invoker
set search_path = public
as $$
  with gone as (
    update public.comparables
    set locator_address = null,
        locator_latitude = null,
        locator_longitude = null,
        locator_property_id = null,
        locator_label = null,
        locator_label_key = null,
        locator_source = null,
        locator_state = null,
        locator_confirmed = null,
        locator_analyzed_at = null,
        locator_purged_at = now(),
        updated_at = now()
    where nullif(btrim(locator_address), '') is not null
      and greatest(
            coalesce(locator_address_at, updated_at),
            prospecting_handed_at,
            prospecting_meeting_at,
            prospecting_mandate_at,
            prospecting_declined_at
          ) < now() - interval '3 years'
    returning 1
  )
  select count(*)::integer from gone
$$;

revoke all on function public.purge_stale_owner_addresses() from public, anon, authenticated;
grant execute on function public.purge_stale_owner_addresses() to service_role;

-- Tous les jours à 3 h 27 (UTC), dix minutes après la purge du journal des erreurs.
select cron.schedule(
  'purge-stale-owner-addresses',
  '27 3 * * *',
  $$select public.purge_stale_owner_addresses()$$
);
