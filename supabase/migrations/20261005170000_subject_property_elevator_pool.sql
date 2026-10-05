-- Essai Stream Estate, étape 2 « les 10 plus proches » : ascenseur et piscine du bien vendeur.
--
-- Deux faits de la fiche, en trois états : oui (true) / non (false) / non renseigné (null). Ils
-- ORDONNENT les concurrents (niveau 2), ils ne filtrent rien. Null par défaut : aucune ligne
-- existante n'est touchée, aucune valeur n'est devinée — un bien déjà saisi reste « non renseigné »
-- jusqu'à ce que le conseiller le dise.
--
-- Compatible avec le code de main : deux colonnes nullable sans défaut, qu'il ne lit ni n'écrit.
-- RLS inchangée (la politique d'isolation par agence de subject_properties s'applique).
alter table public.subject_properties
  add column has_elevator boolean,
  add column has_pool boolean;

comment on column public.subject_properties.has_elevator is
  'Ascenseur : true = oui, false = non, null = non renseigné.';
comment on column public.subject_properties.has_pool is
  'Piscine : true = oui, false = non, null = non renseigné.';
