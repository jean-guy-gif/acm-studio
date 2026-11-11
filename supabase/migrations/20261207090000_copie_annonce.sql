-- Mission 152 (partie A) — Prouver : la copie de l'annonce, et la date de la dernière vérification.
--
-- Au Live, « Voir l'annonce » ouvre l'annonce sur son portail ; quand elle n'y est plus, le
-- conseiller montre la copie qu'ACM en a gardée. Aujourd'hui, le prix relevé est daté et immuable
-- (`listing_observations`, M47), mais le texte et les photos d'un concurrent se modifient à la main
-- (« Modifier la fiche »), sans historique : il n'y a pas de copie (mesure du 11/11).
--
--   `competitor_listing_copies` : l'annonce telle qu'ACM l'a lue, UNE fois, à la création du
--   concurrent — sa source (`page` : la page lue par l'extension ; `search` : la carte de la
--   recherche, M101), sa date, le portail et l'identité de l'annonce (M47), le prix, le texte, les
--   adresses des photos (jamais copiées, M58) et les faits (une liste d'autorisation, relue au
--   serveur à l'écriture et à la lecture : ni titre, ni adresse, ni lien, ni « Vendu par », ni
--   exclusivité, M83, M107). Une par concurrent ; jamais modifiée, clé de service comprise ; partie
--   avec son concurrent (cascade), son dossier et son agence. Lue par les membres non retirés de
--   l'agence ; écrite par le serveur seul ; le concurrent, de ce dossier et de cette agence, vérifié
--   par la base. Le texte ne part jamais vers le Live (garde de donnée, M51) : il sert à la fiche
--   complète du conseiller (partie B).
--
--   `projects.listings_checked_at` : la dernière fois que le conseiller a vérifié les annonces de
--   ses concurrents avant le rendez-vous (« Depuis la préparation ») ; un rappel, rien de plus.
--   Comme `language` (M140 A), le navigateur peut l'écrire dans son agence (`projects` est accordé
--   à la table entière, M147 A).
--
-- Compatible avec le code de `main` : une table neuve qu'il ne connaît pas et une colonne nulle ;
-- aucune ligne écrite, aucune copie reconstituée pour les concurrents déjà importés (M56). Seul
-- `scripts/nettoyer-test.mjs` de `main` s'arrête devant une table à `agency_id` qu'il ne classe pas :
-- entre l'application et le `/valide`, l'e2e ne se joue que depuis la branche.

create table public.competitor_listing_copies (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  project_id uuid not null references public.projects (id) on delete cascade,
  comparable_id uuid not null unique references public.comparables (id) on delete cascade,
  source text not null check (source in ('page', 'search')),
  captured_at timestamptz not null default now(),
  portal text check (portal is null or char_length(portal) between 1 and 60),
  listing_key text check (listing_key is null or char_length(listing_key) between 1 and 500),
  price numeric not null check (price > 0),
  listing_text text check (listing_text is null or char_length(listing_text) <= 20000),
  photo_urls jsonb not null default '[]'::jsonb
    check (jsonb_typeof(photo_urls) = 'array' and jsonb_array_length(photo_urls) <= 40),
  facts jsonb not null default '{}'::jsonb
    check (jsonb_typeof(facts) = 'object' and pg_column_size(facts) <= 20000)
);

create index competitor_listing_copies_listing
  on public.competitor_listing_copies (agency_id, portal, listing_key);
create index competitor_listing_copies_project on public.competitor_listing_copies (project_id);

comment on table public.competitor_listing_copies is
  'Mission 152 — la copie de l''annonce d''un concurrent, écrite une fois à sa création, jamais modifiée ; écrite par le serveur seul.';

-- Le concurrent est de ce dossier et de cette agence ; la copie ne date pas de l'avenir ; elle ne se
-- modifie jamais (une suppression, par cascade ou par l'effacement réel, reste possible).
create function public.check_competitor_listing_copy()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    raise exception 'competitor_listing_copies : une copie ne se modifie pas' using errcode = 'check_violation';
  end if;
  if not exists (
    select 1 from public.comparables c
    where c.id = new.comparable_id and c.project_id = new.project_id and c.agency_id = new.agency_id
  ) then
    raise exception 'competitor_listing_copies : le concurrent n''est pas de ce dossier ni de cette agence'
      using errcode = 'check_violation';
  end if;
  if new.captured_at > now() + interval '5 minutes' then
    raise exception 'competitor_listing_copies : une copie ne date pas de l''avenir' using errcode = 'check_violation';
  end if;
  return new;
end $$;

revoke all on function public.check_competitor_listing_copy() from public, anon, authenticated;

create trigger competitor_listing_copies_check
  before insert or update on public.competitor_listing_copies
  for each row execute function public.check_competitor_listing_copy();

alter table public.competitor_listing_copies enable row level security;
create policy competitor_listing_copies_agency_read on public.competitor_listing_copies
  for select to authenticated
  using (agency_id = public.get_current_agency_id());
revoke all on public.competitor_listing_copies from anon, authenticated;
grant select on public.competitor_listing_copies to authenticated;

alter table public.projects add column listings_checked_at timestamptz;
comment on column public.projects.listings_checked_at is
  'Mission 152 — la dernière vérification des annonces des concurrents avant le rendez-vous (« Depuis la préparation »).';
