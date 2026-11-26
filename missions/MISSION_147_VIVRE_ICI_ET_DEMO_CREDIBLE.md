# MISSION 147 — Vivre ici et démo crédible

**Date** : 09/11/2026 · **Origine** : audit UX / UI du 07/11 (`missions/AUDIT_UX_UI_2026-11.md`),
mission 147 (I7, I8, C7), recadrée par Jean-Guy le 09/11 ; `docs/IDEES.md`, les notes « Pour la
M147 » (08/11 et 09/11). Inventaire préalable : `missions/M147-inventaire.md`.

**La décision (Jean-Guy, 07/11)** : ACM ne garde pas ses propres versions du dossier d'adresse et de
« Vivre ici » : ce sont ceux d'Academia (app.myacademia.ai). Elle remplace la M141 (le dossier
d'adresse construit par ACM, la ligne des ventes réelles sous « Votre analyse de valeur ») et la
M142 (« Vivre ici » construit par ACM, sur Visites et sur le lien de l'acquéreur).

**Deux parties** (Jean-Guy, 09/11), une branche et un `/valide` chacune :
**A, Academia** (planches 1 à 4 et 6 bis, une migration) ; **B, la démo crédible** (planches 5, 6
et 7, sans migration). C6 (Administration) est hors de la mission.

**Maquette d'abord** : `missions/maquettes/M147-1` à `M147-7` (version 2). Aucun code avant
l'accord de Jean-Guy.

**Équipe** : partie A, avec une migration : l'architecte, le gardien-sql, le relecteur une passe,
l'e2e joué par le chef ; partie B : le relecteur et l'e2e (M130 B).

## Partie A — Academia

### A.1 Deux liens vers Academia, sur l'onglet Bien vendeur seulement

- À la place du bloc du dossier d'adresse, une carte « Le bien dans Academia », pour le conseiller
  seul, avec deux liens en contour, « Dossier d'adresse ↗ » et « Vivre ici ↗ », et l'adresse qui
  sera copiée (planche M147-1). Le seul plein de l'écran reste « Enregistrer » (M146 A).
- Un toucher : l'adresse complète du bien (« 4 chemin des Restanques Hautes, 06140 Vence ») est
  copiée, Academia s'ouvre dans un nouvel onglet, et sous les liens, quelques secondes, « Adresse
  copiée : collez-la dans Academia ». La copie part dans le même geste que l'ouverture (un vrai lien
  `target="_blank"`, la copie à son clic, sans attente), pour que Safari et l'iPad n'y voient pas une
  fenêtre surgie. Copie refusée par le navigateur : « Copiez l'adresse : » suivie de l'adresse,
  sélectionnable ; l'onglet s'ouvre quand même.
- Sans adresse (rue ou commune manquante) : pas de lien, « Ajoutez l'adresse du bien », qui mène au
  champ Adresse. Jamais un lien vide, jamais une adresse à moitié.
- La Vue d'ensemble ne change pas (décision de Jean-Guy, 09/11).

### A.2 « Ventes réelles dans Academia ↗ », sous « Votre analyse de valeur »

Sur « Avant le rendez-vous », à la place de la ligne des ventes réelles d'ACM, un lien discret
« Ventes réelles dans Academia ↗ », avec le même geste (copie, nouvel onglet, « Adresse copiée »).
Le conseiller retrouve la médiane en un clic au moment où il décide de son prix (Jean-Guy, 09/11).
Sans adresse : « Ajoutez l'adresse du bien » (lien vers l'onglet Bien vendeur). Rien sur la décision
elle-même ne change (planche M147-2). Une information, jamais un prix pour le bien.

### A.3 « La vente » de la fiche acquéreur

Les liens « Dossier d'adresse ↗ » et « Vivre ici ↗ » s'ajoutent à la suite de « Bon de visite
signé » et « Offre d'achat signée ». Ils portent sur l'adresse du mandat de l'offre (planche
M147-3). Sans adresse : « Ajoutez l'adresse du bien », qui mène à l'onglet Bien vendeur du mandat.

### A.4 Le lien client « Vivre ici », collé une fois sur le mandat (choix B, Jean-Guy, 09/11)

- **La saisie** : sur la carte de l'onglet Bien vendeur, sous les deux liens : « Lien « Vivre ici »
  à montrer aux acquéreurs (facultatif) », « Enregistrer le lien », « Retirer » (planche M147-6 bis).
  Le champ est là sur tout dossier ; le lien ne sert qu'une fois le mandat signé, puisque seul un
  mandat se propose (M145 A). L'écran le dit sous le champ.
- **Seuls les liens d'Academia** : `https://app.myacademia.ai/l/…`, aucun autre site. Tout autre
  lien est refusé, avec ce message : « Collez le lien « Vivre ici » donné par Academia : il commence
  par https://app.myacademia.ai/l/ ». Le contrôle se fait trois fois :
  - **à l'écran**, avant l'envoi ;
  - **au serveur**, par une server action qui relit le lien, pour un membre non retiré de l'agence
    du dossier ;
  - **en base**, par une contrainte (§A.7).
  Le lien est gardé tel quel. Il n'est jamais ouvert ni lu par ACM.
- **Sur le lien de l'acquéreur** (`/dossier/<jeton>`), sous chaque bien de l'agence qui a un lien
  collé : « Vivre ici — le quartier, les écoles, les commerces ↗ », dans sa langue (M140 B), dans un
  nouvel onglet. Il passe par la liste d'autorisation du lien public (`publicDeck`), seulement pour
  un bien de l'agence. Un test le prouve avec le titre piège de la M107.
  Ni la présentation plein cadre, ni le PDF du dossier ne le montrent (M142 : le lien seulement).
  Un concurrent ou une annonce du marché n'a jamais ce lien.
- **Dans « Confirmer la visite »**, le message dit :
  - avec un lien collé : « Je vous confirme la visite de … le … à …. Votre sélection : [lien].
    Vivre ici, autour du bien : [lien Academia] » ;
  - sans lien collé : « … Votre sélection : [lien] » seulement.

  Les textes du client sont écrits et relus en français et en anglais (M140), jamais par une IA.
- **Sans lien collé** : rien sous le bien, rien de plus dans le message.

### A.5 Ce qui part

- Le dossier d'adresse d'ACM : le bloc de Bien vendeur, sa construction, ses six lecteurs, le jeu
  figé de Vence, la ligne des ventes réelles.
- « Vivre ici » d'ACM : la fiche sur Visites, la fiche sur le lien de l'acquéreur, la construction
  en tâche de fond après une demande de visite (et le `maxDuration = 300` qu'elle demandait sur trois
  pages), les jeux figés de la démo, les textes du client `livingHere`.
- Dans le formulaire acquéreur, deux champs qui ne servaient qu'au « Vivre ici » d'ACM :
  « Ce qui compte pour lui » (les ★ du secteur) et « Un lieu qui compte pour vous ».
- Ce qui reste : « Confirmer la visite », dont l'action quitte `living-here` pour
  `buyer-presentation`.
- Les tables et les colonnes devenues inutiles restent. Ni le code ni l'écran ne les lisent ou ne
  les écrivent, mais les nettoyages continuent de les vider :
  - `nettoyer-test` et `PROCEDURE_EFFACEMENT` ;
  - la suppression d'un concurrent ;
  - la remise à zéro de la démo.

  Leur suppression est une migration à part, deux semaines après la mise en production de la 147,
  après sauvegarde (Jean-Guy, 09/11). Elle est notée dans `docs/IDEES.md` au `/valide`.
- Tests :
  - `dossier-d-adresse.spec.ts` part ;
  - de `vivre-ici.spec.ts`, la moitié « Vivre ici » part, et « Confirmer la visite » reste, dans un
    spec renommé `confirmer-la-visite` ;
  - les tests unitaires des deux features partent avec elles ;
  - les tests SQL restent, puisque les tables restent.

### A.6 La démo

Dans l'agence de démonstration, les trois liens (« Dossier d'adresse », « Vivre ici », « Ventes
réelles dans Academia ») ouvrent la page de présentation d'Academia. Aucune adresse inventée n'est
copiée, et rien n'est dit de la copie. C'est le serveur qui le décide, par le repère de l'agence
(M114).

Aucun lien « Vivre ici » n'est semé : un faux lien serait une fausse source. Le lien de l'acquéreur
de la démo ne montre donc rien sous le bien. Noté dans `docs/IDEES.md` : demander à Laurent une
adresse de démonstration dans Academia.

### A.7 La migration (la colonne du lien seulement)

- `projects.academia_living_here_url text null`, avec la contrainte
  `^https://app\.myacademia\.ai/l/[^\s]+$`, 500 caractères au plus. Aucune autre table ni colonne,
  aucune ligne modifiée. Si l'hôte d'Academia change un jour, il faudra une migration.
- Avant : la sauvegarde (`npm run sauvegarde`), puis le comptage prédit :
  - les dossiers, inchangés ;
  - `projects`, une colonne de plus ;
  - une contrainte de plus ;
  - la colonne vide.
- Le gardien-sql la relit. Elle est **montrée à Jean-Guy avant d'être appliquée**, puis inscrite
  dans l'historique (`db push --linked`). Le comptage est comparé à la prédiction.
- Un test SQL, `vivre_ici_academia.sql`, joué par la CI. Il vérifie :
  - un lien d'Academia accepté, vidé ;
  - un autre site, `http`, un autre chemin et un texte trop long refusés ;
  - une autre agence refusée ;
  - un membre retiré refusé.
- `database.types.ts` régénéré.

### A.8 `/confidentialite`

Le texte est validé par le juriste. Le texte exact des changements est dans
`missions/M147-confidentialite-pour-le-juriste.md` :
- un paragraphe supprimé ;
- un paragraphe remplacé ;
- une phrase pour le jour du lien direct ;
- trois questions pour lui.

La page n'est pas modifiée avant son accord. La suppression des fonctions peut partir avant
(Jean-Guy, 09/11).

### A.9 Le réglage

Un seul module (`src/lib/academia.ts`) fabrique les liens :
- **l'adresse d'Academia** : `NEXT_PUBLIC_ACADEMIA_URL`, par défaut `https://app.myacademia.ai` ;
- **la page de présentation pour la démo** (question 1) ;
- **la forme du lien** : la constante `ACADEMIA_LIEN_DIRECT`, fausse.
  - Fausse : l'accueil d'Academia, avec la copie de l'adresse.
  - Vraie : `/app/ouvrir?adresse=…&vers=dossier|vivre-ici`, sans copie ni message.

  Passer au lien direct revient à basculer la constante, rien d'autre (sur le modèle de
  `OFFRE_AVEC_PRET_VALIDEE`). Ce jour-là, la phrase 3 du texte pour le juriste s'ajoute à
  `/confidentialite`.

Un test fige les deux formes.

### A.10 Jamais devant le vendeur

Ni le Live ni un document du vendeur ne montrent ces liens. Le test « jamais côté vendeur » le
vérifie sur le code du Live et des documents.

## Partie B — Démo crédible

### B.1 « Remettre ma démo à zéro » fiable (planche M147-5)

L'inventaire (§4) a trouvé trois lectures en échec lues comme des absences :
- **le profil** : `getProfile` rend `null`, la page renvoie sur `/onboarding` (« Première
  connexion ») ;
- **les dossiers de démo** : `getDemoDossiers` et `ownDemoDossierIds` rendent `[]`, « Préparer »
  en recrée six, d'où les 12 dossiers.

Il a aussi trouvé des suppressions dont personne ne lit l'erreur, sans recompte à la fin.

1. **Mesurer d'abord** (M47). Relire les journaux de Vercel des trois ratés et chronométrer une
   remise à zéro sur l'essai. Confirmer ou défaire l'explication avant de corriger.
2. **Une lecture en échec n'est jamais une absence** (M98).
   - « Ma démo » le dit (« Vos dossiers de démo n'ont pas pu être lus : rechargez la page ») et ne
     propose alors ni « Préparer » ni « Remettre à zéro ».
   - `getProfile` relit une fois, puis mène à la page d'erreur, jamais à « Première connexion ».
     Cela vaut pour toute l'application (Jean-Guy, 09/11).
3. **Chaque suppression et chaque écriture lit son erreur**. La suppression recompte à zéro avant
   de semer.
4. **En étapes, avec la progression** (C7) : supprimer, puis chaque dossier, puis les acquéreurs,
   puis vérifier. Chaque étape est une action courte, appelée par l'écran. La barre dit « Dossier 4
   sur 6 ». Une étape en échec arrête tout et le dit, avec « Recommencer ».
5. **« Votre démo est prête » seulement sur preuve.** La dernière étape relit en base :
   - six dossiers de démo du closer, un par étape attendue (à préparer, prêt, directe, deux signés,
     à relancer) ;
   - les neuf acquéreurs.

   Tout autre résultat (cinq dossiers, douze, une étape en double) donne « La remise à zéro n'a pas
   abouti : 5 dossiers sur 6 », avec « Recommencer », jamais « prête ».
6. **Sans verrou** (Jean-Guy, 09/11) : deux remises à zéro lancées en même temps sont vues à la
   vérification finale, et le message le dit.

### B.2 Toutes les dates relatives au jour de la remise à zéro

Elles le sont déjà presque toutes (`daysAgo(now, …)`). Les seules dates figées étaient les jeux du
dossier d'adresse et de « Vivre ici », qui partent avec la partie A.

La mission le **prouve** par un test. Il sème la démo deux fois sur un client factice, à deux
« maintenant » différents (le 09/11/2026 et le 15/03/2027), et vérifie que chaque date écrite a
bougé exactement de l'écart. Seules exceptions : les dates que la base pose elle-même (heure de la
base, M134, M137), qui tombent le jour même.

### B.3 Un logo fictif (planche M147-6)

- « Agence Horizon Côte d'Azur » reçoit un logo dessiné pour elle : un soleil posé sur l'horizon,
  trois lignes de mer, le nom en deux lignes.
- Deux versions, claire et sombre, en SVG tracé en chemins (sans police), rangées dans
  `public/demo/`. Aucune ressemblance avec une enseigne réelle, rien qui dise « démo ».
- « Préparer » et « Remettre à zéro » le déposent si l'agence n'a pas de logo : celui d'un manager
  n'est jamais remplacé.
- L'accueil du Live, la barre de gauche, les documents et les courriers prennent la forme « avec
  logo » (M146 A).

### B.4 I8 : une démo qui fait vrai (planche M147-7)

- **Photos** : des maisons, villas et appartements de la Côte d'Azur, libres de droits (CC0 ou
  équivalent). Les sources et licences sont listées dans `docs/DEMO.md`. Elles gardent les mêmes
  noms de fichiers (`public/demo/photos`) et remplacent les maisons américaines (bardage, brique,
  pelouse).
- **Rues** : les treize rues-jeux de mots deviennent des noms crédibles mais inventés. « Chemin des
  Restanques Hautes » reste. Chaque nom est vérifié absent de sa commune dans la Base Adresse
  Nationale, et la vérification est consignée dans `docs/DEMO.md`. Le test de la M114 garde sa liste
  de rues réelles refusées et refuse aussi les anciens noms.
- **Téléphones** : tous dans la plage réservée à la fiction, 06 39 98 …
  - L'e2e ne pose plus « 06 00 00 00 01 » sur le compte de démo, mais « 06 39 98 00 01 ».
  - « Préparer » et « Remettre à zéro » remplacent le téléphone du closer seulement s'il est vide ou
    vaut l'ancien « 06 00 00 00 01 ». Le vrai numéro d'un closer n'est jamais touché.
  - Un test refuse tout autre numéro dans le jeu de la démo.
- **L'agence concurrente « Azur Horizon Immobilier »**, trop proche d'« Agence Horizon Côte
  d'Azur », devient **« Brague Immobilier »** (la Brague coule entre Biot, Valbonne et Antibes, au
  milieu des trois scénarios). Jean-Guy a écarté « Calanques » (Marseille) et laissé le choix au chef
  le 09/11. Vérifications du 09/11 : aucune entreprise à ce nom dans le registre
  (recherche-entreprises.api.gouv.fr), aucune agence sur le web. Ce n'est pas non plus une agence
  cliente de Start Academy citée (Agence de l'Olivier, Marclé, Bristol) ; la liste complète des
  clients est à recouper par Jean-Guy.
- **Concurrents avec photo** : mesurer d'abord quels concurrents s'affichent gris et pourquoi (une
  photo sans fichier, une adresse d'hôte, une famille trop courte). Ensuite, chaque concurrent semé
  a au moins une photo qui se charge, prouvé par l'e2e de la démo sur Concurrents, Prospection et le
  lien de l'acquéreur.

## Hors périmètre

- C6 (Administration).
- Le lien direct d'Academia (`/app/ouvrir`) : prêt à basculer, pas basculé.
- La suppression des tables `address_dossiers`, `living_here_sheets` et des colonnes acquéreur, deux
  semaines après la production.
- Les autres points I8 de l'audit : « Exemple — M. et Mme Démo » (le dossier d'exemple, M97) et
  « M. et Mme Lambert » face à « M. et Mme Lambert-Duval ».
- Le lien « Vivre ici » dans le PDF du dossier acquéreur ou la présentation plein cadre.

## Preuves attendues

- **Partie A, tests unitaires :**
  - les deux formes du lien et la copie avec son repli ;
  - « Ajoutez l'adresse du bien » ;
  - la démo, qui ouvre la page de présentation sans copie ;
  - le lien collé, accepté ou refusé par motif ;
  - le lien sous le bien et dans le message, ou rien ;
  - `publicDeck` avec le piège ;
  - « jamais côté vendeur ».
- **Partie A, test SQL** : `vivre_ici_academia.sql`.
- **Partie A, e2e** :
  - Bien vendeur : les liens, « Adresse copiée », coller un lien Academia, refuser un autre site ;
  - « Avant le rendez-vous » : le lien des ventes ;
  - « La vente » des Keller ;
  - « Confirmer la visite », avec et sans lien collé ;
  - sur le lien de l'acquéreur, sur un téléphone : le lien sous le bien ;
  - au plus un bouton plein (`expectOneFilled`).
- **Partie B, tests :**
  - la remise à zéro (une lecture, une suppression ou une étape en échec ; cinq et douze dossiers
    refusés) ;
  - les dates à deux « maintenant » ;
  - le logo déposé seulement s'il manque ;
  - les rues et les téléphones de la démo.
- **Partie B, e2e** : la démo remise à zéro par l'écran (la barre, « Votre démo est prête », six
  dossiers), l'accueil du Live avec le logo, et une photo chargée pour chaque concurrent.

## Décisions de Jean-Guy (09/11)

1. Choix B : le lien client « Vivre ici » d'Academia, collé une fois sur le mandat.
   - Il s'affiche sous le bien sur le lien de l'acquéreur et dans « Confirmer la visite ».
   - Seuls les liens `https://app.myacademia.ai/l/…` sont acceptés.
   - Sans lien collé, rien sous le bien, et la confirmation renvoie à « Votre sélection ».
   - Les deux champs du formulaire acquéreur disparaissent.
   - Migration de la colonne seulement : sauvegarde, montrée avant d'être appliquée, inscrite dans
     l'historique, test SQL.
2. L'onglet Bien vendeur seulement. Sous « Votre analyse de valeur », un lien discret « Ventes
   réelles dans Academia ↗ ».
3. Pas de verrou contre deux remises à zéro simultanées.
4. Les tables devenues inutiles restent. Leur suppression est une migration à part, deux semaines
   après la mise en production de la 147, après sauvegarde.
5. Démo : les liens ouvrent la page de présentation d'Academia, sans copier d'adresse inventée.
   Une note dans IDEES demande à Laurent une adresse de démonstration.
6. `/confidentialite` : le texte exact est préparé pour le juriste. La page n'est pas modifiée avant
   son accord. La suppression des fonctions peut partir avant.
7. `getProfile` : d'accord.
8. Deux parties. A, Academia (planches 1 à 4 et 6 bis). B, la démo crédible (planches 5 et 6, plus
   I8 : photos, rues, téléphones, concurrents avec photo). C6 à part.

## Décisions de Jean-Guy après la livraison sur l'essai (09/11), pour DECISIONS au `/valide`

1. « Confirmer la visite » quand le lien « Vivre ici » du mandat ne peut pas être lu : la visite
   n'est pas bloquée. L'écran le dit (« Le lien « Vivre ici » du bien n'a pas pu être lu.
   Réessayez, ou préparez le message sans lui. ») et le conseiller choisit « Réessayer » ou
   « Préparer le message sans le lien » ; l'échec reste au journal ; rien n'est écrit avant son
   choix.
2. Le bouton plein du formulaire « Confirmer la visite » (« Préparer le message ») : même règle que
   dans le Suivi (M146 A), un formulaire ouvert porte le seul bouton plein de l'écran (précise
   M120 B et M146 B, « aucun bouton plein sur Visites »).
3. Côté acquéreur, le lien collé ne part que pour un mandat signé, comme le dit l'écran (décision du
   chef pendant la mission, à confirmer au `/valide`).

## Questions encore ouvertes

Posées le 09/11, après les décisions ; les réponses s'écrivent ici.

1. **La page de présentation d'Academia** pour la démo : quelle adresse ? Par défaut, je mettrais
   la racine, `https://app.myacademia.ai`.
2. **Une agence concurrente de la démo** s'appelle « Azur Horizon Immobilier », trop proche
   d'« Agence Horizon Côte d'Azur », la nôtre. Je propose de la renommer, par exemple « Calanques &
   Restanques Immobilier », après vérification qu'aucune enseigne réelle ne porte ce nom.
3. **Le lien « Vivre ici » collé** s'affiche sous chaque bien de l'agence de sa sélection. Faut-il le
   montrer aussi avant que l'acquéreur ait demandé à le visiter (je le recommande, puisque rien ne se
   calcule plus), ou seulement pour les biens qu'il va visiter, comme le « Vivre ici » d'ACM ?
