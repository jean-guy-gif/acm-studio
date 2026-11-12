# MISSION 151 — L'acquéreur depuis mes notes : une photo, une fiche CRM ou un texte devient une fiche à vérifier, et ce qui compte pour eux classe les biens

**Date** : 10/11/2026 · **Origine** : décision de Jean-Guy (10/11) : « fonction de base », avant la
bêta. C'est l'ancienne mission 121 (« lecture de notes manuscrites par IA », qui attendait la fin
des missions 117 à 120). Mesure : `missions/M151-mesure.md`.

**Statut** : réponses de Jean-Guy du 10/11 reçues et reportées ici (fin du fichier). **Maquettes
M151-1 à M151-4 validées par Jean-Guy le 10/11.** Aucun code avant l'étape 0 : Jean-Guy revient avec
l'accès aux modèles ouvert par AWS ; le dossier des essais est écrit (11/11).

**Deux parties** (Jean-Guy, 10/11), une branche et un `/valide` chacune : **A, la fiche depuis mes
notes** (lecture, proposition, validation, « Ce qui compte pour eux », le critère « Copropriété ») ;
**B, le classement** (les biens idéaux et la veille rangés par ce qui compte pour eux, avec la
raison du rang). Avec migration : architecte, gardien-sql, relecteur, e2e joué par le chef.

## Objectif

Le conseiller ne ressaisit pas ce qu'il a déjà écrit : il photographie ses notes, dépose la fiche
de son CRM ou colle un texte, et relit une fiche pré-remplie. Ce que les CRM perdent — « au calme »,
« du cachet », « sans vis-à-vis » — est gardé dans « Ce qui compte pour eux », avec leurs mots, et
sert à ranger les biens trouvés, en disant pourquoi.

## Les principes (Jean-Guy, 10/11)

1. **L'IA propose, le conseiller valide.** Rien n'est enregistré sans son « Créer la fiche » ou
   « Compléter la fiche » ; chaque champ proposé porte « À vérifier » jusqu'à ce qu'il le touche ou
   dise « Tout est juste » (le modèle de la M97, sur la fiche acquéreur).
2. **La photo, le PDF ou le texte collé n'est pas gardé** après la lecture : ni dans le stockage,
   ni en base, ni au journal, ni dans la trace ; **seuls les champs validés par le conseiller sont
   enregistrés** (Jean-Guy, 10/11). Le contenu passe par la mémoire du serveur le temps de l'appel,
   jamais par un fichier. Seul part le texte d'un PDF qui en a un (lu dans le navigateur, M43) ; une
   photo, une capture ou un PDF scanné partent comme image, une seule fois. Chez AWS, la
   journalisation des appels (« Model invocation logging ») reste désactivée, vérifiée à l'étape 0 :
   Bedrock ne garde alors ni ce qu'il lit ni ce qu'il répond. **Les sources** (la ligne des notes
   d'où vient chaque champ, montrée à la validation) **ne sont jamais gardées non plus**, comme la
   photo et le fichier (Jean-Guy, 12/11) : elles vivent dans l'écran jusqu'à « Créer la fiche »,
   l'action de création n'a pas de champ pour elles (liste d'autorisation), la trace (A.11) ne garde
   que les noms des champs proposés et gardés, jamais une valeur ni une ligne des notes, et le
   journal d'erreurs ne reçoit jamais la réponse du modèle. Prouvé par un test : après « Créer la
   fiche », aucune source n'existe en base, trace comprise.
3. **Jamais de donnée sensible ni de jugement sur la personne** : ni santé, ni religion, ni
   origine, ni opinions, ni situation familiale, ni « pressé », « difficile », « indécis ». Le
   besoin peut être gardé (« De plain-pied »), jamais sa raison. Trois gardes : la consigne, une
   sortie en liste d'autorisation de champs, et au serveur une liste de mots refusés sur tout texte
   proposé (leurs mots, les Notes), comme les mots interdits des courriers (M120).
4. **Les critères doux classent et expliquent, ils n'écartent jamais un bien** : un bien qui « n'en
   dit rien » reste à sa place ; seule la catégorie de la M118 (indispensables) décide.
5. **Essais avec des notes inventées seulement**, jamais celles de vrais clients.
6. **Un texte pour le juriste** avant la mise en production : `missions/M151-confidentialite-pour-le-juriste.md`.
   `/confidentialite` a été validée par le juriste le 07/11 : **elle ne change pas sans son
   accord** (signalé ici, avant de coder, comme le demande la décision du 07/11).

## Étape 0 — avant le code

1. **Jean-Guy** ouvre le compte AWS et l'accès aux modèles, depuis l'Irlande (eu-west-1), en suivant
   `missions/M151-etapes-aws.md` (SIRET et TVA dans « Tax settings », « Model invocation logging »
   désactivé, une clé limitée à Bedrock), et pose la clé dans `.env.local` et dans Vercel
   (production et essai) ; Claude Code ne touche ni à AWS ni à Vercel.
2. **Jean-Guy** écrit les notes d'essai, de sa main et de deux autres écritures, pour des clients
   inventés (noms de fiction, téléphones en 06 39 98, e-mails en example.com), et exporte de son CRM
   les fiches de 5 acquéreurs inventés. Elles sont rangées hors du dépôt, sauf celles choisies pour
   la démo et les tests.
3. **Le chef mesure** : Sonnet 5.5 et Haiku 5.5, par leur profil « EU », sur ces notes et ces fiches —
   champs justes, champs faux, champs inventés, mentions personnelles relevées par erreur, coût réel
   par fiche — et sur les 73 descriptions de la mesure pour le classement. Le modèle de chaque
   lecture se choisit sur ce résultat (moins de 1 €). Un champ inventé ou une mention personnelle
   relevée arrête la mission.
4. **Le chef mesure aussi** où Stream Estate dit la copropriété (charges, nombre de lots, étiquette),
   pour le nouveau critère, sur les réponses déjà gardées d'abord, sans appel s'il le peut.

**État de l'étape 0 (11/11)** : le dossier d'essais est écrit par Claude Code (Jean-Guy n'avait ni
notes ni fiches), inventé, avec ses corrigés commités avant toute mesure (`missions/M151-essais/`) ;
le script de mesure est prêt et son barème vérifié à blanc. **La mesure n'a pas pu tourner** : AWS
refuse l'appel (403) — l'utilisateur IAM n'a pas le droit `bedrock-mantle:CreateInference`, seul
valable pour Claude 5.5 (l'autorisation `bedrock:InvokeModel` de la première version des étapes
était fausse) ; Paris n'a pas de point d'accès pour ces modèles (l'Irlande, Francfort, Stockholm et
Milan en ont) ; `ACM_AWS_REGION` porte un point final. Et le profil « EU » inclut Zurich et Londres.
Étapes corrigées : `M151-etapes-aws.md`. **Le 11/11, Jean-Guy choisit l'Irlande seule**, corrige le
droit (`bedrock-mantle:CreateInference`) et la région (`eu-west-1`) ; les trois variables sont
dans le projet Vercel `acm-studio`, Production et Preview (l'essai en est le déploiement Preview).
Appels d'essai du 11/11 en Irlande : le droit est accordé (plus de 403 sur le droit), mais **le
compte n'a pas encore accès aux modèles** — même Claude Sonnet 5, ouvert à tous les comptes,
répond « not available for this account » (vérification du compte ou formulaire d'Anthropic en
cours) ; Sonnet 5.5 et Haiku 5.5 répondent « does not exist » en Irlande, à revérifier une fois
l'accès ouvert. La mesure attend ; rien n'a été lu ni facturé.

**Décision de Jean-Guy (11/11 au soir, sur preuve, notée le 12/11)** : les modèles 5.5 se lisent par
leur **profil « EU »**, `eu.anthropic.claude-sonnet-5-5` et `eu.anthropic.claude-haiku-5-5`,
appelés depuis l'Irlande (eu-west-1) ; ce n'est pas l'Irlande seule (remplace le choix du 11/11).
Les régions de destination de ces deux profils se lisent par l'API (`GetInferenceProfile`) dès le
compte débloqué ; le texte de confidentialité ne change qu'après cette vérification.

**Plan B (12/11)** : en attendant le support AWS (cas 179439470000287), l'étape 0 tourne sur Sonnet
4.6 et Haiku 4.5 par leurs profils « EU », pour valider le dossier d'essais et la méthode, pas pour
choisir le modèle : `missions/M151-mesure-provisoire-plan-b.md`.

## Maquettes

`missions/maquettes/M151-1` à `M151-4` (`.png`, source `M151-generateur.mjs --png`), chacune sur
ordinateur (1280), tablette (820) et téléphone (390), notes avant / après à droite. Les notes et
l'acquéreur (M. et Mme Arnaud) sont inventés. **Validées par Jean-Guy le 10/11.**

| Planche | Écran | Partie |
|---|---|---|
| 1 | « Nouvel acquéreur » : depuis mes notes (photo, fichier, texte), puis la lecture | A |
| 2 | La fiche pré-remplie à vérifier, et ce qui n'a pas été relevé | A |
| 3 | « Ce qui compte pour eux » sur la fiche acquéreur | A |
| 4 | Un bien idéal avec la raison de son rang | B |

## Partie A — la fiche depuis mes notes

1. **Entrée.** « Nouvel acquéreur » (M132) gagne en tête « Depuis mes notes » : **Prendre une
   photo**, **Déposer un fichier** (PDF, image, capture d'écran), **Coller un texte**. La saisie
   rapide reste dessous, inchangée. Sur une fiche existante, « Compléter depuis mes notes ».
2. **La lecture** : « Lecture de vos notes… », un seul appel, par Claude sur Amazon Bedrock, par le
   **profil « EU »**, appelé depuis l'Irlande (eu-west-1 ; régions de destination à vérifier par
   l'API, décision du 11/11 au soir) ; le coût est
   réservé avant, réglé après (point 10).
3. **La proposition** (planche 2) : chaque champ de la fiche (M117) avec « À vérifier » et la ligne
   des notes d'où il vient ; un champ que les notes ne disent pas reste vide, jamais deviné (M38) ;
   une valeur hors liste vaut « non renseigné » (M78) ; le nom et une commune restent obligatoires ;
   les ★ proposés sont à vérifier comme le reste. Règles de lecture de Jean-Guy (12/11, mesurées
   sur le plan B) :
   - **aucune valeur par défaut** : le motif et le délai ne se proposent que s'ils sont écrits,
     « résidence principale » ne se suppose jamais ;
   - **une case non cochée ou un champ vide d'un export** vaut « inconnu », jamais « non » ;
   - **les ★** : deux au plus, seulement parmi ceux de l'écran (M132 : Communes, Budget, Extérieur,
     Parking, Piscine, Ascenseur) ; jamais le type de bien ; le budget seulement s'il est dit ferme,
     jamais tiré d'une colonne d'export. **Un ★ sans sa source** (la ligne des notes qui le dit
     indispensable) **est refusé au serveur** : il n'est pas proposé, le critère reste une
     préférence ;
   - **une contrainte pratique** (pas de voiture le week-end) peut aller en Notes, « à vérifier » ;
     aucune autre mention sur la personne, sources comprises ; au serveur, la liste de mots refusés
     (principe 3) passe aussi sur les sources, qui tombent sans faire tomber leur champ ;
   - **les communes se vérifient au serveur** contre la liste officielle : celle des départements de
     l'agence (son adresse, ses dossiers, ses acquéreurs), par la porte qui existe
     (`geoProvider(isDemo).fetchDepartmentCommunes`, M114 ; la table locale pour l'agence de démo) ;
     comparaison par `normalizeCommuneName` (M71 : accents, tirets, St / Ste), puis sans les petits
     mots (de, du, la, le, les, sur) — « Châteauneuf-de-Grasse » → Châteauneuf-Grasse ; le nom
     d'usage (Juan-les-Pins, M86) est gardé tel que lu, reconnu par la liste des alias ; un
     arrondissement par M99. Une seule commune trouvée : proposée sous son nom officiel, « À
     vérifier », avec « lu : … » ; aucune ou plusieurs : le champ reste au conseiller, jamais deviné
     (M38, M103) ; le service en panne : la commune telle que lue, « commune non vérifiée » (M104),
     jamais lue comme « aucune » (M98). La recherche par nom de geo.api.gouv.fr ne suffit pas :
     elle ne trouve ni « Châteauneuf-de-Grasse » ni « St-Laurent-du-Var » (mesuré le 12/11).
4. **« Copropriété acceptée »**, un vrai critère (Jean-Guy, 10/11) : oui / non / non renseigné,
   ★ possible, dans le formulaire complet, la proposition et le rapprochement. Un bien **en
   copropriété connue** écarte un ★ « non » (M118, M133) ; sans ★, « En copropriété » est un écart
   nommé du « Bon compromis ». **Une copropriété inconnue n'écarte jamais un bien** : la carte dit
   « Copropriété : à vérifier » (Jean-Guy, 10/11) — avec un ★, le bien est « À explorer », comme tout
   indispensable que l'annonce ne dit pas (M61, M118).
5. **« Ce qui compte pour eux »**, la liste fermée de Jean-Guy (10/11) : **au calme · sans
   vis-à-vis · du cachet · lumineux · une vue · de plain-pied · traversant · commerces et écoles à
   pied · un jardin sans gros entretien · prêt à vivre (sans travaux)**. Chacun avec **leurs mots**
   tels qu'écrits (80 caractères). Un souhait hors liste n'est pas classé. « Pas de gros travaux »
   donne « Prêt à vivre » ; « Travaux acceptés : non » (qui écarte avec un ★) n'est proposé que si
   les notes le disent sans nuance.
6. **« Notes »** : seulement des faits pratiques — disponibilités pour visiter, contraintes —,
   « À vérifier », jamais une remarque sur la personne (Jean-Guy, 10/11).
7. **Ce qui n'a pas été relevé** : une ligne grise, sans le contenu — « 2 mentions personnelles
   n'ont pas été relevées ».
8. **Valider.** « Créer la fiche » (le seul plein, M146) ; « Recommencer la lecture » ; « Annuler »,
   qui n'écrit rien. Sur une fiche existante, une valeur différente se lit « 650 000 € → 750 000 € »,
   **décochée** par défaut ; un champ vide proposé est coché (Jean-Guy, 10/11).
9. **Le financement** n'est proposé que si les notes le disent clairement (« accord banque OK »),
   toujours « À vérifier », et ne s'écrit que par son action (M132), appelée par « Créer la fiche »
   (Jean-Guy, 10/11). **Un achat comptant** (« cash », « sans prêt ») est une suggestion à l'écran,
   « Comptant, à vérifier », sans jamais l'origine des fonds : le conseiller la transforme ou non en
   « Validé » ; aucune colonne nouvelle, `buyers.financing` garde ses trois valeurs (Jean-Guy,
   12/11).
10. **Le budget d'IA** de l'agence, comme Stream Estate (M100, M105) : réservation avant l'appel,
    règlement après, **10 € par mois et par agence**, réglé par un opérateur en bas de `/erreurs`,
    lu par le manager (Jean-Guy, 10/11) ; atteint : « Budget de lecture du mois atteint : saisissez
    la fiche à la main. » ; illisible n'est pas libre (M100).
11. **La trace** (CLAUDE.md : « ses sorties sont tracées ») : la date, l'auteur, le modèle, le coût,
    la source (photo, fichier, texte — jamais son contenu), les champs proposés et ceux gardés ;
    partie avec la fiche.
12. **Démo** (M114) : aucune lecture réelle ; une photo de notes inventées proposée d'avance, la
    lecture simulée répond après 1,5 s, par les mêmes services ; un dixième acquéreur, « M. et Mme
    Arnaud », à Vence.

## Partie B — le classement par ce qui compte pour eux

1. **Ce qui est lu** : la description et les étiquettes des biens **déjà reçus** — Stream Estate
   (la description arrive avec chaque annonce, sans coût de plus), les concurrents et mandats de
   l'agence. La requête Stream Estate ne change pas : la recherche par mots est ignorée par l'API
   (mesuré ; question posée à leur support le 10/11).
2. **Le jugement**, par critère et par bien : **dit clairement**, **dit avec réserve**, **n'en dit
   rien**, **dit le contraire**, chaque fois avec **les mots exacts de l'annonce** ; la citation doit
   se trouver mot pour mot dans la description (accents et espaces près), sinon le jugement tombe à
   « n'en dit rien ». La description n'est jamais gardée, seule la citation courte l'est
   (Jean-Guy, 10/11).
3. **Le rang** : la catégorie de la M118 d'abord, inchangée ; dans chaque catégorie, ce qui compte
   pour eux, puis le pourcentage (M71), puis le prix. « Dit le contraire » descend un bien dans sa
   catégorie, jamais hors d'elle.
4. **La raison** (planche 4), sur chaque carte, **pour le conseiller seul pendant la bêta**
   (Jean-Guy, 10/11) ; le lien de l'acquéreur se décidera ensuite.
5. **La veille** (M136) juge de même les biens qu'elle garde ; le jugement et ses citations sont
   gardés avec le passage (liste d'autorisation), jamais la description.
6. **Sans budget d'IA** : la liste de mots de la mesure, qui ne dit que « l'annonce mentionne
   « calme » », et le dit : « Classement simplifié : budget de lecture du mois atteint ».

## Critères d'acceptation (testables à l'écran)

1. Une photo de notes inventées donne une fiche proposée où chaque champ porte « À vérifier » et sa
   ligne d'origine ; rien n'est en base avant « Créer la fiche » (relu en base).
2. La photo n'existe nulle part après la lecture : ni stockage, ni table, ni journal (relu).
3. « Madame enceinte, donc plain-pied » et « Monsieur très pressé » donnent « De plain-pied » et
   « 2 mentions personnelles n'ont pas été relevées » : ni « enceinte » ni « pressé » nulle part
   (écran, base, trace, Notes).
4. Une fiche existante complétée : une valeur différente est décochée et ne change pas sans coche.
5. Biens idéaux des Arnaud : à catégorie égale, le bien dont l'annonce dit « calme absolu » passe
   devant celui qui n'en dit rien ; aucun bien n'est écarté par un critère doux ; chaque citation
   affichée se trouve dans la description.
6. « Copropriété acceptée : non » ★ écarte un bien en copropriété connue ; un bien qui ne le dit
   pas reste, avec « Copropriété : à vérifier » sur sa carte (aucun bien écarté pour une copropriété
   inconnue, compté).
7. Budget atteint : la lecture est refusée et le dit ; le classement passe en « simplifié ».
8. La démo joue le tout sans aucun appel extérieur (M114), rien ne dit « démo ».

## Décisions à respecter

M38, M43, M47 (une valeur fausse est pire qu'une case vide), M51 (liste d'autorisation), M55,
M61, M71, M78, M97 (« À vérifier »), M98 (une lecture en échec n'est jamais une absence), M100,
M105, M114, M117, M118, M132, M133, M136, M146 (un seul plein), M147 A (les colonnes
`sector_priorities` et `living_place` ne sont pas reprises : elles partent par leur migration), le
07/11 (textes validés par le juriste).

**Décision remplacée** (Jean-Guy, 10/11) : « la description n'est jamais lue » (Stream Estate,
05/10 ; M101 ; M136) devient « la description est lue seulement pour juger ce qui compte pour
l'acquéreur et en citer une courte phrase ; elle n'est jamais gardée ».

## Hors périmètre

Les photos des annonces lues par l'IA ; un critère doux qui écarte ; une remarque sur la personne
dans « Notes » ; la dictée vocale ; la lecture d'un e-mail transféré ; une recherche Stream Estate
par mots (tant que l'API l'ignore) ; la raison du rang dite à l'acquéreur (après la bêta).

## Essai (interne, l'e2e)

Démo : « Nouvel acquéreur » → « Depuis mes notes » → la photo proposée → la fiche des Arnaud, les
pastilles, les deux mentions non relevées → « Créer la fiche » → « Ce qui compte pour eux » →
« Trouver leurs biens idéaux » (marché simulé) → l'ordre et ses raisons. Après le `/valide`, un seul
test court de Jean-Guy en production, avec ses propres notes inventées.

## Réponses de Jean-Guy (10/11)

1. **Fournisseur** : Claude par Amazon Bedrock, par le **profil « EU »**, appelé depuis l'Irlande
   (eu-west-1) : décision du 11/11 au soir, sur preuve, qui remplace « l'Irlande seule » du 11/11 ;
   les régions de destination se vérifient par l'API au déblocage du compte. D'accord pour le SDK. Jean-Guy crée lui-même le compte AWS et ouvre l'accès au modèle.
2. **Critères doux** : la liste du point A.5. « Pas de copropriété » devient un vrai critère (A.4).
3. **La description** est lue seulement pour juger et citer une courte phrase.
4. **Plafond** : 10 € par mois et par agence, réglé par l'opérateur.
5. **Notes** : seulement des faits pratiques, « à vérifier », jamais de remarque sur la personne.
6. **Compléter** : une valeur différente est proposée décochée.
7. **Financement** : si les notes le disent clairement, et toujours « à vérifier ».
8. **La raison du rang** : conseiller seul pendant la bêta.
9. **Les notes d'essai** : écrites par Jean-Guy et deux autres écritures, clients inventés ; 5 fiches
   d'acquéreurs inventés exportées de son CRM.
10. **Deux parties**, A puis B.

Suite (10/11) : la règle « Prêt à vivre » / « Travaux acceptés » du point A.5 est acceptée ; une
copropriété inconnue n'écarte jamais un bien (A.4) ; seuls les champs validés sont enregistrés,
rien du contenu lu (principe 2, déjà prévu, précisé) ; étapes AWS complétées
(`M151-etapes-aws.md`) ; la clé AWS sera remplacée par un lien OIDC Vercel → AWS avant de faire
payer les agences (`docs/IDEES.md`).
