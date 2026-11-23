---
description: Fusionne dans main une mission validée par Jean-Guy (Moyen, Sensible) ; pour une mission Petit, le chef joue ces étapes lui-même
argument-hint: [numéro de mission]
---

J'ai essayé la mission **$ARGUMENTS** : elle est validée.

Les niveaux (règle de Jean-Guy, 23/11, CLAUDE.md) : une mission **Moyen** ou **Sensible** ne se
fusionne que sur cet ordre de Jean-Guy. Une mission **Petit** n'attend pas « valide » : dès que ses
barrières, ses specs e2e concernées et sa CI sont vertes, le chef joue lui-même les étapes 2 à 8
ci-dessous, puis dit à Jean-Guy ce qui est parti.

Note chaque étape pour l'atelier : `node atelier/note.mjs --mission $ARGUMENTS "…"`.

1. Retrouve la branche `mission-$ARGUMENTS-*` et vérifie qu'elle est poussée. En cas de doute,
   relance `npm run typecheck`, `npm run lint` et `npm test` dessus.
2. Vérifie la CI de la branche. Deux workflows (décision de Jean-Guy, 09/11) : `CI` (`ci.yml`,
   la tâche `checks`) et `CI SQL` (`sql.yml`, la tâche `sql`). Aucun ne part quand un commit ne
   touche que `docs/`, `missions/` ou des `.md` (sauf `docs/DEMO.md` et `docs/extension-store.md`,
   que lisent les tests) ; `CI SQL` ne part que si `supabase/` ou `sql.yml` changent.
   - **Le commit qui compte**, pour `CI` : le plus récent de
     `git log -1 --format=%H main..<branche> -- . ':!docs' ':!missions' ':!*.md'` et de
     `git log -1 --format=%H main..<branche> -- docs/DEMO.md docs/extension-store.md` ; pour
     `CI SQL` : `git log -1 --format=%H main..<branche> -- supabase .github/workflows/sql.yml`.
   - **La course** :
     `gh run list --branch <branche> --workflow ci.yml -L 1 --json headSha,status,conclusion,databaseId`
     (puis `--workflow sql.yml`) ; son `headSha` est ce commit ou un commit plus récent de la
     branche (`git merge-base --is-ancestor <commit> <headSha>`), la course terminée, sa tâche en
     succès (`gh run view <id> --json jobs`). Course en cours : attends-la (`gh run watch`).
   - **Sans changement dans `supabase/` depuis `main`, l'absence de `CI SQL` ne bloque pas** :
     dis-le en une ligne (« pas de changement de la base : CI SQL non requise ») ; la course
     hebdomadaire de `main` en est le filet. Avec un changement dans `supabase/`, `CI SQL` est
     exigée comme `CI`.
   - CI rouge ou absente quand elle est exigée : **arrête-toi**, dis quelle tâche échoue et
     pourquoi — pas de fusion. Exception (décision de Jean-Guy, 29/10) : une CI rouge pour une
     **cause extérieure** (registre d'images, réseau — « toomanyrequests », image introuvable, délai
     dépassé) ne bloque pas une mission **sans migration** : dis-la, et continue. Une mission avec
     migration attend la CI verte.
   - Si toutes les étapes d'une tâche sont vertes, la tâche est verte, même si GitHub n'a pas
     encore clos la course (décision de Jean-Guy, 04/11) : lis les étapes par
     `gh api repos/:owner/:repo/actions/runs/<id>/jobs`.
   - **Le filet** : lis aussi les courses hebdomadaires de `main`
     (`gh run list --branch main --event schedule -L 2 --json workflowName,conclusion,createdAt`).
     Rouge : dis-le avant de fusionner (le défaut est déjà dans `main`, pas forcément dans la
     mission) ; à elle seule, elle ne bloque pas la fusion.
3. Si la mission contient une migration : lance `npx --yes supabase@3.0.0 migration list --remote` et dis-moi si
   elle est appliquée. Si elle ne l'est pas, **arrête-toi** : on l'applique ensemble (règle
   « Migrations » de CLAUDE.md).
4. **Apprentissages** (mission 126) : relis `docs/APPRENTISSAGES.md` et écris ce que la mission a
   appris — aléas, pièges, durées, ce qui a surpris un agent —, une ligne datée chacun, dans la
   section qui convient ; ce qui est une règle produit va dans `docs/DECISIONS.md`, pas ici. Commite
   sur la branche.
5. `git switch main`, `git pull`, `git merge --no-ff <branche>` avec le message
   `Merge Mission $ARGUMENTS — <titre>`.
6. Si `docs/DECISIONS.md` existe, ajoute-y les décisions de la mission (une ligne datée par
   décision, avec le numéro de mission) et commite.
7. Pousse `main` (je validerai la permission). Supprime ensuite la branche locale (et le worktree
   s'il y en a un : `git worktree remove ../acm-studio-$ARGUMENTS`).
8. Lance `npm run verifier:production` : la commande attend que la production serve le commit de
   `main` (10 minutes au plus). Rapporte ce qu'elle répond — « production à jour », ou son échec
   tel quel. Ne dis plus « je n'ai pas vérifié le déploiement ».
9. Compte rendu, dix lignes au plus (règle du 23/11) : ce qui vient de partir en ligne, ce qui
   reste, ce que Jean-Guy a à faire — dont UN test court sur la production
   (acm-studio-henna.vercel.app), pas à pas : Jean-Guy ne teste plus sur l'essai (règle du 06/11).
