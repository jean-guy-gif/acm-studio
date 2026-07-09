# PROMPT_CLAUDE_CODE_INIT.md

# ACM Studio — Sprint 0

Tu es le Lead Software Engineer du projet ACM Studio.

Tu travailles sur un projet réel destiné à être mis en production.

Tu dois respecter STRICTEMENT toute la documentation existante.

Aucune décision produit ne doit être remise en question.

---

# Avant toute chose

Lire obligatoirement dans cet ordre :

1. CLAUDE.md
2. ARCHITECTURE.md
3. DATABASE.md
4. UI_MAP.md
5. TASKS.md

Puis lire tous les documents contenus dans :

docs/

Ne jamais modifier ces documents.

Ils constituent les fondations du projet.

---

# Objectif

Initialiser complètement le projet.

Aucune feature métier ne doit être développée.

Aucun écran fonctionnel ne doit être créé.

Nous voulons uniquement une base technique parfaitement propre.

---

# Stack obligatoire

Next.js 15

React 19

TypeScript

App Router

Supabase

Supabase Auth

Supabase Storage

Tailwind CSS

shadcn/ui

React Hook Form

Zod

OpenAI SDK

PptxGenJS

Lucide React

ESLint

Prettier

Husky

lint-staged

Vitest

Playwright

---

# Arborescence attendue

src/

    app/

    components/

    features/

    hooks/

    lib/

    services/

    prompts/

    ppt/

    supabase/

    types/

public/

docs/

tests/

---

Créer également :

src/features/

    auth/

    projects/

    properties/

    competitors/

    builder/

    live/

    ipc/

    reports/

    admin/

Chaque feature doit contenir uniquement sa structure.

Pas encore de logique métier.

---

# Configuration

Configurer :

TypeScript

ESLint

Prettier

Tailwind

shadcn

Alias

@/*

Variables d'environnement

.env.example

avec :

SUPABASE_URL=

SUPABASE_ANON_KEY=

SUPABASE_SERVICE_ROLE_KEY=

OPENAI_API_KEY=

---

# Supabase

Créer :

src/supabase/

client.ts

server.ts

middleware.ts

Ne créer aucune table.

Ne créer aucune migration.

Ne créer aucun seed.

---

# Layout

Créer :

app/

layout.tsx

page.tsx

not-found.tsx

loading.tsx

error.tsx

Créer un layout responsive.

Desktop prioritaire.

Tablet compatible.

Pas de Mobile First.

---

# Pages vides

Créer uniquement les routes suivantes.

Aucune logique métier.

Seulement des pages avec un titre.

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

---

# UI

Installer shadcn.

Créer uniquement les composants de base.

Button

Input

Textarea

Card

Dialog

Dropdown

Tabs

Table

Badge

Skeleton

Tooltip

Alert

Toast

Separator

ScrollArea

Command

NavigationMenu

---

# Types

Créer uniquement les interfaces vides :

Agency

Advisor

Project

SubjectProperty

Competitor

MeetingScript

SellerResponse

PerceptionResult

Report

Aucun champ métier.

Seulement les fichiers.

---

# Services

Créer uniquement les fichiers :

project.service.ts

property.service.ts

competitor.service.ts

meeting.service.ts

report.service.ts

ipc.service.ts

Chaque fichier contient :

export {}

uniquement.

---

# Hooks

Créer les hooks vides :

useProject

useCompetitors

useMeeting

useReport

Aucune logique.

---

# Prompts

Créer :

prompts/

README.md

Ce dossier accueillera tous les prompts IA.

Ne rien ajouter.

---

# PPT

Créer :

ppt/

README.md

Le moteur PowerPoint sera développé plus tard.

---

# Tests

Configurer :

Vitest

Playwright

Créer :

tests/

unit/

e2e/

Aucun test métier.

Seulement vérifier que la configuration fonctionne.

---

# Git

Créer un .gitignore propre.

Ne rien supprimer.

---

# Vérifications obligatoires

Avant de terminer :

npm install

npm run lint

npm run build

Tous doivent réussir.

Corriger automatiquement les erreurs éventuelles.

---

# Interdictions

Ne créer :

- aucune feature métier

- aucune table Supabase

- aucune migration

- aucun composant Builder

- aucun composant Live

- aucune logique IPC

- aucun export PowerPoint

- aucun appel OpenAI

- aucune estimation

- aucun concurrent fictif

- aucune donnée fake

---

# Livrable attendu

À la fin, fournir uniquement :

## 1. Arborescence créée

## 2. Dépendances installées

## 3. Fichiers créés

## 4. Vérifications exécutées

## 5. Problèmes rencontrés

## 6. Recommandations avant Sprint 1

Ne développer absolument aucune fonctionnalité métier.

L'objectif est uniquement d'obtenir une base technique propre, stable, maintenable et prête à accueillir le développement du MVP.
