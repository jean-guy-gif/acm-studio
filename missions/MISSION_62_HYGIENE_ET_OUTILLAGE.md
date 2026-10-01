# MISSION 62 — Hygiène et outillage

**Date** : 1er octobre 2026 · **Origine** : plan de déblocage (`missions/00_PLAN_DE_DEBLOCAGE.md`
§2-D et §2-F).
**Règle** : aucun changement visible pour un conseiller.

## Objectif

Les contrôles tournent seuls à chaque push, Claude Code ne demande plus la permission pour chaque
commande de routine, et la dépendance fantôme disparaît.

## À faire

1. **zod** : `npm install zod@^4` (c'est la version déjà résolue en transitif). Vérifie que
   `meeting-conclusion/schemas/conclusion-input.ts` et `branding/schemas/typography-input.ts`
   compilent sans modification.
2. **Prettier sur tout le dépôt** : `npm run format:check` doit passer partout. Ajoute `missions/` et
   `supabase/.temp` à `.prettierignore`. Formate les autres `.md` qui échouent (docs, README), mais
   aucun fichier de code.
3. **Intégration continue** : `.github/workflows/ci.yml`, déclenché sur `push` et `pull_request`,
   avec Node 22 : `npm ci`, `npm run typecheck`, `npm run lint`, `npm run format:check`, `npm test`,
   `npm run build`. Le build exige `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   (`src/lib/env.ts`) : mets des valeurs factices et publiques dans le workflow, **jamais les vraies
   clés**. Si le build exige autre chose, dis-le.
4. **Permissions Claude Code** : crée `.claude/settings.json` (versionné) avec exactement le contenu
   ci-dessous. Ajoute `.claude/settings.local.json` au `.gitignore`. Versionne `.claude/commands/`.
5. **Polices** : dans `src/features/branding/fonts/embedded-fonts.ts`, mets `preload: false` sur
   toutes les familles sauf le défaut produit (Montserrat et Rajdhani). Elles restent embarquées et ne
   se chargent que pour l'agence qui les a choisies.
6. **Branches** : supprime les branches locales déjà fusionnées dans `main`
   (`git branch --merged main`), sauf `main`. Ne touche pas aux branches distantes.
7. **Versionne les fichiers du plan** : `missions/00_PLAN_DE_DEBLOCAGE.md`, `missions/_GABARIT.md`,
   `missions/MISSION_62` à `67`.

### `.claude/settings.json`

```json
{
  "permissions": {
    "allow": [
      "Bash(npm run *)",
      "Bash(npm test *)",
      "Bash(npm ci *)",
      "Bash(npx vitest *)",
      "Bash(npx tsc *)",
      "Bash(npx eslint *)",
      "Bash(npx prettier *)",
      "Bash(npx supabase migration list *)",
      "Bash(git status *)",
      "Bash(git diff *)",
      "Bash(git log *)",
      "Bash(git show *)",
      "Bash(git branch *)",
      "Bash(git switch *)",
      "Bash(git fetch *)",
      "Bash(git pull *)",
      "Bash(git add *)",
      "Bash(git commit *)",
      "Bash(git merge *)",
      "Bash(git push -u origin mission-*)",
      "Bash(git push origin mission-*)",
      "Bash(git push origin essai *)",
      "Bash(ls *)",
      "Bash(grep *)",
      "Bash(wc *)"
    ],
    "deny": [
      "Bash(git push --force*)",
      "Bash(git push -f *)",
      "Bash(git push * --force*)",
      "Bash(git reset --hard *)",
      "Bash(npx supabase db reset --linked*)",
      "Bash(supabase db reset --linked*)",
      "Bash(rm -rf *)"
    ]
  }
}
```

Volontairement absents de la liste, donc toujours soumis à ta validation : `git push origin main`
(mise en ligne), `npx supabase db push` (migration sur la vraie base) et `npm install` (nouvelle
dépendance, règle 19).

## Hors périmètre

Aucun renommage, aucun découpage de fichier, aucun changement de comportement.

## Essai

- La CI est verte sur GitHub pour la branche.
- Dans une nouvelle session, Claude Code lance `npm test` et `git commit` sans demander la
  permission, mais la demande avant `git push origin main`.
- Une agence réglée sur une autre police (ex. Poppins) s'affiche toujours dans cette police, Live
  compris.
