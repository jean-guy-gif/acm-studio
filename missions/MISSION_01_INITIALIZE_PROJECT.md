# MISSION 01 — Initialize Project

Version : 1.0

Statut : Ready

Sprint : 0

Priorité : P0

---

# Objectif

Initialiser le projet ACM Studio avec Next.js.

Cette mission doit uniquement créer une base technique propre et compilable.

Aucune logique métier.

Aucune base de données.

Aucune authentification.

Aucune feature ACM.

---

# Documents à lire avant de commencer

Lire obligatoirement :

1. CLAUDE.md
2. DEVELOPMENT_RULES.md
3. ARCHITECTURE.md
4. TASKS.md

Ne modifier aucun document existant.

---

# Travail demandé

Initialiser le projet avec :

- Next.js App Router
- TypeScript
- Tailwind CSS
- ESLint
- src directory
- alias `@/*`

Utiliser la commande adaptée :

```bash
npx create-next-app@latest . --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
```

Si le dossier n'est pas vide, ne supprimer aucun fichier existant.

Conserver tous les fichiers de documentation déjà présents.

---

# À créer ou vérifier

Le projet doit contenir :

```text
src/
  app/
    layout.tsx
    page.tsx

package.json

next.config.ts

tsconfig.json

eslint.config.mjs

postcss.config.mjs

tailwind.config.ts ou configuration Tailwind équivalente

.gitignore
```

---

# Page d'accueil temporaire

Créer une page d'accueil simple :

Titre :

```text
ACM Studio
```

Sous-titre :

```text
MVP initialization complete.
```

Aucun design avancé.

Aucun composant métier.

---

# Interdictions

Ne pas créer :

- Supabase
- Auth
- Shadcn
- OpenAI
- PptxGenJS
- React Hook Form
- Zod
- routes métier
- dashboard
- Builder
- Live
- IPC
- rapport
- données fictives
- migration SQL

---

# Vérifications obligatoires

Exécuter :

```bash
npm install
npm run lint
npm run build
```

Corriger les erreurs si nécessaire.

---

# Commit attendu

```text
chore: initialize nextjs project
```

---

# Rapport attendu

À la fin, répondre avec :

## Fichiers créés

## Fichiers conservés

## Commandes exécutées

## Résultat du lint

## Résultat du build

## Problèmes rencontrés

## Prochaine mission recommandée
