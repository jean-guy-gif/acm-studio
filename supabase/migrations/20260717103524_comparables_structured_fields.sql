-- ACM Studio — Dedicated columns for structured imported details.
-- These values must NOT live in listing_features (which stays a free-form array
-- of portal characteristics). The advisor validates and edits them.

alter table public.comparables
  add column portal_price_per_square_meter numeric,
  add column district text,
  add column ges_rating text,
  add column construction_year integer,
  add column heating_type text,
  add column energy_source text;
