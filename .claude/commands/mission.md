---
description: Exécute une mission ACM Studio selon son niveau (Petit, Moyen, Sensible) ; Petit et Moyen vont jusqu'à la production, Sensible attend Jean-Guy
argument-hint: [numéro de mission, ex. 120B] [--parallele]
---

Mission à exécuter : **$ARGUMENTS** (le premier mot est le numéro ; `--parallele` lance la mission dans
son propre worktree, en parallèle d'une autre, voir le point 11).

**D'abord, le niveau** (règles de Jean-Guy, 23/11, CLAUDE.md). Annonce-le en une ligne au début de
la mission, avec sa raison. Une mission tient en **une heure et demie** : si elle ne tient pas,
découpe-la avant de commencer, et dis-le.

- **Petit** (texte, affichage, impression ; ni base, ni Live) : la branche (point 2) → **le test
  avant le code** → le code (point 5) → les barrières (point 7) → **les seules specs e2e concernées**
  et ton essai dans un vrai navigateur (point 9) → **production**, sans attendre Jean-Guy : tu joues
  toi-même les étapes 2 à 8 de `/valide`. Ni architecte, ni relecteur, ni maquette, sauf écran
  nouveau. Les points 3, 6 et 8 ne s'appliquent pas.
- **Moyen** (écran ou fonction nouvelle, sans base ni Live) : **une maquette, une seule fois**, faite
  par toi et rangée dans `missions/maquettes/` — tu avances avec elle, Jean-Guy corrige après → le
  code → les barrières → **le relecteur une fois** (point 8) → les specs concernées et ton essai
  dans un vrai navigateur (point 9) → **production**, par les étapes 2 à 8 de `/valide`. Ni
  architecte, ni gardien-sql.
- **Sensible** (base et migrations, Live, ce que voit le vendeur, confidentialité, coûts) : le
  processus ci-dessous — l'architecte et le gardien-sql avec une migration, que Jean-Guy applique
  lui-même ; le relecteur une fois ; l'essai (branche `essai`) seulement quand Jean-Guy doit essayer
  lui-même, puis son « valide ».

Quel que soit le niveau (règles du 23/11) :

- **Jean-Guy n'est pas un point d'arrêt** : tu poses tes questions en une fois, chacune avec ta
  réponse par défaut, et tu avances avec elle ; il corrige après. Tu tranches seul les détails et
  tu le dis après. Seuls arrêts : une migration à appliquer, une mission Sensible à essayer par lui ;
- **Petit et Moyen ne passent plus par l'essai** : tu testes sur ta branche, en local ou sur sa
  prévisualisation Vercel (le plus simple des deux) ; si quelque chose l'empêche (connexion, adresse
  du site), tu le dis en une ligne, avec ta solution ;
- **la suite e2e complète tourne une fois par nuit**, plus à chaque mission : en journée, les specs
  concernées seulement ; **le relecteur ne passe qu'une fois**, jamais sur une mission Petit ;
- **un défaut en production** : tu reviens tout de suite à la version précédente sur Vercel, puis tu
  préviens Jean-Guy ;
- **une mission, un objectif** : ce que tu découvres en route va dans `missions/PLUS_TARD.md`, une
  ligne datée, pas dans la mission en cours, sauf si cela la bloque ;
- **pas de chasse aux cas rares** : tu corriges ce qui se voit sur de vrais dossiers ; un cas imaginé
  par un balayage est noté dans `missions/PLUS_TARD.md`, pas corrigé ;
- **l'impression de l'Étude est gelée** ; et pas de nouvelle règle après un incident sans l'accord de
  Jean-Guy ;
- **tu mesures** : à la fin de la mission, une ligne dans `missions/DUREES.md` (durée totale, dont
  l'attente de Jean-Guy, dont les tests) ; le soir, le total de la journée ;
- **un seul point par jour, le soir, en dix lignes** : ce qui est parti, ce qui reste, ce que
  Jean-Guy a à faire.

Le processus complet (niveau Sensible), avec l'équipe allégée (règle de Jean-Guy, 05/11 ; remplace
l'équipe complète de la mission 126) :
architecte (seulement avec migration ou nouvelle table) → questions à Jean-Guy → code → gardien-sql
(seulement avec migration) → application par Jean-Guy → relecteur (une seule passe) → push, les
specs concernées et l'essai du chef dans un vrai navigateur → `essai` seulement si Jean-Guy doit
essayer lui-même → compte rendu du soir. Le designer,
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
   (règle du 23/11). Pose-les **en une fois, numérotées, chacune avec ta réponse par défaut**, et
   **avance avec elle** : Jean-Guy corrige après. Le reste, tu le tranches et tu le dis après. Si la
   mission demande des mesures avant de coder, fais-les et continue avec ce qu'elles disent.
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
   **relecteur** sur la branche, UNE seule fois. Corrige ses **bloquants** et ses « à corriger »
   (règle « Ce que le chef tranche seul »), relance les barrières ; il ne repasse pas.
9. Commit `Mission <numéro> — <titre>`, puis `git push -u origin <branche>` : Vercel fabrique la
   prévisualisation de la branche. Son adresse se lit sur le commit
   (`gh api "repos/{owner}/{repo}/deployments?sha=<commit>"`, puis `…/deployments/<id>/statuses`,
   champ `environment_url`) ; elle répond aux tests avec le contournement de `.env.e2e.local`
   (`/api/version` rend ton commit).
   - **Les specs concernées, par le chef, au premier plan** :
     `E2E_BASE_URL=<adresse de la prévisualisation> npx playwright test <specs>` (la base, la démo et
     l'agence de test sont communes : une seule e2e à la fois). Un échec se rejoue UNE fois : vert au
     second passage, c'est un **aléa**, à nommer ; rouge deux fois, un **défaut**, corrigé puis
     rejoué. La suite complète ne se joue plus en journée : elle tourne la nuit.
   - **Ton essai dans un vrai navigateur**, sur la même adresse : le parcours touché par la mission,
     et deux ou trois captures rangées dans `missions/maquettes/` (nom qui commence par le numéro de
     la mission), commitées sur la branche.
   - **Petit et Moyen** : production, par les étapes 2 à 8 de `/valide`, que tu joues toi-même.
   - **Sensible** : si Jean-Guy doit essayer lui-même, fusionne la branche dans `essai` et pousse
     `essai` (`git fetch` puis `git merge --ff-only origin/essai` d'abord), dis-lui quoi essayer, et
     attends son « valide » ; sinon, production sur son ordre.
10. À la fin de la mission : **une ligne dans `missions/DUREES.md`** (date, mission, niveau, durée
    totale, dont attente de Jean-Guy, dont tests), les décisions dans `docs/DECISIONS.md` à la
    fusion, ce qui est remis à plus tard dans `missions/PLUS_TARD.md`. Pas de compte rendu par
    mission : **un seul point par jour, le soir, en dix lignes** (ce qui est parti, ce qui reste, ce
    que Jean-Guy a à faire, le total de la journée). En journée, tu n'écris à Jean-Guy que pour une
    migration à appliquer, une mission Sensible à essayer, un défaut en production, ou tes questions
    avec leurs réponses par défaut.
11. **`--parallele`** (mission 98, mission 126) : `git worktree add ../acm-studio-<numéro> -b
mission-<numéro>-<mot-clé> main`, puis dans ce dossier `npm ci` et la copie de `.env.local` et
    `.env.e2e.local` (ignorés par git, absents du worktree) ; l'équipe tourne là. Refuse si la branche
    en cours et celle-ci touchent les mêmes dossiers de `src/features` (`git diff --name-only
main...`). Une seule e2e à la fois, quelle que soit l'adresse (la base, la démo et l'agence de
    test sont partagées) : la seconde mission attend que la première ait fini ses specs ; une seule
    migration à la fois.

**Ce que le chef tranche seul** (décision de Jean-Guy, 29/10) : les « à corriger », « à corriger avant
le /valide » et « ça gêne » du relecteur sont appliqués sans
demander, sauf s'ils contredisent la fiche de mission ou une décision de `docs/DECISIONS.md` ; un
constat sur un cas rare, qu'aucun vrai dossier ne montre, va dans `missions/PLUS_TARD.md` (règle du
23/11). Ne remontent à Jean-Guy que trois choses (règle du 23/11) : **sa méthode** (dont une
migration, qu'il applique lui-même, et toute suppression de données), **ce que voit le vendeur**, un
**coût** (appel payant, budget). Le compte rendu dit ce qui a été corrigé, en une ligne, pas les
listes.

Une mission **Petit** ou **Moyen** part en production dès ses barrières, ses specs concernées, ton
essai et sa CI vertes, par les étapes de `/valide` que tu joues toi-même. Une mission **Sensible** ne
se fusionne dans `main` que sur l'ordre de Jean-Guy (`/valide <numéro>`, ou son ordre donné d'avance).
