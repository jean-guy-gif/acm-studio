-- ACM Studio — Initial Supabase schema
-- Source of truth: DATABASE.md
-- This migration is deterministic and replayable on an empty database.
-- Scope: schema only (tables, columns, constraints, relations, indexes, RLS). No business logic, seed, or data.

-- =====================================================================
-- Tables
-- =====================================================================

-- 1. agencies
create table public.agencies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  primary_color text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 2. profiles
create table public.profiles (
  id uuid primary key references auth.users (id),
  agency_id uuid not null references public.agencies (id),
  first_name text not null,
  last_name text not null,
  email text not null,
  role text not null check (role in ('owner', 'admin', 'advisor')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 3. projects
create table public.projects (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id),
  advisor_id uuid not null references public.profiles (id),
  seller_name text not null,
  seller_email text,
  seller_phone text,
  status text not null check (
    status in ('draft', 'preparation', 'ready_for_meeting', 'meeting_completed', 'archived')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 4. subject_properties
create table public.subject_properties (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id),
  project_id uuid not null references public.projects (id),
  address text,
  city text,
  postal_code text,
  property_type text,
  surface_area numeric,
  land_area numeric,
  rooms_count integer,
  bedrooms_count integer,
  bathrooms_count integer,
  energy_rating text,
  description text,
  strengths jsonb,
  weaknesses jsonb,
  photo_urls jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 5. comparables
create table public.comparables (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id),
  project_id uuid not null references public.projects (id),
  title text,
  address text,
  city text,
  postal_code text,
  price numeric not null,
  surface_area numeric,
  land_area numeric,
  rooms_count integer,
  bedrooms_count integer,
  bathrooms_count integer,
  energy_rating text,
  days_on_market integer,
  price_drop_amount numeric,
  price_drop_percentage numeric,
  listing_url text,
  source text,
  photo_urls jsonb,
  advisor_notes text,
  display_order integer not null,
  is_selected boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 6. meeting_scripts
create table public.meeting_scripts (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id),
  project_id uuid not null references public.projects (id),
  version integer not null,
  status text not null check (status in ('draft', 'validated', 'used', 'archived')),
  script_json jsonb not null,
  created_by uuid not null references public.profiles (id),
  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 7. meeting_sessions
create table public.meeting_sessions (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id),
  project_id uuid not null references public.projects (id),
  meeting_script_id uuid not null references public.meeting_scripts (id),
  advisor_id uuid not null references public.profiles (id),
  status text not null check (status in ('not_started', 'in_progress', 'completed', 'cancelled')),
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 8. seller_answers
create table public.seller_answers (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id),
  project_id uuid not null references public.projects (id),
  meeting_session_id uuid not null references public.meeting_sessions (id),
  comparable_id uuid references public.comparables (id),
  question_key text not null,
  answer_type text not null,
  answer_text text,
  answer_number numeric,
  answer_boolean boolean,
  answer_json jsonb,
  created_at timestamptz not null default now()
);

-- 9. perception_results
create table public.perception_results (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id),
  project_id uuid not null references public.projects (id),
  meeting_session_id uuid not null references public.meeting_sessions (id),
  psychological_competitor_id uuid references public.comparables (id),
  best_value_competitor_id uuid references public.comparables (id),
  most_dangerous_competitor_id uuid references public.comparables (id),
  seller_suggested_price numeric,
  priority_criteria jsonb,
  perception_gaps jsonb,
  market_understanding_score numeric,
  summary_json jsonb,
  created_at timestamptz not null default now()
);

-- 10. reports
create table public.reports (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id),
  project_id uuid not null references public.projects (id),
  meeting_session_id uuid not null references public.meeting_sessions (id),
  perception_result_id uuid references public.perception_results (id),
  report_json jsonb not null,
  advisor_summary text,
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- 11. exports
create table public.exports (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id),
  project_id uuid not null references public.projects (id),
  report_id uuid references public.reports (id),
  export_type text not null check (export_type in ('pptx', 'pdf')),
  file_url text,
  status text not null check (status in ('pending', 'completed', 'failed')),
  created_by uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

-- 12. audit_logs
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null references public.agencies (id),
  profile_id uuid references public.profiles (id),
  project_id uuid references public.projects (id),
  action text not null,
  entity_type text,
  entity_id uuid,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- =====================================================================
-- Indexes (exactly those recommended in DATABASE.md)
-- =====================================================================

create index idx_profiles_agency_id on public.profiles (agency_id);
create index idx_projects_agency_id on public.projects (agency_id);
create index idx_projects_advisor_id on public.projects (advisor_id);
create index idx_subject_properties_project_id on public.subject_properties (project_id);
create index idx_comparables_project_id on public.comparables (project_id);
create index idx_comparables_display_order on public.comparables (display_order);
create index idx_meeting_scripts_project_id on public.meeting_scripts (project_id);
create index idx_meeting_sessions_project_id on public.meeting_sessions (project_id);
create index idx_seller_answers_project_id on public.seller_answers (project_id);
create index idx_seller_answers_meeting_session_id on public.seller_answers (meeting_session_id);
create index idx_perception_results_project_id on public.perception_results (project_id);
create index idx_reports_project_id on public.reports (project_id);
create index idx_exports_project_id on public.exports (project_id);
create index idx_audit_logs_agency_id on public.audit_logs (agency_id);
create index idx_audit_logs_project_id on public.audit_logs (project_id);

-- =====================================================================
-- Helper function (documented in DATABASE.md)
-- =====================================================================

-- Returns the agency_id of the currently authenticated profile.
-- Defined after the tables so its SQL body can resolve public.profiles.
-- SECURITY DEFINER so RLS policies can call it without recursing on the profiles policy.
create or replace function public.get_current_agency_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select agency_id from public.profiles where id = auth.uid()
$$;

-- =====================================================================
-- Row Level Security
-- =====================================================================

-- Enable RLS on every table.
alter table public.agencies enable row level security;
alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.subject_properties enable row level security;
alter table public.comparables enable row level security;
alter table public.meeting_scripts enable row level security;
alter table public.meeting_sessions enable row level security;
alter table public.seller_answers enable row level security;
alter table public.perception_results enable row level security;
alter table public.reports enable row level security;
alter table public.exports enable row level security;
alter table public.audit_logs enable row level security;

-- agencies: visible only to members of that agency.
create policy agencies_agency_isolation on public.agencies
  for all
  to authenticated
  using (id = public.get_current_agency_id())
  with check (id = public.get_current_agency_id());

-- Business tables: a user may only access data belonging to their agency.
create policy profiles_agency_isolation on public.profiles
  for all
  to authenticated
  using (agency_id = public.get_current_agency_id())
  with check (agency_id = public.get_current_agency_id());

create policy projects_agency_isolation on public.projects
  for all
  to authenticated
  using (agency_id = public.get_current_agency_id())
  with check (agency_id = public.get_current_agency_id());

create policy subject_properties_agency_isolation on public.subject_properties
  for all
  to authenticated
  using (agency_id = public.get_current_agency_id())
  with check (agency_id = public.get_current_agency_id());

create policy comparables_agency_isolation on public.comparables
  for all
  to authenticated
  using (agency_id = public.get_current_agency_id())
  with check (agency_id = public.get_current_agency_id());

create policy meeting_scripts_agency_isolation on public.meeting_scripts
  for all
  to authenticated
  using (agency_id = public.get_current_agency_id())
  with check (agency_id = public.get_current_agency_id());

create policy meeting_sessions_agency_isolation on public.meeting_sessions
  for all
  to authenticated
  using (agency_id = public.get_current_agency_id())
  with check (agency_id = public.get_current_agency_id());

create policy seller_answers_agency_isolation on public.seller_answers
  for all
  to authenticated
  using (agency_id = public.get_current_agency_id())
  with check (agency_id = public.get_current_agency_id());

create policy perception_results_agency_isolation on public.perception_results
  for all
  to authenticated
  using (agency_id = public.get_current_agency_id())
  with check (agency_id = public.get_current_agency_id());

create policy reports_agency_isolation on public.reports
  for all
  to authenticated
  using (agency_id = public.get_current_agency_id())
  with check (agency_id = public.get_current_agency_id());

create policy exports_agency_isolation on public.exports
  for all
  to authenticated
  using (agency_id = public.get_current_agency_id())
  with check (agency_id = public.get_current_agency_id());

create policy audit_logs_agency_isolation on public.audit_logs
  for all
  to authenticated
  using (agency_id = public.get_current_agency_id())
  with check (agency_id = public.get_current_agency_id());
