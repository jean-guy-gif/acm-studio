# CLAUDE.md — ACM Studio

## Raison d'être

ACM Studio est un SaaS pour conseillers immobiliers : préparer puis conduire un rendez-vous vendeur
interactif, pour que le vendeur comprenne son marché et signe un mandat exclusif. Ce n'est pas un
outil d'estimation automatique : ne jamais construire de fonction qui estime le prix du bien vendeur.

Le conseiller décide.
Le logiciel prépare.
Le vendeur comprend.

**Le gel.** Aucune nouvelle fonctionnalité avant le pilote. Une mission naît d'un problème
rencontré en vrai rendez-vous. Les idées vont dans `docs/IDEES.md`.

## Règles produit absolues

- Ne jamais demander le prix du bien vendeur à la création du dossier.
- Ne jamais produire d'estimation automatique.
- Ne jamais montrer le prix d'un concurrent avant d'avoir demandé au vendeur de le deviner.
- Ne jamais montrer plusieurs concurrents sur le même écran du Live.
- Ne jamais garder la logique métier dans les seuls composants React.
- Ne jamais créer de fausses données, fausses photos, faux concurrents ou fausses sources.
- Toujours garder la validation du conseiller avant un résultat final.
- Toujours distinguer ce que voit le vendeur de ce qui est réservé au conseiller.
- L'IA assiste, ne décide jamais : elle n'estime pas le bien, n'invente rien, ne contourne pas le
  conseiller ; ses sorties sont tracées.

## Les espaces et le MVP

- **Préparation** (`/builder`, `draft`) : bien vendeur, concurrents, analyse, positionnement.
- **Live** (`/live`) : le rendez-vous face au vendeur ; seuls les dossiers prêts (`ready_for_meeting`).
- **Suivi** (`/suivi`) : les dossiers conclus (`meeting_completed`), leur issue, la recherche acheteur.
- **Administration** (`/admin`) : identité de l'agence et équipe — jamais la méthode.
- **MVP** : ces trois espaces, de la création du dossier au Suivi. Le rapport conseiller et l'export
  PowerPoint sortent du MVP : la Conclusion et le Suivi en tiennent lieu. Tout le reste est V2.

## Le Live tel qu'il est

Un moteur interactif, pas un diaporama ; chaque réponse du vendeur est enregistrée. Les écrans, dans
l'ordre de `build-live-pages.ts` (détail : `docs/ETAT_DU_PRODUIT.md`) :

- Introduction → Votre bien (« Reconnaissez-vous votre bien ? »), absent sans bien vendeur.
- Chaque concurrent retenu, seul à l'écran : **Un sérieux concurrent ?** (sans prix ; « non » saute
  la suite) → **À quel prix ?** (le vendeur devine) → **Ce prix vous paraît-il cohérent ?**
  (révélation) → **Pourquoi toujours en vente ?** (durée devinée puis révélée, baisses, motif).
- Le concurrent le plus dangereux → Votre valeur perçue (le marché après la réponse) → Analyse des
  prix → Conclusion (« Sur quel prix partons-nous ? », champ vide). Puis, hors Live, l'écran
  conseiller de conclusion : l'issue (signé, à relancer, vendu ailleurs, retiré).

## Vocabulaire

- Code : `Agency`, `Advisor`, `Project`, `SubjectProperty`, `Competitor`, `Meeting`,
  `SellerResponse`. `comparable` reste dans le code existant (table `comparables`, features
  `comparable*`) ; le nouveau code dit `competitor`, jamais `dossier`, `diaporama`, `estimation`.
- Écran : Dossier vendeur · Votre bien / Bien vendeur · toujours « Concurrent » · Rendez-vous
  vendeur · Marché calculé, Analyse du conseiller, Prix conseillé, Prix de commercialisation.

## Stack (d'après `package.json`)

Next.js 16 (App Router, server actions) · React 19 · TypeScript 5 · Tailwind CSS 4 · Supabase
(Auth, Postgres + RLS, Storage) par `@supabase/ssr` · zod 4 pour les nouveaux schémas · pdfjs-dist
(navigateur) · Vitest 4 · ESLint 9 · Prettier 3 · extension Chrome (`extension/`). Non installés :
shadcn/ui, React Hook Form, OpenAI, PptxGenJS, Playwright. À éviter : Redux, contexte global
inutile, machines à états prématurées, microservices.

## Règles de code

- `src/app` (routes), `src/features/<feature>/`, `src/lib`. TypeScript sans `any`, construit du bas
  vers le haut : type → validation → service → action → interface → tests.
- Les composants affichent, la logique métier vit dans les services, les mutations passent par des
  server actions ; tout ce qui vient de l'utilisateur ou du navigateur est revalidé côté serveur.
- `database.types.ts` se génère (`npm run gen:types`). Jamais exposés : la clé service Supabase, la
  clé Stream Estate, les données d'une autre agence.
- Dépendance nouvelle : besoin réel et non couvert, `npm install` se demande. Un refactoring ne
  change aucun comportement. Démonstration identifiée comme telle. Desktop d'abord, tablette ok.

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
- Le runtime n'écrit que `draft` (en préparation), `ready_for_meeting` (prêt) et
  `meeting_completed` (conclu). La readiness (bien vendeur, au moins 3 concurrents
  exploitables et fourchette) DÉCLENCHE l'écriture de `ready_for_meeting`, sans la remplacer.
- Une donnée retirée ensuite ne dé-prête RIEN : on n'écrit jamais `draft`
  automatiquement.
- Un backfill ne falsifie JAMAIS un état terminal (`meeting_completed`, `archived`) :
  il ne les repousse pas vers `draft`/`ready_for_meeting`.
- `archived` = soft delete : invisible par conception.
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

- `/mission NN` : branche `mission-NN-…`, périmètre de la mission et rien d'autre, barrières vertes,
  push. Puis Laurent essaie. Puis `/valide NN` fusionne dans `main` et complète
  `docs/DECISIONS.md`. **Jamais de fusion dans `main` sans « valide ».**
- On essaie sur l'URL d'essai (branche `essai`). La base Supabase est partagée avec l'environnement
  de travail : une migration doit rester compatible avec le code de `main`, et elle s'applique,
  après comptage, avant l'essai.
- Barrières : `npm run typecheck`, `npm run lint`, `npm test`, `npm run format:check`,
  `npm run build` (la CI les rejoue à chaque push). Une mission n'est finie que vue à l'écran.
- Repères : `docs/ETAT_DU_PRODUIT.md` (ce que fait le code), `docs/01_Method/Storyboard.md` et
  `ACM_Protocol.md` (la méthode), `missions/` (l'historique). `docs/archive/` n'est plus à jour.
- Les décisions produit, qui font autorité comme ce fichier :

@docs/DECISIONS.md
