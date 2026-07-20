-- ACM Studio — Mission 22: structured diagnostics and condominium data.
--
-- Two tables linked to subject_properties, one active row per property per domain
-- (UNIQUE(subject_property_id)). No attachments, no files. Writes go through the
-- RLS-scoped user client from Server Actions (no service role): RLS limits read
-- and write to the property's agency. agency_id is derived server-side, never from
-- the client. updated_at follows the repo convention (default now(); set by the
-- action on upsert — no trigger, consistent with the other tables).

-- Common diagnostic status vocabulary.
-- not_required | not_done | in_progress | clear | anomaly | positive | negative | unknown

-- =====================================================================
-- Table 1: diagnostics
-- =====================================================================
create table public.subject_property_diagnostics (
  id uuid primary key default gen_random_uuid(),
  subject_property_id uuid not null references public.subject_properties (id) on delete cascade,
  agency_id uuid not null references public.agencies (id),
  dpe_date date,
  energy_consumption integer
    check (energy_consumption is null or (energy_consumption between 0 and 2000)),
  ges_emissions integer
    check (ges_emissions is null or (ges_emissions between 0 and 500)),
  asbestos_status text,
  lead_status text,
  electricity_status text,
  gas_status text,
  termites_status text,
  erp_status text,
  diagnostics_completed_at date,
  diagnostics_valid_until date,
  notes text check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint spd_subject_property_unique unique (subject_property_id),
  constraint spd_valid_until_after_completed check (
    diagnostics_valid_until is null
    or diagnostics_completed_at is null
    or diagnostics_valid_until >= diagnostics_completed_at
  ),
  constraint spd_status_values check (
    (asbestos_status is null or asbestos_status in (
      'not_required', 'not_done', 'in_progress', 'clear', 'anomaly', 'positive', 'negative', 'unknown'))
    and (lead_status is null or lead_status in (
      'not_required', 'not_done', 'in_progress', 'clear', 'anomaly', 'positive', 'negative', 'unknown'))
    and (electricity_status is null or electricity_status in (
      'not_required', 'not_done', 'in_progress', 'clear', 'anomaly', 'positive', 'negative', 'unknown'))
    and (gas_status is null or gas_status in (
      'not_required', 'not_done', 'in_progress', 'clear', 'anomaly', 'positive', 'negative', 'unknown'))
    and (termites_status is null or termites_status in (
      'not_required', 'not_done', 'in_progress', 'clear', 'anomaly', 'positive', 'negative', 'unknown'))
    and (erp_status is null or erp_status in (
      'not_required', 'not_done', 'in_progress', 'clear', 'anomaly', 'positive', 'negative', 'unknown'))
  )
);

create index idx_spd_agency_id on public.subject_property_diagnostics (agency_id);

-- =====================================================================
-- Table 2: condominium
-- =====================================================================
create table public.subject_property_condominiums (
  id uuid primary key default gen_random_uuid(),
  subject_property_id uuid not null references public.subject_properties (id) on delete cascade,
  agency_id uuid not null references public.agencies (id),
  is_condominium boolean not null default false,
  total_lots integer check (total_lots is null or (total_lots between 0 and 1000000)),
  residential_lots integer check (residential_lots is null or (residential_lots between 0 and 1000000)),
  annual_charges numeric check (annual_charges is null or annual_charges >= 0),
  works_fund numeric check (works_fund is null or works_fund >= 0),
  syndic_name text check (syndic_name is null or char_length(syndic_name) <= 2000),
  ongoing_procedures boolean,
  procedures_details text check (procedures_details is null or char_length(procedures_details) <= 2000),
  voted_works boolean,
  voted_works_details text check (voted_works_details is null or char_length(voted_works_details) <= 2000),
  planned_works boolean,
  planned_works_details text check (planned_works_details is null or char_length(planned_works_details) <= 2000),
  known_unpaid_charges boolean,
  known_unpaid_charges_amount numeric
    check (known_unpaid_charges_amount is null or known_unpaid_charges_amount >= 0),
  last_general_assembly_date date,
  notes text check (notes is null or char_length(notes) <= 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint spc_subject_property_unique unique (subject_property_id),
  constraint spc_residential_le_total check (
    total_lots is null or residential_lots is null or residential_lots <= total_lots
  ),
  -- Detail fields only when their boolean is explicitly true.
  constraint spc_procedures_detail check (coalesce(ongoing_procedures, false) or procedures_details is null),
  constraint spc_voted_detail check (coalesce(voted_works, false) or voted_works_details is null),
  constraint spc_planned_detail check (coalesce(planned_works, false) or planned_works_details is null),
  constraint spc_unpaid_amount check (
    coalesce(known_unpaid_charges, false) or known_unpaid_charges_amount is null
  ),
  -- A property declared out of condominium keeps no condominium data.
  constraint spc_non_condominium_neutral check (
    is_condominium or (
      total_lots is null and residential_lots is null and annual_charges is null
      and works_fund is null and syndic_name is null and ongoing_procedures is null
      and procedures_details is null and voted_works is null and voted_works_details is null
      and planned_works is null and planned_works_details is null and known_unpaid_charges is null
      and known_unpaid_charges_amount is null and last_general_assembly_date is null and notes is null
    )
  )
);

create index idx_spc_agency_id on public.subject_property_condominiums (agency_id);

-- =====================================================================
-- Row Level Security: read + write limited to the property's agency.
-- =====================================================================
alter table public.subject_property_diagnostics enable row level security;
alter table public.subject_property_condominiums enable row level security;

-- Ownership is verified through the real chain subject_property -> project ->
-- agency, not merely the child's agency_id column. USING (read / delete / update
-- visibility) requires the linked property to belong to the caller's agency;
-- WITH CHECK (insert / update) additionally pins agency_id to the caller's agency.
-- This blocks an authenticated user from attaching a row to another agency's
-- property even while sending their own agency_id.
create policy spd_agency_isolation on public.subject_property_diagnostics
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.subject_properties sp
      join public.projects p on p.id = sp.project_id
      where sp.id = subject_property_id
        and p.agency_id = public.get_current_agency_id()
    )
  )
  with check (
    agency_id = public.get_current_agency_id()
    and exists (
      select 1
      from public.subject_properties sp
      join public.projects p on p.id = sp.project_id
      where sp.id = subject_property_id
        and p.agency_id = public.get_current_agency_id()
    )
  );

create policy spc_agency_isolation on public.subject_property_condominiums
  for all
  to authenticated
  using (
    exists (
      select 1
      from public.subject_properties sp
      join public.projects p on p.id = sp.project_id
      where sp.id = subject_property_id
        and p.agency_id = public.get_current_agency_id()
    )
  )
  with check (
    agency_id = public.get_current_agency_id()
    and exists (
      select 1
      from public.subject_properties sp
      join public.projects p on p.id = sp.project_id
      where sp.id = subject_property_id
        and p.agency_id = public.get_current_agency_id()
    )
  );
