---
description: Exécute une mission ACM Studio de bout en bout jusqu'à l'URL d'essai, avec l'équipe (jamais de fusion dans main)
argument-hint: [numéro de mission, ex. 120B] [--parallele]
---

Mission à exécuter : **$ARGUMENTS** (le premier mot est le numéro ; `--parallele` lance la mission dans
son propre worktree, en parallèle d'une autre, voir le point 11).

L'équipe et son ordre (mission 126) : architecte → designer (si un écran ou un document change) →
questions à Jean-Guy → code → gardien-sql si migration → accord et application par Jean-Guy →
relecteur → push et `essai` → testeur → parcoureur → designer sur les rendus → rapport. Tu es le chef :
tu codes, tu lances les barrières, tu pousses, tu rapportes ; tu ne te relis pas seul et tu ne valides
pas. Tu corriges les bloquants et relances l'agent concerné sur le delta ; tu ne discutes jamais un
constat dans le rapport : Jean-Guy tranche.

**L'atelier** (`npm run atelier`, la page de Jean-Guy) suit l'équipe par les hooks ; à chaque étape
ci-dessous, note-la toi-même d'une ligne, par exemple :
`node atelier/note.mjs --etape code "Aucune question : je code"` ; quand quelque chose attend
Jean-Guy : `node atelier/note.mjs --etat "attend Jean-Guy" --etape accord "Migration soumise"`.
Les étapes : `architecte`, `designer`, `questions`, `code`, `gardien-sql`, `accord`, `relecteur`,
`push`, `testeur`, `parcoureur`, `rendus`, `rapport`.

1. Lis le fichier `missions/MISSION_<numéro>_*.md` (un seul doit correspondre ; sinon, arrête-toi et
   dis-le), puis `docs/DECISIONS.md` et `docs/APPRENTISSAGES.md`. Ne lis aucun autre document de
   cadrage, sauf si la mission le cite.
2. Pars de `main` à jour (`git switch main`, `git pull`) et crée la branche `mission-<numéro>-<mot-clé>`
   — AVANT de lancer un agent, pour que l'atelier rattache chaque ligne à la mission. Les fichiers non
   suivis (plans, missions, `.claude/`) ne se commitent que si la mission le demande.
3. **Architecte** : lance le sous-agent **architecte** sur le numéro de mission. Il rend le plan, les
   réutilisations, les questions numérotées et le risque principal. Si un écran ou un document change,
   lance ensuite le sous-agent **designer** avec ce plan : il rend les maquettes (`missions/maquettes/`),
   les états, les textes exacts et ses questions.
4. **Questions** : s'il y a des questions (architecte, designer), ou si une décision produit manque, ou
   si la mission contredit le code ou `docs/DECISIONS.md` : **arrête-toi et pose-les à Jean-Guy**,
   numérotées, avec les propositions des agents. Si la mission demande des mesures avant de coder :
   fais-les, rends-les sous forme de tableau et arrête-toi. Sinon, dis en 10 lignes au plus les fichiers
   que tu vas toucher et les tests que tu vas écrire, et continue sans attendre.
5. **Code** : implémente le périmètre et rien d'autre, en suivant la maquette et les textes du designer.
   Pas de « tant qu'on y est ».
6. **Migration** : si la mission en crée une, la base est partagée avec l'environnement de travail,
   donc elle doit rester compatible avec le code de `main`. Fais le comptage sur la vraie base (règle
   « Migrations » de CLAUDE.md), lance le sous-agent **gardien-sql** sur le fichier et son test SQL,
   joins son rapport et sa prédiction de comptage, donne la commande d'application et **attends l'accord
   de Jean-Guy** : c'est lui qui l'applique, dans un terminal (`docs/APPRENTISSAGES.md`). Ne fusionne
   pas dans `essai` avant : le code de la branche attend la migration.
7. Barrières, toutes vertes : `npm run typecheck`, `npm run lint`, `npm test`,
   `npm run format:check`, `npm run build`.
8. **Relecteur** : lance le sous-agent **relecteur** sur la branche. Corrige ses **bloquants** et relance
   les barrières, puis le relecteur sur le delta ; les « à corriger avant le /valide » et les remarques
   vont dans ton rapport final, tels quels.
9. Commit `Mission <numéro> — <titre>`, puis `git push -u origin <branche>`. Si la branche `essai`
   existe (mission 64), fusionne aussi ta branche dans `essai` et pousse `essai` (`git fetch` puis
   `git merge --ff-only origin/essai` d'abord : `git pull` échoue sur un auto-stash) : c'est là que
   Jean-Guy essaie. Une fois l'essai déployé (`/api/version` répond ton commit) :
   - **Testeur** : il joue les barrières et la suite e2e, distingue aléa et défaut, produit le PDF et
     les captures hors du dépôt (`~/acm-studio-rendus/<numéro>/`). Un défaut se corrige avant le
     rapport (puis relecteur et testeur sur le delta) ; un aléa se nomme dans le rapport.
   - **Parcoureur** : après le testeur, il joue le scénario d'essai comme un conseiller puis comme un
     client, sans lire le code.
   - **Designer sur les rendus** : il compare les captures à ses maquettes et juge ce qu'un test ne
     voit pas.
10. Rapport final, 15 lignes au plus, suivi des rapports de tous les agents tels quels (architecte,
    designer, gardien-sql, relecteur, testeur, parcoureur, designer sur les rendus) :
    - ce qui a changé (comportement, fichiers principaux) ;
    - le scénario d'essai à l'écran, pas à pas, avec l'URL ;
    - les risques restants ;
    - les décisions prises en route (elles iront dans `docs/DECISIONS.md` au moment de `/valide`).
11. **`--parallele`** (mission 98, mission 126) : `git worktree add ../acm-studio-<numéro> -b
mission-<numéro>-<mot-clé> main`, puis dans ce dossier `npm ci` et la copie de `.env.local` et
    `.env.e2e.local` (ignorés par git, absents du worktree) ; l'équipe tourne là. Refuse si la branche
    en cours et celle-ci touchent les mêmes dossiers de `src/features` (`git diff --name-only
main...`). L'essai reste à une mission à la fois, et l'e2e ne tourne que sur l'essai (la démo et
    l'agence de test sont partagées) : la seconde mission s'arrête aux barrières, relecteur compris,
    et attend l'essai libre pour le testeur ; sauf migration, une seule à la fois, appliquée après le
    `/valide` de l'autre.

Ne fusionne **jamais** dans `main` : c'est `/valide <numéro>` qui le fait, après l'essai de Jean-Guy.
