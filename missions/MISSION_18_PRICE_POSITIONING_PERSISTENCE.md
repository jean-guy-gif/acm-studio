# MISSION 18 — BUILDER : PERSISTENCE DU POSITIONNEMENT

## Statut

Réalisée.

---

# Classification

MVP

---

# Objectif produit

Permettre au conseiller d’enregistrer et de retrouver la décision de positionnement prise dans le Builder.

La Mission 17 calcule une proposition de marché.

La Mission 18 persiste la décision du conseiller.

Le logiciel prépare.

Le conseiller valide.

Le vendeur choisit.

L’IA n’intervient pas.

---

# Objectif métier

Conserver pour chaque projet :

- la proposition calculée au moment de la validation ;
- le prix conseillé validé par le conseiller ;
- le prix souhaité par le vendeur ;
- les bornes basse, centrale et haute ;
- le score et le niveau de confiance ;
- la justification éventuelle du conseiller ;
- la date de validation ;
- l’utilisateur ayant validé.

Le système doit distinguer clairement :

- le calcul courant ;
- la proposition du moteur ;
- la décision validée par le conseiller.

---

# Principe fondamental

Le moteur de Mission 17 continue de recalculer le positionnement courant à partir des données actuelles.

La décision enregistrée constitue un instantané métier.

Elle ne doit jamais être modifiée automatiquement lorsque :

- un comparable est ajouté ;
- un comparable est supprimé ;
- un comparable est retenu ou écarté ;
- la surface du bien vendeur change ;
- les règles métier évoluent.

Le recalcul courant et la décision enregistrée doivent pouvoir diverger.

Cette divergence est normale et doit être visible.

---

# Périmètre MVP

Créer une persistance unique de positionnement par projet.

Un projet possède au maximum un positionnement validé actif.

Le conseiller peut :

- enregistrer une première décision ;
- modifier une décision existante ;
- remplacer la décision enregistrée par le calcul courant ;
- supprimer la décision enregistrée ;
- consulter la date et l’auteur de la dernière validation.

L’historique complet des versions est hors périmètre MVP.

---

# Modèle de données

Créer une table :

```sql
project_price_positionings
```

Colonnes minimales :

```text
id uuid primary key
project_id uuid not null
agency_id uuid not null
advisor_price numeric not null
seller_price numeric null
range_low numeric not null
range_central numeric not null
range_high numeric not null
confidence_score integer not null
confidence_level text not null
justification text null
calculation_snapshot jsonb not null
validated_at timestamptz not null
validated_by uuid not null
created_at timestamptz not null
updated_at timestamptz not null
```

Ajouter une contrainte :

```text
UNIQUE(project_id)
```

Le `project_id` garantit un seul positionnement actif par projet.

---

# Snapshot métier

La colonne :

```text
calculation_snapshot jsonb
```

doit contenir l’instantané minimal permettant de comprendre la décision enregistrée.

Inclure au minimum :

- nombre total de comparables exploitables ;
- nombre de comparables utilisés ;
- nombre d’atypiques ;
- nombre d’atypiques exclus ;
- indication de réintégration des atypiques ;
- dispersion ;
- largeur de fourchette ;
- score de confiance ;
- niveau de confiance ;
- identifiants des comparables influents ;
- raisons produites par le moteur ;
- version du moteur de positionnement.

Ajouter une constante applicative :

```ts
PRICE_POSITIONING_ENGINE_VERSION = 1
```

Le snapshot ne doit pas contenir de données inutiles ni une copie complète des comparables.

---

# Validation des données

Avant persistance, vérifier :

- `advisor_price > 0` ;
- `seller_price` nul ou supérieur à 0 ;
- `range_low > 0` ;
- `range_central > 0` ;
- `range_high > 0` ;
- `range_low <= range_central <= range_high` ;
- `confidence_score` compris entre 0 et 100 ;
- `confidence_level` appartenant aux valeurs autorisées ;
- `justification` limitée à une longueur raisonnable.

Règle MVP :

```text
justification : 1 000 caractères maximum
```

Ne jamais faire confiance aux valeurs envoyées par le client.

---

# Source des valeurs persistées

Les bornes, le score, le niveau de confiance et le snapshot doivent être recalculés côté serveur au moment de l’enregistrement.

Le client peut envoyer uniquement :

- le prix conseillé ;
- le prix souhaité vendeur ;
- la justification.

Le serveur doit :

1. charger le projet ;
2. charger le bien vendeur ;
3. charger les comparables ;
4. appeler `calculatePricePositioning()` ;
5. vérifier que le résultat est `ready` ;
6. construire le snapshot ;
7. persister la décision.

Le client ne doit jamais envoyer comme source de vérité :

- les bornes ;
- la valeur centrale ;
- le score de confiance ;
- le niveau de confiance ;
- la liste des comparables influents.

---

# Stratégie de persistance

Utiliser un UPSERT transactionnel sur :

```text
project_id
```

Créer une RPC dédiée :

```text
save_project_price_positioning
```

La RPC doit :

- vérifier `auth.uid()` ;
- dériver l’agence depuis le profil de l’utilisateur ;
- vérifier que le projet appartient à cette agence ;
- vérifier que l’utilisateur peut modifier le projet ;
- insérer ou mettre à jour le positionnement ;
- renseigner `validated_by` avec `auth.uid()` ;
- renseigner `validated_at` avec `now()` ;
- mettre à jour `updated_at` ;
- ne jamais accepter `agency_id`, `validated_by` ou `validated_at` depuis le client.

La logique métier de calcul reste en TypeScript.

La logique d’autorisation et d’atomicité reste en base.

---

# Suppression

Créer une RPC dédiée :

```text
delete_project_price_positioning
```

Elle doit :

- vérifier l’identité ;
- dériver l’agence ;
- vérifier l’appartenance du projet ;
- supprimer uniquement le positionnement du projet concerné ;
- retourner proprement si aucun positionnement n’existe.

La suppression doit demander une confirmation dans l’interface.

---

# Lecture

Créer un service serveur permettant de récupérer le positionnement enregistré pour un projet.

Le résultat doit inclure :

- les valeurs persistées ;
- la date de validation ;
- l’identité minimale de l’auteur si disponible ;
- le snapshot typé.

Ne pas exposer des données de profil inutiles.

---

# Détection de divergence

Comparer le calcul courant avec le positionnement enregistré.

Créer un indicateur :

```text
up_to_date
outdated
```

Le positionnement enregistré est considéré `outdated` si au moins une des valeurs suivantes diffère :

- borne basse ;
- valeur centrale ;
- borne haute ;
- score de confiance ;
- niveau de confiance ;
- nombre de comparables utilisés ;
- identifiants des comparables influents.

La comparaison doit être déterministe.

Ne pas comparer les textes de raisons pour éviter les divergences purement éditoriales.

---

# Interface Builder

Adapter la page :

```text
/builder/[projectId]/comparables/positioning
```

Ordre recommandé :

## 1. Calcul courant

Afficher la fourchette, la confiance et les comparables influents calculés en temps réel.

## 2. Décision du conseiller

Afficher les champs :

- prix conseillé ;
- prix souhaité vendeur ;
- justification.

## 3. Actions

Afficher :

- `Enregistrer la décision` si aucun positionnement n’existe ;
- `Mettre à jour la décision` si un positionnement existe ;
- `Remplacer par le calcul courant` si la décision est obsolète ;
- `Supprimer la décision` avec confirmation.

## 4. Positionnement enregistré

Afficher :

- prix conseillé validé ;
- prix vendeur ;
- fourchette enregistrée ;
- confiance enregistrée ;
- justification ;
- date de validation ;
- auteur ;
- statut `À jour` ou `À actualiser`.

---

# Expérience utilisateur

Après enregistrement :

- afficher une confirmation claire ;
- recharger les données serveur ;
- conserver l’utilisateur sur la même page ;
- afficher immédiatement le positionnement enregistré.

En cas d’erreur :

- afficher un message explicite ;
- ne pas perdre les champs saisis ;
- ne pas produire de doublon.

Les boutons doivent être désactivés pendant la soumission.

---

# Architecture

Créer ou compléter :

```text
src/features/price-positioning/

  actions/
    save-price-positioning.ts
    delete-price-positioning.ts

  services/
    get-saved-price-positioning.ts
    build-positioning-snapshot.ts
    compare-positioning-snapshots.ts

  components/
    saved-positioning-card.tsx
    positioning-decision-form.tsx
    positioning-status.tsx

  types/
    saved-price-positioning.ts
```

Réutiliser le moteur de Mission 17.

Ne pas dupliquer les calculs.

---

# Base de données et sécurité

Créer une migration unique pour :

- la table ;
- les contraintes ;
- les index ;
- les politiques RLS ;
- les RPC ;
- les droits d’exécution ;
- le trigger `updated_at` si la convention du dépôt l’exige.

RLS obligatoire.

Politiques minimales :

- lecture limitée à l’agence du projet ;
- aucune insertion directe depuis le client ;
- aucune mise à jour directe depuis le client ;
- aucune suppression directe depuis le client.

Les écritures passent exclusivement par les RPC.

Révoquer les droits inutiles pour `public` et `anon`.

Accorder uniquement les droits nécessaires à `authenticated`.

---

# Index

Créer au minimum :

```text
UNIQUE(project_id)
INDEX(agency_id)
INDEX(validated_by)
INDEX(validated_at)
```

Éviter les index redondants.

---

# Types Supabase

Après migration :

- appliquer la migration localement ;
- exécuter `supabase db reset` ;
- régénérer `database.types.ts` via la CLI ;
- ne jamais modifier les types manuellement.

---

# Tests obligatoires

## Base de données

Tester :

- création initiale ;
- mise à jour du même projet sans doublon ;
- contrainte `UNIQUE(project_id)` ;
- utilisateur non authentifié refusé ;
- utilisateur d’une autre agence refusé ;
- projet inexistant refusé ou no-op contrôlé selon la convention ;
- `validated_by` imposé par la base ;
- `validated_at` imposé par la base ;
- suppression autorisée ;
- suppression sans ligne existante ;
- aucune écriture directe autorisée ;
- deux sauvegardes concurrentes ne créent jamais deux lignes.

## Service serveur

Tester :

- snapshot complet ;
- version moteur présente ;
- calcul `insufficient_data` refusé ;
- prix conseiller invalide refusé ;
- prix vendeur invalide refusé ;
- justification supérieure à 1 000 caractères refusée ;
- bornes jamais acceptées depuis le client.

## Divergence

Tester :

- positionnement identique : `up_to_date` ;
- borne modifiée : `outdated` ;
- confiance modifiée : `outdated` ;
- nombre de comparables modifié : `outdated` ;
- comparable influent modifié : `outdated` ;
- raisons textuelles seules modifiées : toujours `up_to_date`.

## Interface

Tester ou vérifier :

- formulaire initial ;
- formulaire prérempli avec décision existante ;
- enregistrement ;
- mise à jour ;
- suppression avec confirmation ;
- statut à jour ;
- statut à actualiser ;
- erreur sans perte des champs ;
- boutons désactivés pendant la soumission.

---

# Critères d’acceptation

La mission est validée lorsque :

- un seul positionnement actif existe par projet ;
- les valeurs calculées sont toujours recalculées côté serveur ;
- le client ne peut pas imposer les bornes ou la confiance ;
- les écritures passent exclusivement par les RPC ;
- la sécurité multi-agence est respectée ;
- les sauvegardes concurrentes ne créent aucun doublon ;
- le snapshot contient la version du moteur ;
- la divergence entre calcul courant et décision enregistrée est visible ;
- le conseiller peut enregistrer, modifier et supprimer sa décision ;
- aucune IA n’est utilisée ;
- aucun composant Live n’est créé ;
- tous les tests sont verts ;
- lint est vert ;
- typecheck est vert ;
- build est vert ;
- `supabase db reset` est vert.

---

# Hors périmètre

## V2

- historique complet des décisions ;
- restauration d’une ancienne version ;
- commentaire obligatoire lors d’une modification ;
- workflow de validation manager ;
- verrouillage après présentation vendeur ;
- notifications de divergence ;
- audit détaillé des changements.

## V3

- recommandation IA ;
- analyse automatique des justifications ;
- suggestions de correction ;
- comparaison multi-scénarios ;
- apprentissage à partir des ventes réalisées.

---

# Points de vigilance

La décision enregistrée est une décision humaine appuyée sur un calcul.

Elle ne doit jamais être remplacée automatiquement.

Un positionnement obsolète doit être signalé, pas écrasé.

Le snapshot doit rester compact, typé et versionné. Stocker tout l’univers dans un JSONB parce que PostgreSQL le permet n’est pas une architecture, c’est une démission avec accolades.

---

# Definition of Done

- migration créée ;
- table et contraintes créées ;
- RLS validée ;
- RPC de sauvegarde créée ;
- RPC de suppression créée ;
- types Supabase régénérés ;
- services serveur créés ;
- interface adaptée ;
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

Exécuter également les tests SQL de la mission.

---

# Livrables attendus

À la fin de la mission, Claude Code doit fournir :

- résumé des développements ;
- décisions techniques prises ;
- migration créée ;
- schéma exact de la table ;
- logique exacte des RPC ;
- politiques RLS ;
- fichiers créés ;
- fichiers modifiés ;
- types Supabase régénérés ;
- résultats détaillés des tests SQL ;
- résultats détaillés des tests applicatifs ;
- test de concurrence ;
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