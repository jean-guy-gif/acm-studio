# MISSION 69 — « Ouvrir mes recherches » : ACM pré-remplit les portails, le conseiller n'a plus qu'à lire

**Date** : 5 octobre 2026 · **Origine** : Laurent — « dans mon outil, il y a déjà le bien avec toutes
ses caractéristiques : n'y a-t-il pas un moyen beaucoup plus simple pour l'utilisateur ? » ; contrainte :
gratuit (pas d'API payante).

## Objectif

Deux clics au lieu de quatre recherches à la main : **« Ouvrir mes recherches »** ouvre, dans le
navigateur du conseiller, les portails déjà filtrés avec les caractéristiques du bien vendeur.
**« Lire mes recherches »** lit tous les onglets ouverts d'un coup (M65 en lit un seul à la fois).

## Les formats d'adresse filtrée (relevés dans tes pages du 01/10, `__fixtures__/filtre/`)

| Portail | Adresse filtrée | Ce qui manque pour la construire |
| --- | --- | --- |
| Bien'ici | `/recherche/achat/nice-06000/appartement/4-pieces?prix-min=…&prix-max=…&surface-min=…&surface-max=…` | rien : tout se déduit du bien |
| SeLoger | `/classified-search?distributionTypes=Buy&estateTypes=Apartment&locations=AD08FR2038&numberOfRoomsMin=4&numberOfRoomsMax=4&priceMin=…&priceMax=…&spaceMin=…&spaceMax=…&projectTypes=Resale` | l'identifiant de lieu (`AD08FR2038` = Nice) |
| Maisons & Appartements | `/views/Search.php?lang=fr&TypeAnnonce=VEN&TypeBien=APP&villes=2123&bdgMin=…&bdgMax=…&surfMin=…&surfMax=…&nb_piece=4` | l'identifiant de ville (`2123` = Nice) |
| Green Acres | `?searchQuery=cn-fr-lg-fr-city_id-gr_3668-hab_appartement-on…` | l'identifiant de ville (`gr_3668`) ; prix, surface et pièces dans l'adresse : **à vérifier** |

## Critères d'acceptation

1. **Valeurs envoyées aux portails**, depuis le bien vendeur : type, commune, pièces exactes, surface
   à ±10 % avec un plancher de ±3 m² (M68), fourchette du conseiller **stricte**. La lecture garde
   ensuite ses crans habituels (M61).
2. **Ouverture** : c'est l'extension qui ouvre les onglets (`chrome.tabs.create`). Plusieurs
   `window.open` sur un clic seraient bloqués par Chrome. Les onglets sont **visibles** : le conseiller
   peut corriger un filtre sur le portail avant de lire.
3. **Identifiants de lieu appris, jamais devinés** : quand le conseiller lit une recherche SeLoger,
   M&A ou Green Acres faite à la main, ACM relève dans l'adresse de l'onglet l'identifiant de la
   commune et le garde (table commune → portail → identifiant, commune à toutes les agences, RLS
   lecture pour tout utilisateur connecté). Commune inconnue pour un portail : l'onglet s'ouvre sur la
   page de recherche du portail et l'écran dit « Première recherche à <commune> sur <portail> :
   réglez la commune une fois, ACM s'en souviendra ».
4. **« Lire mes recherches »** lit en une fois tous les onglets de recherche des portails, avec un
   récapitulatif par portail (annonces lues et retenues). Le choix d'un seul onglet (M65) reste
   possible.
5. Maison, appartement et studio : la correspondance des types par portail est testée (adresses
   construites pour un 4P de 80 m², un studio de 20 m² et une maison 5P de 150 m²).

## Maisons (décidé le 05/10 : même modèle que les appartements)

- Le type « maison » est porté par l'adresse de chaque portail (SeLoger `estateTypes=House`, Bien'ici
  `/maison/`, M&A `TypeBien=…` à relever, Green Acres `hab_house-on`).
- Si un portail accepte une **surface de terrain minimale** dans l'adresse, on ne l'utilise pas
  encore : on la relève seulement (le terrain départage, il ne filtre pas, décision du 01/10).
- Point de vigilance pour la mission suivante : sur trois portails, la surface d'une carte est le
  premier « m² » trouvé. Sur une maison, ça peut être le terrain. À mesurer sur les pages maisons
  ouvertes par cette mission, avant toute correction.

## Avant de coder (mesure, puis arrête-toi)

- Green Acres : le prix, la surface et les pièces peuvent-ils être portés par l'adresse ? Sinon, le
  conseiller les règle sur l'onglet, et l'écran le dit.
- Écris les adresses construites pour les 3 cas du point 5 (dont la maison, avec la valeur `TypeBien`
  de M&A pour une maison) ; je les ouvre à la main pour vérifier.

## Hors périmètre

Les quartiers, la pagination, toute lecture en arrière-plan sans onglet visible, toute API payante.

## Essai

Dossier 4P 80 m² à Nice : « Ouvrir mes recherches » → 4 onglets déjà filtrés → « Lire mes recherches »
→ liste fusionnée. Puis une commune jamais cherchée : le premier passage demande de régler la
commune, le second ouvre directement filtré.
