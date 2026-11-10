# M151 — La mesure, avant la fiche (10/11)

Demande de Jean-Guy (10/11) : avant de préparer « L'acquéreur depuis mes notes », mesurer sans rien
modifier (1) ce que Stream Estate sait faire des mots d'une annonce, (2) ce que disent de vraies
descriptions pour « calme » et « cachet », (3) le choix de l'IA. Rien n'a été écrit en base ni dans
le code. Fichiers de travail hors du dépôt (scratchpad de la session).

## 1. Stream Estate : les mots, la description, les photos

**Ce que dit sa documentation.** Le serveur MCP officiel de Stream Estate (`mcp-stream-estate` 1.0.3,
npm, lu sans l'exécuter) déclare une recherche plein texte, `expressions` : un mot ou une phrase,
inclus ou exclu, cherché « dans le titre et la description ». Il déclare aussi
`constructionYearMin/Max`, `publisherTypes`, `withCoherentPrice`, `bedroomMin`… La page OpenAPI de
l'API répond 401 sans clé, puis 500 avec la clé : elle n'est pas lisible.

**Ce que fait l'API (mesuré le 10/11, maisons à Vence, 06157, une annonce par appel).** 10 annonces
facturées au total, ≈ 0,10 €, par un script hors de l'application : hors du compteur de l'agence.

| Appel | Total | Premier bien | Conclusion |
|---|---|---|---|
| Sans mot | 2 810 | 74f0f6be… | référence |
| `calme` inclus | 2 810 | le même | rien ne change |
| `calme` **exclu** | 2 810 | le même, dont la description dit « calme » | **l'exclusion n'est pas appliquée** |
| `cachet` OU `caractère` | 2 810 | le même | rien ne change |
| `caractère` ET `calme` | 2 810 | le même | rien ne change |
| mot absurde `xqzwvkjh`, 4 écritures différentes | 3 431 (sans `expired`) | le même | **le paramètre est ignoré, quelle que soit l'écriture** |
| `constructionYearMax=1800` | 10 | un bien « construit en 1200 » | lu, mais il **écarte** toute annonce sans année, et l'année est fausse |

- **Recherche ou exclusion par mots : non**, avec notre clé, sous les quatre écritures essayées
  (celle du MCP officiel comprise). C'est la règle de la M136 : un paramètre absurde dit tout de
  suite s'il est lu. Question à poser au support de Stream Estate : option à activer, autre écriture,
  offre payante ?
- **Année de construction** : filtre réel, mais c'est un filtre qui écarte, sur une donnée rare et
  fausse ; inutilisable pour un critère doux, qui n'écarte jamais.
- **La description complète est dans la réponse, sans coût de plus** : `description` sur le bien
  (1 328 caractères ici) et sur chaque annonce, avec les étiquettes `features` (« calme »,
  « Sans vis-à-vis »…). On paie l'annonce (0,01 €), pas ses champs. Aujourd'hui le code la jette
  (`stream-estate.ts` : « contacts, descriptions… ignorés », décision du 05/10).
- **Les photos aussi** : `pictures` (5 adresses ici) et `pictures` par annonce, déjà lues par ACM.

Conséquence : Stream Estate ne cherchera pas « au calme » pour nous. La recherche reste celle
d'aujourd'hui (champs structurés, même coût) ; ce sont les **biens reçus** qu'ACM classe, en lisant
leur description et leurs étiquettes, qu'il a déjà payées.

## 2. Ce que disent 73 vraies descriptions

Pas 30 : les réponses Stream Estate gardées pour les tests ont été taillées (aucune description).
Le corpus est celui des concurrents importés de vraies annonces publiques, lus dans la sauvegarde du
09/11 (lecture locale) : **73 annonces, 51 SeLoger et 22 Bien'ici, 49 appartements et 24 maisons**,
description médiane 1 176 caractères. Les 45 biens des réponses Stream Estate gardées n'ont que les
étiquettes.

### « Calme »

| Ce qu'on cherche | Annonces |
|---|---|
| Dit « calme », « au calme », « paisible », « tranquillité » (description ou étiquette) | **45 sur 73** |
| … dont un indice fort (« calme absolu », « aucun passage », « sans vis-à-vis », impasse, domaine privé) | 17 |
| … dont un contre-signal dans la même annonce | 5 : « résidence calme, à proximité immédiate de l'hôpital » ; « rue calme, à deux pas du boulevard Carnot… accès rapide à l'autoroute A8 » ; « au calme absolu… futur tramway à proximité » ; « proche des axes de circulation » ; « à proximité immédiate de la gare » |
| N'en dit rien | 28 (ce n'est pas « bruyant » : c'est inconnu) |
| Étiquette « Calme » (SeLoger) | 23 ; 17 disent aussi « calme » dans le texte, 6 seulement par l'étiquette |
| Vis-à-vis | 8 « sans vis-à-vis » … et 1 « léger vis-à-vis, compensé par l'ouverture » |
| Étiquettes Stream Estate (45 biens) | « calme » 12, « sans vis-à-vis » 9, « belle vue » 8 |

Une partie du calme n'est qu'à l'intérieur : « les chambres donnent sur l'arrière de l'immeuble et
sont au calme », « l'espace piscine est remarquablement calme ».

### « Cachet »

| Mot | Annonces |
|---|---|
| « cachet » | **0** |
| « caractère » | 2 |
| « charme », « charmant(e) » | 14 |
| « provençal(e) », « mas », « bastide » | 7 |
| « cheminée » | 8 |
| « poutres apparentes », « pierres » | 2 et 2 |
| « résidence bourgeoise des années 1950 », « belle hauteur sous plafond », « résidence ancienne » | 1 chacune |

Une liste large touche **24 annonces sur 73**. Relues une à une : **6 sont vraiment « de caractère »**
(« maison provençale… plafond aux poutres apparentes, cuisine rustique » ; « résidence bourgeoise des
années 1950… belle hauteur sous plafond » ; « maison de caractère… entre authenticité et confort
moderne »), 6 à moitié (« mas provençal récent (2002), sols en pierres, tuiles anciennes »), et
**12 sont fausses** :

- le charme du village, pas de la maison : « plongez dans le charme de Biot », « à proximité du
  charme du Vieux-Cannet » ;
- un nom propre : « le collège **Pierre** Bertone », « le centre **ancien** et la mairie » ;
- le mot creux de l'agent : « charmant studio… résidence de 2011 », « charmant T3 » ;
- le contraire : « villa contemporaine au charme provençal, achevée en 2025 » ; « cheminée avec
  insert » dans une villa de 1996.

### « Lumineux »

34 annonces sur 73 le disent, 32 parlent de soleil ou d'exposition sud : presque toutes.

### Une liste de mots suffit-elle ? Non.

- **Pour le calme, elle ne trie rien** : 45 annonces sur 73 le disent, presque autant que
  « lumineux ». Ce qui compte, c'est la force (« calme absolu, aucun passage » face à « résidence
  calme ») et le contre-signal (l'hôpital, le boulevard, le tramway) : une liste ne les voit pas, et
  lit « léger vis-à-vis » comme « vis-à-vis ».
- **Pour le cachet, elle se trompe une fois sur deux** et rate le vocabulaire : le conseiller dit
  « cachet », l'annonce dit « poutres apparentes » ou « résidence bourgeoise ».
- **Ce qui marche** : lire la phrase, juger « dit clairement / dit avec réserve / n'en dit rien /
  dit le contraire », et **citer les mots exacts de l'annonce**. La citation se vérifie au serveur
  (elle doit se trouver mot pour mot dans la description, sinon le jugement tombe) : l'IA ne peut pas
  inventer une raison, et le conseiller juge sur pièce.
- La liste de mots garde un rôle : un premier tri gratuit, et le repli quand le budget d'IA du mois
  est atteint (elle dit alors « l'annonce mentionne « calme » », jamais plus).

## 3. Le choix de l'IA

Deux lectures très différentes : **les notes** (rares, une photo ou un texte, données personnelles
du client : nom, téléphone, budget) et **les annonces** (nombreuses, textes publics, sans le nom du
client : seuls ses critères doux partent).

### Le coût (tarifs publics d'Anthropic au 06/10/2026, en dollars par million de jetons)

| Modèle | Entrée / sortie | Une fiche (photo ≈ 1 600 jetons, consignes ≈ 2 000, réponse ≈ 1 500) | Classer 60 annonces (≈ 25 000 jetons en entrée, ≈ 4 000 en sortie) |
|---|---|---|---|
| Claude Haiku 5.5 | 0,10 / 0,50 | ≈ 0,001 € | ≈ 0,005 € |
| Claude Sonnet 5.5 | 2 / 10 | ≈ 0,02 € | ≈ 0,09 € |
| Claude Opus 5.5 | 4 / 20 | ≈ 0,045 € | ≈ 0,18 € |

Estimations à confirmer par la mesure (étape 0 de la fiche). Ordre de grandeur pour une agence
active, 40 fiches et 40 recherches par mois : **≈ 1 €** (Sonnet pour les notes, Haiku pour les
annonces), ≈ 4,5 € tout en Sonnet. À comparer aux 0,60 € d'une seule recherche Stream Estate.

### L'hébergement et la conservation

| | Où les données sont traitées | Conservation par le fournisseur | Ce qu'il faut |
|---|---|---|---|
| **Claude par Amazon Bedrock, région Paris (eu-west-3) ou Francfort** | Dans l'Union européenne | Amazon ne garde ni les entrées ni les sorties et ne les transmet pas à Anthropic (à vérifier au contrat) | Un compte AWS ; la disponibilité de Sonnet 5.5 et Haiku 5.5 dans ces régions, **à vérifier** (je ne peux pas la lire d'ici) |
| Claude par l'API d'Anthropic | « global » par défaut, ou États-Unis ; **aucune option Europe** | 30 jours par défaut ; zéro conservation sur accord d'Anthropic | Une clé ; le plus simple à brancher |
| Claude par Google Vertex AI, région Europe | Dans l'Union européenne | Comme Bedrock, à vérifier au contrat | Un compte Google Cloud |
| Mistral (société française) | Dans l'Union européenne | 30 jours, zéro conservation sur demande (à vérifier) | Non mesuré sur l'écriture manuscrite |

Aucun de ces services n'entraîne ses modèles sur les données envoyées par API (conditions
commerciales, à faire confirmer pour le contrat retenu).

**Décidé par Jean-Guy le 10/11** : Claude par Amazon Bedrock, **profil d'inférence UE** (les
données restent dans l'Union européenne, mais peuvent être traitées dans plusieurs pays de l'Union).
La recommandation d'origine disait : Claude par **Amazon Bedrock, en région Paris**, si les deux modèles y sont ;
Sonnet 5.5 pour lire les notes (rare, une erreur coûte une fiche fausse), Haiku 5.5 pour classer les
annonces (volume, textes publics). C'est le seul choix qui laisse les notes en Europe sans
conservation chez le fournisseur : le plus simple à défendre devant le juriste. Le choix final se
fait sur la mesure de l'étape 0 (10 notes et 5 fiches inventées, moins de 1 €).

### Le plafond par agence, comme Stream Estate

Même mécanique que la M100 et la M105 : chaque lecture **réserve** son coût maximal avant l'appel,
dans une seule opération en base, et rend la part non utilisée après ; plafond mensuel par agence,
**10 € par défaut**, réglé par un opérateur en bas de `/erreurs` (M100), lu par le manager sur
Administration, jamais réglé par lui (M55) ; atteint, la lecture des notes est refusée et le dit,
le classement retombe sur la liste de mots ; l'agence de démonstration ne fait aucun appel (M114).
