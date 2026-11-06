-- Mission 139 — Après la visite.
--
--   1. `buyers.language` : la langue du client (français par défaut ; anglais, italien, allemand,
--      russe), pour ses messages écrits depuis des modèles relus, jamais par une IA (23/10).
--   2. `buyer_visit_requests` : le compte rendu de « Visite faite » — l'avis (coup de cœur,
--      intéressé, mitigé, pas pour moi), ce qui a plu et déplu (une liste fermée), la suite (offre
--      envisagée, deuxième visite, on continue à chercher). L'issue (`outcome`, lue par l'offre
--      d'achat, M137 B) reste la vérité et se déduit de la suite : « Offre envisagée » ⇔ 'offer'.
--      La note libre reste `feedback` (2 000 caractères, M119).
--   3. `buyer_dismissals` : un bien écarté pour un acquéreur par le conseiller, avec sa raison, une
--      fois par fiche et par bien (la clé de M134) ; il sort de ses propositions et ne revient plus,
--      veille comprise ; écrit par le serveur seul, lu par l'agence.
--   4. `buyer_events` : deux genres d'envoi notés, jamais des échanges (M135) — le point de la
--      semaine (une fois par fiche et par semaine, la semaine dite par son lundi, jour de Paris) et
--      le point proposé à un acquéreur prêt à visiter.
--
-- Compatible avec le code de `main` : des colonnes nulles ou à valeur par défaut, une table neuve,
-- deux genres de plus (le code de `main` ne lit que les siens) ; aucune ligne modifiée.

-- 1. La langue du client.
alter table public.buyers
  add column language text not null default 'fr'
    check (language in ('fr', 'en', 'it', 'de', 'ru'));

-- 2. Le compte rendu de visite.
alter table public.buyer_visit_requests
  add column opinion text check (opinion in ('love', 'interested', 'mixed', 'not_for_me')),
  add column liked text[] not null default '{}',
  add column disliked text[] not null default '{}',
  add column next_step text check (next_step in ('offer', 'second_visit', 'keep_searching'));

alter table public.buyer_visit_requests
  add constraint buyer_visit_requests_report_tags check (
    liked <@ array['district', 'surface', 'outdoor', 'parking', 'price', 'works', 'light', 'overlooked',
                   'noise', 'pool', 'other']::text[]
    and disliked <@ array['district', 'surface', 'outdoor', 'parking', 'price', 'works', 'light',
                          'overlooked', 'noise', 'pool', 'other']::text[]
    and cardinality(liked) <= 11 and cardinality(disliked) <= 11
  ),
  -- Un compte rendu n'existe que pour une visite faite ; « Offre envisagée » est l'issue 'offer'.
  add constraint buyer_visit_requests_report_dated check (
    (opinion is null and next_step is null and liked = '{}' and disliked = '{}')
    or visited_at is not null
  ),
  add constraint buyer_visit_requests_report_offer check (
    next_step is null or ((next_step = 'offer') = (outcome = 'offer'))
  );

-- 3. Les biens écartés pour un acquéreur.
create table public.buyer_dismissals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  buyer_id uuid not null references public.buyers (id) on delete cascade,
  -- La clé du bien, celle de `buyer_proposals` (M134) : `listing:…`, `project:…`, `competitor:…`.
  property_key text not null check (length(property_key) between 3 and 2100),
  -- Le libellé neutre (type · pièces · surface · commune), jamais un titre ni une adresse.
  label text not null check (length(label) between 1 and 200),
  reason text not null check (
    reason in ('terrace', 'parking', 'floor', 'sector', 'over_budget', 'condition', 'other')
  ),
  dismissed_at timestamptz not null default now(),
  dismissed_by uuid references public.profiles (id) on delete set null,
  unique (buyer_id, property_key)
);

create index buyer_dismissals_agency on public.buyer_dismissals (agency_id);
create index buyer_dismissals_buyer on public.buyer_dismissals (buyer_id, dismissed_at desc);
create index buyer_dismissals_dismissed_by on public.buyer_dismissals (dismissed_by);
-- La tâche « par bien » (M134) cherche les fiches qui ont écarté un bien.
create index buyer_dismissals_property on public.buyer_dismissals (agency_id, property_key);

comment on table public.buyer_dismissals is
  'Mission 139 — un bien écarté pour un acquéreur par le conseiller, avec sa raison, une fois ; il ne lui est plus proposé ; écrit par le serveur seul.';

-- La fiche et l'auteur de l'agence ; seule modification permise : l'auteur vidé par la suppression
-- de son compte. La date n'est pas forcée, comme `buyer_events.occurred_at` (M135) : le serveur ne
-- l'envoie jamais (l'heure de la base, par défaut), la démo seule date ses biens écartés de la semaine.
create function public.check_buyer_dismissal()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if tg_op = 'UPDATE' then
    if new.id is distinct from old.id
       or new.created_at is distinct from old.created_at
       or new.agency_id is distinct from old.agency_id
       or new.buyer_id is distinct from old.buyer_id
       or new.property_key is distinct from old.property_key
       or new.label is distinct from old.label
       or new.reason is distinct from old.reason
       or new.dismissed_at is distinct from old.dismissed_at
       or not (new.dismissed_by is null and old.dismissed_by is not null)
       or exists (select 1 from public.profiles p where p.id = old.dismissed_by) then
      raise exception 'buyer_dismissals : un bien écarté ne se modifie pas' using errcode = 'check_violation';
    end if;
    return new;
  end if;
  if not exists (
    select 1 from public.buyers b where b.id = new.buyer_id and b.agency_id = new.agency_id
  ) then
    raise exception 'buyer_dismissals : la fiche n''est pas de cette agence' using errcode = 'check_violation';
  end if;
  if new.dismissed_by is null or not exists (
    select 1 from public.profiles p where p.id = new.dismissed_by and p.agency_id = new.agency_id
  ) then
    raise exception 'buyer_dismissals : l''auteur n''est pas de cette agence' using errcode = 'check_violation';
  end if;
  new.created_at := now();
  return new;
end $$;

revoke all on function public.check_buyer_dismissal() from public, anon, authenticated;

create trigger buyer_dismissals_check
  before insert or update on public.buyer_dismissals
  for each row execute function public.check_buyer_dismissal();

alter table public.buyer_dismissals enable row level security;
create policy buyer_dismissals_agency_read on public.buyer_dismissals
  for select to authenticated
  using (agency_id = public.get_current_agency_id());
revoke all on public.buyer_dismissals from anon, authenticated;
grant select on public.buyer_dismissals to authenticated;

-- 4. Le point de la semaine et le point proposé.
alter table public.buyer_events
  add column week_start date;

alter table public.buyer_events
  drop constraint buyer_events_kind_check;
alter table public.buyer_events
  add constraint buyer_events_kind_check check (
    kind in ('link_shared', 'relaunch', 'search_adjusted', 'weekly_report', 'meeting_proposed')
  );

alter table public.buyer_events
  drop constraint buyer_events_check;
alter table public.buyer_events
  add constraint buyer_events_check check (
    (kind in ('link_shared', 'relaunch') and selection_id is not null and reason is null
     and summary is null and week_start is null)
    or (kind = 'search_adjusted' and selection_id is null and reason is not null
        and summary is not null and week_start is null)
    -- Le point de la semaine : la semaine dite par son lundi.
    or (kind = 'weekly_report' and selection_id is null and reason is null and summary is null
        and week_start is not null and extract(isodow from week_start) = 1)
    or (kind = 'meeting_proposed' and selection_id is null and reason is null and summary is null
        and week_start is null)
  );

create unique index buyer_events_weekly_report_once
  on public.buyer_events (buyer_id, week_start) where kind = 'weekly_report';

-- Un fait daté ne se déplace pas : sa semaine non plus.
create or replace function public.check_buyer_event()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- L'auteur vidé par la suppression de son compte (`on delete set null`) : rien d'autre ne change,
  -- et la fiche peut déjà être en cours de suppression (le dernier membre d'une agence qui ferme) —
  -- ne rien revérifier (gardien-sql, mission 139 ; le défaut datait de la M135).
  if tg_op = 'UPDATE' and new.created_by is null and old.created_by is not null
     and new.agency_id is not distinct from old.agency_id
     and new.buyer_id is not distinct from old.buyer_id
     and new.selection_id is not distinct from old.selection_id
     and new.kind is not distinct from old.kind
     and new.week_start is not distinct from old.week_start
     and new.reason is not distinct from old.reason
     and new.summary is not distinct from old.summary
     and new.occurred_at is not distinct from old.occurred_at then
    return new;
  end if;
  -- Un fait daté ne se déplace pas : ni d'agence, ni de fiche, ni de sélection, ni de genre, ni de
  -- semaine (seul l'auteur peut devenir nul, quand son profil est supprimé).
  if tg_op = 'UPDATE' and (
    new.agency_id is distinct from old.agency_id
    or new.buyer_id is distinct from old.buyer_id
    or new.selection_id is distinct from old.selection_id
    or new.kind is distinct from old.kind
    or new.week_start is distinct from old.week_start
  ) then
    raise exception 'buyer_events : un événement ne se déplace pas' using errcode = 'check_violation';
  end if;
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
  if tg_op = 'INSERT' and new.kind = 'relaunch' then
    -- Deux « J'ai relancé » au même instant : la sélection verrouillée, l'un attend l'autre.
    perform 1 from public.buyer_selections where id = new.selection_id for update;
    if (
      select count(*) from public.buyer_events e
      where e.selection_id = new.selection_id and e.kind = 'relaunch'
    ) >= 2 then
      raise exception 'buyer_events : deux relances au plus par sélection' using errcode = 'check_violation';
    end if;
  end if;
  return new;
end $$;
