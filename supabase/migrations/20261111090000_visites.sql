-- Mission 119 (partie A) — la présentation de la sélection à l'acquéreur, et les demandes de visite.
--
-- `buyer_selections.presented_at` : la présentation s'est terminée (« Terminer ») ; elle se relit
-- ensuite en lecture seule, « Terminé le [date] », sans se recalculer (M111).
-- `buyer_visit_requests` : chaque demande de visite est un FAIT daté — pendant la présentation,
-- depuis le dossier (partie B) ou par le conseiller —, annulable (`cancelled_at`), puis la visite
-- faite (`visited_at`), son retour libre et son issue (à planifier, visitée, déclinée, offre).
--
-- Lecture : les membres non retirés de l'agence ; écriture : le serveur seul (comme `buyers`).
-- Compatible avec le code de `main` : une colonne nullable, une table neuve, aucune ligne écrite.

alter table public.buyer_selections add column presented_at timestamptz;
comment on column public.buyer_selections.presented_at is
  'Mission 119 — la présentation de cette sélection s''est terminée ; elle se relit en lecture seule.';

create table public.buyer_visit_requests (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id) on delete cascade,
  buyer_id uuid not null references public.buyers (id) on delete cascade,
  buyer_selection_item_id uuid not null references public.buyer_selection_items (id) on delete cascade,
  requested_at timestamptz not null default now(),
  requested_during text not null check (requested_during in ('presentation', 'dossier', 'conseiller')),
  cancelled_at timestamptz,
  visited_at timestamptz,
  feedback text check (feedback is null or char_length(feedback) <= 2000),
  outcome text not null default 'to_plan' check (outcome in ('to_plan', 'visited', 'declined', 'offer')),
  created_at timestamptz not null default now(),
  -- Une visite faite est datée ; une demande annulée n'est pas visitée.
  constraint buyer_visit_requests_visited_dated check (outcome = 'to_plan' or outcome = 'declined' or visited_at is not null),
  constraint buyer_visit_requests_cancelled_not_visited check (cancelled_at is null or visited_at is null)
);

create index buyer_visit_requests_buyer on public.buyer_visit_requests (buyer_id, requested_at desc);
create index buyer_visit_requests_item on public.buyer_visit_requests (buyer_selection_item_id);

comment on table public.buyer_visit_requests is
  'Mission 119 — une demande de visite d''un acquéreur sur un bien retenu : datée, annulable, puis la visite faite, son retour et son issue.';

alter table public.buyer_visit_requests enable row level security;
create policy buyer_visit_requests_agency_read on public.buyer_visit_requests
  for select to authenticated
  using (agency_id = public.get_current_agency_id());
revoke all on public.buyer_visit_requests from anon, authenticated;
grant select on public.buyer_visit_requests to authenticated;
