# M151 — Mesure provisoire, plan B (12/11)

**Ce n'est pas la mesure qui choisit le modèle.** Le compte AWS n'a toujours pas accès à Claude 5.5
(« not available for this account », cas de support 179439470000287). En attendant, l'étape 0 tourne
sur une génération plus ancienne, pour valider le dossier d'essais, le barème et la méthode
(décision de Jean-Guy, 12/11). La fiche et le texte pour le juriste restent écrits pour Claude 5.5.

Trois mesures sur Sonnet 4.6 : la première (06 h 24), la deuxième après les règles de Jean-Guy du
12/11 (08 h 15), la troisième après ses décisions suivantes du 12/11 (08 h 46). Bilans bruts dans
`M151-essais/resultats/` : `bilan-2026-11-12-06-24.md`, `bilan-2026-11-12-08-15.md`,
`bilan-2026-11-12-08-46.md`, et les deux premières renotées sans appel sur les corrigés du 12/11
(`…-renote.md`, celles qui font foi pour les fiches) ; la troisième est aussi renotée sans appel
sur les dernières règles du 12/11 (`bilan-2026-11-12-08-46-renote.md`). **La troisième mesure est
concluante (Jean-Guy, 12/11) : il n'y en aura pas d'autre sur Sonnet 4.6.** Réponses brutes et 73
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

## Haiku 4.5 : refusé, puis laissé de côté

**Laissé de côté (Jean-Guy, 12/11)** : le coût du classement ne le justifie pas pour l'instant.

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

## Les décisions du 12/11 (suite), appliquées

- **Calme**, dans la consigne : tout mot qui dit le calme compte (serein, quiétude, paisible,
  tranquille et leurs proches) ; la proximité d'une gare, du centre ou des commerces, sans un mot
  sur le calme, vaut « rien », jamais « contraire » ; un grand axe ne nuance le calme que si le bien
  est dessus ou à côté. **Corrigés** : rang 5 « clairement » (« à quelques minutes des principaux
  axes » est un atout d'accès) ; rang 70, « rien » accepté. Les autres « réserve » du corrigé
  tiennent : le bien y est à côté (« à proximité immédiate de l'hôpital », « à deux pas du
  boulevard Carnot », « futur tramway à proximité »).
- **Fiches**, dans la consigne : une case non cochée d'un export vaut « inconnu » ; chaque ★ porte
  sa source (`must_have:<clé>`), et le barème compte à part ceux qui n'en ont pas, que le serveur
  refusera (ils ne sont plus « inventés » : ils ne seraient pas proposés).
- **Dans la fiche du code** : le ★ sans source refusé au serveur, la suggestion « Comptant, à
  vérifier », la vérification des communes, les sources jamais gardées.

## Les trois mesures (Sonnet 4.6)

| | 1re (06 h 24) | 2e (08 h 15) | **3e (08 h 46)** |
|---|---|---|---|
| **Fiches** — champs justes en tout (sur 484) | 465 | 482 | **482** |
| Champs attendus remplis justes | 208 / 212 | 211 / 212 | 211 / 212 |
| Champs faux | 9 | 2 | 2 |
| Inventés (champs et ★) | 25 | 2 | **0** |
| ★ sans source, refusés au serveur | — | — | 2 |
| Mentions personnelles | 4 | 1 | **3** |
| Coût de la fiche | 0,020 $ | 0,020 $ | 0,021 $ |
| **Classement** — calme conformes | 63 / 73 | 69 / 73 (71 / 73 sur les corrigés du jour) | **71 / 72** (1 annonce omise) |
| Étiquette seule, marquée « à vérifier » | — | 6 / 6 | 6 / 6 |
| Cachet conformes | 12 / 12 | 12 / 12 | 12 / 12 |
| Citations mot pour mot | 65 / 66 | 67 / 68 | **69 / 69** |
| Coût pour 73 annonces | 0,271 $ | 0,290 $ | 0,295 $ |

Les fiches des deux premières mesures sont renotées sur les corrigés du 12/11 ; la règle de la
source des ★ ne vaut que pour la troisième (les deux autres consignes ne la demandaient pas).

**Ce que dit la troisième mesure :**

- **Plus aucun inventé.** La commune ★ de N6 n'a pas de source, aux deux passes : le serveur la
  refusera. C'est exactement ce que la règle du 12/11 attrape.
- **Les mentions montent de 1 à 3, toutes dans les sources de N4** : « cash (vente Stockholm), pas
  de prêt » recopié aux deux passes comme source du financement (le financement lui-même est juste,
  « comptant, à vérifier »), et « suédois, parlent angl. » comme source de la langue. La consigne ne
  tient pas sur les sources : **la liste de mots refusés au serveur doit passer sur les sources**
  (reporté dans la fiche : la source tombe, le champ reste). Avec les sources jamais gardées
  (ci-dessous), ce qui reste est un affichage d'une ligne des notes du conseiller lui-même, à la
  validation ; la garde l'évite quand même.
- **La case non cochée** : C4, parking « non » encore une fois sur deux, malgré la règle. Le serveur
  ne peut pas la corriger seul (il ne voit pas la case) : à suivre sur Claude 5.5 ; à défaut, un
  « non » tiré d'un export pourrait être proposé décoché.
- **Châteauneuf-de-Grasse**, une fois sur deux : la vérification des communes la rattrapera.
- **Le calme** : les rangs 5 et 64 sont réglés (l'accès aux axes n'est plus une nuance,
  « quiétude » est lu). Deux écarts restent :
  - **le rang 70 manque à la réponse** : le modèle a sauté une annonce d'un lot de 8. Dans le code,
    une annonce absente de la réponse ne vaut jamais « n'en dit rien » sans le dire : elle se
    relance une fois, puis reste « non lue » (M98) ;
  - **le rang 58** (« un cadre récent et serein ») passe de « rien » à « contraire », en citant « dans un lotissement récent et agréable » : le modèle
    applique au calme la règle du cachet (« récent » est le contraire du cachet). Proposition pour
    la consigne : « récent » ou « contemporain » ne dit rien du calme.

## Les sources : gardées ou seulement montrées ? (question du 12/11)

**Dans la conception actuelle, elles ne sont que montrées**, mais rien ne l'interdisait. La planche 2
affiche « d'après : « … » » sous chaque champ, à la validation ; la fiche créée (planche 3) n'en
montre aucune, seulement « leurs mots » des critères doux, qui sont un champ validé, et « 15 champs
proposés, 15 gardés ». Principe 2 : « seuls les champs validés sont enregistrés ». Deux points
pouvaient les garder quand même : la trace (A.11, « les champs proposés et ceux gardés »), si on y
écrivait les valeurs proposées avec leur ligne ; et un brouillon de la proposition gardé côté
serveur entre la lecture et « Créer la fiche ».

**Pour que ce soit impossible** (reporté dans la fiche, principe 2) :
1. La lecture renvoie la proposition, sources comprises, à l'écran et n'écrit rien ; aucun
   brouillon en base. Une page rechargée perd la proposition : « Recommencer la lecture » refait un
   appel (≈ 0,02 €).
2. « Créer la fiche » n'envoie que les champs validés ; son schéma, en liste d'autorisation, n'a
   pas de champ pour les sources : même envoyées, elles ne s'écrivent pas.
3. La trace ne garde que les noms des champs proposés et gardés, jamais une valeur ni une ligne.
4. Le journal d'erreurs (M100) ne reçoit jamais la réponse du modèle, seulement la cause.
5. Un test : après « Créer la fiche », chaque ligne de source est cherchée dans toute la base,
   trace comprise : absente (comme le critère d'acceptation 3).

## Combien coûterait le classement de la veille (Sonnet 4.6)

Mesuré : **0,295 $ pour 73 annonces, 0,0040 $ l'annonce** (deux critères, calme et cachet ; profil
« EU », +10 % compris). La veille (M136) passe une fois par semaine par acquéreur prêt et facture
20 annonces au plus par passage. Pour **10 acquéreurs prêts**, 52 semaines sur 12 mois, et toutes
les annonces classées :

10 × 4,33 passages × 20 annonces = **866 annonces par mois, ≈ 3,5 $ (≈ 3 €)**, au plus.

- C'est un plafond : seuls les biens que la veille garde (nouveaux, sans indispensable contredit)
  ont besoin d'être classés, et un passage n'en garde souvent que quelques-uns.
- Le coût suit le nombre de critères doux de l'acquéreur : la réponse grandit avec eux (ici deux).
- Sur Claude 5.5, au tarif public : Sonnet 5.5 (2 / 10 $) ≈ 2,3 $ ; Haiku 5.5 (0,10 / 0,50 $)
  ≈ 0,12 $, à mesurer.
- Pour comparaison, la même veille chez Stream Estate : 866 annonces à 0,01 € ≈ 8,7 €, dans son
  plafond de 10 € (M136). Le classement tient dans le budget d'IA de 10 € par mois et par agence,
  avec la lecture des notes (≈ 0,02 € la fiche).

## Les dernières décisions du 12/11, sans nouvelle mesure

Reportées dans la consigne (`mesure.mjs`) et dans la fiche du code ; la troisième mesure est
renotée dessus, sans aucun appel.

1. **Chaque critère doux se juge sur ses propres mots** : un mot qui relève d'un autre critère
   (« récent », « contemporain » pour le cachet) ne dit rien du calme. C'est l'écart du rang 58.
   Dans la consigne du classement, avec « réponds pour chaque annonce, sans en sauter aucune ».
2. **Un « non » n'est accepté au serveur que si sa ligne d'origine le dit en toutes lettres**
   (« sans parking », « pas de », « non ») ; sinon il devient « inconnu ». Le barème note la fiche
   telle que le serveur la garderait. Sur la troisième mesure : le parking de C4 (« ☐ Garage »)
   redevient inconnu ; « stationnement;non » (C2) et « PAS de copropriété » (N6) restent.
3. **La langue** : « parlent angl. » remplit le champ Langue (N4 attend désormais « en », lu aux
   deux passes) ; la nationalité ne s'enregistre nulle part.
4. **Deux comptes de mentions personnelles** : dans les champs enregistrés, l'objectif est zéro ;
   dans les sources, seulement montrées et jamais gardées, elles sont tolérées. Cela remplace la
   garde des sources proposée plus haut (troisième mesure, « Les mentions montent ») : la garde du
   serveur porte sur ce qui s'enregistre.
5. **Les sources** : les cinq garanties sont validées ; l'écran prévient « Cette proposition n'est
   pas gardée : si vous quittez ou rechargez la page, elle sera perdue. », et quitter demande
   confirmation (dans l'écran pour un lien, celle du navigateur pour l'actualisation ou la
   fermeture). La phrase s'ajoute à la planche 2 avant le code.
6. **Une annonce absente de la réponse** : relancée une fois, puis « non lue », jamais « n'en dit
   rien ». Le barème la compte désormais (« annonces absentes de la réponse ») ; la troisième
   mesure en a une, le rang 70.
7. **Haiku 4.5 est laissé de côté.**

**La troisième mesure, renotée sur ces règles :**

| | 3e mesure | **3e, renotée** |
|---|---|---|
| Champs justes en tout (sur 484) | 482 | **483** |
| Champs attendus remplis justes | 211 / 212 | 213 / 214 (la langue attendue) |
| Champs faux | 2 | **1** : « Châteauneuf-de-Grasse », que la vérification des communes rattrapera |
| Inventés | 0 | 0 |
| ★ sans source, refusés au serveur | 2 | 2 |
| « Non » sans ligne qui le dise, ramenés à inconnu | — | 1 (C4, parking) |
| Mentions dans les champs enregistrés (objectif 0) | 3 en tout | **0** |
| Mentions dans les sources seulement montrées (tolérées) | | 3 (« vente Stockholm » × 2, « suédois ») |

Le classement n'est pas renoté (pas de nouvel appel) : 71 / 72, une annonce absente, et le rang 58
que la règle 1 vise.

## La stabilité du classement, à température 0 (12/11)

Deux passes identiques du classement des 73 annonces sur Sonnet 4.6, température 0 (comme le code),
SDK 0.36, consigne et corrigés des dernières règles du 12/11 (accord de Jean-Guy, ≈ 0,59 $ ; coût
réel 0,595 $). Bilan brut : `M151-essais/resultats/` (le plus récent).

| | Passe 1 | Passe 2 |
|---|---|---|
| Calme conformes | 73 / 73 | 73 / 73 |
| Calme par l'étiquette seule, « à vérifier » | 6 / 6 | 6 / 6 |
| Cachet conformes | 12 / 12 | 12 / 12 |
| Citations mot pour mot | 69 / 69 | 68 / 69 |
| Annonces absentes de la réponse | 0 | 0 |

**2 annonces sur 73 (2,7 %) changent de jugement d'une passe à l'autre**, contre 4 sur 72 (≈ 6 %)
entre deux mesures sans température :
- rang 25 : calme « clairement » → « avec réserve » ; les deux sont acceptés par le corrigé ;
- rang 70 : calme « clairement » → « rien » ; les deux sont acceptés (la tranquillité de la région,
  décision de Jean-Guy du 12/11).

Aucun changement ne fait passer une annonce d'un jugement juste à un jugement faux. La citation
manquée de la passe 2 (rang 25) recolle deux passages avec « … » : la vérification au serveur la
refuse et le jugement tombe à « rien », comme prévu.

## Ce que la mesure valide

- **Le dossier d'essais et le barème tiennent** : trois mesures se comparent, renotées sans appel ;
  la troisième est concluante (Jean-Guy, 12/11).
- **Sur Sonnet 4.6, avec les règles du 12/11** : 483 / 484 champs justes en tout, aucun inventé,
  aucune mention dans ce qui s'enregistre, calme 71 / 72, l'étiquette « à vérifier » 6 fois sur 6,
  citations 69 / 69, environ 0,02 $ la fiche et 0,004 $ l'annonce.
- **Les gardes au serveur, quoi que dise la consigne** (dans la fiche du code) : le ★ sans source,
  le « non » sans ligne qui le dise, les mots refusés sur ce qui s'enregistre, les citations mot
  pour mot, la commune vérifiée contre la liste officielle, l'annonce absente de la réponse.
- **Haiku 4.5 est laissé de côté** ; le choix du modèle se fera sur Claude 5.5.

## La suite

1. Ajouter à la planche 2 la phrase « Cette proposition n'est pas gardée… » avant le code.
2. Dès que le compte a accès à Claude 5.5 : lire par l'API les régions des profils
   `eu.anthropic.claude-sonnet-5-5` et `eu.anthropic.claude-haiku-5-5`, puis la même mesure, d'une
   commande (`M151-essais/README.md`), qui choisit le modèle.

## Les fiches, avec la ★ copropriété (12/11, après-midi)

Relance des seules fiches (11 cas × 2 passes, Sonnet 4.6, profil « EU », **température 0 comme le
code**), consigne alignée sur `model-request.ts` (sept ★, copropriété comprise ; « jours et heures où
ils peuvent visiter »), corrigé de N6 écrit avant (★ copropriété tolérée). Coût réel 0,456 $.
Bilan brut : `M151-essais/resultats/bilan-2026-11-12-14-14.md`.

| | Mesure du matin (sans température) | Cette mesure (température 0) |
|---|---|---|
| Champs justes en tout | 482 / 484 | 478 / 484 |
| Champs attendus remplis justes | 211 / 212 | 210 / 214 |
| Faux | 2 | 4 (N4 communes, C5 parking, aux deux passes) |
| **Inventés** | **0** | **2 (N5 : extérieur « oui », aux deux passes)** |
| Mentions personnelles dans les champs enregistrés | 0 | 0 |
| ★ sans source refusés au serveur | 2 | 0 |

- **N6** : aux deux passes, « Copropriété acceptée : non » et sa ★, chacun avec sa ligne d'origine
  « PAS de copropriété ni lotissement avec ASL » ; la garde la garde.
- **N5, l'inventé** : « RDC ok si jardinet » devient « Extérieur : oui », aux deux passes. C'est une
  condition, pas un souhait. À température 0 la réponse est la même à chaque passe : le défaut est
  stable, et c'est celui que le produit rencontrerait. Selon la fiche (étape 0), un champ inventé
  arrête la mission : la suite attend la décision de Jean-Guy.
- N4 : « Châteauneuf-de-Grasse » au lieu de Châteauneuf-Grasse ; la vérification des communes
  (A.3) le corrige à l'écran. C5 : un parking que la fiche CRM dit, lu vide (un oubli, pas une
  invention).
