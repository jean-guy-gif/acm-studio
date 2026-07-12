# MISSION 05 — Configuration du client Supabase

## Contexte

Le schéma Supabase du MVP est désormais implémenté et validé.

La migration initiale fonctionne sur une base vide.

Le projet utilise :

* Next.js 16
* React 19
* TypeScript
* Supabase
* App Router

Cette mission ne concerne pas l’authentification.

Elle prépare uniquement la connexion technique entre l’application Next.js et Supabase.

---

# Objectif

Configurer une intégration Supabase propre, typée et compatible avec le rendu serveur et le navigateur.

À la fin de cette mission, l’application doit pouvoir créer :

* un client Supabase côté serveur
* un client Supabase côté navigateur

Aucune fonctionnalité métier ne doit être développée.

---

# À réaliser

## 1. Installer les dépendances nécessaires

Installer uniquement les packages officiels Supabase nécessaires à l’intégration avec Next.js.

Packages attendus :

```bash
@supabase/supabase-js
@supabase/ssr
```

Ne pas ajouter d’autre dépendance.

---

## 2. Créer la structure Supabase

Créer le dossier :

```text
src/lib/supabase/
```

Créer les fichiers suivants :

```text
src/lib/supabase/client.ts
src/lib/supabase/server.ts
```

---

## 3. Client navigateur

Dans :

```text
src/lib/supabase/client.ts
```

Créer une fonction exportée :

```ts
createClient()
```

Cette fonction doit :

* créer un client Supabase navigateur
* utiliser `createBrowserClient` depuis `@supabase/ssr`
* utiliser les variables d’environnement publiques
* ne contenir aucune logique métier
* ne contenir aucune requête
* être compatible avec les Client Components

---

## 4. Client serveur

Dans :

```text
src/lib/supabase/server.ts
```

Créer une fonction asynchrone exportée :

```ts
createClient()
```

Cette fonction doit :

* créer un client Supabase serveur
* utiliser `createServerClient` depuis `@supabase/ssr`
* utiliser `cookies()` depuis `next/headers`
* lire les cookies de la requête
* permettre l’écriture des cookies quand le contexte Next.js l’autorise
* ignorer proprement les erreurs d’écriture dans un Server Component
* ne contenir aucune logique métier
* ne contenir aucune requête SQL
* être compatible avec les Server Components, Server Actions et Route Handlers

---

## 5. Variables d’environnement

Créer ou compléter :

```text
.env.example
```

Ajouter uniquement :

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```

Ne jamais ajouter de vraie clé.

Ne jamais modifier ou commiter `.env.local`.

---

## 6. Validation des variables

Créer un fichier :

```text
src/lib/env.ts
```

Ce fichier doit :

* centraliser la lecture des variables d’environnement Supabase
* vérifier que les variables existent
* produire une erreur claire si elles sont absentes
* éviter de dupliquer `process.env` dans plusieurs fichiers

Exporter un objet typé contenant :

```ts
supabaseUrl
supabaseAnonKey
```

Ne pas ajouter de librairie de validation.

Utiliser uniquement TypeScript natif.

---

## 7. Types

Ne pas générer les types Supabase dans cette mission.

Ne pas créer de fichier `database.types.ts`.

La génération des types fera l’objet d’une mission séparée.

Les clients peuvent temporairement fonctionner sans type de schéma généré.

---

# Contraintes techniques

Respecter les règles suivantes :

* TypeScript strict
* aucun `any`
* aucun cast inutile
* aucune logique métier
* aucune requête Supabase
* aucun singleton global complexe
* aucune abstraction supplémentaire
* aucun wrapper générique
* aucun service métier
* aucun repository
* aucun hook React
* aucun contexte React

Les fichiers doivent rester simples et lisibles.

---

# Interdictions

Ne pas créer :

* de page de connexion
* de formulaire
* de middleware
* de session utilisateur
* de gestion d’authentification
* de récupération de profil
* de requête vers une table
* de données de test
* de seed
* de type généré
* de Server Action métier
* de composant React
* de route API
* de test E2E
* de dépendance supplémentaire

Cette mission configure uniquement les clients Supabase.

---

# Vérifications obligatoires

Exécuter :

```bash
npm run lint
npm run typecheck
npm run build
npm run format:check
```

Tous les contrôles doivent être verts.

Si `format:check` échoue uniquement sur un fichier hors périmètre déjà présent avant la mission, ne pas le modifier sans autorisation.

Vérifier également :

* absence de vraie clé Supabase dans le dépôt
* `.env.local` ignoré par Git
* imports compatibles avec Next.js 16
* aucune erreur liée à `cookies()`
* aucune requête Supabase ajoutée

---

# Livrables attendus

* dépendances Supabase installées
* client navigateur
* client serveur
* validation simple des variables d’environnement
* fichier `.env.example` mis à jour
* rapport des fichiers créés ou modifiés
* résultat des vérifications

---

# Rapport final attendu

Le rapport doit contenir :

1. les fichiers créés
2. les fichiers modifiés
3. les dépendances installées
4. le fonctionnement du client navigateur
5. le fonctionnement du client serveur
6. la gestion des variables d’environnement
7. le résultat exact de :

   * lint
   * typecheck
   * build
   * format:check
8. les éventuels écarts ou points d’attention

Ne pas effectuer le commit.

---

# Commit prévu

```text
feat(supabase): configure server and browser clients
```

---

# Definition of Done

La mission est validée si :

* les deux clients Supabase existent
* le client navigateur utilise `createBrowserClient`
* le client serveur utilise `createServerClient`
* les cookies sont gérés correctement
* les variables d’environnement sont centralisées
* aucune vraie clé n’est exposée
* aucune logique métier n’est ajoutée
* aucune fonctionnalité d’authentification n’est ajoutée
* lint est vert
* typecheck est vert
* build est vert
* le périmètre de la mission est respecté
