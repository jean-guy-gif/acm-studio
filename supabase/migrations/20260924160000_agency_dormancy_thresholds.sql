-- Mission 59 — les seuils de « ce qui dort » deviennent réglables par le manager.
--
-- Un rythme de suivi, pas une méthode : « depuis combien de jours un dossier qui n'avance plus
-- doit-il sauter aux yeux du manager ? » varie légitimement d'une agence à l'autre. Ce n'est
-- PAS un réglage de méthode (le minimum de 3 concurrents, les tolérances restent hors de portée).
--
-- STOCKAGE : deux colonnes sur `agencies`, pas une table à part — deux entiers ne justifient pas
-- leur propre table (agency_branding en portait douze, ce n'est pas le même cas). NOT NULL avec
-- les défauts actuels du code (21 / 30) → aucun rattrapage : chaque agence existante hérite des
-- défauts. Un CHECK garde le minimum d'un jour ; au-delà, un manager qui met 90 jours sait ce
-- qu'il fait (validation minimale, décidée).
alter table public.agencies
  add column preparation_dormant_days integer not null default 21
    check (preparation_dormant_days >= 1),
  add column follow_up_dormant_days integer not null default 30
    check (follow_up_dormant_days >= 1);
