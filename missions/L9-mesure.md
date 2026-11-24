# Lancement, mission 9 — ce que l'IA lit dans une annonce, et ce que coûtent les photos

Mesure du 24/11/2026, sur vingt annonces réelles (concurrents de vraies agences : SeLoger et
Bien'ici, Côte d'Azur surtout), avec le modèle de la production (Claude Sonnet 4.6, Amazon Bedrock,
profil « EU »). L'outil est `missions/L9-essais/photos.mesure.mjs` ; les annonces et les réponses
brutes restent hors du dépôt. La mesure a coûté 1,72 € sur le compte AWS, hors du forfait de toute
agence. Le dollar est compté pour un euro, comme dans le code.

## Ce que l'IA lit aujourd'hui, en cinq lignes

1. Elle lit **la description** de l'annonce et **les étiquettes du portail** (« Calme »,
   « Terrasse »…), rien d'autre.
2. Elle n'y cherche que **« ce qui compte pour eux »** sur la fiche (dix critères possibles : au
   calme, sans vis-à-vis, du cachet, lumineux, une vue, de plain-pied, traversant, commerces et
   écoles à pied, jardin sans gros entretien, prêt à vivre). Une fiche sans aucun de ces critères
   ne fait rien lire.
3. Elle **ne lit pas** les photos, le titre, le prix, l'adresse ni le lien. Le budget, les pièces,
   la surface, l'extérieur, le parking, la piscine, l'ascenseur, le DPE et la copropriété ne passent
   pas par elle : le code les juge sur les champs de l'annonce.
4. Elle lit **tous les biens gardés** par la recherche du marché (pas ceux qu'un indispensable
   écarte), les mandats et les concurrents de l'agence, et, la nuit, les biens gardés par la veille.
5. Elle rend, par critère, un verdict — dit clairement, avec réserve, n'en dit rien, dit le
   contraire — avec **les mots exacts de l'annonce**, vérifiés mot pour mot. Cela range les biens
   dans leur catégorie, n'en écarte aucun, et reste pour le conseiller seul.

## Le texte de toutes les annonces est lu

| Lecture du texte                      | Coût par annonce | Une recherche de 60 annonces | Durée d'un appel (8 annonces) |
| ------------------------------------- | ---------------- | ---------------------------- | ----------------------------- |
| 3 critères sur la fiche               | 0,0042 €         | 0,25 €                       | 6 s                           |
| 10 critères sur la fiche (le maximum) | 0,0086 €         | 0,51 €                       | 14 à 16 s                     |

Un défaut trouvé par la mesure : la production lançait trois appels à la fois. Une recherche de 60
annonces demandait donc trois vagues, soit 18 s avec trois critères mais environ 45 s avec dix, plus
que les 30 s du délai : les dernières annonces restaient « non lues ». Corrigé : les huit appels
d'une recherche partent ensemble. Mesuré sur 60 annonces et dix critères : **15,9 s, aucun refus du
fournisseur, 60 annonces jugées sur 60** (0,51 €).

## Les photos : le chiffre

Les six premières photos de chaque annonce (118 photos chargées sur 120, deux retirées par leur
portail), jugées sur les six critères qu'une photo peut montrer : lumineux, une vue, du cachet, sans
vis-à-vis, prêt à vivre, jardin sans gros entretien. Le calme, le plain-pied, le traversant et les
commerces à pied ne se voient pas sur une photo : ils restent au texte.

| Lecture des photos                             | Par photo | Par bien (6 photos) | Par acquéreur : les 5 biens les mieux classés |
| ---------------------------------------------- | --------- | ------------------- | --------------------------------------------- |
| Telles que servies (1 440 × 1 080 le plus souvent) | 0,0057 €  | 0,034 €             | **0,17 € par recherche**                      |
| Réduites à 640 px avant l'envoi                | 0,0023 €  | 0,014 €             | 0,07 € par recherche                          |

- **Par acquéreur, une recherche complète** (60 annonces lues, photos des 5 mieux classés) :
  de **0,42 €** (trois critères) à **0,68 €** (dix critères), dont 0,17 € pour les photos.
  Lire les photos de **tous** les biens coûterait 2 € de plus par recherche : d'où la règle « les
  mieux classés seulement ».
- Avec le plafond d'IA par défaut d'une agence (10 € par mois), cela fait entre quinze et
  vingt-quatre recherches par mois.
- Les deux tailles disent la même chose 111 fois sur 120 (93 %). Réduire les photos diviserait
  leur coût par 2,5, mais demande d'ajouter une bibliothèque de traitement d'images (`sharp`) : pas
  avant la livraison, voir la question plus bas.
- Une photo se lit en 2 à 4 s par bien ; les cinq biens partent ensemble, après le texte.

## Ce que valent les photos

- Là où le texte ne disait rien, les photos disent quelque chose 50 fois sur 120.
- Elles **contredisent** le texte 4 fois ; deux fois sur « sans vis-à-vis », que l'annonce
  affirmait. Et elles disent « le contraire » très souvent pour le vis-à-vis (14 biens sur 20, en
  ville) et le cachet (12 sur 20, des constructions récentes).
- D'où la règle retenue : **les photos ajoutent, elles ne retirent jamais.** Là où l'annonce ne dit
  rien, des photos qui le montrent comptent un point (comme un « avec réserve ») ; ce que l'annonce
  dit déjà ne compte pas deux fois ; un « contraire » vu sur les photos ne retire rien, il invite le
  conseiller à regarder.
- Le modèle ne rend que des **numéros de photos**, jamais un commentaire : « l'annonce n'en dit
  rien · les photos 2 et 5 le montrent, à vérifier ». Le conseiller regarde les photos lui-même.

## Ce qui est livré, et ce qui attend Jean-Guy

- **Livré** : le texte de toutes les annonces lu dans le délai (huit appels ensemble).
- **Codé, testé, éteint en production** : la lecture des photos des cinq biens du marché les mieux
  classés, dans la limite du plafond de l'agence (si le plafond ne couvre plus les photos, le texte
  seul est lu), la raison pour le conseiller seul. Les photos lues sont celles que donne le
  fournisseur de la recherche (Stream Estate), jamais celles d'un portail : le serveur ne lit pas
  les portails.
- **Pourquoi éteint** : la page de confidentialité validée dit que ce qui compte pour l'acquéreur
  « est comparé aux descriptions publiques des annonces ». Elle ne parle pas des photos, et elle
  doit dire ce que le code fait. Pour allumer : une ligne de code (`PHOTOS_DES_ANNONCES_LUES`) et,
  dans la page, « … aux descriptions publiques des annonces et, pour les biens les mieux classés,
  à leurs photos publiques … », puis « la lecture des notes d'un conseiller, des descriptions et des
  photos d'annonces ». C'est à Jean-Guy de le décider, et de le dire à la juriste.

## Questions, avec la réponse par défaut

1. **Allumer la lecture des photos ?** Par défaut : non, tant que la phrase de la page de
   confidentialité n'est pas décidée.
2. **Réduire les photos avant l'envoi (0,07 € au lieu de 0,17 € par recherche) ?** Cela ajoute
   `sharp` aux dépendances (déjà installé par Next.js, jamais appelé par notre code). Par défaut :
   non avant la livraison.
3. **Cinq biens, six photos ?** Par défaut : oui, ce sont les nombres mesurés.
