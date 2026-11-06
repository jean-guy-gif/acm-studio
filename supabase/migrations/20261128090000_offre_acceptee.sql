-- Mission 138 — L'offre acceptée.
--
-- Quand le vendeur a répondu à une offre d'achat (mission 137 B), « À faire aujourd'hui » porte une
-- tâche — prévenir l'acquéreur, transmettre au notaire, ou faire une nouvelle offre — qui disparaît
-- quand le conseiller coche « Fait » (décision de Jean-Guy, 06/11).
--
--   1. `buyer_offer_follow_ups` : le « Fait » d'une réponse, une fois par offre, daté par la base,
--      avec son auteur ; jamais modifié (sauf l'auteur vidé quand son compte est supprimé) ; écrit
--      par le serveur seul. La réponse du vendeur (`buyer_document_acceptances`) reste immuable :
--      le « Fait » vit à côté d'elle, pas sur elle.
--   2. `buyer_document_links.audience` gagne 'notary' : le troisième lien de l'offre, celui du
--      notaire, à part, qui ne remplace jamais ceux des offrants et du vendeur (décision de
--      Jean-Guy, 06/11) ; il n'existe que pour une offre acceptée.
--
-- Compatible avec le code de `main` : une table neuve, une valeur de plus permise ; aucune ligne
-- modifiée. Le code de `main` lit toute audience autre que 'seller' comme la copie des offrants.

-- 1. Le « Fait » d'une réponse du vendeur.
create table public.buyer_offer_follow_ups (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  document_id uuid not null unique references public.buyer_documents (id) on delete cascade,
  done_at timestamptz not null default now(),
  done_by uuid references public.profiles (id) on delete set null
);

create index buyer_offer_follow_ups_agency on public.buyer_offer_follow_ups (agency_id);
create index buyer_offer_follow_ups_done_by on public.buyer_offer_follow_ups (done_by);

comment on table public.buyer_offer_follow_ups is
  'Mission 138 — le « Fait » coché par le conseiller sur la tâche née de la réponse du vendeur à une offre d''achat, une fois par offre, daté par la base ; écrit par le serveur seul.';

-- Une offre de l'agence qui a reçu sa réponse ; l'auteur, de l'agence ; l'heure de la base ; seule
-- modification permise : l'auteur vidé par la suppression de son compte.
create function public.check_buyer_offer_follow_up()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
       or new.created_at is distinct from old.created_at
       or new.agency_id is distinct from old.agency_id
       or new.document_id is distinct from old.document_id
       or new.done_at is distinct from old.done_at
       or not (new.done_by is null and old.done_by is not null)
       -- L'auteur ne se vide que par la suppression de son compte (`on delete set null`) : à ce
       -- moment-là, son profil n'existe déjà plus (comme la M137 A).
       or exists (select 1 from public.profiles p where p.id = old.done_by) then
      raise exception 'buyer_offer_follow_ups : un « Fait » ne se modifie pas' using errcode = 'check_violation';
    end if;
    return new;
  end if;
  if not exists (
    select 1
    from public.buyer_documents d
    join public.buyer_document_acceptances a on a.document_id = d.id
    where d.id = new.document_id and d.agency_id = new.agency_id and d.kind = 'purchase_offer'
  ) then
    raise exception 'buyer_offer_follow_ups : pas une offre de cette agence qui a reçu sa réponse' using errcode = 'check_violation';
  end if;
  if new.done_by is null or not exists (
    select 1 from public.profiles p where p.id = new.done_by and p.agency_id = new.agency_id
  ) then
    raise exception 'buyer_offer_follow_ups : l''auteur n''est pas de cette agence' using errcode = 'check_violation';
  end if;
  new.created_at := now();
  new.done_at := now();
  return new;
end $$;

revoke all on function public.check_buyer_offer_follow_up() from public, anon, authenticated;

create trigger buyer_offer_follow_ups_check
  before insert or update on public.buyer_offer_follow_ups
  for each row execute function public.check_buyer_offer_follow_up();

alter table public.buyer_offer_follow_ups enable row level security;
create policy buyer_offer_follow_ups_agency_read on public.buyer_offer_follow_ups
  for select to authenticated
  using (agency_id = public.get_current_agency_id());
revoke all on public.buyer_offer_follow_ups from anon, authenticated;
grant select on public.buyer_offer_follow_ups to authenticated;

-- 2. Le lien du notaire.
comment on table public.buyer_document_links is
  'Missions 137 et 138 — le lien d''un document signé : au visiteur (le bon, la copie des offrants d''une offre), au vendeur (une offre, pour l''accepter ou la refuser) ou au notaire (une offre acceptée) ; condensat du jeton, document, agence, auteur, expiration ; jamais le lien.';
alter table public.buyer_document_links
  drop constraint buyer_document_links_audience_check;
alter table public.buyer_document_links
  add constraint buyer_document_links_audience_check
    check (audience in ('visitor', 'seller', 'notary'));

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
  if new.audience = 'notary' and not exists (
    select 1 from public.buyer_document_acceptances a
    where a.document_id = new.document_id and a.decision = 'accepted'
  ) then
    raise exception 'buyer_document_links : le lien du notaire attend une offre acceptée' using errcode = 'check_violation';
  end if;
  return new;
end $$;
