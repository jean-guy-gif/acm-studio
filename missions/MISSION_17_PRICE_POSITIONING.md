# MISSION 17 — BUILDER : PRICE POSITIONING

## Statut

Réalisée.

---

# Classification

MVP

---

# Objectif produit

Transformer l’analyse des comparables en une proposition de positionnement commercial.

Le logiciel prépare.

Le conseiller décide.

Le vendeur choisit.

L’IA n’intervient pas.

---

# Philosophie

Le logiciel ne fixe jamais le prix d’un bien.

Il fournit :

- une analyse objective ;
- une fourchette de marché ;
- les éléments factuels qui expliquent cette fourchette ;
- un niveau de confiance sur la qualité des données disponibles.

Le conseiller reste responsable du prix conseillé.

Le vendeur reste libre de son prix de mise en vente.

La fourchette calculée ne constitue jamais une estimation définitive ni une décision automatique.

---

# Données utilisées

Utiliser uniquement :

- les comparables retenus ;
- l’analyse produite par la Mission 16 ;
- les informations disponibles sur le bien vendeur.

Réutiliser obligatoirement :

```ts
calculateComparableAnalysis()
```

Ne pas recalculer une statistique déjà fournie par la Mission 16.

Les comparables écartés ne participent jamais au positionnement.

Les comparables sans prix ou sans surface ne participent pas aux calculs.

---

# Objectif métier

Produire automatiquement :

- une borne basse ;
- une valeur centrale ;
- une borne haute ;
- un niveau de confiance ;
- les comparables les plus influents ;
- une liste de constats objectifs ;
- le positionnement du prix conseillé ;
- le positionnement du prix souhaité par le vendeur.

Ces résultats constituent une aide à la décision pour le conseiller.

---

# Point d’entrée métier

Créer un service unique :

```ts
calculatePricePositioning()
```

Ce service constitue l’unique point d’entrée du moteur de positionnement.

Il orchestre :

- la sélection du jeu de comparables exploitable ;
- le traitement des comparables atypiques ;
- le calcul de la fourchette ;
- le calcul de la confiance ;
- l’identification des comparables influents ;
- la production des constats ;
- le calcul des écarts du prix conseiller et du prix vendeur.

Les autres services ne doivent être appelés que par ce service principal.

---

# Préconditions de calcul

Le positionnement ne peut être calculé que si les conditions suivantes sont réunies :

- une surface vendeur valide est disponible ;
- au moins un comparable retenu possède un prix et une surface valides ;
- une médiane de prix au m² peut être calculée.

Si ces conditions ne sont pas réunies :

- ne produire aucune fourchette artificielle ;
- retourner un état explicite de données insuffisantes ;
- afficher les raisons empêchant le calcul ;
- conserver une interface stable sans erreur.

---

# Traitement des comparables atypiques

Les comparables atypiques sont détectés par la Mission 16.

Le moteur applique la règle suivante :

1. construire le jeu de comparables exploitables ;
2. tenter d’exclure les comparables marqués comme atypiques ;
3. compter les comparables restant après exclusion.

Si au moins trois comparables exploitables restent :

- exclure les atypiques du calcul de la fourchette ;
- conserver leur nombre dans les métadonnées ;
- ajouter un constat expliquant leur exclusion.

Si moins de trois comparables exploitables restent :

- réintégrer tous les comparables exploitables ;
- conserver les atypiques dans le calcul ;
- diminuer fortement l’indice de confiance ;
- ajouter un constat expliquant que les atypiques ont été conservés afin de préserver un échantillon exploitable.

Le moteur ne supprime et ne modifie jamais les comparables.

Il décide uniquement du jeu utilisé pour le calcul courant.

---

# Jeu de calcul officiel

Le moteur doit exposer clairement :

- le nombre total de comparables exploitables ;
- le nombre de comparables utilisés ;
- le nombre d’atypiques détectés ;
- le nombre d’atypiques exclus ;
- l’indication précisant si les atypiques ont dû être réintégrés.

Le jeu retenu après application des règles précédentes constitue le jeu officiel de calcul du positionnement.

Toutes les valeurs de la fourchette doivent provenir de ce même jeu.

---

# Valeur centrale

La valeur centrale est calculée selon la formule :

```text
prix médian au m² du jeu officiel
×
surface vendeur
```

La médiane utilisée doit être recalculée uniquement lorsque le jeu officiel diffère du jeu analysé par la Mission 16 en raison de l’exclusion ou de la réintégration des atypiques.

Ne jamais utiliser la moyenne comme valeur centrale par défaut.

La valeur centrale doit être arrondie selon une règle unique et documentée.

Règle MVP :

- calcul interne en précision complète ;
- montant final arrondi à l’euro le plus proche.

---

# Dispersion utilisée

La largeur de la fourchette dépend de la dispersion du prix au m² observée dans le jeu officiel.

Réutiliser la même définition métier de dispersion que celle validée dans la Mission 16.

N’introduire aucune seconde méthode concurrente.

Niveaux attendus :

```text
Faible
Moyenne
Forte
```

---

# Construction de la fourchette

Créer automatiquement :

```text
borne basse
valeur centrale
borne haute
```

La largeur de la fourchette dépend exclusivement du niveau de dispersion.

Règle métier MVP :

| Dispersion | Borne basse | Borne haute |
|---|---:|---:|
| Faible | valeur centrale - 3 % | valeur centrale + 3 % |
| Moyenne | valeur centrale - 6 % | valeur centrale + 6 % |
| Forte | valeur centrale - 10 % | valeur centrale + 10 % |

Ces règles sont fixes et déterministes.

Aucun pourcentage variable calculé dynamiquement n’est autorisé.

Les bornes doivent être arrondies selon la même règle que la valeur centrale.

Garantir systématiquement :

```text
borne basse ≤ valeur centrale ≤ borne haute
```

---

# Indice de confiance

Calculer un indice parmi :

```text
Très forte
Forte
Moyenne
Faible
```

Le calcul doit être entièrement déterministe.

Il doit prendre en compte au minimum :

- le nombre de comparables utilisés ;
- la dispersion des prix au m² ;
- le nombre de comparables atypiques ;
- la réintégration éventuelle des atypiques ;
- la proximité des surfaces avec le bien vendeur ;
- l’homogénéité géographique.

---

# Règle de scoring de confiance

Créer un score interne explicite et testable.

Le score ne doit pas être présenté comme une probabilité statistique.

Il constitue uniquement une grille métier.

## Score initial

Commencer à :

```text
100 points
```

## Nombre de comparables utilisés

- 8 comparables ou plus : aucune pénalité ;
- 5 à 7 comparables : -10 points ;
- 3 à 4 comparables : -25 points ;
- 1 à 2 comparables : -45 points.

## Dispersion

- faible : aucune pénalité ;
- moyenne : -15 points ;
- forte : -30 points.

## Comparables atypiques

- aucun atypique : aucune pénalité ;
- un atypique exclu : -5 points ;
- plusieurs atypiques exclus : -10 points ;
- atypiques réintégrés faute d’échantillon suffisant : -30 points.

La pénalité de réintégration remplace la pénalité simple liée au nombre d’atypiques.

Ne pas cumuler deux fois la même faiblesse.

## Proximité des surfaces

Calculer la proportion des comparables utilisés dont la surface est située à ±10 % de la surface vendeur.

- au moins 60 % de surfaces proches : aucune pénalité ;
- entre 30 % et 59 % : -10 points ;
- moins de 30 % : -20 points.

## Homogénéité géographique

Calculer la proportion des comparables utilisés appartenant à la localisation majoritaire.

Utiliser en priorité le quartier lorsqu’il est suffisamment renseigné.

Sinon utiliser la ville.

- au moins 75 % dans la localisation majoritaire : aucune pénalité ;
- entre 50 % et 74 % : -10 points ;
- moins de 50 % : -20 points ;
- aucune localisation exploitable : -15 points.

## Conversion du score

Après application des pénalités, borner le score entre 0 et 100.

| Score | Confiance |
|---|---|
| 80 à 100 | Très forte |
| 60 à 79 | Forte |
| 40 à 59 | Moyenne |
| 0 à 39 | Faible |

Le résultat doit exposer :

- le score ;
- le niveau ;
- les facteurs positifs ;
- les facteurs de vigilance.

---

# Constats métier

Produire automatiquement une liste de constats objectifs.

Exemples :

```text
Le positionnement repose sur 6 comparables exploitables.

Le marché observé présente une faible dispersion.

Deux comparables atypiques ont été exclus du calcul.

Les comparables atypiques ont été réintégrés afin de conserver un échantillon suffisant.

La majorité des comparables présente une surface proche du bien vendeur.

Les comparables sont principalement situés dans le même quartier.

Les données disponibles sont géographiquement dispersées.

Peu de comparables exploitables sont disponibles.
```

Les constats doivent être :

- déterministes ;
- basés exclusivement sur les données ;
- non contradictoires ;
- sans vocabulaire commercial excessif ;
- sans interprétation libre ;
- sans génération IA.

Éviter les doublons sémantiques.

---

# Comparables influents

Identifier automatiquement les trois comparables les plus proches du bien vendeur.

Les comparables influents doivent être choisis uniquement dans le jeu officiel utilisé pour la fourchette.

Le classement doit prendre en compte :

- l’écart relatif de surface ;
- l’écart relatif de prix au m² par rapport à la médiane du jeu officiel.

Créer un score de proximité simple et déterministe.

Règle MVP :

```text
score de proximité
=
écart relatif de surface
+
écart relatif de prix au m²
```

Le score le plus faible correspond au comparable le plus influent.

En cas d’égalité, utiliser successivement :

1. le plus faible écart de surface ;
2. le plus faible écart de prix au m² ;
3. le `display_order` ;
4. l’identifiant du comparable pour garantir un ordre stable.

Retourner au maximum trois comparables.

S’il y en a moins de trois, retourner uniquement ceux disponibles.

---

# Prix conseillé par le conseiller

L’interface doit présenter un champ :

```text
Prix conseillé
```

Valeur initiale :

```text
valeur centrale
```

Le conseiller peut modifier librement ce montant.

Le logiciel ne bloque jamais la saisie en raison d’un écart avec la fourchette.

Le moteur doit recalculer immédiatement :

- l’écart absolu avec la valeur centrale ;
- l’écart en pourcentage avec la valeur centrale ;
- la position du prix conseillé dans la fourchette.

---

# Position du prix conseillé

Utiliser les statuts suivants :

```text
Sous le marché observé
Dans le marché observé
Au-dessus du marché observé
```

Règles :

- prix inférieur à la borne basse : `Sous le marché observé` ;
- prix compris entre les bornes, incluses : `Dans le marché observé` ;
- prix supérieur à la borne haute : `Au-dessus du marché observé`.

---

# Prix souhaité par le vendeur

L’interface doit présenter un champ :

```text
Prix souhaité vendeur
```

Ce champ est facultatif.

Lorsqu’un prix vendeur valide est renseigné, calculer :

- l’écart absolu avec la valeur centrale ;
- l’écart en pourcentage avec la valeur centrale ;
- l’écart absolu avec le prix conseillé ;
- l’écart en pourcentage avec le prix conseillé ;
- sa position par rapport à la fourchette.

Si aucun prix vendeur n’est renseigné :

- ne produire aucun écart artificiel ;
- retourner des valeurs nulles ;
- afficher un état neutre.

---

# Calcul des écarts

Créer une règle unique partagée.

Pour une valeur comparée à une référence :

```text
écart absolu = valeur - référence
```

```text
écart en pourcentage =
((valeur - référence) / référence) × 100
```

Si la référence est nulle ou invalide :

- retourner `null` ;
- ne jamais produire `Infinity`, `NaN` ou une exception.

Les pourcentages affichés doivent être arrondis à une décimale.

Les calculs internes conservent leur précision complète.

---

# Contrat métier

Créer un type explicite.

```ts
export type ConfidenceLevel =
  | "very_high"
  | "high"
  | "medium"
  | "low";

export type MarketPosition =
  | "below_observed_market"
  | "within_observed_market"
  | "above_observed_market";

export type PriceDeviation = {
  absolute: number;
  percentage: number | null;
};

export type RecommendedRange = {
  low: number;
  central: number;
  high: number;
  dispersion: "low" | "medium" | "high";
  widthPercentage: 3 | 6 | 10;
};

export type PositioningConfidence = {
  score: number;
  level: ConfidenceLevel;
  positiveFactors: string[];
  warningFactors: string[];
};

export type InfluentialComparable = {
  comparableId: string;
  proximityScore: number;
  surfaceDeviationPercentage: number;
  pricePerSquareMeterDeviationPercentage: number;
};

export type PositioningDataset = {
  totalEligible: number;
  usedCount: number;
  outlierCount: number;
  excludedOutlierCount: number;
  outliersReintroduced: boolean;
};

export type PricePositioning = {
  status: "ready" | "insufficient_data";
  dataset: PositioningDataset;
  recommendedRange: RecommendedRange | null;
  confidence: PositioningConfidence;
  defaultAdvisorPrice: number | null;
  advisorPrice: number | null;
  sellerPrice: number | null;
  advisorDeviationFromCentral: PriceDeviation | null;
  sellerDeviationFromCentral: PriceDeviation | null;
  sellerDeviationFromAdvisor: PriceDeviation | null;
  advisorMarketPosition: MarketPosition | null;
  sellerMarketPosition: MarketPosition | null;
  influentialComparables: InfluentialComparable[];
  reasons: string[];
};
```

Les noms peuvent être adaptés aux conventions exactes du dépôt, mais le contrat fonctionnel doit être respecté.

---

# Entrées du service

Le service principal doit accepter explicitement les données nécessaires.

Exemple :

```ts
type CalculatePricePositioningInput = {
  comparables: Comparable[];
  sellerProperty: {
    surfaceArea: number | null;
    city?: string | null;
    district?: string | null;
  };
  advisorPrice?: number | null;
  sellerPrice?: number | null;
};
```

Le service appelle lui-même :

```ts
calculateComparableAnalysis()
```

Le composant ou la page ne doit pas reconstruire l’analyse métier.

---

# Interface Builder

Créer une nouvelle page Builder dédiée au positionnement.

Ordre obligatoire :

## 1. Fourchette recommandée

Afficher :

- borne basse ;
- valeur centrale ;
- borne haute ;
- niveau de dispersion ;
- nombre de comparables utilisés.

## 2. Indice de confiance

Afficher :

- score ;
- niveau ;
- facteurs positifs ;
- points de vigilance.

## 3. Prix conseillé

Afficher :

- champ éditable ;
- écart avec la valeur centrale ;
- position par rapport à la fourchette.

## 4. Prix souhaité vendeur

Afficher :

- champ éditable facultatif ;
- écart avec la valeur centrale ;
- écart avec le prix conseillé ;
- position par rapport à la fourchette.

## 5. Comparables influents

Afficher au maximum trois comparables avec :

- photo principale si disponible ;
- ville ;
- quartier ;
- prix ;
- surface ;
- prix au m² ;
- écart de surface ;
- score de proximité.

## 6. Constats

Afficher les raisons factuelles produites par le moteur.

---

# Navigation Builder

Ajouter un accès depuis la page d’analyse des comparables vers la page de positionnement.

La navigation devient :

```text
Comparables
→
Analyse
→
Positionnement
```

Ne pas ajouter cette fonctionnalité au module Live.

---

# Gestion locale des champs éditables

Le prix conseillé et le prix vendeur ne sont pas persistés dans cette mission.

Ils peuvent être gérés dans l’état local du composant client.

À chaque modification :

- recalculer les écarts ;
- recalculer le positionnement ;
- ne pas recalculer inutilement l’analyse complète si les comparables et le bien vendeur n’ont pas changé.

Séparer clairement :

- le calcul structurel de la fourchette ;
- le calcul léger des écarts liés aux champs éditables.

Ne pas introduire de stockage navigateur, de cookie ou de `localStorage`.

---

# Architecture

Créer :

```text
src/features/price-positioning/

  services/
    calculate-price-positioning.ts
    calculate-confidence.ts
    find-influential-comparables.ts
    calculate-price-deviation.ts

  components/
    recommended-range.tsx
    confidence-card.tsx
    advisor-price.tsx
    seller-price.tsx
    influential-comparables.tsx
    positioning-reasons.tsx
    price-positioning-view.tsx

  types/
    price-positioning.ts
```

Le point d’entrée unique du moteur est :

```ts
calculatePricePositioning()
```

Les services secondaires sont appelés uniquement par celui-ci, sauf le calcul léger des écarts qui peut être réutilisé par le composant client.

Tous les composants d’affichage doivent rester présentationnels.

Le composant interactif gère uniquement les champs éditables et appelle les fonctions pures nécessaires.

---

# Réutilisation obligatoire

Réutiliser :

```ts
calculateComparableAnalysis()
```

Réutiliser également les fonctions existantes lorsqu’elles couvrent déjà :

- médiane ;
- prix au m² ;
- normalisation des localisations ;
- traitement des comparables ;
- extraction des photos.

Ne pas recopier une fonction existante sous un autre nom.

Ne pas modifier les règles validées des Missions 15 et 16 sans justification bloquante.

---

# Base de données

Aucune migration.

Aucune nouvelle table.

Aucune nouvelle colonne.

Aucune RPC.

Aucune donnée persistée.

Le prix conseillé et le prix vendeur seront persistés dans une mission ultérieure, lorsque le workflow complet du Builder sera suffisamment stabilisé.

---

# Tests obligatoires

## Préconditions

Tester :

- aucune surface vendeur ;
- aucun comparable exploitable ;
- un seul comparable exploitable ;
- données incomplètes ;
- aucune valeur `NaN` ou infinie.

## Traitement des atypiques

Tester :

- aucun atypique ;
- un atypique exclu avec au moins trois comparables restants ;
- plusieurs atypiques exclus ;
- atypiques réintégrés lorsque moins de trois comparables resteraient ;
- nombre exact de comparables utilisés ;
- constat correspondant ajouté ;
- confiance fortement diminuée après réintégration.

## Valeur centrale

Tester :

- médiane impaire ;
- médiane paire ;
- multiplication par la surface vendeur ;
- arrondi final ;
- recalcul de la médiane après exclusion des atypiques.

## Fourchette

Tester :

- dispersion faible : ±3 % ;
- dispersion moyenne : ±6 % ;
- dispersion forte : ±10 % ;
- cohérence borne basse / valeur centrale / borne haute ;
- arrondis.

## Indice de confiance

Tester séparément :

- nombre de comparables ;
- dispersion ;
- aucun atypique ;
- atypiques exclus ;
- atypiques réintégrés ;
- forte proximité des surfaces ;
- faible proximité des surfaces ;
- forte homogénéité géographique ;
- faible homogénéité géographique ;
- absence de localisation ;
- conversion exacte du score vers le niveau ;
- score borné entre 0 et 100.

## Comparables influents

Tester :

- trois comparables trouvés ;
- moins de trois comparables disponibles ;
- classement par surface ;
- classement par prix au m² ;
- score combiné ;
- égalité départagée de manière stable ;
- atypique exclu absent des comparables influents ;
- atypique réintégré éligible lorsqu’il appartient au jeu officiel.

## Prix conseillé

Tester :

- valeur initiale égale à la valeur centrale ;
- prix sous la borne basse ;
- prix dans la fourchette ;
- prix au-dessus de la borne haute ;
- écart absolu ;
- écart en pourcentage ;
- référence nulle.

## Prix vendeur

Tester :

- aucun prix vendeur ;
- prix vendeur sous la fourchette ;
- prix vendeur dans la fourchette ;
- prix vendeur au-dessus de la fourchette ;
- écart avec la valeur centrale ;
- écart avec le prix conseillé ;
- pourcentage correctement arrondi.

## Constats

Tester :

- peu de comparables ;
- dispersion forte ;
- atypiques exclus ;
- atypiques réintégrés ;
- surfaces proches ;
- dispersion géographique ;
- absence de doublon ;
- ordre stable.

---

# Critères d’acceptation

La mission est validée lorsque :

- aucune migration n’est créée ;
- aucune donnée n’est persistée ;
- tous les calculs sont déterministes ;
- `calculateComparableAnalysis()` est réutilisé ;
- un seul point d’entrée métier existe ;
- les comparables atypiques sont exclus lorsque trois comparables exploitables ou plus restent ;
- les atypiques sont réintégrés lorsque leur exclusion laisserait moins de trois comparables ;
- la réintégration diminue fortement la confiance ;
- les largeurs de fourchette respectent exactement 3 %, 6 % et 10 % ;
- le niveau de confiance prend en compte tous les critères définis ;
- les comparables influents proviennent du jeu officiel ;
- les prix conseiller et vendeur restent librement modifiables ;
- aucun calcul ne produit `NaN` ou `Infinity` ;
- aucun composant Live n’est créé ;
- aucune IA n’est utilisée ;
- tous les tests sont verts ;
- lint est vert ;
- typecheck est vert ;
- build est vert.

---

# Hors périmètre

## V2

- persistance du prix conseillé ;
- persistance du prix vendeur ;
- historique des changements de prix ;
- ajustement manuel documenté par motif ;
- pondération selon les caractéristiques ;
- ajustement DPE ;
- ajustement étage ;
- ajustement vue ;
- ajustement extérieur ;
- ajustement exposition ;
- comparaison avec les ventes DVF ;
- capitalisation éditoriale uniforme des libellés.

## V3

- recommandations IA ;
- génération automatique d’argumentaire ;
- simulation de négociation ;
- scénarios de baisse ;
- prédiction du délai de vente ;
- prédiction de probabilité de vente ;
- pondération automatique apprenante.

---

# Points de vigilance

Le moteur produit un positionnement à partir d’un échantillon de comparables saisi ou importé par le conseiller.

La qualité du résultat dépend directement :

- de la qualité des comparables ;
- de leur pertinence ;
- de leur nombre ;
- de leur proximité avec le bien vendeur.

L’indice de confiance ne doit jamais être présenté comme une garantie.

Le système ne doit jamais masquer une faiblesse des données sous prétexte que des humains apprécient les chiffres bien rangés.

---

# Definition of Done

- développement terminé ;
- tests terminés ;
- architecture conforme ;
- aucune migration ;
- aucune persistance ;
- aucun fichier temporaire ;
- aucune donnée de test persistée ;
- aucune dette bloquante connue ;
- mission laissée au statut `À réaliser.` avant revue CTO ;
- aucun commit ;
- aucun push.

---

# Contrôles obligatoires avant revue CTO

Exécuter :

```bash
npm run test
npm run lint
npm run typecheck
npm run build
npm run format:check
```

Le rapport doit préciser tout échec ou avertissement préexistant.

---

# Livrables attendus

À la fin de la mission, Claude Code doit fournir :

- résumé des développements ;
- décisions techniques prises ;
- règles métier implémentées ;
- fichiers créés ;
- fichiers modifiés ;
- confirmation de l’absence de migration ;
- résultats détaillés des tests ;
- nombre total de tests ;
- résultat du lint ;
- résultat du typecheck ;
- résultat du build ;
- résultat du format check ;
- git diff ;
- git status ;
- points de vigilance éventuels.

Aucun commit.

Aucun push.

Une revue CTO sera effectuée avant validation.