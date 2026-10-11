-- Mission 98 — « Ne plus solliciter » : la liste d'opposition d'une agence.
--
-- Une personne qui demande à ne plus être contactée ne doit plus l'être, dans AUCUN dossier de
-- l'agence, présent ou futur. La liste porte sur l'adresse NORMALISÉE du bien (la clé calculée
-- par `addressKey`, src/features/prospecting/services/address-key.ts) : aucun nom, aucun lien
-- vers un concurrent — la ligne survit donc à l'effacement de ce concurrent
-- (docs/PROCEDURE_EFFACEMENT.md), qui l'alimente lui aussi.
--
-- Compatible avec le code de `main` : une table NEUVE, que `main` ne lit ni n'écrit ; aucune
-- ligne existante n'est touchée, rien ne dépend de l'ordre des opérations.
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
