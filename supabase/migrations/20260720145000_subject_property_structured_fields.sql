-- ACM Studio — Mission 21: structured enrichment of the seller property.
--
-- Adds the missing structured columns to the EXISTING subject_properties table
-- (no new table). `strengths` already exists as jsonb and is converted in place
-- to text[] to match the new structured argument model; `watch_points` is the new
-- structured "points de vigilance". RLS is unchanged (agency isolation policy
-- from the initial schema still applies). All new fields are optional.

-- 1. Non-destructive conversion of the existing jsonb `strengths` into text[].
--    A deterministic, IMMUTABLE helper turns any legacy jsonb shape into a clean
--    text[] (subqueries are allowed here, unlike in an ALTER ... USING clause).
--    Kept usable by the migration test; not exposed to the API (grants revoked).
--
--    Behaviour:
--      * jsonb array  -> keep only STRING elements, trimmed, non-empty, in order;
--      * jsonb string -> a one-element array with that (trimmed) string;
--      * null / number / boolean / object / anything else -> empty array {}.
create or replace function public.jsonb_to_text_array(input jsonb)
returns text[]
language sql
immutable
as $$
  select case
    when jsonb_typeof(input) = 'array' then coalesce(
      (
        select array_agg(trimmed order by ord)
        from (
          select trim(element #>> '{}') as trimmed, ord
          from jsonb_array_elements(input) with ordinality as a(element, ord)
          where jsonb_typeof(element) = 'string'
        ) parsed
        where parsed.trimmed <> ''
      ),
      '{}'::text[]
    )
    when jsonb_typeof(input) = 'string' and trim(input #>> '{}') <> ''
      then array[trim(input #>> '{}')]
    else '{}'::text[]
  end
$$;

revoke all on function public.jsonb_to_text_array(jsonb) from public;
revoke all on function public.jsonb_to_text_array(jsonb) from anon;
revoke all on function public.jsonb_to_text_array(jsonb) from authenticated;

-- Convert strengths without losing data: temp column -> migrate -> drop old ->
-- rename -> constraints. On a fresh reset there is no data, but the conversion is
-- correct for any pre-existing rows.
alter table public.subject_properties
  add column strengths_text text[];
update public.subject_properties
  set strengths_text = public.jsonb_to_text_array(strengths);
alter table public.subject_properties
  drop column strengths;
alter table public.subject_properties
  rename column strengths_text to strengths;
update public.subject_properties
  set strengths = '{}'
  where strengths is null;
alter table public.subject_properties
  alter column strengths set default '{}';
alter table public.subject_properties
  alter column strengths set not null;

-- The conversion helper is only needed during this migration; drop it so it does
-- not exist in the final schema (and never appears in the generated types).
drop function public.jsonb_to_text_array(jsonb);

-- 2. New columns. `weaknesses` (jsonb) is intentionally left untouched.
alter table public.subject_properties
  add column watch_points text[] not null default '{}',
  add column district text,
  add column floor integer,
  add column building_floors integer,
  add column ges_rating text,
  add column heating_type text,
  add column exposure text,
  add column construction_year integer,
  add column general_condition text,
  add column outdoor_spaces text[] not null default '{}',
  add column parking_types text[] not null default '{}',
  add column monthly_charges numeric,
  add column property_tax numeric;

-- 3. Simple, PostgreSQL-compatible constraints. The precise "current year + 1"
--    upper bound for construction_year is enforced in application validation; the
--    CHECK uses a static safe upper bound (now() is not IMMUTABLE, so it cannot
--    appear in a CHECK).
alter table public.subject_properties
  add constraint sp_floor_range
    check (floor is null or (floor between -1 and 200)),
  add constraint sp_building_floors_range
    check (building_floors is null or (building_floors between 0 and 200)),
  add constraint sp_floor_le_building
    check (floor is null or building_floors is null or floor <= building_floors),
  add constraint sp_construction_year_range
    check (construction_year is null or (construction_year between 1500 and 2100)),
  add constraint sp_monthly_charges_positive
    check (monthly_charges is null or monthly_charges >= 0),
  add constraint sp_property_tax_positive
    check (property_tax is null or property_tax >= 0),
  add constraint sp_ges_rating_values
    check (ges_rating is null or ges_rating in ('A', 'B', 'C', 'D', 'E', 'F', 'G')),
  add constraint sp_exposure_values
    check (
      exposure is null or exposure in (
        'north', 'north_east', 'east', 'south_east', 'south', 'south_west',
        'west', 'north_west', 'dual_aspect', 'multiple', 'unknown'
      )
    ),
  add constraint sp_general_condition_values
    check (
      general_condition is null or general_condition in (
        'new', 'excellent', 'good', 'to_refresh', 'to_renovate', 'major_renovation'
      )
    ),
  add constraint sp_heating_type_values
    check (
      heating_type is null or heating_type in (
        'individual_electric', 'individual_gas', 'individual_heat_pump', 'individual_fuel',
        'individual_wood', 'collective_gas', 'collective_fuel', 'collective_heat_network',
        'mixed', 'none', 'unknown'
      )
    ),
  add constraint sp_outdoor_spaces_values
    check (
      outdoor_spaces <@ array[
        'balcony', 'terrace', 'garden', 'loggia', 'veranda', 'roof_terrace', 'none'
      ]::text[]
    ),
  add constraint sp_outdoor_spaces_none_exclusive
    check (not ('none' = any(outdoor_spaces)) or cardinality(outdoor_spaces) = 1),
  add constraint sp_parking_types_values
    check (
      parking_types <@ array[
        'garage', 'closed_box', 'indoor_parking', 'outdoor_parking', 'carport', 'none'
      ]::text[]
    ),
  add constraint sp_parking_types_none_exclusive
    check (not ('none' = any(parking_types)) or cardinality(parking_types) = 1);
