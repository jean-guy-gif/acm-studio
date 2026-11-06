-- Mission 137 (partie A) — L'identité légale de l'agence et le bon de visite.
--
-- Les deux documents (bon de visite ici, offre d'achat en partie B) reprennent mot pour mot des
-- textes validés juridiquement ; tout ce qui identifie l'agence vient de l'agence qui utilise ACM.
--
--   1. `agency_legal_identities` : l'identité légale de l'agence, une ligne par agence — société
--      (raison sociale, forme, capital, siège, RCS, TVA), téléphone et e-mail, responsabilité civile
--      professionnelle (assureur, adresse, contrat), garantie financière structurée (organisme,
--      adresse, adhésion, montant), représentant légal (nom, qualité). Lue par l'agence, écrite par
--      le serveur seul, après le garde manager. Table à part : la charte (`agency_branding`) est
--      réécrite en entier par son propre écran.
--   2. `buyer_documents` : un document signé pour un acquéreur (ici le bon de visite). Il n'existe
--      que signé : le texte rendu, les champs, la version du modèle, l'empreinte sha256 du texte et
--      les signatures (chemins du stockage privé) sont écrits d'un coup, l'heure de signature posée
--      par la base, et rien ne se modifie ensuite — un document signé ne se recalcule jamais. Il
--      ne disparaît ni avec la fiche ni avec le compte du conseiller ; gardé 5 ans après la visite
--      (preuve du droit à commission), puis effacé (décision de Jean-Guy, 06/11).
--   2 bis. Les fiches d'un compte supprimé passent à un manager au lieu d'être supprimées.
--   3. `buyer_document_visits` : les visites (M119) que couvre un bon, plusieurs biens le même jour ;
--      la fiche et l'agence vérifiées par la base.
--   4. `buyer_document_links` : le lien envoyé au visiteur (Copier / E-mail), condensat seul,
--      30 jours, comme le dossier acquéreur (M119).
--   5. Le bucket privé `signed-documents` : les images des signatures, sous le dossier de l'agence ;
--      aucune règle pour le navigateur, le serveur seul y écrit et y lit (liens signés courts).
--
-- Compatible avec le code de `main` : des tables et un bucket neufs qu'il ne connaît pas, et un
-- déclencheur avant la suppression d'un profil (aucun profil supprimé aujourd'hui par le code de
-- `main` sans que ses fiches partent : elles restent désormais à l'agence) ; aucune ligne écrite.

-- 1. L'identité légale.
create table public.agency_legal_identities (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  agency_id uuid not null unique references public.agencies (id) on delete cascade,
  company_name text check (company_name is null or char_length(company_name) between 1 and 160),
  company_form text check (company_form is null or char_length(company_form) between 1 and 40),
  share_capital text check (share_capital is null or char_length(share_capital) between 1 and 40),
  company_seat text check (company_seat is null or char_length(company_seat) between 1 and 300),
  rcs_city text check (rcs_city is null or char_length(rcs_city) between 1 and 80),
  rcs_number text check (rcs_number is null or char_length(rcs_number) between 1 and 40),
  vat_number text check (vat_number is null or char_length(vat_number) between 1 and 40),
  agency_phone text check (agency_phone is null or char_length(agency_phone) between 1 and 40),
  agency_email text check (agency_email is null or char_length(agency_email) between 3 and 200),
  rcp_insurer text check (rcp_insurer is null or char_length(rcp_insurer) between 1 and 160),
  rcp_address text check (rcp_address is null or char_length(rcp_address) between 1 and 300),
  rcp_number text check (rcp_number is null or char_length(rcp_number) between 1 and 80),
  guarantee_body text check (guarantee_body is null or char_length(guarantee_body) between 1 and 160),
  guarantee_address text check (guarantee_address is null or char_length(guarantee_address) between 1 and 300),
  guarantee_number text check (guarantee_number is null or char_length(guarantee_number) between 1 and 80),
  guarantee_amount numeric(14, 2) check (guarantee_amount is null or guarantee_amount > 0),
  representative_name text check (representative_name is null or char_length(representative_name) between 1 and 160),
  representative_title text check (representative_title is null or char_length(representative_title) between 1 and 80),
  updated_by uuid references public.profiles (id) on delete set null
);

comment on table public.agency_legal_identities is
  'Mission 137 — l''identité légale de l''agence pour le bon de visite et l''offre d''achat ; écrite par le serveur seul, après le garde manager.';

-- L'auteur de la dernière modification est de l'agence ; la date de modification est celle de la base.
create function public.check_agency_legal_identity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.updated_by is not null and not exists (
    select 1 from public.profiles p where p.id = new.updated_by and p.agency_id = new.agency_id
  ) then
    raise exception 'agency_legal_identities : l''auteur n''est pas de cette agence' using errcode = 'check_violation';
  end if;
  new.updated_at := now();
  return new;
end $$;

revoke all on function public.check_agency_legal_identity() from public, anon, authenticated;

create trigger agency_legal_identities_check
  before insert or update on public.agency_legal_identities
  for each row execute function public.check_agency_legal_identity();

alter table public.agency_legal_identities enable row level security;
create policy agency_legal_identities_agency_read on public.agency_legal_identities
  for select to authenticated
  using (agency_id = public.get_current_agency_id());
revoke all on public.agency_legal_identities from anon, authenticated;
grant select on public.agency_legal_identities to authenticated;

-- 2. Les documents signés.
create table public.buyer_documents (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  -- Un document signé ne disparaît jamais avec la fiche (décision de Jean-Guy, 06/11) : la fiche
  -- supprimée, il reste, sans fiche, avec ses propres champs ; il s'efface 5 ans après la visite
  -- (PROCEDURE_EFFACEMENT.md).
  buyer_id uuid references public.buyers (id) on delete set null,
  kind text not null check (kind in ('visit_voucher')),
  template_version text not null check (char_length(template_version) between 1 and 40),
  -- Les champs remplis, tels que le texte les a reçus (relus par liste d'autorisation au serveur).
  fields jsonb not null check (jsonb_typeof(fields) = 'object' and pg_column_size(fields) <= 65536),
  -- Le texte rendu, figé à la signature, et son empreinte.
  rendered_text text not null check (char_length(rendered_text) between 1 and 60000),
  content_sha256 text not null check (content_sha256 ~ '^[0-9a-f]{64}$'),
  -- Les images des signatures, dans le bucket privé `signed-documents`, sous le dossier de l'agence.
  signature_paths text[] not null check (cardinality(signature_paths) between 1 and 2),
  signed_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null
);

create index buyer_documents_buyer on public.buyer_documents (buyer_id, signed_at desc);
create index buyer_documents_agency on public.buyer_documents (agency_id, signed_at desc);

comment on table public.buyer_documents is
  'Mission 137 — un document signé pour un acquéreur (bon de visite) : texte, champs et signatures figés à la signature, l''heure posée par la base ; jamais modifié.';

-- L'agence de la fiche et de l'auteur ; les signatures sous le dossier de l'agence ; l'heure de la
-- base ; aucune modification après l'écriture (un document signé ne change plus).
create function public.check_buyer_document()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_path text;
begin
  if tg_op = 'UPDATE' then
    -- Seules exceptions : la fiche ou le compte de l'auteur supprimés laissent le document, sans
    -- fiche ou sans auteur (`on delete set null`, leçon de la M109 : un verrou ne bloque aucune
    -- suppression légitime) ; jamais un vidage à la main.
    if (to_jsonb(new) - 'created_by' - 'buyer_id') = (to_jsonb(old) - 'created_by' - 'buyer_id')
       and (new.created_by is not distinct from old.created_by
            or (new.created_by is null
                and not exists (select 1 from public.profiles p where p.id = old.created_by)))
       and (new.buyer_id is not distinct from old.buyer_id
            or (new.buyer_id is null
                and not exists (select 1 from public.buyers b where b.id = old.buyer_id))) then
      return new;
    end if;
    raise exception 'buyer_documents : un document signé ne se modifie pas' using errcode = 'check_violation';
  end if;
  if new.buyer_id is null then
    raise exception 'buyer_documents : un document se signe pour une fiche' using errcode = 'check_violation';
  end if;
  if not exists (select 1 from public.buyers b where b.id = new.buyer_id and b.agency_id = new.agency_id) then
    raise exception 'buyer_documents : la fiche n''est pas de cette agence' using errcode = 'check_violation';
  end if;
  if new.created_by is not null and not exists (
    select 1 from public.profiles p where p.id = new.created_by and p.agency_id = new.agency_id
  ) then
    raise exception 'buyer_documents : l''auteur n''est pas de cette agence' using errcode = 'check_violation';
  end if;
  -- Sous le dossier de l'agence, sans « .. » ni segment caché, une image PNG.
  foreach v_path in array new.signature_paths loop
    if v_path is null
       or v_path !~ ('^' || new.agency_id::text || '/[^./][^/]*(/[^./][^/]*)*\.png$') then
      raise exception 'buyer_documents : une signature hors du dossier de l''agence' using errcode = 'check_violation';
    end if;
  end loop;
  -- L'empreinte est celle du texte figé, calculée par la base.
  new.content_sha256 := encode(sha256(convert_to(new.rendered_text, 'UTF8')), 'hex');
  new.signed_at := now();
  return new;
end $$;

revoke all on function public.check_buyer_document() from public, anon, authenticated;

create trigger buyer_documents_check
  before insert or update on public.buyer_documents
  for each row execute function public.check_buyer_document();

alter table public.buyer_documents enable row level security;
create policy buyer_documents_agency_read on public.buyer_documents
  for select to authenticated
  using (agency_id = public.get_current_agency_id());
revoke all on public.buyer_documents from anon, authenticated;
grant select on public.buyer_documents to authenticated;

-- 2 bis. Les fiches d'un conseiller dont le compte est supprimé passent à un manager de l'agence
--    (décision de Jean-Guy, 06/11) au lieu d'être supprimées avec lui (`buyers.advisor_id`,
--    `on delete cascade`) : un manager non retiré, sinon un autre membre non retiré ; sans personne
--    (l'agence entière s'en va), la cascade d'avant joue. Le retrait d'un membre (M60) ne change
--    pas : ses fiches restent à son nom.
create function public.reassign_buyers_before_profile_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_heir uuid;
begin
  select p.id into v_heir
  from public.profiles p
  where p.agency_id = old.agency_id and p.id <> old.id and p.removed_at is null
  order by (p.role = 'manager') desc, p.created_at
  limit 1;
  if v_heir is not null then
    update public.buyers set advisor_id = v_heir where advisor_id = old.id;
  end if;
  return old;
end $$;

revoke all on function public.reassign_buyers_before_profile_delete() from public, anon, authenticated;

create trigger profiles_reassign_buyers
  before delete on public.profiles
  for each row execute function public.reassign_buyers_before_profile_delete();

-- 3. Les visites d'un bon.
create table public.buyer_document_visits (
  document_id uuid not null references public.buyer_documents (id) on delete cascade,
  visit_request_id uuid not null references public.buyer_visit_requests (id) on delete cascade,
  agency_id uuid not null references public.agencies (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (document_id, visit_request_id)
);

create index buyer_document_visits_visit on public.buyer_document_visits (visit_request_id);

comment on table public.buyer_document_visits is
  'Mission 137 — les visites qu''un bon de visite couvre (plusieurs biens le même jour) ; écrites par le serveur seul.';

create function public.check_buyer_document_visit()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.buyer_documents d
    join public.buyer_visit_requests v on v.buyer_id = d.buyer_id and v.agency_id = d.agency_id
    where d.id = new.document_id and v.id = new.visit_request_id and d.agency_id = new.agency_id
  ) then
    raise exception 'buyer_document_visits : la visite n''est pas de cette fiche' using errcode = 'check_violation';
  end if;
  return new;
end $$;

revoke all on function public.check_buyer_document_visit() from public, anon, authenticated;

create trigger buyer_document_visits_check
  before insert or update on public.buyer_document_visits
  for each row execute function public.check_buyer_document_visit();

alter table public.buyer_document_visits enable row level security;
create policy buyer_document_visits_agency_read on public.buyer_document_visits
  for select to authenticated
  using (agency_id = public.get_current_agency_id());
revoke all on public.buyer_document_visits from anon, authenticated;
grant select on public.buyer_document_visits to authenticated;

-- 4. Le lien envoyé au visiteur.
create table public.buyer_document_links (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  document_id uuid not null references public.buyer_documents (id) on delete cascade,
  created_by uuid references public.profiles (id) on delete set null,
  token_hash text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  expires_at timestamptz not null default (now() + interval '30 days')
);

create index buyer_document_links_document on public.buyer_document_links (document_id);

comment on table public.buyer_document_links is
  'Mission 137 — le lien d''un document signé envoyé au visiteur : condensat du jeton, document, agence, auteur, expiration ; jamais le lien.';

create function public.check_buyer_document_link()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.buyer_documents d where d.id = new.document_id and d.agency_id = new.agency_id
  ) then
    raise exception 'buyer_document_links : le document n''est pas de cette agence' using errcode = 'check_violation';
  end if;
  return new;
end $$;

revoke all on function public.check_buyer_document_link() from public, anon, authenticated;

create trigger buyer_document_links_check
  before insert or update on public.buyer_document_links
  for each row execute function public.check_buyer_document_link();

alter table public.buyer_document_links enable row level security;
create policy buyer_document_links_agency_read on public.buyer_document_links
  for select to authenticated
  using (agency_id = public.get_current_agency_id());
revoke all on public.buyer_document_links from anon, authenticated;
grant select on public.buyer_document_links to authenticated;

-- 5. Le bucket des signatures : privé, sans règle pour le navigateur (le serveur seul, par la clé
--    de service, y écrit et en tire des liens signés courts).
insert into storage.buckets (id, name, public, allowed_mime_types, file_size_limit)
values ('signed-documents', 'signed-documents', false, array['image/png'], 262144)
on conflict (id) do nothing;
