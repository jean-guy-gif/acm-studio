-- Mission 58 — L'avis de valeur du conseiller quitte le Live pour la préparation.
--
-- Aujourd'hui `advisor_comparative_market_price` (l'analyse du conseiller) est TAPÉ pendant
-- le rendez-vous, sur l'écran « Analyse des prix », devant le vendeur. Un avis de valeur se
-- prépare : le champ déménage à la fin de la préparation, auprès du positionnement — là où le
-- conseiller décide déjà sa fourchette et son prix conseillé, à froid. Dans le Live, la valeur
-- est désormais AFFICHÉE, jamais saisie.
--
-- UNE SEULE SOURCE (règle M55) : la valeur vivait sur `live_seller_summary`. On la déplace vers
-- `project_price_positionings` (sa place naturelle) et on SUPPRIME l'ancienne colonne — jamais
-- deux emplacements pour le même fait. Le champ reste NULLABLE : aucun nouveau critère de
-- préparation, un dossier sans avis de valeur reste prêt (§6).
--
-- CONTINUITÉ VÉRIFIÉE, ÉCRITE ICI. Le compte staging, en dernier avant le DROP :
--   (a) 3 résumés Live portaient une valeur non nulle ;
--   (b) 2 ont une ligne de positionnement → recopiés par le backfill ci-dessous ;
--   (c) 1 n'en a PAS : 3ad605ed-f580-4238-bc0d-24fe015932ff (valeur 249000). MAIS ce dossier
--       est CONCLU (mandat signé le 2026-09-24) et sa valeur est déjà FIGÉE dans
--       project_meeting_conclusions.frozen_advisor_analysis = 249000. Le DROP ne perd donc
--       RIEN de la valeur de record : il ne retire qu'une copie de travail Live, vestigiale
--       pour un dossier signé (la conclusion, elle, reste — §6). On ne crée AUCUNE ligne de
--       positionnement pour l'y reloger : ce serait inventer un positionnement entier
--       (advisor_price, fourchette, snapshot, validated_by tous NOT NULL — interdit), et comme
--       la readiness M52 se garde sur l'EXISTENCE d'une ligne de positionnement, cela ferait
--       basculer un dossier en « prêt » — effet de bord silencieux d'une migration de nettoyage.
--   Bilan : aucune valeur perdue. Chaque valeur non nulle est soit recopiée au positionnement,
--   soit déjà figée dans sa conclusion. Les copies figées M56 ne bougent pas.

alter table public.project_price_positionings
  add column advisor_comparative_market_price numeric
    check (advisor_comparative_market_price is null
      or (advisor_comparative_market_price >= 0 and advisor_comparative_market_price <= 1000000000));

-- Backfill : on recopie la valeur courante là où une ligne de positionnement existe déjà et
-- n'en porte pas encore (jamais par-dessus une valeur existante). Ne crée AUCUNE ligne.
update public.project_price_positionings p set
  advisor_comparative_market_price = s.advisor_comparative_market_price,
  updated_at = now()
from public.live_seller_summary s
where s.project_id = p.project_id
  and p.advisor_comparative_market_price is null
  and s.advisor_comparative_market_price is not null;

-- La saisie a déménagé et plus aucun code ne lit ni n'écrit cette colonne : on la supprime,
-- une seule source. (Le code de la même livraison ne référence plus la colonne ; getLiveSeller
-- Summary lit en select('*'), donc un chargement d'écran ne casse pas si l'ordre de déploiement
-- glisse.)
alter table public.live_seller_summary
  drop column advisor_comparative_market_price;
