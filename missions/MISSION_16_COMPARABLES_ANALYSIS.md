# MISSION 16 — BUILDER : ANALYSE DES COMPARABLES

## Statut

Réalisée.

---

# Classification

**MVP**

Cette mission transforme une simple liste de comparables en une véritable analyse immobilière exploitable par le conseiller.

Aucune intelligence artificielle.

Uniquement des règles métier déterministes.

---

# Objectif produit

À partir des comparables retenus, ACM Studio doit produire automatiquement une analyse objective du marché.

L'objectif est de préparer le conseiller avant son rendez-vous vendeur.

Le logiciel analyse.

Le conseiller interprète.

L'IA n'intervient pas.

---

# Philosophie

Cette mission ne cherche pas à estimer un bien.

Elle cherche à comprendre le marché observé.

Toutes les conclusions doivent être directement justifiables par les données présentes dans les comparables.

Aucune interprétation libre.

Aucune génération de texte.

Uniquement des constats.

---

# Périmètre MVP

Créer un moteur d'analyse des comparables.

Ce moteur doit produire une structure réutilisable par Builder, Live et les futures fonctionnalités IA.

---

# Données analysées

Analyser uniquement les comparables retenus.

Ne jamais utiliser :

- les comparables écartés ;
- les comparables sans prix ;
- les comparables sans surface.

---

# Statistiques générales

Calculer :

- nombre de comparables retenus ;
- prix moyen ;
- prix médian ;
- prix minimum ;
- prix maximum ;
- prix moyen au m² ;
- prix médian au m² ;
- surface moyenne ;
- surface médiane.

---

# Positionnement du bien vendeur

Lorsque le bien vendeur possède une surface :

Calculer :

- différence moyenne de surface ;
- différence médiane ;
- nombre de biens plus petits ;
- nombre de biens plus grands.

---

# Analyse des dispersions

Calculer :

- écart entre le prix minimum et maximum ;
- dispersion des prix au m² ;
- dispersion des surfaces.

Créer des indicateurs simples.

Exemple :

```
Faible dispersion

Moyenne dispersion

Forte dispersion
```

Ne pas utiliser de méthodes statistiques complexes.

---

# Détection des comparables atypiques

Détecter automatiquement les biens éloignés du marché observé.

Règle MVP :

Comparer chaque prix au m² à la médiane.

Si :

```
écart > 20 %
```

Le comparable est marqué :

```
ATYPIQUE
```

Ne jamais supprimer automatiquement un comparable.

Simplement le signaler.

---

# Analyse des surfaces

Déterminer :

- le plus petit bien ;
- le plus grand bien ;
- les biens proches de la surface vendeur (±10 %).

---

# Analyse des prix

Identifier :

- le bien le moins cher ;
- le bien le plus cher ;
- les biens situés autour de la médiane.

---

# Analyse des caractéristiques

À partir de listing_features uniquement.

Calculer la fréquence des principales caractéristiques.

Exemple :

```
Terrasse : 6 / 8

Piscine : 2 / 8

Garage : 5 / 8

Ascenseur : 4 / 8
```

Aucune interprétation.

Uniquement des comptages.

---

# Analyse DPE

Calculer :

Répartition :

```
A

B

C

D

E

F

G
```

Afficher le nombre de comparables dans chaque classe.

---

# Analyse GES

Même logique.

---

# Analyse de localisation

Compter :

- nombre de biens par ville ;
- nombre de biens par quartier.

---

# Analyse des sources

Afficher :

- import manuel ;
- import URL.

---

# Résultat attendu

Créer un service unique :

```
calculateComparableAnalysis()
```

Il retourne :

```ts
export type ComparableAnalysis = {

  statistics: ComparableStatistics;

  sellerComparison: SellerComparison;

  priceAnalysis: PriceAnalysis;

  surfaceAnalysis: SurfaceAnalysis;

  locationAnalysis: LocationAnalysis;

  featureAnalysis: FeatureAnalysis;

  dpeAnalysis: DpeAnalysis;

  gesAnalysis: GesAnalysis;

  outliers: ComparableOutlier[];

};
```

Ce type constitue le contrat métier du Builder.

Aucun composant Live.

---

# Interface Builder

Créer uniquement une page d'analyse.

Ordre :

## 1

Statistiques générales

## 2

Positionnement du bien vendeur

## 3

Analyse des prix

## 4

Analyse des surfaces

## 5

Analyse des caractéristiques

## 6

Répartition DPE

## 7

Répartition GES

## 8

Répartition géographique

## 9

Comparables atypiques

---

# Architecture

Créer :

```
src/features/comparable-analysis/

    services/

        calculate-comparable-analysis.ts

        detect-outliers.ts

        analyze-features.ts

        analyze-location.ts

    components/

        comparable-analysis-overview.tsx

        comparable-analysis-prices.tsx

        comparable-analysis-surfaces.tsx

        comparable-analysis-features.tsx

        comparable-analysis-energy.tsx

        comparable-analysis-location.tsx

        comparable-analysis-outliers.tsx

    types/

        comparable-analysis.ts
```

Réutiliser les services de Mission 15.

Ne jamais recalculer deux fois la même statistique.

---

# Base de données

Aucune migration.

Aucune nouvelle table.

Aucune nouvelle colonne.

Tout est calculé à la volée.

---

# Tests obligatoires

Tester :

## Statistiques

- moyenne
- médiane
- minimum
- maximum

## Outliers

- aucun atypique
- un atypique
- plusieurs atypiques

## Répartition DPE

- toutes les classes
- aucune donnée

## Répartition GES

- toutes les classes
- aucune donnée

## Localisation

- une ville
- plusieurs villes
- plusieurs quartiers

## Caractéristiques

- fréquence correcte
- caractéristiques absentes

---

# Critères d'acceptation

La mission est validée lorsque :

- aucune migration n'est créée ;
- aucune donnée n'est persistée ;
- tous les calculs sont déterministes ;
- toutes les analyses utilisent uniquement les comparables retenus ;
- aucune donnée invalide ne casse le calcul ;
- le résultat est réutilisable par Builder et Live ;
- tous les tests sont verts ;
- lint est vert ;
- typecheck est vert ;
- build est vert.

---

# Hors périmètre

## V2

- pondération automatique ;
- ajustement par étage ;
- ajustement par extérieur ;
- ajustement par exposition ;
- ajustement par année ;
- comparaison DVF.

## V3

- analyse IA ;
- génération automatique d'argumentaire ;
- recommandations de prix ;
- prédiction de valeur.

---

# Definition of Done

- développement terminé ;
- tests terminés ;
- aucun fichier temporaire ;
- aucune dette bloquante connue ;
- mission mise à jour ;
- commit local propre ;
- aucun push.

---

# Livrables attendus

À la fin de la mission, Claude Code devra fournir :

- résumé des développements ;
- fichiers créés ;
- fichiers modifiés ;
- migrations éventuelles ;
- résultats des tests ;
- git diff ;
- git status.

Aucun commit.

Aucun push.

Une revue CTO sera effectuée avant validation.