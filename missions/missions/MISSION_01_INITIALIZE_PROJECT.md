# MISSION 01

Titre

Initialisation technique du projet ACM Studio

Sprint

Sprint 0

Priorité

P0 - Bloquant

Durée estimée

45 à 90 minutes

---

# Objectif

Créer une base Next.js propre, compilable et prête à accueillir le développement du MVP.

Aucune fonctionnalité métier.

Aucun écran métier.

Aucune logique ACM.

Uniquement l'infrastructure.

---

# Avant de commencer

Lire obligatoirement :

- CLAUDE.md
- DEVELOPMENT_RULES.md
- ARCHITECTURE.md
- TASKS.md

---

# Livrables attendus

Créer le projet avec :

- Next.js App Router
- TypeScript
- Tailwind
- ESLint
- Prettier
- Husky
- lint-staged

Installer :

- Supabase
- OpenAI SDK
- React Hook Form
- Zod
- Shadcn/ui
- Lucide React
- PptxGenJS
- Vitest
- Playwright

---

# Créer la structure

Créer :

src/

    app/

    components/

    features/

    hooks/

    lib/

    prompts/

    ppt/

    services/

    supabase/

    types/

Créer également :

features/

    auth/

    projects/

    properties/

    competitors/

    builder/

    live/

    ipc/

    reports/

    admin/

Chaque feature contient uniquement :

components/

services/

schemas/

types/

hooks/

actions/

---

# Configuration

Configurer :

- alias @/*
- prettier
- eslint
- shadcn
- tailwind

Créer :

.env.example

contenant :

SUPABASE_URL=

SUPABASE_ANON_KEY=

SUPABASE_SERVICE_ROLE_KEY=

OPENAI_API_KEY=

---

# Supabase

Créer :

client.ts

server.ts

middleware.ts

Ne créer aucune table.

Ne créer aucune migration.

---

# Routes

Créer uniquement :

/

auth/login

dashboard

projects/new

projects/[projectId]/property

projects/[projectId]/comparables

projects/[projectId]/builder

projects/[projectId]/live

projects/[projectId]/report

projects/[projectId]/export

admin

Chaque page affiche uniquement :

Titre

Description

Lien retour Dashboard

Aucune logique.

---

# UI

Installer uniquement :

Button

Input

Textarea

Card

Badge

Dialog

Dropdown

Table

Tabs

Separator

Skeleton

Toast

Tooltip

Command

NavigationMenu

Alert

ScrollArea

---

# Vérifications

Le projet doit passer :

npm install

npm run lint

npm run build

---

# Interdictions

Ne pas :

- créer une table
- créer une migration
- créer une API
- créer une Feature
- créer une logique métier
- créer un composant Builder
- créer un composant Live
- appeler OpenAI

---

# Commit attendu

chore: initialize ACM Studio project

---

# Rapport attendu

Claude Code doit répondre uniquement :

## Dépendances installées

## Arborescence créée

## Configurations réalisées

## Vérifications exécutées

## Problèmes rencontrés

## Recommandations avant Mission 02

