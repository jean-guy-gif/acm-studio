# MISSION 03A — Prettier Cleanup

Version : 1.0

Statut : Ready

Sprint : 0

Priorité : P0

---

# Objectif

Finaliser proprement la configuration de Prettier.

La mission précédente a volontairement contourné le formatage en ajoutant des exclusions dans `.prettierignore`.

Cette mission supprime ce contournement.

À la fin, tout le projet doit respecter le formatage Prettier.

---

# Documents à lire

Lire uniquement :

- CLAUDE.md
- DEVELOPMENT_RULES.md

---

# Travail demandé

1. Simplifier `.prettierignore`.

Conserver uniquement :

```text
.next
node_modules
```

2. Exécuter :

```bash
npm run format
```

3. Vérifier que tous les fichiers sont correctement formatés.

4. Exécuter ensuite :

```bash
npm run lint
npm run typecheck
npm run format:check
npm run build
```

Tous les contrôles doivent être verts.

---

# Modifications autorisées

Peuvent être modifiés uniquement par le formatage :

- fichiers TypeScript
- fichiers TSX
- fichiers JSON
- fichiers Markdown
- fichiers de configuration

Aucun changement fonctionnel.

Aucune modification métier.

Aucune nouvelle dépendance.

---

# Interdictions

Ne pas :

- modifier la logique métier
- modifier les routes
- installer une dépendance
- créer un nouveau fichier
- supprimer un fichier
- modifier la documentation métier

Uniquement du formatage.

---

# Critères de réussite

La mission est réussie si :

- `.prettierignore` est simplifié
- `npm run format` réussit
- `npm run lint` réussit
- `npm run typecheck` réussit
- `npm run format:check` réussit
- `npm run build` réussit
- aucun changement fonctionnel n'a été introduit

---

# Commit attendu

```text
chore: apply prettier formatting
```

---

# Rapport attendu

Répondre uniquement avec :

## Fichiers reformatés

## Résultat du lint

## Résultat du typecheck

## Résultat du format check

## Résultat du build

## Commit réalisé
