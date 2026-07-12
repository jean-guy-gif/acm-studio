# MISSION 08 — Onboarding et routage initial

## Contexte

L'authentification est terminée.

Un utilisateur peut désormais se connecter.

Aucun profil métier n'est encore créé.

Le modèle de données impose qu'un utilisateur possède un profile rattaché à une agency.

Cette mission ne crée encore aucune donnée.

Elle met uniquement en place le workflow d'onboarding.

---

# Objectif

Créer le point d'entrée de l'application après authentification.

À chaque connexion :

- vérifier si un profile existe ;
- si oui, poursuivre vers l'application ;
- si non, rediriger vers l'onboarding.

Aucune création de données dans cette mission.

---

# À réaliser

## 1. Créer la page d'onboarding

Créer :

```text
/app/onboarding/page.tsx
```

Cette page est volontairement minimale.

Elle affiche uniquement :

```
Bienvenue dans ACM Studio

Configuration initiale...
```

Aucun formulaire.

Aucune création d'agence.

Aucun appel SQL.

---

## 2. Créer un helper

Créer :

```text
src/lib/auth/get-profile.ts
```

Ce helper :

- récupère l'utilisateur Auth connecté ;
- recherche une ligne dans `public.profiles` correspondant à `auth.users.id` ;
- retourne :
  - `null` si aucun profile ;
  - le profile sinon.

Ne charger aucune autre table.

---

## 3. Routage

Après connexion réussie :

```
Utilisateur connecté

↓

Profile ?

↓

Oui

↓

/protected

↓

Non

↓

/onboarding
```

---

## 4. Protection

La page :

```
/onboarding
```

doit être accessible uniquement aux utilisateurs authentifiés.

Un utilisateur non connecté doit être redirigé vers :

```
/login
```

---

## Contraintes

Ne pas créer :

- agency
- profile
- dashboard
- Builder
- Live
- Admin

Ne pas écrire dans la base.

Ne faire que de la lecture sur `profiles`.

---

## Vérifications

Tester :

- utilisateur sans profile → onboarding ;
- utilisateur avec profile → protected ;
- utilisateur non connecté → login.

Exécuter :

```bash
npm run lint
npm run typecheck
npm run build
npm run format:check
```

---

## Livrables

- page onboarding
- helper get-profile
- routage après connexion

---

## Rapport attendu

Le rapport doit contenir :

1. fichiers créés ;
2. fichiers modifiés ;
3. fonctionnement du helper ;
4. fonctionnement du routage ;
5. résultats des vérifications.

Ne pas effectuer le commit.

---

# Commit

```text
feat(onboarding): implement onboarding flow
```

---

# Definition of Done

La mission est validée si :

- un utilisateur authentifié sans profile est redirigé vers `/onboarding` ;
- un utilisateur avec profile est redirigé vers `/protected` ;
- aucune donnée n'est créée ;
- aucune logique métier supplémentaire n'est ajoutée ;
- lint est vert ;
- typecheck est vert ;
- build est vert.