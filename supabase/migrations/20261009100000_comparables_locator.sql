-- Mission 75 — l'adresse d'un concurrent, telle que le Localisateur Academia la rend.
--
-- Dix colonnes NULLABLES sur comparables, PAS de backfill : une ligne existante reste à
-- null (« jamais demandé ») et ACM interroge le Localisateur à la prochaine ouverture du
-- dossier. Aucune écriture dans cette migration : rien ne dépend de l'ordre des opérations,
-- et le code de main, qui ignore ces colonnes, continue de fonctionner.
--
-- Ces valeurs sont COPIÉES de la réponse du Localisateur, jamais calculées par ACM : aucun
-- seuil, aucun chiffre de certitude. ACM décide sur locator_label_key et locator_confirmed,
-- jamais en lisant locator_label (un texte à afficher tel quel).
--
-- Distinctes de comparables.address et comparables.source, qui viennent de l'ANNONCE.
-- Réservées au conseiller : jamais dans le Live ni dans une page montrée au vendeur.
--
-- La RLS ne change pas : les politiques de comparables couvrent la ligne entière.

alter table public.comparables
  add column locator_state text,
  add column locator_label text,
  add column locator_label_key text,
  add column locator_address text,
  add column locator_source text,
  add column locator_confirmed boolean,
  add column locator_property_id text,
  add column locator_latitude double precision,
  add column locator_longitude double precision,
  add column locator_analyzed_at timestamptz;

comment on column public.comparables.locator_state is
  'État rendu par le Localisateur : inconnu, en-cours, fiche, pret. Null = jamais demandé.';
comment on column public.comparables.locator_label is
  'Étiquette du Localisateur, affichée telle quelle. ACM ne la lit jamais pour décider.';
comment on column public.comparables.locator_label_key is
  'Clé stable de l''étiquette (confirmee, pistes, copro, rien, vous). Null tant que l''état n''est pas pret.';
comment on column public.comparables.locator_address is
  'Adresse localisée du bien concurrent, rendue par le Localisateur. Usage interne de prospection ; jamais montrée au vendeur.';
comment on column public.comparables.locator_source is
  'Source de l''adresse selon le Localisateur (vous, dpe, copropriete, residence, terrain, meme-bien, cercle). Null sans adresse unique.';
comment on column public.comparables.locator_confirmed is
  'Vrai quand le Localisateur tient l''adresse pour confirmée : ACM ne la redemande plus.';
comment on column public.comparables.locator_property_id is
  'Identifiant du bien dans le Localisateur (bienId).';
comment on column public.comparables.locator_analyzed_at is
  'Date de l''analyse côté Localisateur (analyseLe).';
