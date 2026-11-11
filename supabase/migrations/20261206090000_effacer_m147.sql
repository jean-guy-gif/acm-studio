-- Mission 152 (partie 0, étape 2) — effacer ce que la M147 a laissé.
--
-- Le dossier d'adresse et « Vivre ici » construits par ACM (M141, M142) ne sont plus lus ni écrits
-- depuis la M147 A ; `/confidentialite` promet leur effacement au plus tard le 23/11/2026. Depuis
-- l'étape 1 (en production le 11/11, 6be72481), plus aucun code ne les touche. Cette migration
-- supprime les deux tables, leurs fonctions de déclencheur et les trois colonnes, données comprises.
-- Sans copie de sécurité (décision de Jean-Guy, 11/11) : le comptage ci-dessous arrête tout s'il sort
-- de ce qui a été compté en base le 11/11 (1 dossier d'adresse, 4 fiches, colonnes vides). Bornes
-- « au plus » : la CI part d'une base vide.
--
-- Prédiction du catalogue (base partagée, 11/11) : tables publiques 50 → 48, politiques 55 → 53,
-- fonctions 59 → 57, déclencheurs 33 → 31, index 161 → 157 (clé primaire et unicité de chaque table),
-- `buyers` deux colonnes de moins, `buyer_visit_requests` une de moins. `scheduled_at` reste
-- (« Confirmer la visite », M147 A). La CLI joue la migration dans une seule transaction.

-- Les suppressions prennent des verrous forts (`buyers`, `buyer_visit_requests`, et les tables que
-- visent leurs clés étrangères) : si une requête les tient, la migration s'annule au bout de 5 s
-- plutôt que de mettre la production en file derrière elle ; on la relance (gardien-sql, 11/11).
set local lock_timeout = '5s';

do $$
declare
  v_dossiers bigint := (select count(*) from public.address_dossiers);
  v_sheets bigint := (select count(*) from public.living_here_sheets);
  v_priorities bigint := (select count(*) from public.buyers where sector_priorities <> '{}');
  v_places bigint := (select count(*) from public.buyers where living_place is not null);
  v_trips bigint := (select count(*) from public.buyer_visit_requests where living_place_trip is not null);
begin
  raise notice 'avant : % dossier(s) d''adresse, % fiche(s) « Vivre ici », colonnes remplies : %, %, %',
    v_dossiers, v_sheets, v_priorities, v_places, v_trips;
  if v_dossiers > 1 or v_sheets > 4 or v_priorities > 0 or v_places > 0 or v_trips > 0 then
    raise exception 'comptage hors de la prédiction du 11/11 : rien n''est supprimé';
  end if;
end $$;

-- Les tables partent avec leurs règles, leurs déclencheurs, leurs index et leurs contraintes.
drop table public.address_dossiers;
drop table public.living_here_sheets;

-- Les fonctions de leurs déclencheurs, devenues orphelines.
drop function public.check_address_dossier();
drop function public.date_living_here_sheet();

-- Les colonnes partent avec leurs contraintes CHECK.
alter table public.buyers drop column sector_priorities, drop column living_place;
alter table public.buyer_visit_requests drop column living_place_trip;
