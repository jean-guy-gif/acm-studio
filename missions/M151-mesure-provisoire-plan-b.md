# M151 — Mesure provisoire, plan B (12/11)

**Ce n'est pas la mesure qui choisit le modèle.** Le compte AWS n'a toujours pas accès à Claude 5.5
(« not available for this account », cas de support 179439470000287). En attendant, l'étape 0 tourne
sur une génération plus ancienne, pour valider le dossier d'essais, le barème et la méthode
(décision de Jean-Guy, 12/11). La fiche et le texte pour le juriste restent écrits pour Claude 5.5.

Deux mesures sur Sonnet 4.6 : la première (06 h 24), puis, après les règles de Jean-Guy du 12/11,
la seconde (08 h 15). Bilans bruts dans `M151-essais/resultats/` : `bilan-2026-11-12-06-24.md`,
`bilan-2026-11-12-08-15.md` (fiches et classement), et les deux mêmes renotées sans appel sur les
corrigés du 12/11 (`…-renote.md`, celles qui font foi pour les fiches). Réponses brutes et 73
annonces hors du dépôt.

## Les conditions

- **Modèles** : `eu.anthropic.claude-sonnet-4-6` et `eu.anthropic.claude-haiku-4-5-20251001-v1:0`,
  appelés depuis l'Irlande (eu-west-1) par l'API Bedrock classique.
- **Où va la lecture** : lu par l'API (`GetInferenceProfile`, 12/11). Les deux profils envoient
  vers les six mêmes régions, **toutes dans l'Union** : Stockholm (eu-north-1), Paris (eu-west-3),
  Milan (eu-south-1), Espagne (eu-south-2), Irlande (eu-west-1), Francfort (eu-central-1). Ni
  Zurich ni Londres. Celles du profil « EU » de Claude 5.5 restent à lire par l'API.
- **Droits** : la politique en place, sans changement (`M151-etapes-aws.md`, étape 10).
- **Le dossier** : les 11 cas inventés (N1 à N6, C1 à C5), deux passes par modèle, sans photo
  (`photos/` est vide), contre les corrigés écrits avant ; le classement des 73 annonces réelles,
  une passe, 8 annonces par appel.

## Ce qui a changé dans l'outil de mesure (rien dans l'application)

- `mesure.mjs` choisit son client selon le modèle : un Claude 4 passe par l'API classique
  (`bedrock:InvokeModel`), un Claude 5.5 par `bedrock-mantle`. Tarifs des modèles 4 ajoutés
  (Sonnet 4.6 : 3 / 15 $ ; Haiku 4.5 : 1 / 5 $ par million de jetons, +10 % pour un profil
  géographique) ; un modèle sans tarif arrête la mesure. Haiku 4.5 n'a pas le réglage d'effort.
- **Le schéma de la fiche a été refusé** au premier passage : « too many parameters with union
  types (20 …, limit: 16) ». Les dix champs à liste fermée (oui / non, motif, délai, langue, DPE)
  disent désormais « ou rien » par `null` dans la liste, au lieu d'un `anyOf`. Le sens ne change
  pas, et le barème se vérifie toujours lui-même (`--essai-notation`). **À reprendre dans la
  fiche du code** : la limite vaudra aussi dans l'application.
- Modèles par défaut : `eu.anthropic.claude-sonnet-5-5` et `eu.anthropic.claude-haiku-5-5`, le profil
  « EU » appelé depuis l'Irlande (décision du 11/11 au soir). La commande des 5.5 est dans
  `M151-essais/README.md`.

## Haiku 4.5 : refusé

L'appel d'essai a répondu, puis chaque appel de la mesure a été refusé, et un nouvel essai aussi :

> 403 Model access is denied due to IAM user or service role is not authorized to perform the
> required AWS Marketplace actions (aws-marketplace:ViewSubscriptions, aws-marketplace:Subscribe)
> to enable access to this model. […] Your AWS Marketplace subscription for this model cannot be
> completed at this time. If you recently fixed this issue, try again after 5 minutes.

Ce n'est aucun des deux cas prévus (ni « not available for this account », ni « no
identity-based policy allows ») : à la première utilisation d'un modèle, AWS l'abonne au compte par
AWS Marketplace, et c'est l'appelant qui doit en avoir le droit. `acm-studio-bedrock` ne l'a pas.
Sonnet 4.6 marche, sans doute parce qu'il a déjà été ouvert dans le Playground par un compte
administrateur. **Remède sans toucher à IAM** : ouvrir Haiku 4.5 une fois dans le Playground avec
le compte administrateur, attendre 5 minutes, puis relancer la mesure de Haiku seul
(`M151_MODELES=eu.anthropic.claude-haiku-4-5-20251001-v1:0`). Le même abonnement attendra Claude
5.5 au déblocage du compte.

## Sonnet 4.6, première mesure (avant les règles) : les fiches

| | Passe 1 | Passe 2 |
|---|---|---|
| Champs attendus justes | 104 / 105 | 104 / 105 |
| Champs faux | 2 | 1 |
| Valeurs inventées | 11 | 10 |
| Mentions personnelles | 2 | 2 |
| Critères doux manquants ou en trop | 0 | 0 |
| Notes incomplètes | 0 | 0 |

**Coût : 0,435 $ pour 22 fiches, 0,020 $ la fiche** ; durée médiane 3,6 s. Les deux passes donnent
presque la même chose : la lecture est stable.

**Ce qui est juste** : noms, téléphones dictés en lettres, e-mails, budgets ambigus laissés vides,
la contradiction « pas de travaux / un rafraîchissement ça va », le financement, les disponibilités
dans les Notes, les critères doux (aucun manqué, aucun en trop), la piscine de N4 en champ et non en
critère doux.

**Ce qui ne va pas** — c'est ce que la mesure sur Claude 5.5 devra dire, et ce que l'application
devra rattraper :

1. **Le motif inventé** : « résidence principale » posée sur 6 cas sur 11 où les notes n'en disent
   rien, aux deux passes, sans aucune source. Le modèle remplit la liste au lieu de la laisser vide. Ce peut être en partie l'effet
   du nouveau schéma (`null` dans la liste) : la même mesure sur Claude 5.5 le dira. Le délai
   « trois mois » de N6 est aussi déduit (« acte en février »), pas écrit.
2. **Deux mentions personnelles, aux deux passes** : « cash (vente Stockholm) » recopié comme
   source du financement (N4 : patrimoine et lieu de vie) ; « pas de voiture le w-e » recopié dans
   les mots d'un critère doux (N5). La consigne interdit les sources et les mots, et le modèle le
   fait quand même : **la garde au serveur sur les sources et les mots n'est pas facultative.**
3. **Des ★ inventés** : le budget ★ sur deux exports de logiciel, une fois sur deux (C2, C4 : une
   colonne « budget max » n'est pas « indispensable ») ; le type et les communes ★ de N6, tirés de
   « maison plain-pied obligatoire ». Le type ★ se défend, les communes non. Le corrigé de N6 est
   peut-être à relire sur ce point avant la mesure sur 5.5 (`must_have_accepte`).
4. **Un nom de commune faux** : « Châteauneuf-de-Grasse » au lieu de Châteauneuf-Grasse (N4, aux
   deux passes). La commune reconnue au serveur par geo.api.gouv.fr (M103) le rattrapera.
5. **Une case non cochée lue comme un refus** : parking « non » sur C4, à la passe 1 seulement.

## Sonnet 4.6, première mesure : le classement des 73 annonces

- **Cachet : 12 / 12 conformes**, y compris les faux amis (le charme du village, le collège
  « Pierre » Bertone, la villa de 2025 « au charme provençal »).
- **Calme : 63 / 73 conformes.** Les 10 écarts :
  - 4 annonces ne disent le calme que par l'**étiquette** SeLoger « Calme » : le modèle l'ignore et
    répond « rien ». À trancher pour la fiche : une étiquette du portail vaut-elle « clairement » ?
    La consigne ne le dit pas ;
  - 2 lus « contraire » là où l'annonce ne dit rien (le modèle tire un bruit d'un passage) : le
    plus gênant, car « contraire » fait descendre un bien ;
  - 3 « rien » à tort : 2 annonces disent le calme sans le mot (le corrigé y voit un indice), 1 le
    dit en toutes lettres ; et 1 « clairement » là où le corrigé voit une réserve.
- **Citations mot pour mot : 65 / 66.** Celle qui manque (« au calme absolu, au calme et sans
  nuisance ») recolle deux passages. La vérification au serveur l'aurait refusée et le jugement
  serait tombé : la garde prévue marche.
- **Coût : 0,271 $ pour 73 annonces, ≈ 0,004 $ l'annonce.**

## « Résidence principale » : noté, mais caché par le score (question du 12/11)

Le motif (`purpose`) **est noté** : il est dans la liste des champs du barème. Quand le corrigé ne
l'attend pas et ne le tolère pas, il doit rester vide, et « résidence principale » y compte comme
**inventé** : ce sont 12 des 21 « inventés » de la première mesure. Mais le score affiché, 208 / 210,
ne comptait que les champs **attendus remplis** ; un champ attendu vide n'y entrait pas, juste ou
faux. Rien n'est donc à ajouter aux corrigés : c'est le score qui trompait. Il dit désormais
**« champs justes en tout »**, les 22 champs de chaque fiche, remplis et vides (22 × 11 cas × 2
passes = 484) : la première mesure fait **467 / 484** sur le barème du 11/11.

## Les règles du 12/11, appliquées à la consigne et aux corrigés

1. Un champ dont les notes ne disent rien reste vide, sans valeur par défaut, motif et délai
   compris.
2. Un achat comptant va dans Financement, « comptant, à vérifier » (`cash_to_verify`), sans
   l'origine des fonds ; une contrainte pratique de visite (pas de voiture le week-end) peut aller
   en Notes, suivie de « (à vérifier) » ; aucune autre mention sur la personne, sources comprises.
3. Deux ★ au plus, seulement parmi Communes, Budget, Extérieur, Parking, Piscine, Ascenseur ; jamais
   le type de bien ; le budget seulement s'il est dit ferme, jamais tiré d'une colonne d'export.
4. Une étiquette « Calme » du portail vaut le calme, marquée « à vérifier ».

Corrigés modifiés en conséquence, **après** la première mesure (ils avaient été écrits avant ; la
modification suit des règles nouvelles, pas les réponses du modèle) : N4 attend `cash_to_verify` ;
N5 permet « voiture » dans les seules Notes, suivi de « à vérifier » ; l'étage (N1, C1) et la
copropriété (N6) ne sont plus des ★ tolérés ; les 6 annonces où seule l'étiquette dit le calme
portent `calme_a_verifier`. Le barème refuse aussi plus de deux ★.

**À reporter dans la fiche du code** (elle n'est pas modifiée) : `buyers.financing` n'a que validé,
en cours, inconnu ; « comptant, à vérifier » serait une proposition à l'écran, que le conseiller
transforme en « Validé » ou non, sans colonne nouvelle.

## Avant et après les règles : les fiches (Sonnet 4.6)

| | Avant, barème du 11/11 | Avant, corrigés du 12/11 | **Après les règles** |
|---|---|---|---|
| Champs justes en tout (sur 484) | 467 | 465 | **482** |
| Champs attendus remplis justes | 208 / 210 | 208 / 212 | **211 / 212** |
| Champs faux | 3 | 9 | **2** |
| Inventés (champs et ★) | 21 | 25 | **2** |
| Mentions personnelles | 4 | 4 | **1** |
| Coût de la fiche | 0,020 $ | — | 0,020 $ |

La colonne du milieu renote, sans appel, les réponses de la première mesure sur les corrigés du
12/11 : c'est elle qu'il faut comparer à la dernière. Ce qu'il reste :

- **« vente Stockholm » recopié une fois sur deux** (N4, passe 2), dans la source du financement,
  alors que le financement lui-même est juste (« comptant, à vérifier »). La consigne ne suffit pas :
  la garde au serveur sur les sources reste nécessaire.
- **La commune ★ de N6**, aux deux passes, sans source : « maison plain-pied obligatoire » en fait
  encore un indispensable (le type ★ a disparu).
- **« Châteauneuf-de-Grasse »** au lieu de Châteauneuf-Grasse (N4, passe 2) : voir la vérification
  des communes ci-dessous.
- **Une case non cochée lue comme un refus** (C4, parking, passe 1).

Disparus : le motif inventé (12 fois), le délai déduit, les ★ du budget tirés d'un export, l'étage
★, « pas de voiture » hors des Notes (désormais « Pas de voiture le week-end (à vérifier). » en
Notes, aux deux passes), le financement comptant posé en « validé ».

Une correction de **mon barème** en route : la source de la note permise (`notes : « pas de voiture
le w-e »`) était comptée comme une mention ; elle suit désormais la règle des Notes. Les deux
mesures sont renotées avec ce barème.

## Avant et après les règles : le classement (Sonnet 4.6)

| | Avant | **Après** |
|---|---|---|
| Calme conformes | 63 / 73 | **69 / 73** |
| Calme par l'étiquette seule, marqué « à vérifier » | — | **6 / 6** |
| Cachet conformes | 12 / 12 | 12 / 12 |
| Citations mot pour mot | 65 / 66 | 67 / 68 |
| Coût pour 73 annonces | 0,271 $ | 0,290 $ |

## Les 6 autres écarts du calme

Hors des 4 étiquettes, la première mesure avait 6 écarts ; 2 ont disparu d'eux-mêmes, 4 restent.

| Rang | L'annonce dit | Corrigé | Lu avant → après | Pourquoi |
|---|---|---|---|---|
| 17 | Cannes, « proche gare », « à 10 minutes à pied de la gare » | rien | contraire → **rien** | La proximité d'une gare, sans un mot sur le calme, n'est pas le contraire du calme. Corrigé sans changer la consigne : c'est l'écart d'une passe à l'autre. |
| 57 | Antibes, « à proximité immédiate du Port Vauban, de la gare, du centre-ville » | rien | contraire → **rien** | Le même cas. |
| 5 | Antibes, « un environnement calme », « entre calme résidentiel et proximité des commodités », mais « à quelques minutes … des principaux axes de circulation » | réserve | clairement → clairement | Le contre-signal est écrit comme un atout : le modèle ne le lit pas comme une nuance. |
| 58 | Le Thoronet, « une vie confortable … dans un cadre récent et serein » | clairement ou réserve | rien → rien | « Serein » n'est pas dans les exemples de la consigne. |
| 64 | Roquefort-les-Pins, « une véritable sensation de quiétude » sur le terrain, et « à proximité … des grands axes » | clairement ou réserve | rien → rien | « Quiétude » non plus. |
| 70 | Opio, « une région prisée pour sa tranquillité » | clairement ou réserve | rien → rien | C'est la région, pas le bien : la règle du cachet (« le charme du village n'est pas le cachet du bien ») donne raison au modèle. **Le corrigé est à revoir.** |

Propositions, à trancher par Jean-Guy avant la mesure sur 5.5 :
- **Consigne** : ajouter « serein, sérénité du cadre, quiétude » aux exemples du calme ; « la
  proximité d'une gare ou du centre, sans un mot sur le calme, vaut "rien", jamais "contraire" » ;
  « la proximité de grands axes nuance le calme, même présentée comme un atout ».
- **Corrigé** : rang 70, accepter « rien » (la tranquillité d'une région n'est pas celle du bien).

La citation du rang 13 (« au calme absolu, au calme et sans nuisance ») colle encore deux passages
de l'annonce : la vérification mot pour mot au serveur la refuse, et le jugement tombe, comme prévu.

## Les communes : la vérification proposée (pas codée)

Le modèle écrit « Châteauneuf-de-Grasse » ; la commune officielle est Châteauneuf-Grasse (06038).
Mesuré le 12/11 : la recherche par nom de geo.api.gouv.fr ne la trouve pas (aucun résultat pour
« Châteauneuf-de-Grasse » ni pour « St-Laurent-du-Var »). La recherche floue ne suffit donc pas.

**La vérification, au serveur, pour chaque commune lue :**
1. **La liste officielle du département**, par la porte qui existe déjà
   (`geoProvider(isDemo).fetchDepartmentCommunes`, M114 ; table locale des Alpes-Maritimes pour
   l'agence de démo) : les départements de l'agence (son adresse, ceux de ses dossiers et de ses
   acquéreurs).
2. **La comparaison** : le nom normalisé comme partout (`normalizeCommuneName`, M71 : accents,
   tirets, St / Ste), puis sans les petits mots (de, du, la, le, les, sur). Essayé hors du dépôt sur
   les 163 communes du 06 : « Châteauneuf-de-Grasse » → Châteauneuf-Grasse, « St-Laurent-du-Var » →
   Saint-Laurent-du-Var, « Opio » → Opio.
3. **Le nom d'usage** (Juan-les-Pins, Golfe-Juan, Cros-de-Cagnes, M86) est gardé tel que lu, comme
   l'acquéreur l'a dit (M117), reconnu par la liste des alias ; un arrondissement par M99.
4. **Le résultat** : une seule commune trouvée, elle est proposée sous son nom officiel avec la
   pastille « À vérifier » et « lu : Châteauneuf-de-Grasse » ; aucune ou plusieurs (« Cagnes »,
   « Châteauneuf » seul), le champ reste à la main du conseiller, jamais deviné (M38, M103) ; le
   service en panne, la commune reste telle que lue, marquée « commune non vérifiée » (M104), jamais
   lue comme « aucune commune » (M98).
5. **Les tests** : les cas N1 à C5 (Juan, St-Laurent, Châteauneuf), un nom absent, deux homonymes,
   le service en panne, l'agence de démo sans appel réseau.

## Ce que la mesure valide

- **Le dossier d'essais et le barème tiennent**, avec le score « en tout », qui ne cache plus les
  champs attendus vides. Restent à relire : le corrigé du rang 70.
- **Les règles du 12/11 marchent sur Sonnet 4.6** : 482 / 484, inventés de 25 à 2, mentions de 4 à
  1, calme de 63 à 69 sur 73, l'étiquette « à vérifier » 6 fois sur 6, au même coût.
- **Deux gardes au serveur restent nécessaires**, quoi que dise la consigne : les mentions
  personnelles dans les sources et les mots, et les citations mot pour mot.
- **Rien ne choisit encore entre Sonnet et Haiku** : Haiku n'a pas été relancé (pas encore ouvert).

## La suite

1. Jean-Guy tranche les trois propositions du calme et le corrigé du rang 70.
2. Jean-Guy ouvre Haiku 4.5 une fois dans le Playground (compte administrateur), puis je relance
   Haiku seul.
3. Dès que le compte a accès à Claude 5.5 : lire par l'API les régions des profils
   `eu.anthropic.claude-sonnet-5-5` et `eu.anthropic.claude-haiku-5-5`, puis la même mesure, d'une
   commande (`M151-essais/README.md`), qui choisit le modèle.
