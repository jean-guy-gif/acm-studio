# MISSION 10 — Protected Layout et shell applicatif

## Contexte

Les missions précédentes ont validé :

```text
Authentification
↓
Détection du profil
↓
Onboarding
↓
Création agence + profil owner
↓
Accès à la zone protégée
```

Le socle Auth, RLS, multi-tenant et onboarding est terminé.

La zone protégée contient actuellement une page temporaire :

```text
src/app/(protected)/protected/page.tsx
```

Cette page affiche uniquement :

```text
Authenticated
```

Nous devons maintenant construire le shell applicatif commun à toutes les futures pages ACM Studio.

Cette mission concerne uniquement :

* la structure visuelle globale ;
* la navigation principale ;
* l’affichage du profil et de l’agence ;
* la déconnexion.

Aucune fonctionnalité métier ne doit être développée.

---

# Objectif

Créer un layout protégé stable et réutilisable pour les futures sections :

```text
Builder
Live
Admin
```

À la fin de la mission, un utilisateur authentifié avec profil doit voir :

* une barre latérale ;
* le nom ACM Studio ;
* les trois entrées principales ;
* son identité ;
* le nom de son agence ;
* un bouton de déconnexion ;
* une zone principale destinée aux pages futures.

---

# Décision produit

Les trois modules visibles dans la navigation sont :

```text
Builder
Live
Admin
```

Ils correspondent à l’architecture produit déjà validée.

Pour cette mission, chaque module doit être une page placeholder uniquement.

Ne développer aucune fonctionnalité interne.

---

# À réaliser

## 1. Layout protégé

Modifier :

```text
src/app/(protected)/layout.tsx
```

Le layout doit :

1. récupérer le profil courant ;
2. rediriger vers `/onboarding` si aucun profil n’existe ;
3. récupérer l’agence liée au profil ;
4. afficher le shell applicatif ;
5. rendre les pages enfants dans la zone principale.

Le layout doit rester un Server Component.

Ne pas ajouter :

```text
'use client'
```

dans ce fichier.

---

## 2. Récupération de l’agence

Créer :

```text
src/lib/auth/get-agency.ts
```

Responsabilité unique :

* récupérer le profil courant ;
* lire l’agence correspondant à `profile.agency_id` ;
* retourner l’agence ou `null`.

Le helper doit utiliser :

```text
src/lib/supabase/server.ts
```

Il doit interroger uniquement :

```text
profiles
agencies
```

Aucune autre table.

Alternative acceptable :

* recevoir directement `agencyId` en paramètre afin d’éviter une seconde lecture du profil.

Décision recommandée :

```ts
getAgency(agencyId: string)
```

Cela évite de rappeler `getProfile()` deux fois dans le même rendu.

Signature recommandée :

```ts
export async function getAgency(agencyId: string): Promise<Agency | null>
```

Le type doit provenir des types Supabase générés.

Ne pas dupliquer manuellement le type `Agency`.

---

## 3. Structure du shell

Créer une structure simple :

```text
┌──────────────────────┬──────────────────────────┐
│ Sidebar              │ Main content             │
│                      │                          │
│ ACM Studio           │ children                 │
│                      │                          │
│ Builder              │                          │
│ Live                 │                          │
│ Admin                │                          │
│                      │                          │
│ Profil               │                          │
│ Agence               │                          │
│ Déconnexion          │                          │
└──────────────────────┴──────────────────────────┘
```

La sidebar peut être réalisée directement dans le layout.

Ne pas créer de design system.

Ne pas créer de composant générique de navigation si ce n’est pas nécessaire.

---

## 4. Navigation

Créer les liens suivants :

```text
/builder
/live
/admin
```

Utiliser :

```ts
import Link from 'next/link';
```

Les libellés affichés doivent être exactement :

```text
Builder
Live
Admin
```

Ne pas créer de logique d’autorisation par rôle dans cette mission.

L’entrée Admin reste visible pour tous les profils pour le moment.

La gestion fine des rôles sera traitée plus tard.

---

## 5. Pages placeholders

Créer :

```text
src/app/(protected)/builder/page.tsx
src/app/(protected)/live/page.tsx
src/app/(protected)/admin/page.tsx
```

Chaque page doit afficher uniquement :

### Builder

```text
Builder
Préparation des rendez-vous vendeurs.
```

### Live

```text
Live
Animation des rendez-vous vendeurs.
```

### Admin

```text
Admin
Gestion de l’agence et des utilisateurs.
```

Aucun bouton.

Aucun formulaire.

Aucun appel Supabase.

Aucune logique métier.

---

## 6. Page d’entrée protégée

La page temporaire actuelle :

```text
src/app/(protected)/protected/page.tsx
```

doit être supprimée ou remplacée.

Décision recommandée :

Supprimer la route `/protected`.

Créer :

```text
src/app/(protected)/page.tsx
```

Cette page doit rediriger vers :

```text
/builder
```

Exemple :

```ts
import { redirect } from 'next/navigation';

export default function ProtectedHomePage() {
  redirect('/builder');
}
```

Puis modifier les redirections existantes qui pointent encore vers :

```text
/protected
```

pour les faire pointer vers :

```text
/builder
```

Fichiers probablement concernés :

```text
src/app/login/actions.ts
src/app/onboarding/actions.ts
src/app/onboarding/page.tsx
src/app/(protected)/layout.tsx
```

Ne pas modifier le proxy sauf nécessité réelle démontrée.

---

## 7. Affichage utilisateur

Dans la sidebar, afficher :

```text
Prénom Nom
email
```

Les données doivent provenir du profil déjà récupéré.

Ne pas récupérer l’utilisateur Auth séparément si le profil contient déjà les informations nécessaires.

Ne pas afficher le rôle dans cette mission.

---

## 8. Affichage agence

Afficher :

```text
Nom de l’agence
```

Le nom doit provenir de la table :

```text
agencies
```

Si l’agence est introuvable, afficher un fallback simple :

```text
Agence inconnue
```

Ne pas créer de logique de réparation automatique.

---

## 9. Déconnexion

Réutiliser la Server Action existante :

```text
signOut
```

depuis :

```text
src/app/login/actions.ts
```

Afficher un formulaire avec un bouton :

```text
Déconnexion
```

Ne pas créer une nouvelle action de déconnexion.

---

## 10. Styles

Utiliser uniquement Tailwind CSS déjà installé.

Créer un rendu propre mais minimal.

Attentes :

* sidebar fixe ou pleine hauteur ;
* largeur raisonnable ;
* contenu principal lisible ;
* espaces cohérents ;
* aucune animation ;
* aucun thème complexe ;
* aucune bibliothèque UI ;
* aucune icône externe ;
* aucun logo graphique.

Utiliser du texte uniquement.

Ne pas investir du temps dans le branding.

Le but est la stabilité structurelle, pas la beauté finale.

---

# Architecture recommandée

```text
src/app/(protected)/
├── layout.tsx
├── page.tsx
├── builder/
│   └── page.tsx
├── live/
│   └── page.tsx
└── admin/
    └── page.tsx
```

Helper :

```text
src/lib/auth/get-agency.ts
```

---

# Fichiers prévus

## À créer

```text
src/app/(protected)/page.tsx
src/app/(protected)/builder/page.tsx
src/app/(protected)/live/page.tsx
src/app/(protected)/admin/page.tsx
src/lib/auth/get-agency.ts
missions/MISSION_10_PROTECTED_LAYOUT.md
```

## À modifier

```text
src/app/(protected)/layout.tsx
src/app/login/actions.ts
src/app/onboarding/actions.ts
src/app/onboarding/page.tsx
```

## À supprimer

```text
src/app/(protected)/protected/page.tsx
```

## À examiner

```text
src/lib/auth/get-profile.ts
src/lib/supabase/server.ts
src/lib/supabase/database.types.ts
src/proxy.ts
src/lib/supabase/middleware.ts
```

## À ne pas modifier

```text
DATABASE.md
supabase/migrations/
src/lib/supabase/database.types.ts
```

Sauf bug réel démontré.

Aucune migration ne doit être créée.

---

# Contraintes

Ne pas créer :

* dashboard métier ;
* cartes KPI ;
* projets ;
* dossier vendeur ;
* Builder fonctionnel ;
* Live fonctionnel ;
* Admin fonctionnel ;
* logique de rôle ;
* gestion des invitations ;
* gestion des utilisateurs ;
* paramètres d’agence ;
* design system ;
* composants UI génériques ;
* bibliothèque d’icônes ;
* dépendance supplémentaire ;
* Client Component inutile ;
* état global ;
* hook personnalisé ;
* middleware supplémentaire.

Ne pas interroger :

```text
projects
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

---

# Comportement attendu

## Cas 1 — Utilisateur non authentifié

Accès :

```text
/builder
/live
/admin
```

Résultat :

```text
/login
```

---

## Cas 2 — Utilisateur authentifié sans profil

Accès :

```text
/builder
/live
/admin
```

Résultat :

```text
/onboarding
```

---

## Cas 3 — Utilisateur authentifié avec profil

Accès :

```text
/
```

Résultat :

```text
/builder
```

Accès :

```text
/builder
/live
/admin
```

Résultat :

```text
HTTP 200
shell visible
profil visible
agence visible
navigation visible
```

---

## Cas 4 — Déconnexion

Depuis n’importe quelle page protégée :

```text
clic Déconnexion
↓
session supprimée
↓
/login
```

Puis accès à :

```text
/builder
```

Résultat :

```text
/login
```

---

# Tests obligatoires

## Test structurel

Vérifier :

* sidebar visible ;
* contenu principal rendu ;
* navigation Builder / Live / Admin présente ;
* profil visible ;
* email visible ;
* agence visible ;
* bouton Déconnexion visible.

---

## Test routage

Vérifier :

```text
/ → /builder
/protected → 404 ou route supprimée
/builder → 200
/live → 200
/admin → 200
```

---

## Test authentification

Tester :

1. utilisateur non connecté ;
2. utilisateur connecté sans profil ;
3. utilisateur connecté avec profil ;
4. déconnexion ;
5. accès refusé après déconnexion.

---

## Test données

Créer localement un utilisateur Auth temporaire, une agence et un profil.

Vérifier que :

```text
nom utilisateur correct
email correct
nom agence correct
```

Nettoyer ensuite :

* profil ;
* agence ;
* utilisateur Auth ;
* cookies ;
* scripts temporaires.

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
3. fichiers supprimés ;
4. fonctionnement du layout ;
5. fonctionnement de `getAgency()` ;
6. fonctionnement de la navigation ;
7. nouvelle route d’entrée ;
8. redirections modifiées ;
9. affichage utilisateur ;
10. affichage agence ;
11. fonctionnement de la déconnexion ;
12. résultats des tests non authentifiés ;
13. résultats des tests sans profil ;
14. résultats des tests avec profil ;
15. résultats des tests Builder / Live / Admin ;
16. résultat de `/protected` ;
17. résultats de lint ;
18. résultats de typecheck ;
19. résultats du build ;
20. résultats du format check ;
21. nettoyage des données temporaires ;
22. `git diff` ;
23. `git status`.

Ne pas effectuer le commit.

---

# Commit prévu

```text
feat(app): create protected application shell
```

---

# Definition of Done

La mission est validée si :

* le shell protégé existe ;
* le layout reste un Server Component ;
* profil et agence sont récupérés côté serveur ;
* aucune logique métier n’est ajoutée ;
* les trois modules apparaissent dans la navigation ;
* les trois pages placeholders fonctionnent ;
* `/` redirige vers `/builder` pour un utilisateur correctement configuré ;
* les anciennes redirections `/protected` sont remplacées ;
* la route temporaire `/protected` est supprimée ;
* la déconnexion fonctionne ;
* un utilisateur non authentifié ne peut accéder à aucune page protégée ;
* un utilisateur sans profil est redirigé vers `/onboarding` ;
* aucun appel aux tables métier n’est ajouté ;
* aucune migration n’est créée ;
* aucune dépendance n’est ajoutée ;
* lint est vert ;
* typecheck est vert ;
* build est vert ;
* aucun commit n’est effectué avant revue CTO.
