-- Mission 137 (partie B) — L'offre d'achat ferme.
--
-- L'offre reprend mot pour mot le texte validé (fiche de mission) ; elle se signe au doigt par les
-- offrants (deux au plus), comme le bon de visite (décision de Jean-Guy, 06/11), puis part au
-- vendeur pour acceptation par un lien.
--
--   1. `buyer_documents` reçoit le genre `purchase_offer` et sa date de validité (`valid_until`,
--      obligatoire pour une offre, absente d'un bon) ; le document reste figé à la signature, et ne
--      disparaît ni avec la fiche ni avec le compte (partie A).
--   2. `buyer_document_acceptances` : la réponse du vendeur, une fois — « Bon pour acceptation »
--      signé au doigt, ou « Je refuse » —, datée par la base, au plus tard le dernier jour de
--      validité ; jamais modifiée ; écrite par le serveur seul (lien public du vendeur).
--   3. `buyer_document_links.audience` : le lien du visiteur (bon) ou celui du vendeur (offre).
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

-- 2. La réponse du vendeur.
create table public.buyer_document_acceptances (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  document_id uuid not null unique references public.buyer_documents (id) on delete cascade,
  decision text not null check (decision in ('accepted', 'refused')),
  signer_name text check (signer_name is null or char_length(signer_name) between 2 and 160),
  -- L'image de la signature « Bon pour acceptation », sous le dossier de l'agence.
  signature_path text,
  decided_at timestamptz not null default now(),
  constraint buyer_document_acceptances_signed check (
    decision = 'refused' or (signature_path is not null and signer_name is not null)
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
  if new.signature_path is not null
     and new.signature_path !~ ('^' || new.agency_id::text || '/[^./][^/]*(/[^./][^/]*)*\.png$') then
    raise exception 'buyer_document_acceptances : une signature hors du dossier de l''agence' using errcode = 'check_violation';
  end if;
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

-- 3. À qui va le lien.
alter table public.buyer_document_links
  add column audience text not null default 'visitor' check (audience in ('visitor', 'seller'));

-- 4. Le mandat signé : son numéro, ses honoraires et leur charge.
alter table public.project_meeting_conclusions
  add column mandate_number text
    check (mandate_number is null or char_length(mandate_number) between 1 and 40),
  add column fees_amount numeric(12, 2) check (fees_amount is null or fees_amount > 0),
  add column fees_paid_by text check (fees_paid_by is null or fees_paid_by in ('seller', 'buyer'));
