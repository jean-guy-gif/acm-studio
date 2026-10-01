---
description: Exécute une mission ACM Studio de bout en bout jusqu'à l'URL d'essai (jamais de fusion dans main)
argument-hint: [numéro de mission, ex. 62]
---

Mission à exécuter : **$ARGUMENTS**

1. Lis le fichier `missions/MISSION_$ARGUMENTS_*.md` (un seul doit correspondre ; sinon, arrête-toi et
   dis-le), puis `docs/DECISIONS.md` s'il existe. Ne lis aucun autre document de cadrage, sauf si la
   mission le cite.
2. Pars de `main` à jour (`git switch main`, `git pull`) et crée la branche
   `mission-$ARGUMENTS-<mot-clé>`. Les fichiers non suivis (plans, missions, `.claude/`) ne se
   commitent que si la mission le demande.
3. Avant de coder, donne en 10 lignes au plus : les fichiers que tu vas toucher, les tests que tu vas
   écrire, et tout point où la mission contredit le code ou `docs/DECISIONS.md`.
   - Si une décision produit manque ou qu'il y a une contradiction : **arrête-toi et pose la
     question**.
   - Si la mission demande des mesures avant de coder : fais-les, rends-les sous forme de tableau et
     arrête-toi.
   - Sinon, continue sans attendre.
4. Implémente le périmètre et rien d'autre. Pas de « tant qu'on y est ».
5. Si la mission crée une migration : la base est partagée avec l'environnement de travail, donc la
   migration doit rester compatible avec le code de `main`. Fais le comptage sur la vraie base (règle
   « Migrations » de CLAUDE.md), donne-moi la commande d'application et **attends mon accord avant de
   l'appliquer**.
6. Barrières, toutes vertes : `npm run typecheck`, `npm run lint`, `npm test`,
   `npm run format:check`, `npm run build`.
7. Commit `Mission $ARGUMENTS — <titre>`, puis `git push -u origin <branche>`. Si la branche `essai`
   existe (mission 64), fusionne aussi ta branche dans `essai` et pousse `essai` : c'est là que
   j'essaie.
8. Rapport final, 15 lignes au plus :
   - ce qui a changé (comportement, fichiers principaux) ;
   - le scénario d'essai à l'écran, pas à pas, avec l'URL ;
   - les risques restants ;
   - les décisions prises en route (elles iront dans `docs/DECISIONS.md` au moment de `/valide`).

Ne fusionne **jamais** dans `main` : c'est `/valide $ARGUMENTS` qui le fait, après mon essai.
