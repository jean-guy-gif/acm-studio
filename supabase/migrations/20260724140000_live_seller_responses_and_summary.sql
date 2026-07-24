-- ACM Studio — Mission 24: Live seller comparative core.
--
-- Two tables capturing the SELLER's Live answers, kept strictly separate from the
-- advisor decision (project_price_positionings). Writes go through the RLS-scoped
-- user client from Server Actions (no service role): RLS limits read/write to the
-- project's agency AND verifies the real ownership chain response/summary ->
-- project -> agency, plus that any referenced comparable actually belongs to the
-- project. agency_id is derived server-side, never from the client. updated_at
-- follows the repo convention (default now(); set by the action on upsert).
--
-- This migration ALSO enriches the comparables table with the structured
-- characteristics required to answer "est-il un sérieux concurrent ?" (general
-- condition, exposure, outdoor spaces, parking). Vocabulary + constraints mirror
-- subject_properties exactly. Existing rows keep their values ('{}' for the new
-- array columns); no RLS change.

-- =====================================================================
-- Comparables enrichment (structured competitive characteristics)
-- =====================================================================
alter table public.comparables
  add column general_condition text,
  add column exposure text,
  add column outdoor_spaces text[] not null default '{}',
  add column parking_types text[] not null default '{}';

alter table public.comparables
  add constraint comparables_general_condition_values check (
    general_condition is null
    or general_condition in ('new', 'excellent', 'good', 'to_refresh', 'to_renovate', 'major_renovation')
  ),
  add constraint comparables_exposure_values check (
    exposure is null
    or exposure in ('north', 'north_east', 'east', 'south_east', 'south', 'south_west',
                    'west', 'north_west', 'dual_aspect', 'multiple', 'unknown')
  ),
  add constraint comparables_outdoor_spaces_values check (
    outdoor_spaces <@ ARRAY['balcony', 'terrace', 'garden', 'loggia', 'veranda', 'roof_terrace', 'none']::text[]
  ),
  add constraint comparables_outdoor_spaces_none_exclusive check (
    not ('none' = any (outdoor_spaces)) or cardinality(outdoor_spaces) = 1
  ),
  add constraint comparables_parking_types_values check (
    parking_types <@ ARRAY['garage', 'closed_box', 'indoor_parking', 'outdoor_parking', 'carport', 'none']::text[]
  ),
  add constraint comparables_parking_types_none_exclusive check (
    not ('none' = any (parking_types)) or cardinality(parking_types) = 1
  );

-- =====================================================================
-- Table 1: per-comparable seller responses (the 3-step loop)
-- =====================================================================
create table public.live_seller_responses (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects (id) on delete cascade,
  comparable_id uuid references public.comparables (id) on delete cascade,
  agency_id uuid not null references public.agencies (id),
  seller_serious_competitor text
    check (seller_serious_competitor is null
      or seller_serious_competitor in ('yes', 'no', 'unsure')),
  seller_serious_competitor_comment text
    check (seller_serious_competitor_comment is null
      or char_length(seller_serious_competitor_comment) <= 2000),
  seller_estimated_listing_price numeric
    check (seller_estimated_listing_price is null
      or (seller_estimated_listing_price >= 0 and seller_estimated_listing_price <= 1000000000)),
  seller_market_duration_reason text
    check (seller_market_duration_reason is null
      or seller_market_duration_reason in (
        'price_too_high', 'condition', 'location', 'presentation', 'work_required',
        'strong_competition', 'not_enough_exposure', 'unknown', 'other')),
  seller_market_duration_comment text
    check (seller_market_duration_comment is null
      or char_length(seller_market_duration_comment) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint lsr_project_comparable_unique unique (project_id, comparable_id)
);

create index idx_lsr_agency_id on public.live_seller_responses (agency_id);
create index idx_lsr_project_id on public.live_seller_responses (project_id);
create index idx_lsr_comparable_id on public.live_seller_responses (comparable_id);

-- =====================================================================
-- Table 2: per-project seller summary (most dangerous competitor + prices)
-- =====================================================================
create table public.live_seller_summary (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null unique references public.projects (id) on delete cascade,
  agency_id uuid not null references public.agencies (id),
  seller_most_dangerous_comparable_id uuid references public.comparables (id) on delete set null,
  seller_most_dangerous_reason text
    check (seller_most_dangerous_reason is null
      or seller_most_dangerous_reason in (
        'better_value', 'better_condition', 'better_location', 'better_surface',
        'better_outdoor', 'better_features', 'more_attractive_price', 'other')),
  seller_most_dangerous_comment text
    check (seller_most_dangerous_comment is null
      or char_length(seller_most_dangerous_comment) <= 2000),
  seller_perceived_property_price numeric
    check (seller_perceived_property_price is null
      or (seller_perceived_property_price >= 0 and seller_perceived_property_price <= 1000000000)),
  advisor_comparative_market_price numeric
    check (advisor_comparative_market_price is null
      or (advisor_comparative_market_price >= 0 and advisor_comparative_market_price <= 1000000000)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_lss_agency_id on public.live_seller_summary (agency_id);
create index idx_lss_dangerous_comparable_id
  on public.live_seller_summary (seller_most_dangerous_comparable_id);

-- =====================================================================
-- Row Level Security
-- Ownership verified through the real chain (not just the child agency_id):
--   * the project must belong to the caller's agency;
--   * any referenced comparable must belong to that same project AND agency;
--   * WITH CHECK additionally pins agency_id to the caller's agency.
-- =====================================================================
alter table public.live_seller_responses enable row level security;
alter table public.live_seller_summary enable row level security;

create policy lsr_agency_isolation on public.live_seller_responses
  for all
  to authenticated
  using (
    agency_id = public.get_current_agency_id()
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.agency_id = public.get_current_agency_id()
    )
    and (
      comparable_id is null
      or exists (
        select 1 from public.comparables c
        where c.id = comparable_id
          and c.project_id = project_id
          and c.agency_id = public.get_current_agency_id()
      )
    )
  )
  with check (
    agency_id = public.get_current_agency_id()
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.agency_id = public.get_current_agency_id()
    )
    and (
      comparable_id is null
      or exists (
        select 1 from public.comparables c
        where c.id = comparable_id
          and c.project_id = project_id
          and c.agency_id = public.get_current_agency_id()
      )
    )
  );

create policy lss_agency_isolation on public.live_seller_summary
  for all
  to authenticated
  using (
    agency_id = public.get_current_agency_id()
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.agency_id = public.get_current_agency_id()
    )
    and (
      seller_most_dangerous_comparable_id is null
      or exists (
        select 1 from public.comparables c
        where c.id = seller_most_dangerous_comparable_id
          and c.project_id = project_id
          and c.agency_id = public.get_current_agency_id()
      )
    )
  )
  with check (
    agency_id = public.get_current_agency_id()
    and exists (
      select 1 from public.projects p
      where p.id = project_id and p.agency_id = public.get_current_agency_id()
    )
    and (
      seller_most_dangerous_comparable_id is null
      or exists (
        select 1 from public.comparables c
        where c.id = seller_most_dangerous_comparable_id
          and c.project_id = project_id
          and c.agency_id = public.get_current_agency_id()
      )
    )
  );
