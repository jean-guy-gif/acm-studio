-- Lot C (Jean-Guy, 27/11 et 28/11) — la vie du mandat côté vendeur.
--
--   Après « Mandat signé », le dossier suit le mandat jusqu'au bout : Offre acceptée → Sous
--   compromis → Vendu par l'agence, et la sortie, mandat terminé sans vente. On note la fin du
--   mandat (et sa reconduction tacite, retouche 4 du 28/11), les avenants de baisse (l'historique
--   gardé), le compromis et la date prévue de l'acte, l'acte et le prix de vente.
--
-- L'étape n'est jamais écrite : `projects.status` reste « meeting_completed » (CLAUDE.md : le
-- statut porte la position, jamais l'issue). Elle se lit dans des faits datés — ceux-ci, et l'offre
-- acceptée du côté acquéreur (`buyer_document_acceptances`, M137 B, M138) — par un service pur.
--
--   1. `project_meeting_conclusions`, la fiche du mandat (type, n°, honoraires, signature, prix à
--      la signature), gagne neuf colonnes, nulles (la reconduction tacite, fausse), écrites par le
--      serveur seul : la fin du mandat et sa reconduction tacite ; le compromis et l'acte prévu,
--      ensemble ; l'acquéreur (de l'agence, avec ou sans sa fiche, ou venu d'ailleurs) ; l'acte et
--      le prix de vente, ensemble, après un compromis ; la fin sans vente, jamais avec un compromis
--      ni une vente. Un déclencheur refuse un de ces faits posé hors d'un mandat signé, et une fiche
--      acquéreur d'une autre agence ; vider un fait reste permis (« Le compromis est tombé »,
--      `on delete set null` d'une fiche supprimée). Sous compromis ou vendu, l'issue ne quitte plus
--      « mandat signé », ni par « Changer l'issue » (`change_meeting_outcome`) ni par une seconde
--      conclusion (`conclude_meeting`) : le même déclencheur le refuse, le compromis tombe d'abord.
--      Ces deux fonctions ne touchent pas les faits : « Compléter » le type d'un mandat signé, ou
--      le conclure une seconde fois « signé », les garde.
--   2. `mandate_price_amendments`, une table neuve : un avenant de baisse par ligne (sa date, le
--      nouveau prix), jamais modifié (seul l'auteur se vide à la suppression de son compte), retiré
--      par le serveur seul ; parti avec son dossier. Le prix du mandat est celui du dernier avenant,
--      sinon le prix à la signature, qui n'est jamais réécrit (la synthèse le lit, M111).
--
-- Compatible avec le code de `main` : `main` ne lit ni n'écrit ces colonnes ni cette table ;
-- `conclude_meeting` et `change_meeting_outcome` ne les touchent pas, et sans compromis ni vente
-- la garde de l'issue ne refuse rien ; aucune ligne existante n'est modifiée (les neuf colonnes
-- prennent leur défaut).
--
-- Les droits sont redits en toutes lettres à la fin, avec une garde qui annule la migration s'ils
-- ne sont plus ceux-là : anon aucun ; le navigateur la seule lecture (la politique de chaque table
-- la borne à son agence) ; le serveur tout.

set local lock_timeout = '5s';

-- 1. La fiche du mandat.
alter table public.project_meeting_conclusions
  add column mandate_ends_on date,
  add column mandate_tacit_renewal boolean not null default false,
  add column compromise_signed_on date,
  add column deed_planned_on date,
  add column sale_buyer_origin text
    constraint project_meeting_conclusions_sale_buyer_origin_check
      check (sale_buyer_origin in ('agency', 'outside')),
  add column compromise_buyer_id uuid
    constraint project_meeting_conclusions_compromise_buyer_fk
      references public.buyers (id) on delete set null,
  add column deed_signed_on date,
  add column sale_price numeric
    constraint project_meeting_conclusions_sale_price_check
      check (sale_price > 0 and sale_price <= 999999999),
  add column mandate_ended_on date,
  -- La reconduction tacite se dit d'une fin de mandat.
  add constraint project_meeting_conclusions_tacit_needs_end
    check (not mandate_tacit_renewal or mandate_ends_on is not null),
  -- Le compromis et l'acte prévu, ensemble ; l'acte au plus tôt le jour du compromis.
  add constraint project_meeting_conclusions_compromise_pair
    check (
      (compromise_signed_on is null) = (deed_planned_on is null)
      and (deed_planned_on is null or deed_planned_on >= compromise_signed_on)
    ),
  -- L'acquéreur se dit avec le compromis, et sa fiche n'est que celle d'un acquéreur de l'agence
  -- (`is not distinct from` : une fiche sans origine ne passe pas par un CHECK qui vaudrait nul).
  add constraint project_meeting_conclusions_buyer_with_compromise
    check (
      (sale_buyer_origin is null) = (compromise_signed_on is null)
      and (compromise_buyer_id is null or sale_buyer_origin is not distinct from 'agency')
    ),
  -- L'acte et le prix de vente, ensemble, après un compromis, au plus tôt le jour du compromis.
  add constraint project_meeting_conclusions_sale_after_compromise
    check (
      (deed_signed_on is null) = (sale_price is null)
      and (
        deed_signed_on is null
        or (compromise_signed_on is not null and deed_signed_on >= compromise_signed_on)
      )
    ),
  -- La fin sans vente, jamais avec un compromis ni une vente.
  add constraint project_meeting_conclusions_ended_without_sale
    check (mandate_ended_on is null or (compromise_signed_on is null and deed_signed_on is null));

create index project_meeting_conclusions_compromise_buyer
  on public.project_meeting_conclusions (compromise_buyer_id);

comment on column public.project_meeting_conclusions.mandate_ends_on is
  'Lot C — la fin du mandat (la durée saisie devient cette date, au serveur). Écrit par le serveur seul.';
comment on column public.project_meeting_conclusions.mandate_tacit_renewal is
  'Lot C — la reconduction tacite (retouche 4 du 28/11) : la tâche devient « Faire le point avant la reconduction ».';
comment on column public.project_meeting_conclusions.compromise_signed_on is
  'Lot C — le jour du compromis, avec la date prévue de l''acte ; vidés ensemble quand le compromis tombe.';
comment on column public.project_meeting_conclusions.deed_planned_on is
  'Lot C — la date prévue de l''acte, avec le compromis.';
comment on column public.project_meeting_conclusions.sale_buyer_origin is
  'Lot C — l''acquéreur du compromis : agency (de l''agence) ou outside (venu d''ailleurs).';
comment on column public.project_meeting_conclusions.compromise_buyer_id is
  'Lot C — la fiche de l''acquéreur de l''agence, s''il en a une ; vidée si la fiche est supprimée.';
comment on column public.project_meeting_conclusions.deed_signed_on is
  'Lot C — le jour de l''acte, avec le prix de vente, après un compromis.';
comment on column public.project_meeting_conclusions.sale_price is
  'Lot C — le prix de vente signé chez le notaire, avec le jour de l''acte.';
comment on column public.project_meeting_conclusions.mandate_ended_on is
  'Lot C — la fin du mandat sans vente, jamais avec un compromis ni une vente.';

-- Un fait de la vie du mandat ne se pose que sur un mandat signé, et la fiche de l'acquéreur est de
-- l'agence. Vider un fait reste permis. Et un dossier ne quitte pas « Mandat signé » tant qu'un
-- compromis ou une vente y est noté. Le déclencheur ne regarde que ces colonnes et l'issue :
-- `conclude_meeting` et `change_meeting_outcome` ne le réveillent que par l'issue, et ne sont
-- refusés que dans ce cas ; le code de `main`, qui ne note jamais ces faits, ne l'est jamais.
create function public.check_mandate_life()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  o public.project_meeting_conclusions;
begin
  if tg_op = 'UPDATE' then
    o := old;
  end if;
  if (
       (new.mandate_ends_on is not null and new.mandate_ends_on is distinct from o.mandate_ends_on)
       or (new.mandate_tacit_renewal and not coalesce(o.mandate_tacit_renewal, false))
       or (new.compromise_signed_on is not null
           and new.compromise_signed_on is distinct from o.compromise_signed_on)
       or (new.deed_planned_on is not null and new.deed_planned_on is distinct from o.deed_planned_on)
       or (new.sale_buyer_origin is not null
           and new.sale_buyer_origin is distinct from o.sale_buyer_origin)
       or (new.compromise_buyer_id is not null
           and new.compromise_buyer_id is distinct from o.compromise_buyer_id)
       or (new.deed_signed_on is not null and new.deed_signed_on is distinct from o.deed_signed_on)
       or (new.sale_price is not null and new.sale_price is distinct from o.sale_price)
       or (new.mandate_ended_on is not null and new.mandate_ended_on is distinct from o.mandate_ended_on)
     )
     and new.outcome is distinct from 'signed' then
    raise exception 'project_meeting_conclusions : la vie du mandat ne se note que sur un mandat signé'
      using errcode = 'check_violation';
  end if;
  if tg_op = 'UPDATE' and old.outcome = 'signed' and new.outcome is distinct from 'signed'
     and (new.compromise_signed_on is not null or new.deed_signed_on is not null) then
    raise exception 'project_meeting_conclusions : un compromis ou une vente est noté, l''issue reste « mandat signé »'
      using errcode = 'check_violation';
  end if;
  if new.compromise_buyer_id is not null
     and new.compromise_buyer_id is distinct from o.compromise_buyer_id
     and not exists (
       select 1 from public.buyers b
       where b.id = new.compromise_buyer_id and b.agency_id = new.agency_id
     ) then
    raise exception 'project_meeting_conclusions : l''acquéreur du compromis n''est pas de cette agence'
      using errcode = 'check_violation';
  end if;
  return new;
end $$;

revoke all on function public.check_mandate_life() from public, anon, authenticated;

create trigger project_meeting_conclusions_mandate_life
  before insert or update of outcome, mandate_ends_on, mandate_tacit_renewal, compromise_signed_on,
    deed_planned_on, sale_buyer_origin, compromise_buyer_id, deed_signed_on, sale_price,
    mandate_ended_on
  on public.project_meeting_conclusions
  for each row execute function public.check_mandate_life();

-- 2. Les avenants de baisse.
create table public.mandate_price_amendments (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  amended_on date not null,
  price numeric not null
    constraint mandate_price_amendments_price_check check (price > 0 and price <= 999999999),
  created_by uuid references public.profiles (id) on delete set null
);

create index mandate_price_amendments_project
  on public.mandate_price_amendments (project_id, amended_on);
create index mandate_price_amendments_agency on public.mandate_price_amendments (agency_id);
create index mandate_price_amendments_created_by on public.mandate_price_amendments (created_by);

comment on table public.mandate_price_amendments is
  'Lot C — un avenant de baisse du mandat par ligne (sa date, le nouveau prix), daté par la base, jamais modifié ; le prix du mandat est celui du dernier, sinon le prix à la signature. Écrit et retiré par le serveur seul.';

-- Le dossier est de l'agence et son mandat est signé ; l'auteur, de l'agence ; l'heure de la base ;
-- seule modification permise : l'auteur vidé par la suppression de son compte (comme la M138).
create function public.check_mandate_price_amendment()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
       or new.created_at is distinct from old.created_at
       or new.agency_id is distinct from old.agency_id
       or new.project_id is distinct from old.project_id
       or new.amended_on is distinct from old.amended_on
       or new.price is distinct from old.price
       or not (new.created_by is null and old.created_by is not null)
       -- L'auteur ne se vide que par la suppression de son compte (`on delete set null`) : à ce
       -- moment-là, son profil n'existe déjà plus.
       or exists (select 1 from public.profiles p where p.id = old.created_by) then
      raise exception 'mandate_price_amendments : un avenant ne se modifie pas'
        using errcode = 'check_violation';
    end if;
    return new;
  end if;
  if not exists (
    select 1
    from public.projects p
    join public.project_meeting_conclusions c on c.project_id = p.id
    where p.id = new.project_id and p.agency_id = new.agency_id
      and c.agency_id = new.agency_id and c.outcome = 'signed'
  ) then
    raise exception 'mandate_price_amendments : pas un mandat signé de cette agence'
      using errcode = 'check_violation';
  end if;
  if new.created_by is null or not exists (
    select 1 from public.profiles p where p.id = new.created_by and p.agency_id = new.agency_id
  ) then
    raise exception 'mandate_price_amendments : l''auteur n''est pas de cette agence'
      using errcode = 'check_violation';
  end if;
  new.created_at := now();
  return new;
end $$;

revoke all on function public.check_mandate_price_amendment() from public, anon, authenticated;

create trigger mandate_price_amendments_check
  before insert or update on public.mandate_price_amendments
  for each row execute function public.check_mandate_price_amendment();

alter table public.mandate_price_amendments enable row level security;
create policy mandate_price_amendments_agency_read on public.mandate_price_amendments
  for select to authenticated
  using (agency_id = public.get_current_agency_id());

-- 3. Les droits, en toutes lettres : anon n'a rien ; le navigateur lit (la politique de chaque table
-- le borne à son agence) et n'écrit rien ; le serveur écrit. Sur la conclusion, le navigateur avait
-- aussi REFERENCES, TRIGGER et MAINTAIN (relevés sur la production le 28/11), qu'il ne peut pas
-- employer par l'API : ils lui sont retirés, il garde la lecture.
revoke all on table public.project_meeting_conclusions from anon, authenticated;
grant select on table public.project_meeting_conclusions to authenticated;
grant select, insert, update, delete on table public.project_meeting_conclusions to service_role;
revoke all on table public.mandate_price_amendments from anon, authenticated;
grant select on table public.mandate_price_amendments to authenticated;
grant select, insert, update, delete on table public.mandate_price_amendments to service_role;

-- La garde : si un droit n'est pas celui-là, la migration s'annule. Elle lit aussi ce qui viendrait
-- de PUBLIC et des droits posés sur une seule colonne, et le droit de vider une table.
do $$
declare
  t text;
begin
  foreach t in array array['public.project_meeting_conclusions', 'public.mandate_price_amendments']
  loop
    if has_any_column_privilege('anon', t, 'SELECT')
       or has_any_column_privilege('anon', t, 'INSERT')
       or has_any_column_privilege('anon', t, 'UPDATE')
       or has_table_privilege('anon', t, 'DELETE')
       or has_table_privilege('anon', t, 'TRUNCATE') then
      raise exception 'vie_du_mandat : anon a un droit sur %', t;
    end if;
    if not has_table_privilege('authenticated', t, 'SELECT') then
      raise exception 'vie_du_mandat : le navigateur ne lit plus %', t;
    end if;
    if has_any_column_privilege('authenticated', t, 'INSERT')
       or has_any_column_privilege('authenticated', t, 'UPDATE')
       or has_table_privilege('authenticated', t, 'DELETE')
       or has_table_privilege('authenticated', t, 'TRUNCATE') then
      raise exception 'vie_du_mandat : le navigateur peut écrire dans %', t;
    end if;
    if not (
      has_table_privilege('service_role', t, 'SELECT')
      and has_table_privilege('service_role', t, 'INSERT')
      and has_table_privilege('service_role', t, 'UPDATE')
      and has_table_privilege('service_role', t, 'DELETE')
    ) then
      raise exception 'vie_du_mandat : le serveur ne peut plus écrire dans %', t;
    end if;
  end loop;
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relname = 'mandate_price_amendments' and c.relrowsecurity
  ) then
    raise exception 'vie_du_mandat : la table des avenants n''a pas sa RLS';
  end if;
end $$;
