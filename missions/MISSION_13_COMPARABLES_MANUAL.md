# MISSION 13 — Comparables manuels

## Contexte

Les missions précédentes ont permis de créer :

```text
Agence
↓
Dossier vendeur
↓
Bien vendeur
```

Nous devons maintenant permettre au conseiller d’ajouter les biens concurrents utilisés pendant la préparation et le rendez-vous vendeur.

La table existante est :

```text
public.comparables
```

Un dossier peut posséder plusieurs comparables.

Les comparables seront utilisés plus tard par :

* le Builder ;
* le script de rendez-vous ;
* le Live ;
* le Baromètre de perception.

Cette mission concerne uniquement la gestion manuelle des comparables.

---

# Objectif

Permettre au conseiller de :

1. afficher les comparables d’un dossier ;
2. créer un comparable ;
3. modifier un comparable ;
4. supprimer un comparable ;
5. sélectionner ou exclure un comparable ;
6. modifier leur ordre d’affichage.

Aucune donnée ne doit être importée automatiquement.

---

# Périmètre

Tables autorisées :

```text
profiles
projects
comparables
```

Ne pas utiliser :

```text
subject_properties
meeting_scripts
meeting_sessions
seller_answers
perception_results
reports
exports
audit_logs
```

Aucune migration ne doit être créée sauf défaut d’intégrité démontré par un test réel.

---

# Données disponibles

Utiliser uniquement les colonnes existantes dans `comparables`.

Avant de coder, inspecter précisément :

```text
src/lib/supabase/database.types.ts
DATABASE.md
```

Utiliser notamment les colonnes déjà prévues :

```text
id
agency_id
project_id
price
days_on_market
price_drop_amount
price_drop_percentage
display_order
is_selected
advisor_notes
created_at
updated_at
```

Utiliser également les autres colonnes descriptives réellement présentes dans le schéma, sans en inventer.

Ne jamais ajouter un champ qui n’existe pas en base.

---

# Décision produit

Le terme affiché dans l’interface doit être :

```text
Bien concurrent
```

La liste doit être intitulée :

```text
Biens concurrents
```

Ne pas afficher le mot technique :

```text
Comparable
```

dans l’interface utilisateur.

---

# Architecture de la feature

Créer :

```text
src/features/comparables/
```

Structure recommandée :

```text
src/features/comparables/
├── types.ts
├── queries/
│   ├── get-comparables.ts
│   └── get-comparable.ts
├── actions/
│   ├── create-comparable.ts
│   ├── update-comparable.ts
│   ├── delete-comparable.ts
│   ├── toggle-comparable-selection.ts
│   └── move-comparable.ts
└── utils/
    └── parse-number.ts
```

Ne pas créer de repository générique.

Ne pas créer de service générique.

---

# 1. Types

Créer :

```text
src/features/comparables/types.ts
```

Utiliser exclusivement les types générés Supabase.

Exemple :

```ts
export type Comparable =
  Database['public']['Tables']['comparables']['Row'];
```

Ne pas utiliser :

```text
any
```

Ne pas recopier manuellement la structure SQL.

---

# 2. Lecture de la liste

Créer :

```text
getComparables(projectId: string)
```

La fonction doit :

1. récupérer le profil courant ;
2. vérifier que le projet appartient à l’agence courante ;
3. lire les comparables avec :

```text
project_id = projectId
agency_id = profile.agency_id
```

4. trier par :

```text
display_order asc
created_at asc
```

Retour :

```text
Comparable[]
```

Aucune jointure.

Aucune autre table métier chargée.

---

# 3. Lecture d’un comparable

Créer :

```text
getComparable(projectId: string, comparableId: string)
```

Filtres obligatoires :

```text
id = comparableId
project_id = projectId
agency_id = profile.agency_id
```

Utiliser :

```text
maybeSingle()
```

Retour :

```text
Comparable | null
```

Un comparable introuvable ou appartenant à une autre agence doit être traité comme inexistant.

---

# 4. Création d’un comparable

Créer une Server Action :

```text
createComparable
```

Route d’utilisation :

```text
/builder/[projectId]/comparables/new
```

La Server Action doit :

1. récupérer le profil courant ;
2. vérifier que le projet appartient à son agence ;
3. nettoyer les champs ;
4. valider les nombres ;
5. déterminer automatiquement le prochain `display_order` ;
6. créer le comparable ;
7. attribuer automatiquement :

```text
agency_id = profile.agency_id
project_id = projectId
is_selected = true
```

Le statut sélectionné par défaut doit être :

```text
true
```

Le client ne doit jamais fournir :

```text
agency_id
project_id
display_order
is_selected
```

Après création :

```text
redirect('/builder/{projectId}/comparables')
```

---

# 5. Champs du formulaire

Créer le formulaire à partir des colonnes réellement présentes.

Utiliser au minimum, si elles existent dans le schéma :

```text
Titre ou référence
Adresse
Ville
Code postal
Type de bien
Surface
Nombre de pièces
Prix
Délai de commercialisation
Montant de baisse
Pourcentage de baisse
Notes conseiller
```

Important :

* ne pas inventer de colonne ;
* adapter le formulaire au schéma réel ;
* documenter dans le rapport les champs disponibles et ceux absents.

---

# 6. Validations

Valeurs numériques :

```text
surface >= 0
rooms_count >= 0
price >= 0
days_on_market >= 0
price_drop_amount >= 0
price_drop_percentage >= 0
```

Les champs optionnels vides doivent devenir :

```text
null
```

Les nombres invalides doivent provoquer une erreur utilisateur.

Ne pas installer Zod.

Créer un helper local simple si nécessaire.

---

# 7. Modification

Créer une Server Action :

```text
updateComparable
```

La modification doit filtrer explicitement :

```text
id
project_id
agency_id
```

Le formulaire doit être pré-rempli.

Après mise à jour :

```text
redirect('/builder/{projectId}/comparables')
```

Ne pas modifier :

```text
display_order
is_selected
```

depuis le formulaire principal.

Ces deux propriétés ont leurs propres actions.

---

# 8. Sélection ou exclusion

Créer :

```text
toggleComparableSelection
```

Le bouton doit permettre de basculer :

```text
is_selected = true
```

ou :

```text
is_selected = false
```

Libellés recommandés :

```text
Retenir
Exclure
```

Un comparable exclu reste visible dans la liste.

Il doit seulement être clairement identifié comme exclu.

Aucune suppression automatique.

---

# 9. Réorganisation

Créer :

```text
moveComparable
```

Actions autorisées :

```text
up
down
```

L’ordre doit être stocké dans :

```text
display_order
```

Approche MVP recommandée :

* récupérer le comparable courant ;
* récupérer son voisin ;
* échanger les deux valeurs `display_order`.

Toutes les lectures et écritures doivent filtrer :

```text
agency_id
project_id
```

Ne pas ajouter de drag-and-drop.

Ne pas ajouter de Client Component complexe.

Deux boutons suffisent :

```text
Monter
Descendre
```

---

# 10. Suppression

Créer :

```text
deleteComparable
```

Filtres obligatoires :

```text
id
project_id
agency_id
```

Après suppression :

1. revalider la liste ;
2. rediriger vers la page des comparables.

Ne pas supprimer un autre objet.

Ne pas utiliser de cascade.

---

# 11. Page liste

Créer :

```text
src/app/(protected)/builder/[projectId]/comparables/page.tsx
```

La page doit :

1. vérifier que le projet existe et appartient à l’agence ;
2. afficher :

```text
Biens concurrents
```

3. afficher un lien :

```text
Ajouter un bien concurrent
```

vers :

```text
/builder/[projectId]/comparables/new
```

4. afficher l’état vide :

```text
Aucun bien concurrent.
Ajoutez les biens actuellement en concurrence avec le bien du vendeur.
```

---

# 12. Affichage de la liste

Pour chaque concurrent, afficher au minimum :

```text
Titre ou référence
Prix
Surface
Prix au m² calculé si possible
Délai de commercialisation
Baisse éventuelle
Statut Retenu ou Exclu
Notes conseiller
```

Prix au m² :

```text
price / surface
```

Uniquement si :

```text
price > 0
surface > 0
```

Ce calcul est uniquement visuel.

Ne pas enregistrer le prix au m² en base.

Actions disponibles :

```text
Modifier
Retenir / Exclure
Monter
Descendre
Supprimer
```

---

# 13. Page création

Créer :

```text
src/app/(protected)/builder/[projectId]/comparables/new/page.tsx
```

Titre :

```text
Ajouter un bien concurrent
```

Afficher le formulaire minimal.

Ajouter un lien :

```text
Retour aux biens concurrents
```

---

# 14. Page modification

Créer :

```text
src/app/(protected)/builder/[projectId]/comparables/[comparableId]/edit/page.tsx
```

Titre :

```text
Modifier le bien concurrent
```

Le formulaire doit être pré-rempli.

Utiliser :

```text
notFound()
```

si le comparable est absent ou appartient à une autre agence.

---

# 15. Page dossier vendeur

Modifier :

```text
src/app/(protected)/builder/[projectId]/page.tsx
```

Ajouter une section :

```text
Biens concurrents
```

Avec un lien :

```text
Gérer les biens concurrents
```

vers :

```text
/builder/[projectId]/comparables
```

Ne pas afficher toute la liste sur la page dossier.

---

# Sécurité multi-tenant

Toutes les opérations doivent filtrer explicitement :

```text
agency_id = profile.agency_id
project_id = projectId
```

RLS reste actif.

Ne jamais accepter `agency_id` depuis :

* formulaire ;
* URL ;
* query string ;
* Client Component.

Le `projectId` vient de la route, mais l’appartenance du projet doit être vérifiée côté serveur.

---

# Tests obligatoires

## Création

Tester :

1. création du premier comparable ;
2. `display_order = 1` ou première valeur cohérente ;
3. `is_selected = true` ;
4. agence et projet corrects ;
5. nombres optionnels vides ;
6. nombres invalides refusés.

## Modification

Tester :

1. préremplissage ;
2. modification des champs ;
3. conservation de `display_order` ;
4. conservation de `is_selected`.

## Sélection

Tester :

```text
true → false
false → true
```

## Ordre

Créer au moins trois comparables.

Vérifier :

```text
Monter
Descendre
ordre final cohérent
```

Tester les limites :

* premier élément ne monte pas ;
* dernier élément ne descend pas ;
* aucun doublon incohérent de `display_order`.

## Suppression

Tester :

1. suppression d’un comparable de l’agence ;
2. suppression d’un comparable d’une autre agence ;
3. suppression d’un identifiant inexistant ;
4. absence de fuite de données.

## Multi-tenant

Créer :

```text
agence A
agence B
projet A
projet B
comparables A et B
```

Vérifier qu’A ne peut jamais :

* lire B ;
* modifier B ;
* sélectionner B ;
* déplacer B ;
* supprimer B.

## Parcours navigateur

Tester :

```text
connexion
↓
dossier vendeur
↓
Biens concurrents
↓
état vide
↓
ajout de 3 concurrents
↓
modification
↓
exclusion
↓
réorganisation
↓
suppression
```

## Nettoyage

Supprimer :

```text
comparables
projects
profiles
agencies
utilisateurs Auth
scripts temporaires
cookies temporaires
```

État final attendu :

```text
comparables = 0
projects = 0
profiles = 0
agencies = 0
auth users temporaires = 0
```

---

# Vérifications techniques

Exécuter :

```bash
npm run lint
npm run typecheck
npm run build
npm run format:check
```

Puis :

```bash
git diff
git status
```

---

# Fichiers prévus

## À créer

```text
src/features/comparables/types.ts
src/features/comparables/queries/get-comparables.ts
src/features/comparables/queries/get-comparable.ts
src/features/comparables/actions/create-comparable.ts
src/features/comparables/actions/update-comparable.ts
src/features/comparables/actions/delete-comparable.ts
src/features/comparables/actions/toggle-comparable-selection.ts
src/features/comparables/actions/move-comparable.ts
src/features/comparables/utils/parse-number.ts
src/app/(protected)/builder/[projectId]/comparables/page.tsx
src/app/(protected)/builder/[projectId]/comparables/new/page.tsx
src/app/(protected)/builder/[projectId]/comparables/[comparableId]/edit/page.tsx
missions/MISSION_13_COMPARABLES_MANUAL.md
```

## À modifier

```text
src/app/(protected)/builder/[projectId]/page.tsx
```

## À examiner

```text
DATABASE.md
src/lib/supabase/database.types.ts
src/lib/auth/get-profile.ts
src/features/projects/queries/get-project.ts
```

## À ne pas modifier

```text
supabase/migrations/
src/lib/supabase/database.types.ts
src/lib/supabase/middleware.ts
src/proxy.ts
src/app/login/
src/app/onboarding/
```

Sauf défaut structurel démontré par un test réel.

---

# Contraintes

Ne pas créer :

* import CSV ;
* import DVF ;
* API immobilière ;
* scraping ;
* upload ;
* IA ;
* script de rendez-vous ;
* moteur de perception ;
* drag-and-drop ;
* pagination ;
* recherche ;
* filtre avancé ;
* carte géographique ;
* bibliothèque UI ;
* dépendance supplémentaire ;
* composants génériques prématurés.

---

# Rapport final attendu

Le rapport doit contenir :

1. fichiers créés ;
2. fichiers modifiés ;
3. colonnes réellement utilisées ;
4. architecture de la feature ;
5. fonctionnement de `getComparables()` ;
6. fonctionnement de `getComparable()` ;
7. fonctionnement de la création ;
8. fonctionnement de la modification ;
9. fonctionnement de la sélection ;
10. fonctionnement de l’ordre ;
11. fonctionnement de la suppression ;
12. calcul du prix au m² ;
13. état vide ;
14. page liste ;
15. page création ;
16. page modification ;
17. tests de création ;
18. tests de modification ;
19. tests de sélection ;
20. tests de réorganisation ;
21. tests de suppression ;
22. tests multi-tenant ;
23. parcours navigateur ;
24. lint ;
25. typecheck ;
26. build ;
27. format check ;
28. nettoyage ;
29. `git diff` ;
30. `git status`.

Ne pas effectuer le commit.

---

# Commit prévu

```text
feat(comparables): add manual comparable management
```

---

# Definition of Done

La mission est validée si :

* les comparables d’un dossier sont affichés ;
* un comparable peut être créé ;
* un comparable peut être modifié ;
* un comparable peut être supprimé ;
* un comparable peut être retenu ou exclu ;
* l’ordre peut être modifié ;
* le prix au m² est calculé uniquement pour l’affichage ;
* tous les accès filtrent explicitement par agence et projet ;
* un utilisateur ne peut agir sur les comparables d’une autre agence ;
* aucune donnée automatique n’est importée ;
* aucune migration n’est créée sans défaut démontré ;
* aucune dépendance n’est ajoutée ;
* aucun `any` n’est utilisé ;
* lint est vert ;
* typecheck est vert ;
* build est vert ;
* aucun commit n’est effectué avant revue CTO.
