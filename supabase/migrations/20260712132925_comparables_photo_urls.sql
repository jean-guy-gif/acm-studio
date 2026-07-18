-- ACM Studio — Normalise comparables.photo_urls for the URL import feature.
-- The column already exists (jsonb, nullable, no default) from the initial
-- schema. Instead of ADD COLUMN, we harden it: backfill NULLs, make it a
-- non-null jsonb array defaulting to '[]', and constrain it to JSON arrays.
-- No comparable_photos table, no extra column, no scraped_at, no versioning.

update public.comparables
set photo_urls = '[]'::jsonb
where photo_urls is null;

alter table public.comparables
  alter column photo_urls set default '[]'::jsonb;

alter table public.comparables
  alter column photo_urls set not null;

alter table public.comparables
  add constraint comparables_photo_urls_array_check
  check (jsonb_typeof(photo_urls) = 'array');
