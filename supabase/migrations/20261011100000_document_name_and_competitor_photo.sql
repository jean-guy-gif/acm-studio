-- Mission 87 — Un dossier de prospection présentable, avec la photo du concurrent.
--
-- 1. Le nom de l'agence tel qu'il s'imprime sur les documents. Facultatif : null = le nom de
--    l'agence. 40 caractères au plus, pour tenir sur une ligne en pied de page.
-- 2. La photo du bien concurrent, choisie par le conseiller, par concurrent et par version comme
--    la photo de notre bien (remplace M84, « jamais les photos du concurrent ») :
--      • their_photo_mode : 'listing' (une photo de son annonce), 'upload' (« Ma photo »),
--        'none' (« Sans photo ») ; null = pas encore choisi, l'écran propose la première photo
--        de l'annonce ;
--      • their_photo_source_url : l'adresse de la photo d'annonce retenue ;
--      • their_photo_path : le fichier dans le stockage de l'agence — la photo importée, ou la
--        copie de la photo d'annonce (un lien de portail expire avec l'annonce).
--
-- Compatible avec le code de `main` : quatre colonnes nullables, aucune ligne écrite.

alter table public.agency_branding
  add column document_name text
    check (document_name is null or char_length(document_name) between 1 and 40);

comment on column public.agency_branding.document_name is
  'Nom de l''agence imprimé sur les documents (dossier de prospection). Null = le nom de l''agence.';

alter table public.competitor_prospecting_files
  add column their_photo_mode text
    check (their_photo_mode is null or their_photo_mode in ('listing', 'upload', 'none')),
  add column their_photo_source_url text
    check (
      their_photo_source_url is null
      or (their_photo_source_url ~ '^https?://' and char_length(their_photo_source_url) <= 2000)
    ),
  add column their_photo_path text
    check (their_photo_path is null or char_length(their_photo_path) <= 300),
  -- Une photo d'annonce a son adresse ; « sans photo » n'a ni adresse ni fichier.
  add constraint competitor_prospecting_files_their_photo_check
    check (
      (their_photo_mode is distinct from 'listing' or their_photo_source_url is not null)
      and (their_photo_mode is distinct from 'upload' or their_photo_path is not null)
      and (their_photo_mode is distinct from 'none'
           or (their_photo_source_url is null and their_photo_path is null))
    );
