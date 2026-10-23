---
description: Fusionne dans main une mission essayée et validée
argument-hint: [numéro de mission]
---

J'ai essayé la mission **$ARGUMENTS** : elle est validée.

1. Retrouve la branche `mission-$ARGUMENTS-*` et vérifie qu'elle est poussée. En cas de doute,
   relance `npm run typecheck`, `npm run lint` et `npm test` dessus.
2. Vérifie la CI du dernier commit poussé de la branche :
   `gh run list --branch <branche> -L 1 --json headSha,status,conclusion,databaseId`. Le `headSha`
   doit être le dernier commit de la branche, la course terminée, et chaque tâche (`checks`, `sql`)
   en succès (`gh run view <id> --json jobs`). Course en cours : attends-la (`gh run watch`).
   CI rouge ou absente : **arrête-toi**, dis quelle tâche échoue et pourquoi — pas de fusion.
3. Si la mission contient une migration : lance `npx supabase migration list --linked` et dis-moi si
   elle est appliquée. Si elle ne l'est pas, **arrête-toi** : on l'applique ensemble (règle
   « Migrations » de CLAUDE.md).
4. `git switch main`, `git pull`, `git merge --no-ff <branche>` avec le message
   `Merge Mission $ARGUMENTS — <titre>`.
5. Si `docs/DECISIONS.md` existe, ajoute-y les décisions de la mission (une ligne datée par
   décision, avec le numéro de mission) et commite.
6. Pousse `main` (je validerai la permission). Supprime ensuite la branche locale.
7. Lance `npm run verifier:production` : la commande attend que la production serve le commit de
   `main` (10 minutes au plus). Rapporte ce qu'elle répond — « production à jour », ou son échec
   tel quel. Ne dis plus « je n'ai pas vérifié le déploiement ».
8. Dis-moi en 3 lignes ce qui vient de partir en ligne.
