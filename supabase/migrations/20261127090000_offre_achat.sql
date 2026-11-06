-- Mission 137 (partie B) — L'offre d'achat ferme.
--
-- L'offre reprend mot pour mot le texte validé (fiche de mission) ; elle se signe au doigt par les
-- offrants (deux au plus), comme le bon de visite (décision de Jean-Guy, 06/11), puis part au
-- vendeur pour acceptation par un lien.
--
--   1. `buyer_documents` reçoit le genre `purchase_offer` et sa date de validité (`valid_until`,
--      obligatoire pour une offre, absente d'un bon) ; le document reste figé à la signature, et ne
--      disparaît ni avec la fiche ni avec le compte (partie A).
--      Une offre ne naît jamais déjà périmée (jour de Paris).
--   2. `buyer_document_acceptances` : la réponse du vendeur, une fois — « Bon pour acceptation »
--      signé au doigt par chaque propriétaire (deux au plus : un couple, une indivision), ou « Je
--      refuse », sans signature —, datée par la base, au plus tard le dernier jour de validité ;
--      jamais modifiée ; écrite par le serveur seul (lien public du vendeur).
--   3. `buyer_document_links.audience` : le lien des acquéreurs (bon ou offre) ou celui du vendeur
--      (offre seulement).
--   4. `project_meeting_conclusions` : le n° de mandat, les honoraires et leur charge, saisis une
--      fois à la première offre d'un mandat signé, repris ensuite (décision du 06/11).
--
-- Compatible avec le code de `main` : un genre de plus, des colonnes nulles ou à valeur par défaut,
-- une table neuve ; aucune ligne modifiée.

-- 1. Le genre et la validité.
alter table public.buyer_documents
  drop constraint buyer_documents_kind_check;
alter table public.buyer_documents
  add constraint buyer_documents_kind_check check (kind in ('visit_voucher', 'purchase_offer'));
alter table public.buyer_documents
  add column valid_until date;
alter table public.buyer_documents
  add constraint buyer_documents_offer_validity check (
    (kind = 'purchase_offer') = (valid_until is not null)
  );

-- Une offre se signe valable au moins jusqu'au jour même (jour de Paris).
create function public.check_buyer_offer_validity()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.kind = 'purchase_offer'
     and new.valid_until < (now() at time zone 'Europe/Paris')::date then
    raise exception 'buyer_documents : une offre ne naît pas périmée' using errcode = 'check_violation';
  end if;
  return new;
end $$;

revoke all on function public.check_buyer_offer_validity() from public, anon, authenticated;

create trigger buyer_documents_offer_validity
  before insert on public.buyer_documents
  for each row execute function public.check_buyer_offer_validity();

-- 2. La réponse du vendeur.
create table public.buyer_document_acceptances (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  document_id uuid not null unique references public.buyer_documents (id) on delete cascade,
  decision text not null check (decision in ('accepted', 'refused')),
  -- Chaque propriétaire qui signe « Bon pour acceptation », et l'image de sa signature, sous le
  -- dossier de l'agence ; un refus ne porte ni nom ni signature.
  signer_names text[],
  signature_paths text[],
  decided_at timestamptz not null default now(),
  constraint buyer_document_acceptances_signed check (
    case decision
      when 'accepted' then
        coalesce(cardinality(signer_names), 0) between 1 and 2
        and coalesce(cardinality(signature_paths), 0) = coalesce(cardinality(signer_names), 0)
      else signer_names is null and signature_paths is null
    end
  )
);

create index buyer_document_acceptances_agency on public.buyer_document_acceptances (agency_id);

comment on table public.buyer_document_acceptances is
  'Mission 137 — la réponse du vendeur à une offre d''achat (acceptée et signée, ou refusée), une fois, datée par la base ; écrite par le serveur seul.';

-- Une offre de l'agence, encore valable ; la signature sous le dossier de l'agence ; l'heure de la
-- base ; aucune modification.
create function public.check_buyer_document_acceptance()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  v_valid_until date;
  v_value text;
begin
  if tg_op = 'UPDATE' then
    raise exception 'buyer_document_acceptances : une réponse ne se modifie pas' using errcode = 'check_violation';
  end if;
  select d.valid_until into v_valid_until
  from public.buyer_documents d
  where d.id = new.document_id and d.agency_id = new.agency_id and d.kind = 'purchase_offer';
  if not found then
    raise exception 'buyer_document_acceptances : pas une offre de cette agence' using errcode = 'check_violation';
  end if;
  if (now() at time zone 'Europe/Paris')::date > v_valid_until then
    raise exception 'buyer_document_acceptances : l''offre n''est plus valable' using errcode = 'check_violation';
  end if;
  foreach v_value in array coalesce(new.signature_paths, '{}'::text[]) loop
    if v_value is null
       or v_value !~ ('^' || new.agency_id::text || '/[^./][^/]*(/[^./][^/]*)*\.png$') then
      raise exception 'buyer_document_acceptances : une signature hors du dossier de l''agence' using errcode = 'check_violation';
    end if;
  end loop;
  foreach v_value in array coalesce(new.signer_names, '{}'::text[]) loop
    if v_value is null or char_length(btrim(v_value)) not between 2 and 160 then
      raise exception 'buyer_document_acceptances : un nom de signataire invalide' using errcode = 'check_violation';
    end if;
  end loop;
  new.decided_at := now();
  return new;
end $$;

revoke all on function public.check_buyer_document_acceptance() from public, anon, authenticated;

create trigger buyer_document_acceptances_check
  before insert or update on public.buyer_document_acceptances
  for each row execute function public.check_buyer_document_acceptance();

alter table public.buyer_document_acceptances enable row level security;
create policy buyer_document_acceptances_agency_read on public.buyer_document_acceptances
  for select to authenticated
  using (agency_id = public.get_current_agency_id());
revoke all on public.buyer_document_acceptances from anon, authenticated;
grant select on public.buyer_document_acceptances to authenticated;

-- 3. À qui va le lien : aux acquéreurs (le bon, leur copie de l'offre), ou au vendeur (une offre
--    seulement). Le déclencheur de la partie A vérifie en plus le genre du document.
alter table public.buyer_document_links
  add column audience text not null default 'visitor' check (audience in ('visitor', 'seller'));

create or replace function public.check_buyer_document_link()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (
    select 1 from public.buyer_documents d
    where d.id = new.document_id and d.agency_id = new.agency_id
      and (new.audience = 'visitor' or d.kind = 'purchase_offer')
  ) then
    raise exception 'buyer_document_links : le document n''est pas de cette agence, ou pas une offre pour le vendeur' using errcode = 'check_violation';
  end if;
  return new;
end $$;

-- 4. Le mandat signé : son numéro, ses honoraires et leur charge.
alter table public.project_meeting_conclusions
  add column mandate_number text
    check (mandate_number is null or char_length(mandate_number) between 1 and 40),
  add column fees_amount numeric(12, 2) check (fees_amount is null or fees_amount > 0),
  add column fees_paid_by text check (fees_paid_by is null or fees_paid_by in ('seller', 'buyer'));
