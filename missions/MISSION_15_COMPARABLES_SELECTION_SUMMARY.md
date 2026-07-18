# MISSION 15 — COMPARABLES : SÉLECTION ET SYNTHÈSE

## Statut

Réalisée.

---

# Classification

**MVP**

Cette mission prépare directement l'exploitation des biens concurrents dans Builder et Live.

---

# Objectif produit

Permettre au conseiller de :

- distinguer les comparables retenus de ceux écartés ;
- comprendre immédiatement la cohérence de sa sélection ;
- visualiser les principaux indicateurs de marché ;
- préparer automatiquement une synthèse exploitable lors du rendez-vous vendeur.

Le logiciel prépare.

Le conseiller décide.

---

# Objectifs fonctionnels

À l'issue de cette mission, le conseiller doit pouvoir :

- sélectionner les biens réellement pertinents ;
- écarter les biens inutiles sans les supprimer ;
- retrouver facilement un bien écarté ;
- visualiser instantanément les statistiques de sa sélection ;
- préparer les données qui seront utilisées dans le module Live.

Aucune intelligence artificielle n'intervient encore.

Toutes les statistiques sont déterministes.

---

# Périmètre MVP

## 1. Séparation des comparables

La liste des comparables doit être divisée en deux groupes.

### Biens retenus

Les biens utilisés pour construire l'avis de valeur.

### Biens écartés

Les biens conservés dans le projet mais exclus de l'analyse.

---

## 2. Carte comparable

Chaque carte doit afficher au minimum :

- photo principale ;
- titre ;
- ville ;
- quartier si disponible ;
- prix ;
- surface ;
- prix au m² calculé par ACM ;
- nombre de pièces ;
- origine :
  - Manuel
  - Import URL
- statut :
  - Retenu
  - Écarté.

---

## 3. Actions disponibles

Le conseiller doit pouvoir :

- retenir un bien ;
- écarter un bien ;
- réintégrer un bien écarté ;
- modifier un comparable ;
- supprimer un comparable ;
- modifier l'ordre des biens retenus.

Les mécanismes développés lors de la Mission 13 doivent être réutilisés.

Aucune logique dupliquée.

---

# Synthèse automatique

Créer une synthèse calculée uniquement à partir des biens retenus.

Afficher :

- nombre de comparables retenus ;
- prix moyen ;
- prix médian ;
- prix minimum ;
- prix maximum ;
- surface moyenne ;
- prix moyen au m² ;
- prix médian au m².

Les calculs ignorent automatiquement :

- prix nuls ;
- surfaces nulles ;
- données invalides.

---

# Comparaison avec le bien vendeur

Lorsque la surface du bien vendeur est connue, afficher pour chaque comparable :

Surface comparable

↓

Écart en m²

↓

Écart en %

Calcul :

```
écart = surfaceComparable - surfaceBien
```

```
écart% =
(surfaceComparable - surfaceBien)
/ surfaceBien
× 100
```

Ne rien afficher si la surface vendeur est inconnue.

---

# Alertes automatiques

Créer uniquement des alertes simples.

## Nombre de comparables

Moins de 3

→ Avertissement

Entre 3 et 8

→ OK

Plus de 8

→ Avertissement

---

## Dispersion des prix

Calcul :

```
(maxPrixM2 - minPrixM2)
/
médianePrixM2
```

Si le résultat dépasse :

```
30 %
```

Afficher :

> Les comparables présentent une forte dispersion de prix.

---

## Données incomplètes

Afficher une alerte lorsqu'un comparable retenu possède :

- aucun prix ;
- aucune surface ;
- aucune photo.

---

# Résumé réutilisable

Créer un service indépendant.

Type attendu :

```ts
export type ComparableSelectionSummary = {
  selectedCount: number;

  averagePrice: number | null;
  medianPrice: number | null;

  averagePricePerSquareMeter: number | null;
  medianPricePerSquareMeter: number | null;

  averageSurfaceArea: number | null;

  minimumPrice: number | null;
  maximumPrice: number | null;

  warnings: ComparableSelectionWarning[];
};
```

Cette structure sera réutilisée plus tard dans Live.

---

# Règles métier

## Bien retenu

```
is_selected = true
```

## Bien écarté

```
is_selected = false
```

Aucun nouveau statut.

---

## Prix au m²

Calcul :

```ts
Math.round(price / surfaceArea)
```

Uniquement si :

- prix > 0
- surface > 0

Sinon :

```
null
```

---

## Médiane

Nombre impair

→ valeur centrale

Nombre pair

→ moyenne des deux valeurs centrales.

Créer une fonction pure.

---

# Interface

Ordre d'affichage :

1. Synthèse
2. Alertes
3. Biens retenus
4. Biens écartés
5. Bouton Ajouter un comparable

---

# États vides

Prévoir :

- aucun comparable ;
- aucun comparable retenu ;
- aucun comparable écarté ;
- données insuffisantes.

---

# Suppression

La suppression demande confirmation.

Toutes les autres actions sont immédiates.

---

# Architecture

Créer ou compléter proprement :

```
src/features/comparables/

    components/

        comparable-card.tsx

        comparable-selection-summary.tsx

        comparable-selection-warnings.tsx

        selected-comparables-list.tsx

        rejected-comparables-list.tsx

    services/

        calculate-comparable-summary.ts

        build-comparable-warnings.ts

    types/

        comparable-selection-summary.ts
```

Ne jamais dupliquer :

- déplacement ;
- sélection ;
- suppression.

Réutiliser le code existant.

---

# Base de données

Avant toute migration :

Inspecter le schéma.

Réutiliser :

- is_selected
- display_order

Créer une migration uniquement si une donnée indispensable au MVP manque réellement.

---

# Tests obligatoires

## Calculs

Tester :

- zéro comparable ;
- un comparable ;
- médiane paire ;
- médiane impaire ;
- valeurs nulles ;
- prix nul ;
- surface nulle ;
- prix au m² ;
- minimum ;
- maximum ;
- moyenne.

---

## Alertes

Tester :

- moins de 3 comparables ;
- entre 3 et 8 ;
- plus de 8 ;
- dispersion > 30 % ;
- comparable sans prix ;
- comparable sans surface ;
- comparable sans photo.

---

## Interface

Tester :

- séparation retenus / écartés ;
- changement de sélection ;
- ordre des retenus ;
- suppression avec confirmation ;
- états vides ;
- mise à jour automatique de la synthèse.

---

# Critères d'acceptation

La mission est validée lorsque :

- les biens sont séparés entre retenus et écartés ;
- la sélection est persistée ;
- l'ordre des retenus est conservé ;
- les indicateurs sont exacts ;
- les alertes sont déterministes ;
- aucune donnée invalide ne casse les calculs ;
- le résumé est réutilisable dans Live ;
- aucune migration inutile n'est créée ;
- tous les tests sont verts ;
- lint est vert ;
- typecheck est vert ;
- build est vert.

---

# Hors périmètre

## V2

- score automatique des comparables ;
- pondération des biens ;
- recommandations IA ;
- OpenRouter ;
- graphiques avancés ;
- carte interactive.

## V3

- comparaison automatique avec DVF ;
- ajustement automatique des prix ;
- estimation assistée par IA.

---

# Definition of Done

- développement terminé ;
- tests terminés ;
- mission mise à jour ;
- aucun fichier temporaire ;
- aucune dette bloquante connue ;
- commit local propre ;
- aucun push.

---

# Livrables attendus

À la fin de la mission, Claude Code devra fournir :

- résumé des développements réalisés ;
- fichiers créés ;
- fichiers modifiés ;
- migrations éventuelles ;
- résultats des tests ;
- git diff ;
- git status.

Aucun commit.

Aucun push.

Une revue CTO sera effectuée avant validation.