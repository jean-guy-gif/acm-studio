# MISSION 06 — Génération des types Supabase

## Contexte

Le schéma Supabase est validé.

Les clients serveur et navigateur sont configurés.

Cette mission a pour unique objectif de générer les types TypeScript à partir du schéma de la base.

Aucune fonctionnalité métier n'est développée.

---

# Objectif

Créer les types TypeScript officiels de la base Supabase et les utiliser dans les clients existants.

Les types doivent être générés automatiquement à partir du schéma.

Ils deviennent la référence unique du projet.

---

# À réaliser

## 1. Générer les types

Utiliser la commande officielle Supabase CLI.

Le résultat doit être enregistré dans :

```text
src/lib/supabase/database.types.ts
```

Ne pas écrire ce fichier à la main.

---

## 2. Typage du client navigateur

Modifier :

```text
src/lib/supabase/client.ts
```

Le client doit utiliser :

```ts
SupabaseClient<Database>
```

avec le type généré.

---

## 3. Typage du client serveur

Modifier :

```text
src/lib/supabase/server.ts
```

Le client doit également utiliser :

```ts
SupabaseClient<Database>
```

---

## 4. Export des types

Créer :

```text
src/lib/supabase/index.ts
```

Exporter :

- createClient navigateur
- createClient serveur
- Database

afin de disposer d'un point d'entrée unique.

---

## Contraintes

Ne pas modifier :

- DATABASE.md
- les migrations
- les tables
- les policies
- les index
- les variables d'environnement

Ne créer :

- aucune requête
- aucune authentification
- aucun composant React
- aucun hook
- aucun repository
- aucun service métier

---

## Vérifications

Exécuter :

```bash
npm run lint
npm run typecheck
npm run build
npm run format:check
```

Tous les contrôles doivent être verts.

Si les types doivent être régénérés plusieurs fois, utiliser uniquement la commande officielle Supabase.

---

## Livrables

- database.types.ts
- clients typés
- index.ts
- rapport des fichiers modifiés

---

## Rapport final attendu

Le rapport doit contenir :

1. commande utilisée pour générer les types ;
2. fichiers créés ;
3. fichiers modifiés ;
4. vérification que les clients utilisent bien `Database` ;
5. résultats de :
   - lint
   - typecheck
   - build
   - format:check

Ne pas effectuer le commit.

---

# Commit

```text
feat(supabase): generate database types
```

---

# Definition of Done

La mission est validée si :

- les types sont générés automatiquement ;
- aucun type n'est écrit manuellement ;
- les deux clients utilisent `Database` ;
- aucun code métier n'est ajouté ;
- lint est vert ;
- typecheck est vert ;
- build est vert.