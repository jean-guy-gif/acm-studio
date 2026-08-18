# MISSION 27 — CLÔTURE TECHNIQUE POST-AUDIT DU 2026-08-17

## Statut

Réalisée.

## Classification

MVP — validation / stabilisation. Aucune nouvelle fonctionnalité.

## Objectif

Vérifier, stabiliser et clôturer les correctifs issus de l'audit terrain du 2026-08-17,
sans réimplémenter ce qui a déjà été livré par les Missions 25 et 26.

## 1. Correctif fiche 3 du Live (seul changement de code)

`src/features/live-seller/components/live-page-duration.tsx`

Écart réel démontré : la **baisse de prix** (« Prix initial … · Baisse … ») était affichée
avant l'enregistrement de `seller_estimated_days_on_market`, alors que la **durée observée**
était correctement masquée. Contraire à l'invariant de révélation progressive de la fiche 3
et à CLAUDE.md Règle 11 (délai **et** baisse révélés ensemble, après les devinettes du vendeur).

Correctif minimal : le bloc historique/baisse est désormais encapsulé derrière `durationRevealed`
(même garde que la durée observée). Aucune logique de calcul, action serveur, validation ou
schéma de base modifié.

Résultat vérifié (smoke test humain final) :
- durée observée **et** baisse de prix restent cachées tant que le vendeur n'a pas saisi et
  validé son estimation ;
- les deux apparaissent après validation ;
- un rechargement ne contourne pas le verrou (`durationRevealed` et `canAdvance` ne lisent que
  la donnée persistée) ;
- page 1 et page 2 n'écrivent jamais `seller_estimated_days_on_market` (écriture par champ via
  `formData.has(...)`), seule la fiche 3 l'enregistre.

La correction ESLint `react-hooks/preserve-manual-memoization` livrée en Mission 26 reste
conforme et inchangée (navigation précédent/suivant, clavier, plein écran, verrous `canAdvance`
inchangés — aucune erreur reproduite).

## 2. Contrôles automatisés — verts

- `npm run test` : 55 fichiers / 444 tests.
- `npm run lint` : propre.
- `npm run typecheck` : propre.
- `npm run format:check` : propre (src/ + supabase/).
- `npm run build` : réussi (route `/comparables/find` présente).

## 3. Base de données — vérifiée

- `supabase db reset` : 13 migrations rejouées, dont
  `20260817150000_live_seller_estimated_days_on_market.sql`.
- Tous les fichiers `supabase/tests/` exécutés (aucun sélectionné arbitrairement) : **6/6 verts**
  — comparables_structured_characteristics, live_seller_responses_and_summary,
  move_selected_comparable, project_price_positioning,
  subject_property_diagnostics_and_condominium, subject_property_structured_fields.

## 4. Types Supabase — vérifiés

`supabase gen types typescript --local --schema public > src/lib/supabase/database.types.ts`
Aucune dérive de schéma : les types committés correspondent au schéma local (seul écart = un
saut de ligne final produit par la CLI, fichier `.prettierignore`). Fichier restauré à sa version
committée ; aucune modification manuelle.

## 5. Mode manuel — intact

Création et édition manuelles d'un comparable (photos, prix, durée, baisses, caractéristiques
structurées) restent pleinement fonctionnelles et indépendantes de l'aspiration web. L'import
automatique demeure un accélérateur, jamais une obligation.

## 6. Smoke test humain final — validé

Compte QA fonctionnel, projet Live QA fonctionnel, parcours Builder → Live déroulé, verrou de la
fiche 3 confirmé au navigateur. Le dataset QA (données fictives, photos placeholders) est un jeu
de test local et n'est pas committé.

## Interdictions respectées

Aucune nouvelle fonctionnalité, aucune refonte UX, aucun contournement anti-bot, aucune estimation
automatique, mode manuel préservé. Seul changement : la correction d'un bug démontré sur la
fiche 3.
