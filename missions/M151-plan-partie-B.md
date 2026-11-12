# Mission 151, partie B — le plan (12/11, sans code)

Le classement des biens idéaux par ce qui compte pour eux (fiche, partie B ; planche 4, validée le
10/11). Ce plan suit la fiche ; les questions à trancher par Jean-Guy sont en fin de page.

## Ce qui existe déjà

- La partie A pose `buyers.soft_criteria` (dix critères, leurs mots) et la trace `ai_usage`, dont
  la `purpose` 'ranking' et la `source` 'listings' sont déjà permises par la migration appliquée :
  **aucune migration n'est prévue**.
- La consigne du classement, ses règles du 12/11 et le contrôle des citations existent dans
  `missions/M151-essais/mesure.mjs` (mesurés : calme 73/73, cachet 12/12, citations 69/69,
  0,004 $ l'annonce, 8 annonces par appel ; à température 0, 2 annonces sur 73 changent de
  jugement d'une passe à l'autre, toutes deux dans ce que le corrigé accepte).
- Les textes : Stream Estate envoie la description de chaque annonce de la recherche des biens
  idéaux (gardée pour la fiche complète, M152 B) ; un concurrent a `listing_description` et ses
  étiquettes ; un mandat a la description et les atouts de sa fiche.

## Les étapes

1. **Le jugement, un service pur** (`soft-judgment.ts`) : par bien et par critère doux, « dit
   clairement », « avec réserve », « n'en dit rien », « dit le contraire », ou « non lu » (une
   annonce absente de la réponse, relancée une fois, M98) ; la citation vérifiée mot pour mot dans
   le texte (accents et espaces près), sinon le jugement tombe à « n'en dit rien ». L'étiquette
   « Calme » d'un portail vaut « à vérifier ». Rien du texte n'est gardé, seule la citation courte.
2. **L'appel au modèle** (`ranking-request.ts`) : la consigne de la mesure, telle qu'elle a été
   mesurée, 8 annonces par appel, température 0 sur Claude 4, le modèle en paramètre (Sonnet 4.6
   par le profil « EU » tant que les 5.5 sont refusés) ; budget réservé avant, réglé après
   (`reserve_ai_budget`, même plafond que la lecture des notes), trace sans texte.
3. **Le rang** : la catégorie de la M118 d'abord, inchangée ; dans la catégorie, le score de ce
   qui compte pour eux, puis le % (M71), puis le prix. « Dit le contraire » descend le bien dans sa
   catégorie, jamais hors d'elle ; aucun bien n'est écarté par un critère doux.
4. **L'écran** (planche 4) : « Pourquoi 1er » sur chaque carte — ✓ ≈ ✗ ? par critère, avec les mots
   de l'annonce —, pour le conseiller seul ; le bandeau « Rangés par ce qui compte pour eux » ; la
   même raison dans la fiche complète (M152 B). Ni la présentation, ni le dossier, ni son lien.
5. **La veille** (M136) : la nuit, le serveur juge les biens qu'elle garde avec leur texte, tant
   qu'il l'a, et garde le jugement et ses citations dans `buyer_watch_runs.finds` (liste
   d'autorisation), jamais le texte.
6. **Sans budget d'IA** (ou lecture fermée) : la liste de mots de la mesure — « l'annonce mentionne
   « calme » », jamais ✓ ni ✗ — et le bandeau « Classement simplifié : budget de lecture du mois
   atteint ».
7. **La démo** (M114) : des jugements simulés pour les annonces du jeu de données, par les mêmes
   services, sans appel ; rien ne dit « démo ».
8. **Les preuves** : tests du service (citation absente → « n'en dit rien », « non lu » jamais
   « rien », le contraire descend sans sortir), de l'action (budget, trace sans texte, aucune
   description gardée), garde « jamais côté acquéreur » ; e2e sur la démo (critère 5 : « calme
   absolu » devant « n'en dit rien », chaque citation dans le texte).

## Les décisions de Jean-Guy (12/11)

1. Le marché se classe pendant la recherche, avant d'afficher, avec un message d'attente ; échec ou
   délai (30 s au plus pour la lecture) : les biens s'affichent en classement simplifié, sans bloquer.
2. « Ce que l'agence a déjà » se classe au lancement de la recherche du marché ; avant, l'écran dit
   que le classement est simplifié (planche 4 b).
3. Le score (clairement 2, avec réserve 1, rien ou non lu 0, le contraire −2) ne range qu'à
   l'intérieur d'une catégorie : il ne change jamais un bien de catégorie et n'en écarte aucun.
4. Le classement suit la même porte que la lecture des notes, ouvrable agence par agence sans
   redéploiement (proposition ci-dessous).
5. Budget d'IA commun avec la lecture des notes ; la veille de nuit en prend la moitié au plus.
6. Les Arnaud ne sont pas semés (ils naissent de la photo) ; les Lambert reçoivent des critères
   doux, sans changer aucun compte de la démo.

## L'ouverture agence par agence, sans migration (proposition)

- La porte devient le plafond d'IA de l'agence, réglé par un opérateur en bas de `/erreurs`
  (`agency_ai_budgets`, déjà en base) : **sans ligne, ou à 0 €, fermé ; au-dessus, ouvert**. Le
  défaut du code (10 € sans ligne) disparaît : ouvrir, c'est poser un plafond.
- La constante `NOTES_READING_OPEN` disparaît. Restent ouverts sans plafond : l'agence de
  démonstration (simulée, aucun appel) et les opérateurs, pour l'essai manuel.
- Fermer : remettre 0 €. Les deux (lecture des notes, classement) s'ouvrent et se ferment ensemble.
- La moitié pour la veille : le classement de la nuit vérifie, avant de réserver, que ce qu'il a
  déjà dépensé ce mois (`ai_usage`, `purpose` 'ranking', sans auteur) reste sous la moitié du
  plafond. La veille tourne une agence après l'autre, un passage à la fois (M136) : la vérification
  suffit sans verrou ; une garantie en base, comme `start_buyer_watch`, demanderait une migration.

## Les questions posées le 12/11 (tranchées ci-dessus)

1. **Quand classer le marché ?** Dans la recherche payante elle-même, avant d'afficher les
   biens (le serveur a les textes, +5 à 8 s d'attente, environ 0,04 € pour 10 biens) — ma
   recommandation —, ou après l'affichage, ce qui demande de renvoyer les textes depuis le
   navigateur ou de les garder quelque part ?
2. **« Ce que l'agence a déjà »** (mandats, concurrents) s'affiche sans recherche payante, à chaque
   ouverture de la page : le classer à chaque ouverture coûte à chaque visite. Le classer seulement
   quand le conseiller lance la recherche du marché (ma recommandation), ou garder les jugements
   (une table, donc une migration) ?
3. **Le score dans une catégorie** : je propose clairement = 2, avec réserve = 1, rien ou non lu
   = 0, le contraire = −2, additionnés sur les critères de la fiche. D'accord, ou un autre poids
   (par exemple le premier critère cité compte plus) ?
4. **La lecture est fermée pendant la bêta** (sauf démo et opérateurs) : le classement suit-il la
   même porte (tout le monde en « simplifié » jusqu'à l'ouverture), ou s'ouvre-t-il à part ?
5. **Le budget de la veille** : le classement de la nuit se prend sur le budget d'IA de l'agence
   (10 €, avec la lecture des notes), comme je le prévois, ou sur un plafond à part ?
6. **La démo** : la fiche annonce « un dixième acquéreur, M. et Mme Arnaud, à Vence » ; il n'est
   pas semé aujourd'hui (l'e2e le crée depuis les notes, puis l'archive). Le semer change
   « neuf acquéreurs » en « dix » sur « Ma démo ». Le semer, ou donner ses critères doux à un
   acquéreur déjà semé (les Lambert, maison à Vence) ?
7. **`/confidentialite`** : le texte pour le juriste dit déjà que la description est lue pour
   juger ; rien d'autre à lui soumettre pour la partie B, sauf si la raison du rang part un jour
   vers l'acquéreur.
