# MISSION 03 — Code Quality

Version : 1.0

Statut : Ready

Sprint : 0

Priorité : P0

---

# Objectif

Renforcer la qualité technique du projet après l'initialisation Next.js.

Cette mission doit uniquement ajouter les outils de qualité de code nécessaires au MVP.

Aucune fonctionnalité métier.

Aucune configuration Supabase.

Aucune authentification.

---

# Documents à lire avant de commencer

Lire obligatoirement :

1. CLAUDE.md
2. DEVELOPMENT_RULES.md
3. ARCHITECTURE.md
4. TASKS.md

Ne modifier aucun document produit.

---

# Travail demandé

Installer et configurer :

- Prettier
- script `format`
- script `format:check`
- script `typecheck`

---

# Modifications autorisées

Tu peux modifier uniquement :

- package.json
- package-lock.json
- créer `.prettierrc`
- créer `.prettierignore` si nécessaire

---

# Scripts attendus

Ajouter dans `package.json` :

```json
"typecheck": "tsc --noEmit",
"format": "prettier --write .",
"format:check": "prettier --check ."
```

Conserver les scripts existants :

```json
"dev"
"build"
"start"
"lint"
```

---

# Configuration Prettier attendue

Créer `.prettierrc` avec une configuration simple :

```json
{
  "semi": true,
  "singleQuote": true,
  "trailingComma": "all",
  "printWidth": 100,
  "tabWidth": 2
}
```

Créer `.prettierignore` si nécessaire avec au minimum :

```text
.next
node_modules
package-lock.json
```

---

# Vérifications obligatoires

Exécuter :

```bash
npm install
npm run lint
npm run typecheck
npm run format:check
npm run build
```

Si `format:check` échoue uniquement à cause du formatage initial, exécuter :

```bash
npm run format
```

Puis relancer :

```bash
npm run lint
npm run typecheck
npm run format:check
npm run build
```

---

# Interdictions

Ne pas :

- créer de feature métier
- modifier les fichiers dans `docs/`
- modifier CLAUDE.md
- modifier DATABASE.md
- modifier ARCHITECTURE.md
- modifier UI_MAP.md
- modifier TASKS.md
- modifier les routes
- modifier `src/app/page.tsx`
- modifier `src/app/layout.tsx`
- installer Supabase
- installer Shadcn
- installer Zod
- installer React Hook Form
- installer OpenAI
- créer de migration SQL
- créer de données fictives

---

# Critères de réussite

La mission est réussie si :

- Prettier est installé
- `.prettierrc` existe
- `.prettierignore` existe si utile
- les scripts `typecheck`, `format`, `format:check` existent
- `npm run lint` réussit
- `npm run typecheck` réussit
- `npm run format:check` réussit
- `npm run build` réussit
- aucune fonctionnalité métier n'a été ajoutée
- aucun document produit n'a été modifié

---

# Commit attendu

```text
chore: configure code quality tools
```

---

# Rapport attendu

Répondre uniquement avec :

## Fichiers créés

## Fichiers modifiés

## Dépendances installées

## Commandes exécutées

## Résultat du lint

## Résultat du typecheck

## Résultat du format check

## Résultat du build

## Problèmes rencontrés

## Commit réalisé
