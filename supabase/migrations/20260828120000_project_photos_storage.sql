-- Mission 37 — Photos du bien vendeur.
-- First use of Supabase Storage in the repo: a PRIVATE bucket for the seller's
-- own property photos (real files uploaded by the advisor). Objects live under
-- {agency_id}/{project_id}/property/{uuid}.{ext}. Read happens through short-lived
-- signed URLs generated server-side; the bucket is never public.
--
-- RLS on storage.objects mirrors the table policies: a conseiller only ever
-- touches files whose first path segment (agency_id) equals his own agency.

insert into storage.buckets (id, name, public)
values ('project-photos', 'project-photos', false)
on conflict (id) do nothing;

-- The caller's agency, as text, for comparison with the first path segment.
-- Wrapped so the four policies stay identical and readable.
create or replace function public.current_agency_id_text()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select agency_id::text from public.profiles where id = auth.uid()
$$;

drop policy if exists "project_photos_select_own_agency" on storage.objects;
create policy "project_photos_select_own_agency"
on storage.objects for select to authenticated
using (
  bucket_id = 'project-photos'
  and (storage.foldername(name))[1] = public.current_agency_id_text()
);

drop policy if exists "project_photos_insert_own_agency" on storage.objects;
create policy "project_photos_insert_own_agency"
on storage.objects for insert to authenticated
with check (
  bucket_id = 'project-photos'
  and (storage.foldername(name))[1] = public.current_agency_id_text()
);

drop policy if exists "project_photos_update_own_agency" on storage.objects;
create policy "project_photos_update_own_agency"
on storage.objects for update to authenticated
using (
  bucket_id = 'project-photos'
  and (storage.foldername(name))[1] = public.current_agency_id_text()
)
with check (
  bucket_id = 'project-photos'
  and (storage.foldername(name))[1] = public.current_agency_id_text()
);

drop policy if exists "project_photos_delete_own_agency" on storage.objects;
create policy "project_photos_delete_own_agency"
on storage.objects for delete to authenticated
using (
  bucket_id = 'project-photos'
  and (storage.foldername(name))[1] = public.current_agency_id_text()
);
