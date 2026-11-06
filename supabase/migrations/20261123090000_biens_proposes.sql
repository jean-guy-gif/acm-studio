-- Mission 134 — Personne n'est oublié.
--
-- Chaque nouveau bien (mandat signé, vendeur à relancer avec un prix, concurrent retenu, nouveau
-- venu, bien démarché) appelle les acquéreurs de l'agence qui lui correspondent ; le conseiller les
-- leur propose en série, un à un, et note chaque envoi (« Envoyé, suivant »). Ce fait daté manquait :
-- la 133 ne gardait qu'une sélection, posée dès la préparation du lien.
--
--   `buyer_proposals` : un bien proposé à un acquéreur, UNE fois (la première date est gardée,
--   l'écran dit ensuite « déjà proposé le … ») — l'agence, la fiche, le bien par sa clé (`project:`
--   pour un dossier de l'agence, `listing:` portail + numéro pour une annonce, M47/M98, sinon
--   `competitor:` pour une fiche saisie sans annonce), sa source et sa référence dans le vocabulaire
--   de `buyer_selection_items`, le dossier vendeur s'il y en a un, son origine, son libellé neutre
--   (jamais une adresse ni un titre d'annonce), la ligne de sélection qui le porte (pour lire la
--   réponse donnée par le lien, M122 B), le moment de l'envoi — posé par la base — et son auteur.
--   Lue par les membres non retirés de l'agence ; écrite par le serveur seul ; l'agence de la fiche,
--   du dossier et de la ligne de sélection vérifiée par la base, quel que soit le chemin.
--
-- Compatible avec le code de `main` : une table neuve qu'il ne connaît pas ; aucune ligne écrite,
-- aucun envoi passé n'est reconstitué (M56).

create table public.buyer_proposals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  buyer_id uuid not null references public.buyers (id) on delete cascade,
  property_key text not null check (length(property_key) between 3 and 2100),
  source text not null check (source in ('project', 'competitor', 'listing')),
  reference text not null check (length(reference) between 1 and 2000),
  project_id uuid references public.projects (id) on delete cascade,
  origin text not null check (origin in ('mandate', 'follow_up', 'competitor', 'newcomer', 'prospect')),
  label text not null check (length(label) between 1 and 200),
  selection_item_id uuid references public.buyer_selection_items (id) on delete set null,
  sent_at timestamptz not null default now(),
  sent_by uuid references public.profiles (id) on delete set null,
  unique (buyer_id, property_key)
);

create index buyer_proposals_agency on public.buyer_proposals (agency_id);
create index buyer_proposals_property on public.buyer_proposals (agency_id, property_key);
create index buyer_proposals_project on public.buyer_proposals (project_id);
create index buyer_proposals_selection_item on public.buyer_proposals (selection_item_id);
create index buyer_proposals_sent_by on public.buyer_proposals (sent_by);

comment on table public.buyer_proposals is
  'Mission 134 — un bien proposé à un acquéreur (« Envoyé, suivant »), une fois, daté par la base ; écrit par le serveur seul.';

-- L'agence de la fiche, du dossier et de la ligne de sélection ; l'heure de l'envoi est celle de la
-- base, à l'insertion.
create function public.check_buyer_proposal()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (select 1 from public.buyers b where b.id = new.buyer_id and b.agency_id = new.agency_id) then
    raise exception 'buyer_proposals : la fiche n''est pas de cette agence' using errcode = 'check_violation';
  end if;
  if new.project_id is not null and not exists (
    select 1 from public.projects p where p.id = new.project_id and p.agency_id = new.agency_id
  ) then
    raise exception 'buyer_proposals : le dossier n''est pas de cette agence' using errcode = 'check_violation';
  end if;
  if new.selection_item_id is not null and not exists (
    select 1 from public.buyer_selection_items i
    where i.id = new.selection_item_id and i.agency_id = new.agency_id
  ) then
    raise exception 'buyer_proposals : la ligne de sélection n''est pas de cette agence' using errcode = 'check_violation';
  end if;
  if tg_op = 'INSERT' then
    new.sent_at := now();
  else
    new.sent_at := old.sent_at;
  end if;
  return new;
end $$;

revoke all on function public.check_buyer_proposal() from public, anon, authenticated;

create trigger buyer_proposals_check
  before insert or update on public.buyer_proposals
  for each row execute function public.check_buyer_proposal();

alter table public.buyer_proposals enable row level security;
create policy buyer_proposals_agency_read on public.buyer_proposals
  for select to authenticated
  using (agency_id = public.get_current_agency_id());
revoke all on public.buyer_proposals from anon, authenticated;
grant select on public.buyer_proposals to authenticated;
