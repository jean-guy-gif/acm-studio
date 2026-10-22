-- Mission 113 — « Sans photo », sur l'écran conseiller de la synthèse : le conseiller retire la
-- photo d'un concurrent du document imprimé ET du lien déjà envoyé. Le choix est gardé en base pour
-- que la page publique le respecte (elle relit le dossier à chaque ouverture, M110).
--
-- Une colonne, fausse par défaut : la photo figure, comme Laurent l'a décidé (21/10). Aucune ligne
-- n'est modifiée ; le code de main ne lit ni n'écrit la colonne. L'écriture suit les règles déjà
-- posées sur `comparables` (agence du dossier, M108) : aucune règle nouvelle.

alter table public.comparables
  add column synthesis_hide_photo boolean not null default false;

comment on column public.comparables.synthesis_hide_photo is
  'Mission 113 — vrai : la synthèse laissée au vendeur ne montre pas la photo de ce concurrent.';
