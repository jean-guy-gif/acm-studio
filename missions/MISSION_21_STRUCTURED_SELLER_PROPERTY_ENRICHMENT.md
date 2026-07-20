# MISSION 21 — BUILDER : ENRICHISSEMENT STRUCTURÉ DU BIEN VENDEUR

## Statut

Réalisée.

---

# Classification

MVP

---

# Objectif produit

Compléter la fiche du bien vendeur avec les informations structurées nécessaires au Builder, à la présentation vendeur et au module Live.

La Mission 12 a créé la première fiche bien vendeur.

La Mission 21 enrichit ce modèle sans remettre en cause son architecture.

Le logiciel prépare.

Le conseiller renseigne.

Le vendeur comprend.

L’IA n’intervient pas.

---

# Objectif métier

Permettre au conseiller de renseigner les caractéristiques essentielles du bien dans des champs structurés, fiables et réutilisables.

Les nouvelles données doivent améliorer immédiatement :

- la qualité de la fiche bien vendeur ;
- la présentation Builder ;
- la présentation Live ;
- les futures analyses ;
- les futurs exports.

Éviter les informations critiques enfouies dans un grand champ texte libre.

---

# Principe fondamental

Chaque donnée doit être :

- saisie une seule fois ;
- stockée dans un champ structuré ;
- réutilisable partout ;
- facultative lorsqu’elle n’est pas connue ;
- jamais inventée ;
- jamais déduite automatiquement sans validation humaine.

---

# Périmètre MVP

Ajouter les champs suivants à `subject_properties`.

## Localisation

- quartier ;
- étage ;
- nombre total d’étages de l’immeuble.

## Performance énergétique

- GES ;
- type de chauffage.

## Caractéristiques

- exposition ;
- année de construction ;
- état général ;
- extérieur ;
- stationnement.

## Données financières

- charges ;
- taxe foncière.

## Argumentaire

- points forts structurés ;
- points de vigilance structurés.

---

# Modèle de données

Adapter la table existante `subject_properties`.

Ajouter uniquement les colonnes absentes après inspection du schéma :

```text
district text null
floor integer null
building_floors integer null
ges_rating text null
heating_type text null
exposure text null
construction_year integer null
general_condition text null
outdoor_spaces text[] not null default '{}'
parking_types text[] not null default '{}'
monthly_charges numeric null
property_tax numeric null
strengths text[] not null default '{}'
watch_points text[] not null default '{}'
```

Si `strengths` existe déjà, la conserver et l’adapter seulement si nécessaire.

---

# Valeurs contrôlées

## Extérieurs

```text
balcony
terrace
garden
loggia
veranda
roof_terrace
none
```

`none` ne doit jamais coexister avec une autre valeur.

## Stationnement

```text
garage
closed_box
indoor_parking
outdoor_parking
carport
none
```

`none` ne doit jamais coexister avec une autre valeur.

## Exposition

```text
north
north_east
east
south_east
south
south_west
west
north_west
dual_aspect
multiple
unknown
```

## État général

```text
new
excellent
good
to_refresh
to_renovate
major_renovation
```

## Type de chauffage

```text
individual_electric
individual_gas
individual_heat_pump
individual_fuel
individual_wood
collective_gas
collective_fuel
collective_heat_network
mixed
none
unknown
```

## GES

```text
A
B
C
D
E
F
G
```

---

# Validations métier

## Étage

- entier ;
- minimum : `-1` ;
- maximum : `200`.

## Nombre total d’étages

- entier ;
- minimum : `0` ;
- maximum : `200`.

Si les deux valeurs sont renseignées :

```text
floor <= building_floors
```

## Année de construction

- entier ;
- minimum : `1500` ;
- maximum : année courante + 1.

## Charges

- montant mensuel ;
- nul ou supérieur ou égal à `0`.

## Taxe foncière

- montant annuel ;
- nul ou supérieur ou égal à `0`.

## Points forts et points de vigilance

- maximum 10 éléments par liste ;
- maximum 200 caractères par élément ;
- trim obligatoire ;
- espaces multiples réduits ;
- valeurs vides supprimées ;
- doublons supprimés sans tenir compte de la casse ni des accents ;
- ordre de première occurrence conservé.

---

# Migration

Créer une seule migration dédiée contenant :

- les nouvelles colonnes nécessaires ;
- les contraintes SQL ;
- les valeurs par défaut ;
- les validations simples compatibles PostgreSQL.

Ne pas créer de nouvelle table.

Ne pas modifier les fondations des missions précédentes.

---

# Sécurité

Conserver les règles RLS existantes sur `subject_properties`.

Vérifier que :

- la lecture reste limitée à l’agence du projet ;
- la modification reste limitée aux utilisateurs autorisés ;
- aucune donnée d’une autre agence n’est accessible.

Ne pas introduire de client service-role si le flux actuel avec RLS suffit.

---

# Sauvegarde

Réutiliser l’action existante de sauvegarde du bien vendeur si son architecture le permet.

La sauvegarde doit :

- vérifier l’utilisateur ;
- vérifier l’agence ;
- vérifier l’appartenance du projet ;
- valider les données ;
- normaliser les tableaux ;
- persister les champs ;
- recharger la page concernée.

Ne pas créer une seconde action concurrente sans justification bloquante.

---

# Interface Builder

Adapter la fiche bien vendeur existante.

Ne pas créer une page concurrente.

Organiser les champs en cinq sections :

## 1. Localisation

- quartier ;
- étage ;
- nombre total d’étages.

## 2. Énergie et chauffage

- DPE existant ;
- GES ;
- type de chauffage.

## 3. Caractéristiques du bien

- exposition ;
- année de construction ;
- état général ;
- extérieurs ;
- stationnements.

## 4. Données financières

- charges mensuelles ;
- taxe foncière annuelle.

## 5. Argumentaire

- points forts ;
- points de vigilance.

---

# Composants de saisie

Utiliser :

- champ texte court pour quartier ;
- champs numériques pour étage, année, charges et taxe ;
- listes déroulantes pour GES, exposition, état et chauffage ;
- sélecteurs multiples pour extérieurs et stationnements ;
- listes éditables pour points forts et points de vigilance.

Unités :

```text
Charges : €/mois
Taxe foncière : €/an
```

L’interface doit conserver les données saisies en cas d’erreur, afficher les erreurs près des champs et désactiver le bouton pendant la sauvegarde.

---

# Normalisation

Créer une fonction pure partagée pour les tableaux texte.

Elle doit :

- trim ;
- réduire les espaces multiples ;
- supprimer les valeurs vides ;
- dédupliquer sans tenir compte de la casse ;
- dédupliquer sans tenir compte des accents ;
- conserver un libellé propre ;
- préserver l’ordre de la première occurrence.

Réutiliser si possible l’utilitaire de normalisation de la Mission 16.

Ne pas recopier la logique.

---

# Mise à jour SellerPresentation

Adapter le moteur de Mission 19 afin d’exposer les nouvelles données du bien vendeur :

- quartier ;
- GES ;
- étage ;
- extérieurs ;
- stationnements ;
- exposition ;
- année de construction ;
- état général ;
- chauffage ;
- charges ;
- taxe foncière ;
- points forts ;
- points de vigilance.

Ne jamais inventer une valeur absente.

---

# Mise à jour Live

Adapter uniquement les composants Live qui affichent le bien vendeur.

Afficher les nouvelles données lorsqu’elles existent.

Ne créer aucune logique métier dans Live.

Live reste strictement en lecture seule.

---

# Architecture recommandée

Compléter la feature existante du bien vendeur.

Créer uniquement les éléments réellement nécessaires, par exemple :

```text
src/features/subject-property/
  constants/property-options.ts
  services/normalize-property-arrays.ts
  services/validate-subject-property.ts
  components/property-location-fields.tsx
  components/property-energy-fields.tsx
  components/property-characteristics-fields.tsx
  components/property-financial-fields.tsx
  components/property-list-field.tsx
```

Adapter les noms à l’architecture réelle du dépôt.

Ne pas créer une nouvelle feature si une feature bien vendeur existe déjà.

---

# Base de données

Cette mission nécessite une migration.

Après migration :

- exécuter `supabase db reset` ;
- régénérer `database.types.ts` via la CLI ;
- ne jamais modifier les types manuellement.

---

# Tests obligatoires

## Validation

Tester :

- étage valide ;
- étage supérieur au nombre total refusé ;
- année valide ;
- année trop ancienne refusée ;
- année future excessive refusée ;
- charges négatives refusées ;
- taxe foncière négative refusée ;
- GES invalide refusé ;
- exposition invalide refusée ;
- état général invalide refusé ;
- chauffage invalide refusé.

## Tableaux contrôlés

Tester :

- extérieur unique ;
- plusieurs extérieurs ;
- `none` seul ;
- `none` avec une autre valeur refusé ;
- stationnement unique ;
- plusieurs stationnements ;
- doublons supprimés ;
- valeur invalide refusée.

## Argumentaire

Tester :

- trim ;
- espaces multiples ;
- valeurs vides supprimées ;
- doublons casse/accents supprimés ;
- ordre conservé ;
- plus de 10 éléments refusé ;
- élément de plus de 200 caractères refusé.

## Sauvegarde

Tester :

- création ;
- mise à jour ;
- données partielles ;
- utilisateur non autorisé ;
- autre agence refusée ;
- projet inexistant ;
- aucune duplication de fiche vendeur.

## SellerPresentation

Tester :

- nouvelles données exposées ;
- données absentes conservées à `null` ou tableau vide ;
- points forts exposés ;
- points de vigilance exposés ;
- aucune donnée inventée.

## Live

Vérifier :

- nouvelles données affichées si présentes ;
- champs absents masqués ;
- aucune action de modification ;
- aucun débordement majeur sur tablette.

---

# Critères d’acceptation

La mission est validée lorsque :

- les champs structurés sont ajoutés à `subject_properties` ;
- aucune nouvelle table concurrente n’est créée ;
- les valeurs contrôlées sont validées ;
- les tableaux sont normalisés ;
- la fiche Builder permet la saisie et la modification ;
- les données partielles restent acceptées ;
- SellerPresentation expose les nouvelles données ;
- Live les affiche sans logique métier supplémentaire ;
- aucune donnée n’est inventée ;
- la sécurité multi-agence est conservée ;
- les types Supabase sont régénérés via la CLI ;
- tous les tests sont verts ;
- lint est vert ;
- typecheck est vert ;
- build est vert ;
- `supabase db reset` est vert.

---

# Hors périmètre

## V2

- caractéristiques personnalisées par agence ;
- réordonnancement avancé des listes ;
- copropriété détaillée ;
- diagnostics détaillés ;
- travaux ;
- historique des modifications ;
- journal d’audit complet ;
- suggestion automatique des points forts ;
- export de la fiche bien.

## V3

- enrichissement IA ;
- extraction automatique depuis diagnostics ;
- analyse photo ;
- recommandation travaux ;
- génération d’argumentaire.

---

# Points de vigilance

Ne pas transformer `subject_properties` en inventaire encyclopédique.

Chaque champ ajouté doit servir directement au rendez-vous vendeur, au positionnement ou à la présentation.

Les champs facultatifs ne doivent pas devenir des obstacles à la création d’un projet.

Le produit a besoin d’une fiche utile, pas d’un formulaire administratif capable de décourager un notaire.

---

# Definition of Done

- migration créée ;
- schéma enrichi ;
- contraintes ajoutées ;
- types Supabase régénérés ;
- formulaire Builder adapté ;
- validation et normalisation créées ;
- SellerPresentation adapté ;
- Live adapté ;
- tests applicatifs et SQL terminés ;
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
supabase db reset
```

Exécuter également les tests SQL de la mission si le dépôt suit cette convention.

---

# Livrables attendus

À la fin de la mission, Claude Code doit fournir :

- résumé des développements ;
- décisions techniques prises ;
- migration créée ;
- schéma exact ajouté ;
- valeurs contrôlées ;
- règles de validation ;
- règles de normalisation ;
- fichiers créés ;
- fichiers modifiés ;
- types Supabase régénérés ;
- résultats détaillés des tests ;
- nombre total de tests ;
- résultat du lint ;
- résultat du typecheck ;
- résultat du build ;
- résultat du format check ;
- résultat de `supabase db reset` ;
- git diff ;
- git status ;
- points de vigilance éventuels.

Aucun commit.

Aucun push.

Une revue CTO sera effectuée avant validation.