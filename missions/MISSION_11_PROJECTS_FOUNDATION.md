# MISSION 11 — Fondations des dossiers vendeurs

## Contexte

Les missions précédentes ont validé :

```text
Authentification
↓
Onboarding
↓
Création agence + profil owner
↓
Shell applicatif protégé
↓
Navigation Builder / Live / Admin
```

Le socle technique du MVP est désormais stable.

Nous commençons la première fonctionnalité métier :

```text
Dossiers vendeurs
```

La table concernée existe déjà :

```text
public.projects
```

Un projet représente un dossier vendeur.

Cette mission doit uniquement permettre :

* d’afficher les dossiers de l’agence ;
* de créer un dossier vendeur minimal ;
* d’ouvrir un dossier ;
* de supprimer un dossier vide ou non encore utilisé.

Aucune fonctionnalité Builder avancée ne doit être développée.

---

# Objectif

Transformer la page :

```text
/builder
```

en point d’entrée des dossiers vendeurs.

À la fin de la mission, un conseiller doit pouvoir :

1. voir les dossiers de son agence ;
2. créer un nouveau dossier vendeur ;
3. ouvrir la page d’un dossier ;
4. supprimer un dossier ;
5. ne jamais accéder aux dossiers d’une autre agence.

---

# Périmètre MVP

Cette mission concerne uniquement la table :

```text
projects
```

Ne pas utiliser dans cette mission :

```text
subject_properties
comparables
meeting_scripts
meeting_sessions
seller_answers
perception_results
reports
exports
audit_logs
```

Le dossier vendeur est créé avant les données du bien.

---

# Décision produit

Le terme affiché dans l’interface doit être :

```text
Dossier vendeur
```

Ne pas afficher :

```text
Projet
Project
ACM
Analyse comparative
```

La table technique reste :

```text
projects
```

---

# Données disponibles dans projects

Le schéma actuel contient :

```text
id
agency_id
advisor_id
seller_name
seller_email
seller_phone
status
created_at
updated_at
```

Statuts autorisés :

```text
draft
preparation
ready_for_meeting
meeting_completed
archived
```

Pour cette mission, tout nouveau dossier doit être créé avec :

```text
status = 'draft'
```

Le client ne doit pas choisir le statut.

---

# À réaliser

## 1. Types métier

Créer :

```text
src/features/projects/types.ts
```

Ne pas recréer manuellement la structure SQL.

Créer uniquement des alias utiles issus des types Supabase.

Exemple :

```ts
import type { Database } from '@/lib/supabase/database.types';

export type Project =
  Database['public']['Tables']['projects']['Row'];

export type ProjectInsert =
  Database['public']['Tables']['projects']['Insert'];
```

Ne pas utiliser :

```text
any
```

---

## 2. Lecture des dossiers

Créer :

```text
src/features/projects/queries/get-projects.ts
```

Responsabilité unique :

* récupérer le profil courant ;
* si aucun profil, retourner une erreur ou une liste vide selon l’architecture existante ;
* lire les projets de l’agence courante ;
* trier les projets du plus récent au plus ancien.

Filtre obligatoire :

```text
agency_id = profile.agency_id
```

Même si RLS protège déjà les données, le filtre explicite doit rester présent.

Ordre :

```text
created_at desc
```

Colonnes à récupérer :

```text
id
seller_name
seller_email
seller_phone
status
created_at
updated_at
advisor_id
agency_id
```

Ne pas charger d’autres tables.

---

## 3. Lecture d’un dossier

Créer :

```text
src/features/projects/queries/get-project.ts
```

Signature recommandée :

```ts
getProject(projectId: string)
```

Responsabilité :

* récupérer le profil courant ;
* lire le projet correspondant ;
* vérifier explicitement :

```text
id = projectId
agency_id = profile.agency_id
```

Utiliser :

```text
maybeSingle()
```

Retourner :

```text
Project | null
```

Ne pas lever une erreur pour un dossier simplement introuvable.

---

## 4. Création d’un dossier

Créer :

```text
src/features/projects/actions/create-project.ts
```

Créer une Server Action.

Champs du formulaire :

```text
sellerName
sellerEmail
sellerPhone
```

Champ obligatoire :

```text
sellerName
```

Champs optionnels :

```text
sellerEmail
sellerPhone
```

La Server Action doit :

1. récupérer le profil courant ;
2. refuser si aucun profil n’existe ;
3. nettoyer les valeurs avec `trim()` ;
4. vérifier que `sellerName` n’est pas vide ;
5. créer une ligne dans `projects` ;
6. utiliser automatiquement :

```text
agency_id = profile.agency_id
advisor_id = profile.id
status = 'draft'
```

7. rediriger vers :

```text
/builder/{projectId}
```

Le client ne doit jamais fournir :

```text
agency_id
advisor_id
status
project_id
```

---

## 5. Suppression d’un dossier

Créer :

```text
src/features/projects/actions/delete-project.ts
```

Créer une Server Action.

Entrée :

```text
projectId
```

La Server Action doit :

1. récupérer le profil courant ;
2. refuser si aucun profil ;
3. supprimer uniquement si :

```text
id = projectId
agency_id = profile.agency_id
```

4. revalider :

```text
/builder
```

5. rediriger vers :

```text
/builder
```

Ne pas utiliser de suppression côté client direct.

Ne pas utiliser de clé `service_role`.

---

## 6. Page Builder

Modifier :

```text
src/app/(protected)/builder/page.tsx
```

La page doit devenir la liste des dossiers vendeurs.

Elle doit afficher :

```text
Builder
Dossiers vendeurs
```

Ajouter un bouton ou lien :

```text
Nouveau dossier vendeur
```

Ce lien doit pointer vers :

```text
/builder/new
```

---

## 7. État vide

Si aucun dossier n’existe, afficher :

```text
Aucun dossier vendeur.
Créez votre premier dossier pour préparer un rendez-vous vendeur.
```

Ne pas afficher de données fictives.

---

## 8. Liste des dossiers

Pour chaque dossier, afficher au minimum :

```text
Nom du vendeur
Email ou —
Téléphone ou —
Statut
Date de création
Lien Ouvrir
Bouton Supprimer
```

Le lien :

```text
Ouvrir
```

doit pointer vers :

```text
/builder/{projectId}
```

Le bouton Supprimer doit utiliser la Server Action.

Aucune confirmation JavaScript dans cette mission.

Aucun menu contextuel.

Aucune pagination.

---

## 9. Libellés de statut

Créer une fonction simple dans :

```text
src/features/projects/status-label.ts
```

Correspondances :

```text
draft → Brouillon
preparation → En préparation
ready_for_meeting → Prêt pour le rendez-vous
meeting_completed → Rendez-vous terminé
archived → Archivé
```

Ne pas créer d’enum TypeScript manuel si les types générés ne l’exigent pas.

Ne pas créer de système de badge générique.

---

## 10. Page nouveau dossier

Créer :

```text
src/app/(protected)/builder/new/page.tsx
```

Afficher :

```text
Nouveau dossier vendeur
```

Formulaire :

```text
Nom du vendeur
Email
Téléphone
Créer le dossier
```

Le formulaire doit utiliser :

```text
createProject
```

Aucun design avancé.

Aucune dépendance.

---

## 11. Page dossier vendeur

Créer :

```text
src/app/(protected)/builder/[projectId]/page.tsx
```

La page doit :

1. récupérer `projectId` depuis les paramètres ;
2. appeler `getProject(projectId)` ;
3. utiliser `notFound()` si le projet n’existe pas ;
4. afficher :

```text
Dossier vendeur
Nom du vendeur
Email
Téléphone
Statut
Date de création
```

Ajouter un lien :

```text
Retour aux dossiers
```

vers :

```text
/builder
```

Afficher également un placeholder :

```text
La préparation du bien sera ajoutée dans une prochaine étape.
```

Ne pas commencer la fiche du bien dans cette mission.

---

## 12. Gestion des erreurs

Les erreurs de formulaire doivent rester simples.

Approche recommandée :

```text
redirection avec searchParams.error
```

ou retour d’état de Server Action si cela reste très léger.

Ne pas ajouter :

```text
Zod
React Hook Form
bibliothèque de formulaire
toast
système d’erreur global
```

Message vendeur vide :

```text
Le nom du vendeur est requis.
```

Erreur création :

```text
La création du dossier a échoué.
```

Erreur suppression :

```text
La suppression du dossier a échoué.
```

---

# Architecture recommandée

```text
src/features/projects/
├── types.ts
├── status-label.ts
├── queries/
│   ├── get-project.ts
│   └── get-projects.ts
└── actions/
    ├── create-project.ts
    └── delete-project.ts
```

Pages :

```text
src/app/(protected)/builder/
├── page.tsx
├── new/
│   └── page.tsx
└── [projectId]/
    └── page.tsx
```

---

# Fichiers prévus

## À créer

```text
src/features/projects/types.ts
src/features/projects/status-label.ts
src/features/projects/queries/get-project.ts
src/features/projects/queries/get-projects.ts
src/features/projects/actions/create-project.ts
src/features/projects/actions/delete-project.ts
src/app/(protected)/builder/new/page.tsx
src/app/(protected)/builder/[projectId]/page.tsx
missions/MISSION_11_PROJECTS_FOUNDATION.md
```

## À modifier

```text
src/app/(protected)/builder/page.tsx
```

## À examiner

```text
src/lib/auth/get-profile.ts
src/lib/supabase/server.ts
src/lib/supabase/database.types.ts
src/app/(protected)/layout.tsx
DATABASE.md
```

## À ne pas modifier

```text
DATABASE.md
supabase/migrations/
src/lib/supabase/database.types.ts
src/lib/supabase/middleware.ts
src/proxy.ts
src/app/login/
src/app/onboarding/
```

Sauf bug réel démontré.

Aucune migration ne doit être créée.

---

# Sécurité et multi-tenant

Toutes les lectures et écritures doivent comporter explicitement :

```text
agency_id = profile.agency_id
```

RLS reste actif.

Ne jamais accepter `agency_id` depuis :

```text
FormData
URL
query string
Client Component
```

`advisor_id` doit toujours provenir du profil courant.

Ne jamais accepter `advisor_id` depuis le client.

---

# Comportement attendu

## Cas 1 — Aucun dossier

Accès :

```text
/builder
```

Résultat :

```text
état vide
bouton Nouveau dossier vendeur
```

---

## Cas 2 — Création

Formulaire valide :

```text
Nom vendeur : Jean Martin
Email : jean@example.com
Téléphone : 0600000000
```

Résultat :

```text
project créé
status = draft
agency_id = agence du profil
advisor_id = profil courant
redirection /builder/{projectId}
```

---

## Cas 3 — Consultation

Accès :

```text
/builder/{projectId}
```

Résultat :

```text
HTTP 200
informations du dossier affichées
```

---

## Cas 4 — Dossier inexistant

Accès :

```text
/builder/uuid-inexistant
```

Résultat :

```text
404
```

---

## Cas 5 — Dossier autre agence

Un utilisateur de l’agence A tente d’accéder à un dossier de l’agence B.

Résultat :

```text
404
```

Aucune information ne doit indiquer que le dossier existe.

---

## Cas 6 — Suppression

Depuis la liste :

```text
Supprimer
```

Résultat :

```text
dossier supprimé
redirection /builder
liste actualisée
```

---

## Cas 7 — Suppression autre agence

Un utilisateur de l’agence A tente de supprimer un projet de l’agence B.

Résultat :

```text
aucune suppression
aucune fuite de données
```

---

# Tests obligatoires

## Lecture

Tester :

1. agence sans projet ;
2. agence avec un projet ;
3. plusieurs projets triés du plus récent au plus ancien ;
4. accès à un projet valide ;
5. accès à un projet inexistant ;
6. accès à un projet d’une autre agence.

---

## Création

Vérifier :

```text
seller_name correct
seller_email correct
seller_phone correct
status = draft
agency_id correct
advisor_id correct
```

Tester :

```text
nom vide
email vide autorisé
téléphone vide autorisé
```

---

## Suppression

Tester :

1. suppression d’un projet de l’agence ;
2. suppression d’un projet d’une autre agence ;
3. suppression d’un identifiant inexistant ;
4. retour sur `/builder`.

---

## Parcours réel

Tester dans le navigateur :

```text
connexion
↓
/builder
↓
état vide
↓
Nouveau dossier vendeur
↓
formulaire
↓
création
↓
page du dossier
↓
retour à la liste
↓
suppression
↓
état vide
```

---

## Nettoyage

Supprimer après test :

```text
projets temporaires
profils temporaires
agences temporaires
utilisateurs Auth temporaires
scripts et fichiers de test
cookies de session
```

Vérifier :

```text
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

# Rapport final attendu

Le rapport doit contenir :

1. fichiers créés ;
2. fichiers modifiés ;
3. architecture de la feature projects ;
4. fonctionnement de `getProjects()` ;
5. fonctionnement de `getProject()` ;
6. fonctionnement de `createProject()` ;
7. fonctionnement de `deleteProject()` ;
8. isolation par agence ;
9. affichage de la liste ;
10. fonctionnement de l’état vide ;
11. fonctionnement du formulaire ;
12. fonctionnement de la page dossier ;
13. comportement dossier inexistant ;
14. comportement dossier autre agence ;
15. fonctionnement de la suppression ;
16. résultats du parcours navigateur ;
17. résultats des tests multi-tenant ;
18. résultats lint ;
19. résultats typecheck ;
20. résultats build ;
21. résultats format check ;
22. nettoyage ;
23. `git diff` ;
24. `git status`.

Ne pas effectuer le commit.

---

# Commit prévu

```text
feat(projects): add seller project foundation
```

---

# Definition of Done

La mission est validée si :

* `/builder` affiche les dossiers vendeurs ;
* un état vide fonctionnel existe ;
* un dossier peut être créé ;
* un dossier est lié automatiquement à l’agence ;
* un dossier est lié automatiquement au conseiller ;
* le statut initial est `draft` ;
* un dossier peut être consulté ;
* un dossier inexistant retourne 404 ;
* un dossier d’une autre agence retourne 404 ;
* un dossier peut être supprimé ;
* un dossier d’une autre agence ne peut pas être supprimé ;
* toutes les requêtes filtrent explicitement par `agency_id` ;
* RLS reste actif ;
* aucune table métier secondaire n’est utilisée ;
* aucune migration n’est créée ;
* aucune dépendance n’est ajoutée ;
* aucun `any` n’est utilisé ;
* lint est vert ;
* typecheck est vert ;
* build est vert ;
* aucun commit n’est effectué avant revue CTO.
