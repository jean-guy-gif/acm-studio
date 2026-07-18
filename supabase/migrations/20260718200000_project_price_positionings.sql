-- ACM Studio — Mission 18: persist the advisor's price-positioning decision.
--
-- One active positioning per project (UNIQUE(project_id)). The recommended range,
-- confidence and snapshot are ALWAYS recomputed server-side (TypeScript engine of
-- Mission 17) before being persisted.
--
-- SECURITY MODEL (CTO-hardened):
--   * RLS exposes READS to the project's agency only.
--   * There is NO insert/update/delete/truncate privilege for `authenticated`
--     and NO write policy, so the browser can never write — directly or through
--     a public RPC. There is intentionally NO save/delete RPC callable by
--     `authenticated`: a public RPC accepting range/confidence/snapshot would let
--     an authenticated user bypass the Server Action and persist invented values.
--   * All writes happen in a Server Action, AFTER authentication + agency/project
--     authorisation, via a server-only SERVICE ROLE client that bypasses RLS.
--     agency_id / range / confidence / snapshot / validated_by / validated_at /
--     updated_at are all imposed by the server; the browser only supplies
--     advisor_price, seller_price and justification.

create table public.project_price_positionings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  agency_id uuid not null references public.agencies (id),
  advisor_price numeric not null check (advisor_price > 0),
  seller_price numeric check (seller_price is null or seller_price > 0),
  range_low numeric not null check (range_low > 0),
  range_central numeric not null check (range_central > 0),
  range_high numeric not null check (range_high > 0),
  confidence_score integer not null check (confidence_score between 0 and 100),
  confidence_level text not null check (confidence_level in ('very_high', 'high', 'medium', 'low')),
  justification text check (justification is null or char_length(justification) <= 1000),
  calculation_snapshot jsonb not null,
  validated_at timestamptz not null default now(),
  validated_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint project_price_positionings_project_unique unique (project_id),
  constraint project_price_positionings_range_order
    check (range_low <= range_central and range_central <= range_high)
);

-- Indexes (UNIQUE(project_id) already provides the project_id index).
create index idx_ppp_agency_id on public.project_price_positionings (agency_id);
create index idx_ppp_validated_by on public.project_price_positionings (validated_by);
create index idx_ppp_validated_at on public.project_price_positionings (validated_at);

-- =====================================================================
-- Row Level Security: read-only for the project's agency, no direct writes.
-- =====================================================================
alter table public.project_price_positionings enable row level security;

create policy ppp_select_agency_isolation on public.project_price_positionings
  for select
  to authenticated
  using (agency_id = public.get_current_agency_id());

-- No insert/update/delete policy → direct writes are denied by RLS. Revoke the
-- default table privileges as a second line of defence (TRUNCATE bypasses RLS, so
-- it is revoked too). Writes happen only through the server-only service role
-- client, from a Server Action, after authorisation.
revoke insert, update, delete, truncate on public.project_price_positionings from authenticated;
revoke all on public.project_price_positionings from anon;
