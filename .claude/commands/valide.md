---
description: Fusionne dans main une mission essayée et validée
argument-hint: [numéro de mission]
---

J'ai essayé la mission **$ARGUMENTS** : elle est validée.

1. Retrouve la branche `mission-$ARGUMENTS-*` et vérifie qu'elle est poussée. En cas de doute,
   relance `npm run typecheck`, `npm run lint` et `npm test` dessus.
2. Si la mission contient une migration : lance `npx supabase migration list --linked` et dis-moi si
   elle est appliquée. Si elle ne l'est pas, **arrête-toi** : on l'applique ensemble (règle
   « Migrations » de CLAUDE.md).
3. `git switch main`, `git pull`, `git merge --no-ff <branche>` avec le message
   `Merge Mission $ARGUMENTS — <titre>`.
4. Si `docs/DECISIONS.md` existe, ajoute-y les décisions de la mission (une ligne datée par
   décision, avec le numéro de mission) et commite.
5. Pousse `main` (je validerai la permission). Supprime ensuite la branche locale.
6. Dis-moi en 3 lignes ce qui vient de partir en ligne.
