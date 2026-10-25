-- Mission 122 (partie A) — le dossier qui fait agir : tout part de SA recherche, et il répond.
--
-- `buyer_selections.buyer_words` : « Vous m'avez dit : … », la phrase relue et modifiée par le
--   conseiller ; null = la phrase proposée par l'outil, bâtie depuis la fiche.
-- `buyer_selection_items.pitch` : « Pourquoi je vous le propose », 140 caractères au plus, relue et
--   modifiée par le conseiller avant de présenter ; null = la phrase proposée par l'outil.
-- `buyer_item_responses` : sa réponse à chaque bien, un FAIT daté — visiter, peut-être, pas pour
--   moi (avec ses raisons) —, donnée pendant la présentation ou depuis le lien (partie B) ; une
--   réponse par bien et par moment.
-- `buyer_visit_requests.availability` : ses disponibilités, portées par la demande de visite.
-- `buyers.ignored_suggestions` : les suggestions que le conseiller a ignorées, par raison ; elles
--   ne reviennent plus.
--
-- Lecture : les membres non retirés de l'agence ; écriture : le serveur seul (comme `buyers`).
-- Compatible avec le code de `main` : colonnes nullables ou à défaut vide, une table neuve, aucune
-- ligne écrite.

alter table public.buyer_selections add column buyer_words text
  check (buyer_words is null or char_length(buyer_words) between 1 and 300);
comment on column public.buyer_selections.buyer_words is
  'Mission 122 — « Vous m''avez dit », modifié par le conseiller ; null = la phrase proposée.';

alter table public.buyer_selection_items add column pitch text
  check (pitch is null or char_length(pitch) between 1 and 140);
comment on column public.buyer_selection_items.pitch is
  'Mission 122 — « Pourquoi je vous le propose », modifié par le conseiller ; null = la phrase proposée.';

alter table public.buyer_visit_requests add column availability text[] not null default '{}'
  check (availability <@ array['sat_morning', 'sat_afternoon', 'sunday', 'weekday_day', 'weekday_evening']::text[]);
comment on column public.buyer_visit_requests.availability is
  'Mission 122 — les disponibilités de l''acquéreur pour cette visite.';

alter table public.buyers add column ignored_suggestions text[] not null default '{}'
  check (ignored_suggestions <@ array['district', 'surface', 'outdoor', 'parking', 'price', 'works', 'photos', 'other']::text[]);
comment on column public.buyers.ignored_suggestions is
  'Mission 122 — les suggestions ignorées par le conseiller, par raison ; elles ne reviennent plus.';

create table public.buyer_item_responses (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  buyer_id uuid not null references public.buyers (id) on delete cascade,
  selection_item_id uuid not null references public.buyer_selection_items (id) on delete cascade,
  answer text not null check (answer in ('visit', 'maybe', 'no')),
  reasons text[] not null default '{}'
    check (reasons <@ array['district', 'surface', 'outdoor', 'parking', 'price', 'works', 'photos', 'other']::text[]),
  answered_during text not null check (answered_during in ('presentation', 'dossier')),
  answered_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  -- Des raisons ne se donnent qu'à « Pas pour moi ».
  constraint buyer_item_responses_reasons_on_no check (answer = 'no' or cardinality(reasons) = 0),
  constraint buyer_item_responses_once unique (selection_item_id, answered_during)
);

create index buyer_item_responses_buyer on public.buyer_item_responses (buyer_id, answered_at desc);

comment on table public.buyer_item_responses is
  'Mission 122 — la réponse d''un acquéreur à un bien retenu : visiter, peut-être, pas pour moi et ses raisons ; datée, pendant la présentation ou depuis le lien.';

alter table public.buyer_item_responses enable row level security;
create policy buyer_item_responses_agency_read on public.buyer_item_responses
  for select to authenticated
  using (agency_id = public.get_current_agency_id());
revoke all on public.buyer_item_responses from anon, authenticated;
grant select on public.buyer_item_responses to authenticated;
