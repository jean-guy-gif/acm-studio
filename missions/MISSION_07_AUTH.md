# MISSION 07 — Authentification Supabase

## Contexte

Le schéma Supabase est validé.

Les clients serveur et navigateur sont configurés.

Les types TypeScript sont générés.

Nous commençons maintenant la couche applicative.

Cette mission concerne uniquement l'authentification.

Aucun code métier ne doit être développé.

---

# Objectif

Mettre en place l'authentification Supabase dans Next.js.

À la fin de cette mission :

- un utilisateur peut se connecter ;
- un utilisateur peut se déconnecter ;
- la session est correctement gérée ;
- les routes privées sont protégées.

Aucun profil métier (`profiles`) ne doit encore être créé.

---

# À réaliser

## 1. Middleware

Créer le middleware officiel Supabase compatible Next.js 16.

Le middleware doit :

- restaurer la session ;
- rafraîchir automatiquement les tokens ;
- laisser passer les routes publiques ;
- protéger les routes privées.

Ne pas ajouter de logique métier.

---

## 2. Pages

Créer uniquement :

```text
/app/login/page.tsx
```

Créer un formulaire minimal.

Champs :

- email
- mot de passe

Bouton :

- Connexion

Aucun design.

Aucune bibliothèque UI.

---

## 3. Authentification

Utiliser exclusivement :

- email
- mot de passe

Ne pas implémenter :

- OAuth
- Magic Link
- OTP
- MFA
- Passkeys

---

## 4. Server Actions

Créer les Server Actions nécessaires :

- connexion
- déconnexion

Utiliser exclusivement :

```ts
supabase.auth.signInWithPassword()
supabase.auth.signOut()
```

Les Server Actions doivent uniquement gérer :

- l'appel Supabase
- les redirections
- les erreurs minimales

Aucune logique métier.

---

## 5. Session

Créer un helper permettant de récupérer l'utilisateur connecté.

Utiliser uniquement :

```ts
supabase.auth.getUser()
```

Ne jamais interroger :

- profiles
- agencies
- projects

---

## 6. Routes protégées

Créer un groupe :

```text
/app/(protected)/
```

Créer uniquement une page temporaire :

```text
/app/(protected)/page.tsx
```

Cette page doit simplement afficher :

```
Authenticated
```

Aucun dashboard.

Aucune donnée.

Le but est uniquement de valider le fonctionnement de l'authentification.

---

## 7. Routes publiques

Considérer comme publiques :

```text
/
```

```text
/login
```

Tous les autres écrans du groupe `(protected)` doivent nécessiter une authentification.

---

## Contraintes

Ne pas créer :

- profil utilisateur
- bootstrap automatique
- dashboard
- Builder
- Live
- Admin
- CRUD
- appels à Supabase sur les tables métier
- composants UI avancés

Ne jamais interroger une table métier.

---

## Vérifications

Exécuter :

```bash
npm run lint
npm run typecheck
npm run build
npm run format:check
```

Vérifier :

- connexion fonctionnelle ;
- déconnexion fonctionnelle ;
- restauration automatique de session ;
- accès refusé aux routes protégées sans connexion ;
- accès autorisé après connexion ;
- aucune erreur middleware.

---

## Livrables

- middleware
- page login
- page protégée de test
- server actions
- helper session

---

## Rapport final attendu

Le rapport doit contenir :

1. fichiers créés ;
2. fichiers modifiés ;
3. fonctionnement du middleware ;
4. fonctionnement de la connexion ;
5. fonctionnement de la déconnexion ;
6. fonctionnement de la restauration de session ;
7. fonctionnement des routes protégées ;
8. résultats exacts de :

- lint
- typecheck
- build
- format:check

Ne pas effectuer le commit.

---

# Commit

```text
feat(auth): implement supabase authentication
```

---

# Definition of Done

La mission est validée si :

- un utilisateur peut se connecter ;
- un utilisateur peut se déconnecter ;
- la session est restaurée automatiquement ;
- le middleware protège les routes privées ;
- les routes publiques restent accessibles ;
- aucune table métier n'est interrogée ;
- aucune logique Builder n'est créée ;
- aucune logique métier n'est ajoutée ;
- lint est vert ;
- typecheck est vert ;
- build est vert.