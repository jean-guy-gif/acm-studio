---
description: Exécute une mission ACM Studio selon son niveau (Petit, Moyen, Sensible) ; seule une mission Petit va d'elle-même jusqu'à la production
argument-hint: [numéro de mission, ex. 120B] [--parallele]
---

Mission à exécuter : **$ARGUMENTS** (le premier mot est le numéro ; `--parallele` lance la mission dans
son propre worktree, en parallèle d'une autre, voir le point 11).

**D'abord, le niveau** (règle de Jean-Guy, 23/11, CLAUDE.md). Annonce-le en une ligne au début de la
mission, avec sa raison ; Jean-Guy le corrige s'il le faut.

- **Petit** (texte, affichage, impression ; ni base, ni Live) : la branche (point 2) → **le test
  avant le code** → le code (point 5) → les barrières (point 7) → push et `essai`, puis **les seules
  specs e2e concernées**, au premier plan (point 9) → **production directe**, sans attendre
  « valide » : tu joues toi-même les étapes 2 à 8 de `/valide` (CI, apprentissages, fusion dans
  `main`, décisions, `npm run verifier:production`), puis tu dis à Jean-Guy ce qui est parti. Ni
  architecte, ni relecteur, ni suite e2e complète, ni maquette, sauf écran nouveau. Les points 3, 4, 6
  et 8 ne s'appliquent pas.
- **Moyen** (écran ou fonction nouvelle, sans base ni Live) : **une maquette, une seule fois**, faite
  par toi, rangée dans `missions/maquettes/`, et l'accord de Jean-Guy avant de coder → le code → les
  barrières → **le relecteur une fois** (point 8, sans seconde passe) → push, `essai` et **la suite
  e2e complète une fois** (point 9) → compte rendu ; la production après le feu vert de Jean-Guy
  (`/valide`). Ni architecte, ni gardien-sql.
- **Sensible** (base et migrations, Live, ce que voit le vendeur, confidentialité, coûts) : le
  processus complet ci-dessous, sans rien sauter ; la production après `/valide`.

Quel que soit le niveau (règles du 23/11) :

- **une mission, un objectif** : ce que tu découvres en route va dans `missions/PLUS_TARD.md`, une
  ligne datée, pas dans la mission en cours, sauf si cela la bloque ;
- **pas de chasse aux cas rares** : tu corriges ce qui se voit sur de vrais dossiers ; un cas imaginé
  par un balayage est noté dans `missions/PLUS_TARD.md`, pas corrigé ;
- **tu tranches seul les détails** et tu le dis après ; tu ne poses une question à Jean-Guy que pour
  sa méthode, ce que voit le vendeur, ou un coût ;
- **ton compte rendu tient en dix lignes** : ce qui est parti, ce qui reste, ce que Jean-Guy a à faire.

Le processus complet (niveau Sensible), avec l'équipe allégée (règle de Jean-Guy, 05/11 ; remplace
l'équipe complète de la mission 126) :
architecte (seulement avec migration ou nouvelle table) → questions à Jean-Guy → code → gardien-sql
(seulement avec migration) → accord et application par Jean-Guy → relecteur (une passe, puis le delta
des seuls bloquants) → push et `essai` → e2e joué par le chef, au premier plan → rapport. Le designer,
le parcoureur et le testeur ne sont plus lancés. Tu es le chef :
tu codes, tu lances les barrières, tu pousses, tu rapportes ; tu ne te relis pas seul et tu ne valides
pas. Tu corriges les bloquants et relances l'agent concerné sur le delta ; tu ne discutes jamais un
constat dans le rapport : Jean-Guy tranche.

**L'atelier** (`npm run atelier`, la page de Jean-Guy) suit l'équipe par les hooks ; à chaque étape
ci-dessous, note-la toi-même d'une ligne, par exemple :
`node atelier/note.mjs --etape code "Aucune question : je code"` ; quand quelque chose attend
Jean-Guy : `node atelier/note.mjs --etat "attend Jean-Guy" --etape accord "Migration soumise"`.
Un agent que tu lances ne reçoit jamais le port de l'atelier (4871) ni l'ordre de tuer un processus
par son nom : un serveur d'essai prend `--port 0`.
Les étapes : `architecte`, `questions`, `code`, `gardien-sql`, `accord`, `relecteur`, `push`,
`testeur` (l'e2e du chef), `rapport`.

1. Lis le fichier `missions/MISSION_<numéro>_*.md` (un seul doit correspondre ; sinon, arrête-toi et
   dis-le), puis `docs/DECISIONS.md` et `docs/APPRENTISSAGES.md`. Ne lis aucun autre document de
   cadrage, sauf si la mission le cite.
2. Pars de `main` à jour (`git switch main`, `git pull`) et crée la branche `mission-<numéro>-<mot-clé>`
   — AVANT de lancer un agent, pour que l'atelier rattache chaque ligne à la mission. Les fichiers non
   suivis (plans, missions, `.claude/`) ne se commitent que si la mission le demande.
3. **Architecte**, seulement si la mission crée une migration ou une nouvelle table : lance le
   sous-agent **architecte** sur le numéro de mission ; il rend le plan, les réutilisations, les
   questions numérotées et le risque principal. Sinon, tu lis le code toi-même. Les maquettes validées
   par Jean-Guy (`missions/maquettes/`) font foi ; le designer n'est plus lancé.
4. **Questions** : seulement pour la méthode de Jean-Guy, ce que voit le vendeur, ou un coût
   (règle du 23/11) — une décision produit de cet ordre qui manque, ou une mission qui contredit
   `docs/DECISIONS.md` sur ces points : **arrête-toi et pose-les à Jean-Guy**, numérotées, avec les
   propositions des agents. Le reste, tu le tranches et tu le dis après. Si la mission demande des
   mesures avant de coder :
   fais-les, rends-les sous forme de tableau et arrête-toi. Sinon, dis en 10 lignes au plus les fichiers
   que tu vas toucher et les tests que tu vas écrire, et continue sans attendre.
5. **Code** : implémente le périmètre et rien d'autre, en suivant la maquette validée.
   Pas de « tant qu'on y est ».
6. **Migration** : si la mission en crée une, la base est partagée avec l'environnement de travail,
   donc elle doit rester compatible avec le code de `main`. Fais le comptage sur la vraie base (règle
   « Migrations » de CLAUDE.md), lance le sous-agent **gardien-sql** sur le fichier et son test SQL,
   joins son rapport et sa prédiction de comptage, donne la commande d'application et **attends l'accord
   de Jean-Guy** : c'est lui qui l'applique, dans un terminal (`docs/APPRENTISSAGES.md`). Ne fusionne
   pas dans `essai` avant : le code de la branche attend la migration.
7. Barrières, toutes vertes : `npm run typecheck`, `npm run lint`, `npm test`,
   `npm run format:check`, `npm run build`.
8. **Relecteur** (niveaux Moyen et Sensible ; jamais pour une mission Petit) : lance le sous-agent
   **relecteur** sur la branche, UNE passe. Corrige ses
   **bloquants** et ses « à corriger » (règle « Ce que le chef tranche seul »), relance les barrières ;
   le relecteur ne repasse que sur le delta qui corrige un bloquant.
9. Commit `Mission <numéro> — <titre>`, puis `git push -u origin <branche>`. Si la branche `essai`
   existe (mission 64), fusionne aussi ta branche dans `essai` et pousse `essai` (`git fetch` puis
   `git merge --ff-only origin/essai` d'abord : `git pull` échoue sur un auto-stash) : c'est l'étape
   interne (Jean-Guy n'y teste plus jamais, règle du 06/11). Une fois l'essai déployé (`/api/version` répond ton commit) :
   - **E2E, par le chef, au premier plan** (jamais en tâche de fond) : pour une mission Petit, les
     seules specs concernées ; pour une mission Moyen, la suite complète une fois ; pour une mission
     Sensible, la suite e2e complète si la mission change `src/`, `extension/` ou `supabase/` (sinon,
     les tests propres à la mission ; décision de Jean-Guy, 29/10) ; toujours après une remise à zéro
     de la démo par l'écran ; un échec se
     rejoue UNE fois : vert au second passage, c'est un **aléa**, à nommer ; rouge deux fois, un
     **défaut**, corrigé avant le rapport, puis la spec rejouée. Les captures hors du dépôt
     (`~/acm-studio-rendus/<numéro>/`) seulement si Jean-Guy les demande.
10. Compte rendu, **dix lignes au plus** (règle du 23/11) : ce qui est parti (ou ce qui est prêt
    sur l'essai), ce qui reste, ce que Jean-Guy a à faire. Dedans :
    - ce qui a changé, en comportement ;
    - une ligne pour les agents lancés et l'e2e : ce qui a été corrigé, ce qui remonte — jamais
      leurs listes ;
    - aucun scénario sur l'essai : Jean-Guy n'y teste plus (règle du 06/11) ; UN test court sur la
      production, après la mise en production ;
    - les décisions prises en route vont dans `docs/DECISIONS.md` à la fusion, ce qui est remis à
      plus tard dans `missions/PLUS_TARD.md`.
11. **`--parallele`** (mission 98, mission 126) : `git worktree add ../acm-studio-<numéro> -b
mission-<numéro>-<mot-clé> main`, puis dans ce dossier `npm ci` et la copie de `.env.local` et
    `.env.e2e.local` (ignorés par git, absents du worktree) ; l'équipe tourne là. Refuse si la branche
    en cours et celle-ci touchent les mêmes dossiers de `src/features` (`git diff --name-only
main...`). L'essai reste à une mission à la fois, et l'e2e ne tourne que sur l'essai (la démo et
    l'agence de test sont partagées) : la seconde mission s'arrête aux barrières, relecteur compris,
    et attend l'essai libre pour l'e2e ; sauf migration, une seule à la fois, appliquée après le
    `/valide` de l'autre.

**Ce que le chef tranche seul** (décision de Jean-Guy, 29/10) : les « à corriger », « à corriger avant
le /valide » et « ça gêne » du relecteur sont appliqués sans
demander, sauf s'ils contredisent la fiche de mission ou une décision de `docs/DECISIONS.md` ; un
constat sur un cas rare, qu'aucun vrai dossier ne montre, va dans `missions/PLUS_TARD.md` (règle du
23/11). Ne remontent à Jean-Guy que trois choses (règle du 23/11) : **sa méthode** (dont une
migration, qu'il applique lui-même, et toute suppression de données), **ce que voit le vendeur**, un
**coût** (appel payant, budget). Le compte rendu dit ce qui a été corrigé, en une ligne, pas les
listes.

Ne fusionne **jamais** dans `main` une mission Moyen ou Sensible : c'est `/valide <numéro>` qui le
fait, sur l'ordre de Jean-Guy. Une mission Petit part en production dès ses barrières, ses specs et sa
CI vertes, par les étapes de `/valide` que tu joues toi-même.
