-- Mission 33 — délai de commercialisation lu dans l'annonce elle-même.
--
-- Les portails publient la date de première mise en ligne dans leur propre page
-- (`datePosted` schema.org, `creationDate`…). La stocker, plutôt que le seul
-- nombre de jours, garde le délai juste dans le temps : un import fait trois
-- semaines avant le rendez-vous afficherait sinon un délai périmé.
--
-- `days_on_market` reste la saisie du conseiller (et le repli quand le portail
-- ne publie pas de date). Aucun service tiers n'intervient.
--
-- Pas de contrainte CHECK sur la date : une contrainte fondée sur `now()` n'est
-- pas immuable et fragilise les restaurations. La vraisemblance est vérifiée à
-- la lecture (extract-listing-published-at) et à la saisie (comparable-input).

alter table public.comparables
  add column listing_published_at timestamptz;

comment on column public.comparables.listing_published_at is
  'Date de première mise en ligne publiée par le portail. Source du délai de commercialisation, recalculé à l''affichage. Null = le portail ne la publie pas.';
