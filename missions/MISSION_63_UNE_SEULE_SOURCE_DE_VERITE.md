# MISSION 63 — Une seule source de vérité

**Date** : 1er octobre 2026 · **Origine** : plan de déblocage §2-E. À chaque session, Claude Code lit
des consignes fausses (TASKS.md de juillet, une stack non installée, un MVP avec export PowerPoint,
l'interdiction d'un mot présent 2 590 fois), et les décisions produit sont éparpillées dans 61
missions.
**Règle** : documentation seulement. Aucun fichier de code ne bouge.

## À trancher AVANT de commencer : pose ces deux questions et attends les réponses

1. Le « rapport conseiller » et l'export PowerPoint sortent-ils du MVP, la Conclusion et le Suivi en
   tenant lieu ? (Recommandé : oui.)
2. Le vocabulaire `comparable` reste-t-il dans le code existant, avec `competitor` pour le nouveau
   code et toujours « Concurrent » à l'écran ? (Recommandé : oui. Renommer 61 fichiers n'apporte rien
   au pilote.)

## À faire

1. **`docs/ETAT_DU_PRODUIT.md`** (100 lignes au plus), écrit **à partir du code** et pas des anciens
   docs : routes réelles (`src/app`) avec une ligne par écran, features (`src/features`) avec une
   ligne chacune, tables (`supabase/migrations`), séquence réelle du Live (`build-live-pages.ts`),
   cycle `projects.status`.
2. **`docs/DECISIONS.md`** (150 lignes au plus) : relis les missions 37 à 65, **ainsi que les
   messages de commit et de fusion des missions 61 à 68** (`git log`), et extrais chaque décision
   produit sur une seule ligne datée, avec son numéro de mission. Plusieurs décisions récentes n'ont
   été prises qu'en route et ne figurent que dans les commits : M61 fourchette de prix stricte ;
   M65 lecture de l'onglet du conseiller dans le navigateur, commune M&A lue sur la carte ;
   M68 studio/T1/F1 = 1 pièce, surface jamais moins de ±3 m². Exemple :
   « 28/08 · M40 · gris = équivalent ; un critère sans donnée ne s'affiche pas ». Regroupe par thème :
   Préparation · Concurrents & recherche · Live · Conclusion & Suivi · Agence & équipe · Données &
   provenance · Méthode. Quand une décision en remplace une autre, ne garde que la plus récente et note
   « remplace Mxx ». N'invente rien : une décision qui n'est écrite nulle part n'y entre pas.
3. **`CLAUDE.md` réécrit en français, 150 lignes au plus.**
   - **Garde intacts** : la raison d'être (« Le conseiller décide. Le logiciel prépare. Le vendeur
     comprend. »), les règles produit absolues, les règles base de données (dont « Migrations » et
     « projects.status »), « Données manquantes et provenance », « Chantiers en suspens ».
   - **Corrige** :
     - la stack réelle d'après `package.json` (zod pour les nouveaux schémas) ;
     - le vocabulaire, selon la réponse 2 ;
     - le Live tel qu'il est (liste exacte des écrans) ;
     - les espaces Préparation → Live → Suivi, plus Administration ;
     - l'état du MVP, selon la réponse 1.
   - **Ajoute** :
     - le gel : « Aucune nouvelle fonctionnalité avant le pilote. Une mission naît d'un problème
       rencontré en vrai rendez-vous. Les idées vont dans docs/IDEES.md. » ;
     - le flux de travail : `/mission NN` → essai → `/valide NN`, jamais de fusion dans main sans
       « valide » ;
     - la ligne `@docs/DECISIONS.md`, pour que les décisions se chargent à chaque session.
4. **Archive** dans `docs/archive/` avec `git mv` (rien n'est supprimé) : TASKS.md, UI_MAP.md,
   PROMPT_CLAUDE_CODE_INIT.md, ARCHITECTURE.md, DATABASE.md, DEVELOPMENT_RULES.md (ses règles encore
   vraies passent dans CLAUDE.md), `audits/`, ainsi que tout document de `docs/` qu'aucune mission
   depuis la 37 ne cite. Vérifie par grep : `Storyboard.md` et `ACM_Protocol.md` restent s'ils sont
   cités.
5. **README.md** : 15 lignes vraies (installer, lancer, tester, déployer, où sont les missions).
6. **`docs/IDEES.md`** : un en-tête d'une ligne, puis rien.

## Hors périmètre

Aucun fichier de code. Aucune règle produit nouvelle.

## Essai

Ouvre une nouvelle session (`/clear`) et demande : « Quelles sont les règles de la recherche de
concurrents, et que fait le Live écran par écran ? » La réponse doit être juste et venir de CLAUDE.md
et DECISIONS.md, sans ouvrir dix fichiers.
