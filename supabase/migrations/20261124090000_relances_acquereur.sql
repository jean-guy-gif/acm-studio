-- Mission 135 — Des fiches qui font visiter.
--
-- Trois faits datés d'un acquéreur, qu'aucune colonne ne portait :
--   • `link_shared` : le lien de sa sélection a été partagé (Copier, SMS, WhatsApp, E-mail sur la page
--     du dossier acquéreur) — la première fois par sélection, gardée ; un lien seulement créé ne
--     compte pas (« Passer » dans la série de la 134 n'envoie rien) ;
--   • `relaunch` : « J'ai relancé » sur un lien resté sans réponse 48 h, deux au plus par sélection
--     (la 2e cinq jours après la 1re, puis plus rien) ;
--   • `search_adjusted` : un ajustement de sa recherche appliqué depuis ses refus (M122, M135), avec
--     la raison et un résumé écrit par le serveur (« Budget plafond : 1 650 000 € → 1 579 000 € »),
--     pour « Ce qui s'est passé ».
--
--   `buyer_events` : lue par les membres non retirés de l'agence ; écrite par le serveur seul ;
--   l'agence de la fiche, de la sélection et de l'auteur, et la sélection de cette fiche, vérifiées
--   par la base, quel que soit le chemin. `occurred_at` vaut `now()` par défaut, sans être forcé
--   (modèle de `follow_up_contacts`) : la démo date ses événements.
--
-- Compatible avec le code de `main` : une table neuve qu'il ne connaît pas ; aucune ligne écrite.

create table public.buyer_events (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  buyer_id uuid not null references public.buyers (id) on delete cascade,
  kind text not null check (kind in ('link_shared', 'relaunch', 'search_adjusted')),
  selection_id uuid references public.buyer_selections (id) on delete cascade,
  reason text check (
    reason in ('district', 'surface', 'outdoor', 'parking', 'price', 'works', 'photos')
  ),
  summary text check (length(summary) between 1 and 200),
  occurred_at timestamptz not null default now(),
  created_by uuid references public.profiles (id) on delete set null,
  check (
    (kind in ('link_shared', 'relaunch') and selection_id is not null and reason is null)
    or (kind = 'search_adjusted' and selection_id is null and reason is not null
        and summary is not null)
  )
);

-- Le premier partage d'une sélection est gardé.
create unique index buyer_events_link_shared_once
  on public.buyer_events (selection_id) where kind = 'link_shared';
create index buyer_events_buyer on public.buyer_events (buyer_id, occurred_at desc);
create index buyer_events_agency on public.buyer_events (agency_id);
create index buyer_events_selection on public.buyer_events (selection_id);
create index buyer_events_created_by on public.buyer_events (created_by);

comment on table public.buyer_events is
  'Mission 135 — les faits datés d''un acquéreur : lien partagé, relance, ajustement de sa recherche ; écrits par le serveur seul.';

-- L'agence de la fiche, de la sélection et de l'auteur ; la sélection de cette fiche ; deux relances
-- au plus par sélection.
create function public.check_buyer_event()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if not exists (select 1 from public.buyers b where b.id = new.buyer_id and b.agency_id = new.agency_id) then
    raise exception 'buyer_events : la fiche n''est pas de cette agence' using errcode = 'check_violation';
  end if;
  if new.selection_id is not null and not exists (
    select 1 from public.buyer_selections s
    where s.id = new.selection_id and s.agency_id = new.agency_id and s.buyer_id = new.buyer_id
  ) then
    raise exception 'buyer_events : la sélection n''est pas de cette fiche' using errcode = 'check_violation';
  end if;
  if new.created_by is not null and not exists (
    select 1 from public.profiles p where p.id = new.created_by and p.agency_id = new.agency_id
  ) then
    raise exception 'buyer_events : l''auteur n''est pas de cette agence' using errcode = 'check_violation';
  end if;
  if tg_op = 'INSERT' and new.kind = 'relaunch' and (
    select count(*) from public.buyer_events e
    where e.selection_id = new.selection_id and e.kind = 'relaunch'
  ) >= 2 then
    raise exception 'buyer_events : deux relances au plus par sélection' using errcode = 'check_violation';
  end if;
  return new;
end $$;

revoke all on function public.check_buyer_event() from public, anon, authenticated;

create trigger buyer_events_check
  before insert or update on public.buyer_events
  for each row execute function public.check_buyer_event();

alter table public.buyer_events enable row level security;
create policy buyer_events_agency_read on public.buyer_events
  for select to authenticated
  using (agency_id = public.get_current_agency_id());
revoke all on public.buyer_events from anon, authenticated;
grant select on public.buyer_events to authenticated;
