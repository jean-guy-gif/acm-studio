-- ACM Studio — Store the imported listing description and enriched features.
-- MVP storage decision: the full description goes to its own text column, while
-- every other enriched detail (district, GES, construction year, heating,
-- energy source, portal price/m², portal characteristics) is kept as a JSON
-- array in listing_features rather than adding one dedicated column per field.
-- The advisor validates and edits both before saving. Never copied to advisor_notes.

alter table public.comparables
  add column listing_description text;

alter table public.comparables
  add column listing_features jsonb not null default '[]'::jsonb;

alter table public.comparables
  add constraint comparables_listing_features_array_check
  check (jsonb_typeof(listing_features) = 'array');
