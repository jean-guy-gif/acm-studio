-- Mission 55 jalon 1 — L'identité de l'agence (socle manuel).
--
-- UNE SEULE SOURCE. Les colonnes dormantes agencies.logo_url et primary_color existent
-- depuis le schéma initial, ne servent NULLE PART, et sont vides partout (0 non-null en
-- local ET en staging). On les SUPPRIME — sinon deux sources possibles pour le même fait.
-- L'identité vit désormais dans agency_branding (1:1), et les logos dans un bucket dédié.

alter table public.agencies drop column if exists logo_url;
alter table public.agencies drop column if exists primary_color;

-- La charte, 1:1 avec l'agence. Chaque couleur est un HEX validé PAR LA BASE : une couleur
-- est une DONNÉE, jamais une instruction — un CHECK rejette tout ce qui n'est pas #RRGGBB
-- avant même qu'elle atteigne une feuille de style. Tout est nullable → une agence sans
-- charte tombe sur les défauts produit (Start Academy).
create table public.agency_branding (
  id uuid primary key default gen_random_uuid(),
  agency_id uuid not null unique references public.agencies (id) on delete cascade,

  -- Deux versions du logo (§4) : claire pour les écrans de travail, sombre pour le Live.
  logo_light_path text,
  logo_dark_path text,

  -- La palette RÉSOLUE = exactement ce qui est injecté. Figée à la validation.
  brand text check (brand is null or brand ~ '^#[0-9A-Fa-f]{6}$'),
  brand_deep text check (brand_deep is null or brand_deep ~ '^#[0-9A-Fa-f]{6}$'),
  brand_soft text check (brand_soft is null or brand_soft ~ '^#[0-9A-Fa-f]{6}$'),
  -- Les deux stops sombres du dégradé du Live (jusqu'ici en dur #013a58 / #01283b).
  brand_darker text check (brand_darker is null or brand_darker ~ '^#[0-9A-Fa-f]{6}$'),
  brand_darkest text check (brand_darkest is null or brand_darkest ~ '^#[0-9A-Fa-f]{6}$'),
  -- La couleur du texte POSÉ sur un aplat de marque (bouton), selon la luminance de brand.
  on_brand_text text check (on_brand_text is null or on_brand_text ~ '^#[0-9A-Fa-f]{6}$'),

  -- La couleur de marque a-t-elle été assombrie pour rester lisible EN TEXTE (§5) ?
  text_contrast_adjusted boolean not null default false,

  validated_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_agency_branding_agency on public.agency_branding (agency_id);

alter table public.agency_branding enable row level security;
create policy agency_branding_select_own on public.agency_branding
  for select to authenticated using (agency_id = public.get_current_agency_id());
-- Écritures via Server Action + service role (après autorisation), jamais directes.
revoke insert, update, delete, truncate on public.agency_branding from authenticated;
revoke all on public.agency_branding from anon;

-- Bucket PUBLIC pour les logos : un logo est une donnée publique de marque, affichée au
-- vendeur pendant le Live. Lecture publique via URL stable ; écritures cadrées sur l'agence
-- (1er segment du chemin = agency_id), même garde que project-photos.
insert into storage.buckets (id, name, public)
values ('agency-branding', 'agency-branding', true)
on conflict (id) do nothing;

drop policy if exists "agency_branding_insert_own" on storage.objects;
create policy "agency_branding_insert_own" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'agency-branding'
    and (storage.foldername(name))[1] = public.current_agency_id_text()
  );

drop policy if exists "agency_branding_update_own" on storage.objects;
create policy "agency_branding_update_own" on storage.objects for update to authenticated
  using (
    bucket_id = 'agency-branding'
    and (storage.foldername(name))[1] = public.current_agency_id_text()
  )
  with check (
    bucket_id = 'agency-branding'
    and (storage.foldername(name))[1] = public.current_agency_id_text()
  );

drop policy if exists "agency_branding_delete_own" on storage.objects;
create policy "agency_branding_delete_own" on storage.objects for delete to authenticated
  using (
    bucket_id = 'agency-branding'
    and (storage.foldername(name))[1] = public.current_agency_id_text()
  );
