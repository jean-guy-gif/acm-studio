# Plan de déblocage — 1er octobre 2026

> À lire une fois. Ensuite, on exécute les commandes du §4 dans l'ordre : **une session Claude Code
> par commande**, avec `/clear` entre deux.

---

## 1. Le constat en chiffres

| | |
| --- | --- |
| Missions | 61 en 12 semaines (11 depuis le 21/09) |
| Code | 34 400 lignes + 10 700 lignes de tests |
| Contrôles (branche M61) | `tsc` ✔ · `eslint` ✔ · `vitest` 833/833 ✔ en 3 s |
| Textes de missions | 76 500 mots, soit un roman de 250 pages |
| Code qui sert à aller chercher la donnée (portails, PDF) | 10 800 lignes, soit **31 % du code**, et une quinzaine de missions |
| « GO PILOTE » déclaré | 24/07 (audit M23) et 17/08 (audit terrain) |
| Missions nées d'un retour de conseiller pilote | **aucune** : les origines écrites citent Laurent, un audit ou un jalon interne |

**Ce n'est pas le code qui te ralentit.** Il est propre, testé et cohérent. Ce qui fait tourner en
rond, c'est cette boucle :

> essai interne → défaut ou idée → longue mission → mesures → code → fusion dans l'unique
> environnement → essai → défaut → mission suivante…

Tant qu'aucun conseiller extérieur n'est dans la boucle, rien ne dit « c'est assez bon ». Chaque
essai produit donc la mission suivante.

---

## 2. Ce qui bloque, par ordre d'impact

### A. Il n'y a pas de ligne d'arrivée

Le MVP de CLAUDE.md est fait à 7 sur 8 : dossier, bien vendeur, import, validation, préparation,
Live et réponses du vendeur. Seul manque le « rapport conseiller », que la Conclusion et le Suivi
remplacent dans les faits. Pourtant, les missions 55 à 60 construisent l'administration multi-agences
(identité, typographie, équipe, rôles, seuils « ce qui dort »). Ce travail servira le jour où
plusieurs agences paieront, pas avant.

→ **On gèle les fonctionnalités jusqu'au pilote.** Les idées vont dans `docs/IDEES.md`, pas en mission.

### B. La recherche automatique bute sur une limite de structure

Elle ne lit que la **1re page non filtrée** de chaque portail, puisque les robots.txt interdisent
les adresses de recherche à paramètres. Ça fait environ 80 annonces pour toute une ville. Voici ce
que donne la branche M61 sur les vraies pages de Nice (fixtures) :

| Appartement, Nice (80 annonces lues) | Bon nombre de pièces | Retenus après l'élargissement maximal |
| --- | --- | --- |
| 2P 45 m², 220–260 k€ | **0** | 1 (un 3P de 49 m²), sous le plancher de 3 |
| 3P 65 m², 320–380 k€ | 3, dont 2 à 399 k€ que seuls les +10 % de prix laissent passer | 4 |
| 4P 80 m², 400–480 k€ | **1** (2 avec le correctif M&A ci-dessous) | 7, dont 6 × 3P |

Aucun réglage de tolérance ne compensera une réserve de 80 annonces non filtrées. Le conseiller,
lui, filtre son portail en 20 secondes.

→ **Le chemin principal devient : le conseiller filtre sur le portail, et ACM lit la page qu'il a
sous les yeux** (mission 65). La recherche automatique reste en option.

### C. Deux bugs sur la branche M61 (non fusionnée)

1. **Maisons & Appartements : 16 annonces sur 17 sont écartées comme « doublons ».** La fonction
   `absolute()` (`competitor-search/services/extract-search-results.ts`) supprime la query string,
   alors que l'identifiant M&A s'y trouve (`ficheAnnonce.php?…&IdAnnonce=4533487`). Toutes les
   cartes finissent avec la même adresse, et la nouvelle déduplication par adresse les écrase. Parmi
   les annonces écartées, il y a un 4P de 77 m² à 475 000 €, c'est-à-dire le bien recherché. Sur
   `main`, les cartes passent, mais leur lien d'import pointe vers la même page générique.
2. **Le prix.** Le §2 de M61 et son test n° 4 disent « la fourchette ne s'élargit pas », alors que
   `priceBounds()` (`rank-candidates.ts`) l'élargit de 10 % de chaque côté.

### D. Chaque essai passe par l'environnement de travail

- Il n'existe qu'un environnement : l'URL `acm-studio-henna.vercel.app` et la base Supabase
  `acm-studio-staging`. Essayer une branche revient à la déployer là où l'on travaille.
- L'extension n'accepte que cette URL et `localhost:3000`, donc impossible d'essayer sur une
  préversion Vercel. On fusionne pour essayer, puis on corrige et on refusionne. Mesuré : M50 a pris
  12 commits, M51 6, M54 3 fusions dans `main` en 1 h 30, et la migration de M60 a été rejetée par la
  base puis corrigée.
- Il n'y a pas d'intégration continue (aucun `.github/workflows`) : les contrôles ne tournent que si
  Claude Code pense à les lancer. `prettier --check .` échoue sur 51 fichiers Markdown, donc la
  barrière « prettier » n'est jamais passée sur l'ensemble du dépôt.

→ Missions 62 et 64.

### E. Claude Code lit des consignes fausses à chaque session

`CLAUDE.md` demande de lire `TASKS.md`, le plan de sprints de juillet, aujourd'hui caduc.
`DEVELOPMENT_RULES.md` impose de lire 7 documents, plus `docs/`, avant chaque mission (plus de
4 000 lignes). Ces consignes contredisent le code :

- le MVP comprend un rapport conseiller et un export PowerPoint, jamais construits ;
- la stack annoncée (Zod, React Hook Form, shadcn/ui, OpenAI, Playwright) n'est pas installée ;
- « ne jamais écrire *comparable* », alors que le mot apparaît 2 590 fois dans 61 fichiers et que la
  table s'appelle `comparables` ;
- les routes `/projects/…` de UI_MAP n'existent pas : les vraies sont `/builder/…`, `/live` et `/suivi` ;
- le Live est décrit en 7 étapes, alors que le code et la décision du 28/08 font 4 écrans par concurrent.

Les décisions produit, elles, sont éparpillées dans 61 missions. Certaines se perdent puis
reviennent : M50 disait « le conseiller ne voit pas le desserrage », M61 a dû le corriger ; M54 avait
réglé « le type filtre », et le même défaut est revenu « un cran plus bas » avec M61.

→ Mission 63.

### F. Petits points techniques (une session suffit)

- `zod` est importé par la conclusion du rendez-vous et par la typographie, mais **ne figure pas dans
  package.json**. Il n'arrive que par une dépendance d'`eslint-config-next` : le jour où celle-ci
  change, la conclusion casse au build.
- Les permissions de Claude Code se résument à 2 règles, d'où une validation manuelle pour chaque
  commande `npm` ou `git`.
- next/font précharge par défaut les 7 familles de polices sur chaque page, Live compris, sur tablette.
- Certains fichiers attirent les défauts : `competitor-search-panel.tsx` fait 938 lignes (la règle est
  de 300), `live-comparative-shell.tsx` 593 et `comparable-form-fields.tsx` 524. On ne les découpe que
  quand une mission les touche.
- 17 branches de mission locales, dont 16 déjà fusionnées.

→ Mission 62.

### G. Les conseillers pilotes ne pourront pas recevoir leur invitation

- Les liens d'invitation de M60 sont construits avec `NEXT_PUBLIC_SITE_URL`, et sinon
  `http://localhost:3000` (`team/services/deliver-invitation.ts`). La variable n'apparaît ni dans
  `.env.example` ni dans `.env.local` : si elle manque aussi sur Vercel, l'invitation renvoie le
  conseiller vers localhost.
- Le code le dit lui-même : « un SMTP à brancher en prod ». Sans SMTP personnalisé, le service
  d'e-mail par défaut de Supabase limite fortement les envois et, sur un projet hébergé, ne les
  délivre en principe qu'aux membres de l'équipe Supabase. À vérifier dans le tableau de bord
  (Authentication → Emails). Si c'est confirmé, un conseiller extérieur ne reçoit rien.

→ Commande 1 pour vérifier, mission 64 pour corriger.

---

## 3. La nouvelle façon de travailler

1. **Une session = une commande**, avec `/clear` entre deux. Les missions ne s'écrivent plus dans une
   longue conversation : les décisions vivent dans `docs/DECISIONS.md`.
2. **Des missions courtes** (`missions/_GABARIT.md`, 40 lignes au plus) : objectif, critères
   d'acceptation testables à l'écran, hors périmètre, essai.
3. **`/mission NN`** fait tout le cycle jusqu'à l'URL d'essai. **`/valide NN`** fusionne dans `main`
   une fois l'essai fait. Rien n'arrive dans l'environnement de travail sans ton « valide ».
4. **Gel jusqu'au pilote** : une mission ne naît que d'un problème rencontré en vrai rendez-vous. Les
   retours passent par `/retours`, qui sépare bloquant, gênant et idée.
5. **Le pilote d'abord** : 2 ou 3 conseillers, 5 vrais rendez-vous chacun, avant toute nouvelle
   fonctionnalité.

> Les commandes `/mission`, `/valide` et `/retours` sont dans `.claude/commands/`. **Relance Claude
> Code** une fois pour qu'il les voie.

---

## 4. Les commandes, dans l'ordre

Chaque bloc se colle tel quel dans Claude Code, dans le dossier `acm-studio`. Tape `/clear` avant
chaque commande.

### Commande 1 — État des lieux (5 min, aucune modification)

```text
État des lieux en LECTURE SEULE, rendu en 10 lignes au plus. Ne modifie rien.
1. git : branche courante, branches non fusionnées dans main, écart entre main et origin/main.
2. Base liée : `npx supabase migration list --linked`. Toutes les migrations du dépôt sont-elles
   appliquées ? Dis précisément où en sont celles des missions 59-60 (20260925090000, 20260925093000).
3. Sur la branche courante : `npm run typecheck`, `npm run lint`, `npm test`.
4. Invitations (M60) : `deliver-invitation.ts` construit le lien avec NEXT_PUBLIC_SITE_URL, et
   sinon localhost:3000. Dis-moi si la variable est définie sur Vercel (`npx vercel env ls` si la
   CLI est connectée ; sinon, dis-moi où regarder). Dis-moi aussi si un SMTP personnalisé est
   configuré dans Supabase (sinon, comment le vérifier dans le tableau de bord).
5. Liste ce que je dois vérifier moi-même à l'écran pour être sûr que la fusion M60 (+ correctif)
   fonctionne en ligne (écran Équipe, invitation envoyée à une adresse EXTÉRIEURE à l'équipe
   Supabase). Ne suppose rien que tu n'as pas vérifié.
Si quelque chose est rouge, dis-le et arrête-toi.
```

### Commande 2 — Terminer la mission 61 (les deux bugs du §2-C)

> Décision sur le prix : **A** par défaut, c'est-à-dire conforme à la mission. Remplace A par B si tu
> veux garder les ±10 %.

```text
On termine la mission 61 : branche mission-61-criteres-filtrent, non fusionnée.
Lis missions/00_PLAN_DE_DEBLOCAGE.md §2-B et §2-C, puis corrige ces deux défauts et rien d'autre.

1. Maisons & Appartements : `absolute()` dans
   src/features/competitor-search/services/extract-search-results.ts vide la query string, alors
   que l'identifiant M&A s'y trouve (`ficheAnnonce.php?…&IdAnnonce=4533487`). Mesuré sur la fixture
   de Nice : 17 cartes lues, 16 écartées comme « doublons ».
   - L'adresse d'une carte M&A conserve `IdAnnonce`. Vérifie sur une vraie annonce que l'adresse
     retenue ouvre la bonne fiche et que l'import d'annonce (comparable-import) l'accepte.
   - La déduplication porte sur l'identité publiée : portail + clé de l'annonce quand elle existe,
     adresse sinon.
   - Vérifie qu'aucun autre portail ne porte son identifiant dans la query ; si c'est le cas, même
     traitement.
   - Test : fixture M&A de Nice → 17 cartes, 17 adresses distinctes, 0 doublon.
2. Prix : M61 §2 et le test n° 4 disent que la fourchette du conseiller ne s'élargit pas, mais
   `priceBounds()` dans rank-candidates.ts l'élargit de 10 % de chaque côté.
   Décision : A  (A = fourchette stricte, conforme à la mission ; B = ±10 % fixe, et la mission ainsi
   que le test n° 4 sont corrigés pour le dire). Écris la décision dans le message de commit.
3. Barrières : typecheck, lint, test, build. Dans le rapport, donne le tableau « annonces lues /
   retenues / dont bon nombre de pièces » pour 2P 45 m² 220-260 k€, 3P 65 m² 320-380 k€ et
   4P 80 m² 400-480 k€ sur les fixtures de Nice, avant et après correctif.
4. Ne commite QUE les fichiers de la mission 61 : pas missions/00_PLAN…, ni missions/_GABARIT.md,
   ni missions/MISSION_62 à 66, ni .claude/.
5. Pousse la branche sans la fusionner. Donne-moi le scénario d'essai à l'écran en 5 lignes.
```

Après ton essai : `/valide 61`

### Commande 3 — `/mission 62` : hygiène et outillage

```text
/mission 62
```

Ensuite : CI verte sur GitHub, puis `/valide 62`. Cette mission ne change rien de visible.

### Commande 3 bis — `/mission 65` passe AVANT la 63 (décidé le 01/10)

Essai du 01/10 : la recherche automatique ne propose aucun vrai 4P, alors que la même recherche
filtrée à la main sur SeLoger en affiche 56. On fait donc « Lire ma recherche » tout de suite après
la 62 (préalable : les 4 pages filtrées, voir en tête de la mission 65).

```text
/mission 65
```

La mission 67 (pièces dans l'adresse et pages suivantes) ne se lance **que si** les pilotes
réclament la recherche automatique.

### Commande 3 ter — `/mission 69` : « Ouvrir mes recherches » (ajoutée le 05/10)

ACM ouvre les portails déjà filtrés avec les caractéristiques du bien, puis lit tous les onglets
d'un coup. Gratuit, sans API. La mission commence par une mesure.

```text
/mission 69
```

### Commande 4 — `/mission 63` : une seule source de vérité

```text
/mission 63
```

Claude Code te posera deux questions au départ : le rapport conseiller sort-il du MVP, et garde-t-on
`comparable` dans le code existant ? Réponse recommandée : oui aux deux. Ensuite `/valide 63`.

### Commande 5 — `/mission 64` : un environnement d'essai, et des invitations qui arrivent

À faire d'abord toi-même : **15 minutes dans Vercel et Supabase** (domaine d'essai, variable
`NEXT_PUBLIC_SITE_URL`, adresses de redirection, SMTP), décrites en tête de la mission 64. Puis :

```text
/mission 64
```

À partir d'ici, tous les essais se font sur l'URL d'essai, jamais dans l'environnement de travail.

### Commande 6 — (déplacée en 3 bis : la mission 65 se fait juste après la 62)

### Commande 7 — `/mission 66` : le parcours qui ne casse plus

```text
/mission 66
```

### Ensuite : le pilote

- 2 ou 3 conseillers d'agences que tu accompagnes déjà, avec 5 vrais rendez-vous vendeur chacun en
  deux semaines.
- Après chaque rendez-vous, trois questions : le rendez-vous est-il allé au bout avec l'outil ?
  Qu'est-ce qui a bloqué ou gêné ? Mandat signé ou à relancer ?
- Tu colles les réponses brutes dans :

```text
/retours <colle ici les retours tels quels>
```

`/retours` classe chaque retour (bloquant, gênant ou idée), range les idées dans `docs/IDEES.md` et
ne rédige une mission **que** pour les bloquants.

---

## 5. Calendrier indicatif

| Quand | Quoi |
| --- | --- |
| J1 | Commandes 1 et 2 (M61 terminée et validée), commande 3 (M62), puis 3 bis (M65) |
| J2 | Commande 4 (M63), puis commande 5 (M64 + réglages Vercel) |
| J3-J4 | Commande 7 (M66) |
| S2-S3 | Pilote. Les missions ne viennent plus que de `/retours` |
