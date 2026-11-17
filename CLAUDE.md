# CLAUDE.md — ACM Studio

## Raison d'être

ACM Studio est un SaaS pour conseillers immobiliers : préparer puis conduire un rendez-vous vendeur
interactif, pour que le vendeur comprenne son marché et signe un mandat exclusif. Ce n'est pas un
outil d'estimation automatique : ACM ne calcule jamais lui-même une valeur du bien vendeur.

Le conseiller décide.
Le logiciel prépare.
Le vendeur comprend.

**Le gel est levé** (Jean-Guy, 24/10) : le parcours vendeur est complet et la démo le prouve de bout
en bout (M114). Une mission naît d'un problème rencontré en vrai rendez-vous ou d'une décision de
Jean-Guy ; les idées non retenues vont dans `docs/IDEES.md`. Le mode acquéreur (missions 117 à 120)
est le chantier en cours ; la lecture de notes manuscrites par IA (121) attend la fin des quatre.

## Règles produit absolues

- Ne jamais demander le prix du bien vendeur à la création du dossier.
- ACM ne calcule jamais de valeur du bien vendeur. Une valeur venue d'un service extérieur, la
  « Valeur indicative d'Academia », s'affiche au conseiller seul, comme une aide : sa fourchette, sa
  fiabilité et sa mention, nommées par leur source. Elle ne s'enregistre jamais : seule s'enregistre
  la fourchette du conseiller, qu'il peut faire partir de cette valeur puis modifier librement. Elle
  n'atteint jamais le vendeur : ni le Live, ni la présentation, ni un document, ni un lien client, ni
  la vue « bien-client » (Jean-Guy, 17/11).
- Ne jamais montrer le prix d'un concurrent avant d'avoir demandé au vendeur de le deviner, sauf en
  présentation directe ou dans l'Étude de marché, choisies par le conseiller (Jean-Guy, 05/11, M131).
- Ne jamais montrer plusieurs concurrents sur le même écran du Live.
- Ne jamais garder la logique métier dans les seuls composants React.
- Ne jamais créer de fausses données, fausses photos, faux concurrents ou fausses sources.
- Toujours garder la validation du conseiller avant un résultat final.
- Toujours distinguer ce que voit le vendeur de ce qui est réservé au conseiller.
- L'IA assiste, ne décide jamais : elle n'estime pas le bien, n'invente rien, ne contourne pas le
  conseiller ; ses sorties sont tracées.

## Les espaces et le MVP

- **Aujourd'hui** (`/aujourdhui`) : la page d'arrivée, ce qu'il y a à faire : ses tâches, et toute l'agence pour un manager.
- **Préparation** (`/builder`, `draft`) : bien vendeur, concurrents, analyse, positionnement.
- **Live** (`/live`) : le rendez-vous face au vendeur ; seuls les dossiers prêts (`ready_for_meeting`).
- **Suivi** (`/suivi`) : les dossiers conclus (`meeting_completed`), leur issue, la recherche acheteur.
- **Administration** (`/admin`) : identité de l'agence et équipe — jamais la méthode.
- **Acquéreurs** (`/acquereurs`, missions 117 à 120) : la fiche acquéreur, les biens idéaux, le dossier
  remis à l'acquéreur, et les actions qui en dérivent (visite, courrier propriétaire, confrère).
- **MVP** (livré) : Préparation, Live, Suivi, Prospection, Administration. Le rapport conseiller et
  l'export PowerPoint n'en font pas partie : la Conclusion et la synthèse en tiennent lieu. Le mode
  acquéreur est la V2, décidée le 24/10 par Jean-Guy.

## Le Live tel qu'il est

Un moteur interactif, pas un diaporama ; chaque réponse du vendeur est enregistrée. Les écrans, dans
l'ordre de `build-live-pages.ts` (détail : `docs/ETAT_DU_PRODUIT.md`) :

- Introduction → Votre bien (« Reconnaissez-vous votre bien ? »), absent sans bien vendeur →
  Votre valeur perçue (le vendeur dit son prix, rien n'est révélé).
- Chaque concurrent retenu, seul à l'écran : **Un sérieux concurrent ?** (sans prix ; « non » saute
  la suite) → **À quel prix ?** (le vendeur devine) → **Ce prix vous paraît-il cohérent ?**
  (révélation) → **Pourquoi toujours en vente ?** (durée devinée puis révélée, baisses, motif).
- Le concurrent le plus dangereux → Analyse des prix (rappel du prix du vendeur, marché révélé) →
  Conclusion (« Sur quel prix partons-nous ? », champ vide). Puis, hors Live, l'écran conseiller
  de conclusion : l'issue (signé, à relancer, vendu ailleurs, retiré).

## Vocabulaire

- Code : `Agency`, `Advisor`, `Project`, `SubjectProperty`, `Competitor`, `Meeting`,
  `SellerResponse`. `comparable` reste dans le code existant (table `comparables`, features
  `comparable*`) ; le nouveau code dit `competitor`, jamais `dossier` seul, `diaporama`, `estimation`.
  Exception (Jean-Guy, 25/10) : « Dossier acquéreur » est le nom du document remis à l'acquéreur
  (M119) ; ses identifiants sont donc permis : `buyer-dossier`, `buyer_dossier_links`, `DossierItem`,
  et les préfixes `dossier_` / `DOSSIER_` / `Dossier` qui ne désignent que lui (Jean-Guy, 25/10, M122 B).
- Écran : Dossier vendeur · Votre bien / Bien vendeur · toujours « Concurrent » · Rendez-vous
  vendeur · Marché calculé, Analyse du conseiller, Prix des concurrents, Prix de commercialisation.

## Stack (d'après `package.json`)

Next.js 16 (App Router, server actions) · React 19 · TypeScript 5 · Tailwind CSS 4 · Supabase
(Auth, Postgres + RLS, Storage) par `@supabase/ssr` · zod 4 pour les nouveaux schémas · pdfjs-dist
(navigateur) · Vitest 4 · ESLint 9 · Prettier 3 · extension Chrome (`extension/`). Non installés :
shadcn/ui, React Hook Form, OpenAI, PptxGenJS, Playwright. À éviter : Redux, contexte global
inutile, machines à états prématurées, microservices.

L'extension Chrome est **publiée** sur le Chrome Web Store (non répertoriée, version 1.0.0,
identifiant `podbdogdackjabnpnngndpkdnhfakfgb`, depuis le 13/10/2026 ; fiche et lien :
`docs/extension-store.md`). **On ne modifie pas `extension/`** : toute modification repasse par la
validation de Google, et se décide avec Jean-Guy.

## Règles de code

- `src/app` (routes), `src/features/<feature>/`, `src/lib`. TypeScript sans `any`, construit du bas
  vers le haut : type → validation → service → action → interface → tests.
- Les composants affichent, la logique métier vit dans les services, les mutations passent par des
  server actions ; tout ce qui vient de l'utilisateur ou du navigateur est revalidé côté serveur.
- `database.types.ts` se génère (`npm run gen:types`). Jamais exposés : la clé service Supabase, la
  clé Stream Estate, les données d'une autre agence.
- Dépendance nouvelle : besoin réel et non couvert, `npm install` se demande. Un refactoring ne
  change aucun comportement. L'agence de démonstration (`agencies.is_demo`, M114) se reconnaît au
  serveur seulement : rien ne dit « démo » à l'écran ni à l'impression (Jean-Guy, 23/10). Desktop
  d'abord, tablette ok.
- **La démo est le miroir du vrai produit** (Jean-Guy, 05/11) : mêmes écrans, données simulées
  crédibles (noms, adresses, prix plausibles, téléphones en 06 39 98, plage que l'ARCEP réserve à la
  fiction, e-mails en example.com). Chaque mission met la démo à jour avec le produit ; aucune
  mission pour la démo seule. Le vrai produit passe toujours en premier.

## Base de données

Supabase est la source de vérité. Chaque table a `id`, `created_at`, `updated_at` si utile, la RLS
activée et un cloisonnement par agence là où il a un sens. Jamais de table sans politique RLS,
jamais de donnée exposée d'une agence à l'autre. Suppression douce quand c'est possible.

Le modèle d'e-mail d'invitation du projet en ligne se colle à la main (Authentication → Emails →
Templates → Invite user) depuis `supabase/templates/invite.html` ; l'envoi passe par le SMTP Google
de laurent@start-academy.fr.

### Migrations

Une migration vérifiée sur une base vide n'est pas vérifiée. Le local prouve la syntaxe, pas
l'ordre des opérations : une écriture avant la levée d'une contrainte passe partout où il n'y a
pas de ligne. C'est pourquoi on compte sur la vraie base avant d'appliquer, et pourquoi la
transaction doit toujours pouvoir annuler.

Exemple (1er octobre 2026) : `role = 'manager'` écrit AVANT le retrait du CHECK
`{owner, admin, advisor}` — vert en local (base sans profil), rejeté sur staging (1 owner réel),
la transaction a annulé et laissé staging intact.

### `projects.status` — cycle de vie

`projects.status` est la seule vérité de l'état d'un dossier.

Le parcours : **Préparation → Live → Suivi** — `draft` → `ready_for_meeting` →
`meeting_completed`.

- **`projects.status` porte la POSITION dans le parcours, jamais l'ISSUE d'une étape.**
  Une issue (mandat signé / à relancer, …) se stocke avec ses faits — pas dans l'enum.
  C'est ce qui empêche l'enum de grossir à chaque nuance : `meeting_completed` = « conclu,
  en Suivi » ; que le mandat soit signé ou à relancer se lit dans `project_meeting_conclusions`.
- Le passage en `meeting_completed` et l'écriture de l'issue sont UNE SEULE transaction
  (fonction `conclude_meeting`) : un `meeting_completed` sans conclusion serait « en Suivi
  sans issue » — l'équivalent du dossier invisible.
- Le runtime n'écrit que `draft` (en préparation), `ready_for_meeting` (prêt),
  `meeting_completed` (conclu) et `archived` (« Supprimer », mission 93). La readiness (bien vendeur, au moins 3 concurrents
  exploitables et fourchette) DÉCLENCHE l'écriture de `ready_for_meeting`, sans la remplacer.
- Une donnée retirée ensuite ne dé-prête RIEN : on n'écrit jamais `draft`
  automatiquement.
- Un backfill ne falsifie JAMAIS un état terminal (`meeting_completed`, `archived`) :
  il ne les repousse pas vers `draft`/`ready_for_meeting`.
- `archived` = soft delete : invisible par conception, dans les listes comme par son adresse.
  L'effacement réel suit `docs/PROCEDURE_EFFACEMENT.md`.
- Aucun dossier NON terminal ne doit devenir invisible. Si un jour `meeting_completed`
  ou `archived` sont réellement produits, c'est l'écran qui les montre quelque part —
  jamais le backfill qui les normalise.

## Données manquantes et provenance

Une donnée absente mais **portée par la provenance** n'écarte pas ; une donnée absente qui **EST
le critère** écarte, et se compte.

Exemple (mission 61) : une carte de portail **sans ville** reste dans le périmètre — c'est l'URL
interrogée qui porte la commune, pas la vignette. Mais une carte **sans surface** est écartée (et
comptée) : sans surface, impossible de savoir si on est dans la tolérance. La confiance faite à la
provenance pour la commune ne tient **que parce que le périmètre (la commune) ne se desserre
jamais** ; si un jour le desserrage touchait la commune, cette règle tomberait.

## Chantiers en suspens

- **Identifiants de lieu par portail** — le secteur reste cadré à la **commune** tant que ce
  chantier n'est pas fait. Filtrer/chercher au **quartier** exige de mapper le quartier du bien
  vers l'identifiant de lieu propre à chaque portail (slugs/IDs de zone), un par un. En suspens
  depuis la mission 50 ; la mission 61 filtre donc le secteur à la commune (`candidate.city`).

## Flux de travail

- **Jean-Guy Ourmières crée et décide le produit** : il écrit les missions, valide et tranche.
  Une décision datée et signée Jean-Guy, ici, dans `docs/DECISIONS.md` ou dans une mission, fait
  autorité sur toute décision antérieure, y compris celles qui citent Laurent.
- `/mission NN` : branche `mission-NN-…`, périmètre de la mission et rien d'autre, barrières vertes,
  push, e2e sur l'essai. Puis `/valide NN` fusionne dans `main` et complète `docs/DECISIONS.md`.
  **Jamais de fusion dans `main` sans « valide ».**
- **Maquette d'abord** (Jean-Guy, 07/11) : toute mission qui change la disposition ou le parcours
  d'un écran commence par une maquette des écrans touchés, sur tablette, téléphone et ordinateur,
  avec des notes avant / après, rangée dans `missions/maquettes/`. Aucun code avant l'accord sur la
  maquette. Une mission qui corrige sans rien changer à la disposition en est dispensée.
- **Jean-Guy ne teste plus jamais sur l'essai** (Jean-Guy, 06/11) : aucun rapport ne lui donne de
  scénario sur l'essai ; après le `/valide`, un seul test court, sur la production
  (acm-studio-henna.vercel.app). L'essai reste l'étape interne : l'e2e et le parcours du relecteur.
- L'URL d'essai (branche `essai`) est l'étape interne. La base Supabase est partagée avec l'environnement
  de travail : une migration doit rester compatible avec le code de `main`, et elle s'applique,
  après comptage, avant l'essai.
- Barrières : `npm run typecheck`, `npm run lint`, `npm test`, `npm run format:check`,
  `npm run build` (la CI les rejoue à chaque push). Une mission n'est finie que vue à l'écran.
- **Équipe allégée** (Jean-Guy, 05/11) : l'architecte seulement avec une migration ou une nouvelle
  table ; le gardien-sql seulement avec une migration ; le relecteur une passe, puis les seuls
  bloquants ; l'e2e joué par le chef, au premier plan ; le designer et le parcoureur ne sont plus
  lancés (`.claude/commands/mission.md`).
- Repères : `docs/ETAT_DU_PRODUIT.md` (ce que fait le code), `docs/01_Method/Storyboard.md` et
  `ACM_Protocol.md` (la méthode), `missions/` (l'historique). `docs/archive/` n'est plus à jour.
- Les décisions produit, qui font autorité comme ce fichier :

@docs/DECISIONS.md
