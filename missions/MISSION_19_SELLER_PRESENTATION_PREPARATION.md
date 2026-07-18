# MISSION 19 — BUILDER : PRÉPARATION DE LA PRÉSENTATION VENDEUR

## Statut

Réalisée.

---

# Classification

MVP

---

# Objectif produit

Transformer les données validées du Builder en un dossier structuré, cohérent et réutilisable pour le rendez-vous vendeur.

La mission ne construit pas encore l’interface complète du module Live.

Elle prépare un contrat de présentation stable qui pourra être consommé ultérieurement par :

- Live ;
- un export PDF ;
- une impression ;
- un partage client.

Le logiciel prépare.

Le conseiller anime.

Le vendeur comprend.

Le conseiller décide.

L’IA n’intervient pas.

---

# Objectif métier

Créer un moteur unique :

```ts
buildSellerPresentation()
```

Ce moteur doit agréger les données déjà disponibles dans ACM Studio sans les recalculer inutilement.

Il doit produire une présentation structurée comprenant :

- le résumé du projet ;
- le résumé du bien vendeur ;
- les comparables retenus ;
- la synthèse des comparables ;
- l’analyse du marché ;
- le positionnement courant ;
- la décision validée du conseiller ;
- le prix souhaité vendeur ;
- les écarts de prix ;
- les points de vigilance ;
- les sections disponibles pour une future présentation Live.

---

# Principe fondamental

La présentation vendeur constitue une projection métier des données existantes.

Elle ne doit :

- ni modifier les données source ;
- ni prendre de décision ;
- ni recalculer des règles déjà définies ;
- ni générer de contenu libre ;
- ni utiliser l’IA.

Elle doit uniquement agréger, normaliser et structurer les résultats des missions précédentes.

---

# Sources de données

Réutiliser obligatoirement les éléments existants :

- projet ;
- bien vendeur ;
- comparables retenus ;
- `calculateComparableSummary()` ;
- `calculateComparableAnalysis()` ;
- `calculatePricePositioning()` ;
- positionnement enregistré de la Mission 18 ;
- snapshot enregistré ;
- services d’extraction de photos existants.

Ne jamais dupliquer les règles métier des Missions 15, 16, 17 ou 18.

---

# Point d’entrée unique

Créer :

```ts
buildSellerPresentation()
```

Ce service constitue l’unique point d’entrée métier.

Il doit :

1. charger ou recevoir toutes les données nécessaires ;
2. appeler les services métier existants ;
3. construire les sections ;
4. déterminer les sections disponibles ;
5. produire les alertes de préparation ;
6. retourner un objet typé et versionné.

---

# Version du contrat

Créer une constante :

```ts
SELLER_PRESENTATION_VERSION = 1
```

La version doit être incluse dans le résultat.

Elle servira plus tard à garantir la compatibilité avec Live et les exports.

---

# Contrat métier

Créer un type explicite :

```ts
export type SellerPresentationStatus =
  | "ready"
  | "incomplete";

export type SellerPresentationSectionKey =
  | "property"
  | "comparables"
  | "market_analysis"
  | "price_positioning"
  | "advisor_decision"
  | "seller_price"
  | "warnings";

export type SellerPresentationSectionStatus =
  | "available"
  | "unavailable";

export type SellerPresentationSection = {
  key: SellerPresentationSectionKey;
  status: SellerPresentationSectionStatus;
  order: number;
  title: string;
  reasonUnavailable: string | null;
};

export type SellerPresentationWarning = {
  code: string;
  severity: "info" | "warning" | "blocking";
  message: string;
};

export type SellerPresentation = {
  version: number;
  status: SellerPresentationStatus;
  generatedAt: string;

  project: SellerPresentationProject;
  property: SellerPresentationProperty | null;

  comparables: SellerPresentationComparable[];
  comparableSummary: ComparableSelectionSummary | null;
  marketAnalysis: ComparableAnalysis | null;

  currentPositioning: PricePositioning | null;
  savedPositioning: SavedPricePositioning | null;
  positioningStatus: "not_saved" | "up_to_date" | "outdated";

  sections: SellerPresentationSection[];
  warnings: SellerPresentationWarning[];
};
```

Les noms peuvent être adaptés aux conventions du dépôt, mais le contrat fonctionnel doit être respecté.

---

# Résumé du projet

Inclure au minimum :

- identifiant du projet ;
- nom du projet ;
- statut du projet si disponible ;
- date de création ;
- date de dernière modification.

Ne pas exposer de données internes inutiles.

---

# Résumé du bien vendeur

Inclure les données disponibles nécessaires à la présentation :

- type de bien ;
- adresse ou localisation disponible ;
- ville ;
- quartier ;
- surface ;
- nombre de pièces ;
- nombre de chambres ;
- étage si disponible ;
- extérieur si disponible ;
- stationnement si disponible ;
- DPE ;
- GES ;
- caractéristiques principales ;
- photos disponibles.

Ne jamais inventer une donnée absente.

Les champs manquants restent `null` ou vides selon les conventions du dépôt.

---

# Comparables retenus

Inclure uniquement les comparables avec :

```text
is_selected = true
```

Respecter l’ordre `display_order`.

Pour chaque comparable, inclure au minimum :

- identifiant ;
- titre ;
- ville ;
- quartier ;
- prix ;
- surface ;
- prix au m² ;
- nombre de pièces ;
- nombre de chambres ;
- DPE ;
- GES ;
- photo principale ;
- source ;
- URL source si disponible ;
- statut atypique ;
- score d’influence si disponible ;
- position dans la liste.

Les comparables écartés ne doivent jamais apparaître dans la présentation vendeur.

---

# Synthèse des comparables

Réutiliser :

```ts
calculateComparableSummary()
```

Inclure au minimum :

- nombre de comparables retenus ;
- prix moyen ;
- prix médian ;
- prix minimum ;
- prix maximum ;
- prix moyen au m² ;
- prix médian au m² ;
- alertes de synthèse.

Ne pas recalculer ces valeurs dans la Mission 19.

---

# Analyse du marché

Réutiliser :

```ts
calculateComparableAnalysis()
```

Inclure au minimum :

- statistiques générales ;
- analyse des prix ;
- analyse des surfaces ;
- comparaison avec le bien vendeur ;
- caractéristiques fréquentes ;
- répartition DPE ;
- répartition GES ;
- répartition géographique ;
- comparables atypiques.

La Mission 19 ne modifie aucune règle d’analyse.

---

# Positionnement courant

Réutiliser :

```ts
calculatePricePositioning()
```

Inclure :

- statut du calcul ;
- borne basse ;
- valeur centrale ;
- borne haute ;
- dispersion ;
- score de confiance ;
- niveau de confiance ;
- comparables influents ;
- raisons ;
- prix conseillé courant ;
- prix souhaité vendeur courant si disponible.

Si le moteur retourne `insufficient_data`, la section est indisponible et une alerte bloquante doit être créée.

---

# Décision enregistrée

Récupérer le positionnement enregistré de la Mission 18.

Inclure :

- prix conseillé validé ;
- prix souhaité vendeur ;
- fourchette enregistrée ;
- score et niveau de confiance enregistrés ;
- justification ;
- date de validation ;
- auteur de validation ;
- version du moteur ;
- snapshot enregistré.

La décision enregistrée ne doit jamais être remplacée par le calcul courant.

---

# Statut du positionnement

Réutiliser la logique de divergence de la Mission 18.

Valeurs possibles :

```text
not_saved
up_to_date
outdated
```

Règles :

- aucun positionnement enregistré : `not_saved` ;
- positionnement enregistré identique au calcul courant : `up_to_date` ;
- divergence détectée : `outdated`.

Une décision obsolète reste affichée.

Elle ne doit jamais être masquée ni recalculée automatiquement.

---

# Sections de présentation

Construire les sections dans l’ordre suivant :

1. Bien vendeur
2. Comparables retenus
3. Analyse du marché
4. Positionnement prix
5. Décision du conseiller
6. Prix souhaité vendeur
7. Points de vigilance

Chaque section doit exposer :

- sa clé ;
- son ordre ;
- son titre ;
- son statut ;
- la raison de son indisponibilité.

---

# Disponibilité des sections

## Bien vendeur

Disponible si un bien vendeur existe.

## Comparables retenus

Disponible si au moins un comparable est retenu.

## Analyse du marché

Disponible si l’analyse contient au moins un comparable exploitable.

## Positionnement prix

Disponible si `calculatePricePositioning()` retourne `ready`.

## Décision du conseiller

Disponible si une décision enregistrée existe.

## Prix souhaité vendeur

Disponible si un prix vendeur valide est enregistré.

## Points de vigilance

Toujours disponible.

---

# Statut global de préparation

La présentation est `ready` uniquement si :

- un bien vendeur existe ;
- au moins trois comparables retenus exploitables existent ;
- le positionnement courant est disponible ;
- une décision conseiller est enregistrée.

Sinon elle est `incomplete`.

Ce statut n’interdit jamais l’accès à la présentation.

Il informe uniquement le conseiller du niveau de préparation.

---

# Alertes de préparation

Créer des alertes déterministes.

## Alertes bloquantes

- aucun bien vendeur ;
- aucune surface vendeur valide ;
- aucun comparable retenu exploitable ;
- positionnement impossible.

## Alertes de vigilance

- moins de trois comparables exploitables ;
- décision conseiller non enregistrée ;
- décision enregistrée obsolète ;
- prix vendeur absent ;
- données principales du bien incomplètes ;
- aucun visuel disponible pour le bien vendeur ;
- aucun visuel disponible pour les comparables.

## Alertes informatives

- comparables atypiques exclus ;
- comparables atypiques réintégrés ;
- faible niveau de confiance ;
- forte dispersion du marché.

Les messages doivent être factuels et non culpabilisants.

---

# Interface Builder

Créer une page de prévisualisation :

```text
/builder/[projectId]/presentation
```

Cette page ne doit pas imiter encore le futur mode Live.

Elle doit permettre au conseiller de vérifier la matière préparée.

Ordre de la page :

## 1. État de préparation

Afficher :

- statut global ;
- nombre de sections disponibles ;
- alertes bloquantes ;
- alertes de vigilance.

## 2. Aperçu des sections

Afficher les sept sections dans leur ordre futur.

Chaque section doit être présentée sous forme de bloc simple.

## 3. Bien vendeur

Afficher les informations principales et les photos.

## 4. Comparables

Afficher les comparables retenus dans l’ordre.

## 5. Analyse marché

Afficher les chiffres essentiels.

## 6. Positionnement

Afficher calcul courant et décision enregistrée séparément.

## 7. Points de vigilance

Afficher toutes les alertes.

---

# Navigation Builder

Ajouter un accès depuis la page de positionnement vers la présentation.

Le parcours devient :

```text
Bien vendeur
→ Comparables
→ Analyse
→ Positionnement
→ Présentation
```

Ne pas modifier le module Live dans cette mission.

---

# Architecture

Créer :

```text
src/features/seller-presentation/

  services/
    build-seller-presentation.ts
    build-presentation-sections.ts
    build-presentation-warnings.ts

  components/
    presentation-readiness.tsx
    presentation-section-card.tsx
    presentation-property.tsx
    presentation-comparables.tsx
    presentation-market-analysis.tsx
    presentation-positioning.tsx
    presentation-warnings.tsx

  types/
    seller-presentation.ts
```

Créer la page :

```text
src/app/(protected)/builder/[projectId]/presentation/page.tsx
```

Le point d’entrée métier unique reste :

```ts
buildSellerPresentation()
```

Les composants doivent rester présentationnels.

---

# Chargement des données

La page serveur doit :

1. vérifier l’utilisateur ;
2. vérifier l’agence ;
3. vérifier l’accès au projet ;
4. charger le projet ;
5. charger le bien vendeur ;
6. charger les comparables ;
7. charger le positionnement enregistré ;
8. appeler `buildSellerPresentation()` ;
9. rendre la prévisualisation.

Ne jamais charger des données d’une autre agence.

---

# Base de données

Aucune migration.

Aucune nouvelle table.

Aucune nouvelle colonne.

Aucune RPC.

Aucune persistance supplémentaire.

La présentation est générée à la volée à partir des données existantes.

---

# Tests obligatoires

## Contrat général

Tester :

- version du contrat ;
- date de génération ;
- statut `ready` ;
- statut `incomplete` ;
- ordre stable des sections ;
- aucune mutation des données d’entrée.

## Bien vendeur

Tester :

- bien complet ;
- bien incomplet ;
- aucun bien ;
- photos absentes ;
- champs manquants conservés à `null`.

## Comparables

Tester :

- uniquement les comparables retenus ;
- ordre `display_order` ;
- comparables écartés absents ;
- prix au m² réutilisé ;
- photo principale ;
- source manuelle ;
- source URL ;
- atypiques signalés ;
- score d’influence présent lorsque disponible.

## Synthèse et analyse

Tester :

- réutilisation de la synthèse ;
- réutilisation de l’analyse ;
- données insuffisantes ;
- aucun recalcul concurrent.

## Positionnement

Tester :

- calcul courant disponible ;
- calcul courant indisponible ;
- décision absente ;
- décision à jour ;
- décision obsolète ;
- décision enregistrée jamais remplacée.

## Sections

Tester chaque règle de disponibilité.

## Alertes

Tester :

- aucun bien ;
- aucune surface ;
- aucun comparable ;
- moins de trois comparables ;
- décision absente ;
- décision obsolète ;
- prix vendeur absent ;
- photos absentes ;
- faible confiance ;
- forte dispersion ;
- absence de doublons ;
- ordre stable.

## Page

Vérifier :

- accès agence ;
- projet inexistant ;
- affichage stable avec données partielles ;
- navigation Positionnement → Présentation ;
- aucun composant Live.

---

# Critères d’acceptation

La mission est validée lorsque :

- `buildSellerPresentation()` est l’unique point d’entrée métier ;
- les services des Missions 15 à 18 sont réutilisés ;
- aucune règle métier n’est dupliquée ;
- seuls les comparables retenus sont présentés ;
- le calcul courant et la décision enregistrée sont clairement séparés ;
- une décision obsolète reste visible ;
- les sections disposent d’un statut explicite ;
- les alertes de préparation sont déterministes ;
- la présentation est versionnée ;
- aucune migration n’est créée ;
- aucune donnée n’est persistée ;
- aucune IA n’est utilisée ;
- aucun composant Live n’est créé ;
- tous les tests sont verts ;
- lint est vert ;
- typecheck est vert ;
- build est vert.

---

# Hors périmètre

## V2

- personnalisation de l’ordre des sections ;
- masquage manuel d’une section ;
- choix des comparables à afficher indépendamment de la sélection métier ;
- annotations du conseiller ;
- thèmes graphiques ;
- export PDF ;
- impression ;
- partage par lien ;
- version figée de présentation.

## V3

- génération automatique d’argumentaire ;
- narration IA ;
- recommandations de discours ;
- adaptation au profil vendeur ;
- génération de scénarios de négociation ;
- présentation interactive avancée.

---

# Points de vigilance

La présentation générée reflète l’état courant des données.

Elle ne constitue pas encore une version figée remise au vendeur.

Le positionnement enregistré reste la décision humaine de référence.

Le moteur ne doit jamais remplacer cette décision par le calcul courant.

Cette mission construit le contrat métier de présentation, pas une collection de jolies cartes destinées à masquer des données manquantes avec des ombres portées.

---

# Definition of Done

- contrat `SellerPresentation` créé ;
- version du contrat définie ;
- moteur d’agrégation créé ;
- sections créées ;
- alertes créées ;
- page Builder créée ;
- navigation ajoutée ;
- tests terminés ;
- aucune migration ;
- aucune persistance ;
- aucun fichier temporaire ;
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

---

# Livrables attendus

À la fin de la mission, Claude Code doit fournir :

- résumé des développements ;
- décisions techniques prises ;
- contrat métier créé ;
- règles de disponibilité des sections ;
- règles du statut global ;
- alertes implémentées ;
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