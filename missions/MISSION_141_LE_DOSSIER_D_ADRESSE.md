# MISSION 141 — Le dossier d'adresse

**Date** : 07/11/2026 · **Origine** : réunion Plaud du 03/11 et décision de Jean-Guy du 07/11 : « le
dossier d'adresse doit aider au moment où le conseiller rentre le prix d'estimation et complète le dossier
vendeur ; pas encore le Live ».

Équipe allégée. Données **publiques et gratuites**, lues côté serveur, jamais d'IA. Une migration probable
(cache du dossier par bien, daté) : gardien-sql, arrêt. Jean-Guy ne teste que sur la production.

## Où
1. Sur le dossier vendeur, onglet **Bien vendeur** (un bloc « Dossier d'adresse ») et sur **Avant le
   rendez-vous**, à côté de la décision de prix. **Écran conseiller seulement** : rien dans le Live ni dans
   les documents du vendeur (décision du 07/11 ; un report au Live pourra venir plus tard).
2. Construit à la demande (« Construire le dossier d'adresse ») dès que l'adresse du bien est géocodée
   (BAN, déjà utilisée), puis gardé et daté ; « Actualiser » le refait.

## Ce qu'il contient (sources publiques)
3. **Ventes réelles autour** — DVF (data.gouv, Etalab) : les mutations des 3 dernières années, même type
   (maison / appartement), dans un rayon de 500 m (élargi à 1 km sous 5 ventes) : date, prix, surface,
   prix au m², pièces. En tête : médiane du prix au m², fourchette (1er–3e quartile), nombre de ventes.
   Puis **le prix au m² du bien vendeur au prix envisagé**, placé dans cette fourchette (« dans la
   fourchette haute »). Jamais un nom de vendeur ou d'acheteur ; aucune revente des données.
4. **Le DPE du bien et de l'immeuble** — base ADEME : le DPE le plus récent trouvé à l'adresse (classe
   énergie et GES, date, surface déclarée), pour vérifier ce que dit le vendeur (M79).
5. **Risques** — Géorisques : inondation, mouvements de terrain, retrait-gonflement des argiles,
   sismicité, radon, sites pollués à proximité ; ce que l'acquéreur trouvera dans l'ERP.
6. **Urbanisme** — Géoportail de l'urbanisme : la zone du PLU de la parcelle et son libellé ; servitudes
   d'utilité publique si disponibles. Avec la parcelle cadastrale (section, numéro, contenance), utile aussi
   à l'offre d'achat (M137).
7. **Copropriété** — Registre national des copropriétés : si l'adresse en est une, nombre de lots, syndic,
   date de construction, procédures déclarées.
8. Chaque bloc dit sa source et sa date, et « Rien trouvé à cette adresse » quand c'est le cas. Une source
   en panne n'empêche pas les autres.

## Pour la décision de prix
9. Sur « Avant le rendez-vous », à côté du prix envisagé : « Ventes réelles à 500 m : médiane 6 850 €/m²
   (14 ventes) · votre prix envisagé : 7 300 €/m², fourchette haute ». Information, jamais une
   recommandation de prix.

## Démo
Une adresse de démo crédible à Vence avec un dossier d'adresse pré-construit (données publiques réelles du
secteur, sans appel en direct pendant la démo).

## Preuves
- Tests : calcul médiane/quartiles, élargissement à 1 km, placement du prix envisagé, source en panne.
- e2e : construire le dossier d'adresse sur un dossier de démo ; le bloc prix sur « Avant le rendez-vous ».
