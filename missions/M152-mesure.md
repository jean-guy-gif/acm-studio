# M152 — La mesure, avant la fiche (11/11)

Demande de Jean-Guy (11/11) : mesurer ce que Stream Estate et nos imports fournissent vraiment
(photos, texte complet, dates), et dire si ACM garde une copie datée de l'annonce importée. Lu sans
rien modifier : la sauvegarde du 09/11 (lecture locale), les réponses Stream Estate déjà payées et
gardées en base, le code de `main` (3b45ea9). Aucun appel payant.

## 1. ACM garde-t-il une copie datée de l'annonce importée ? Non, pas entière.

| Ce qui est gardé | Où | Daté ? | Peut-il changer ? |
|---|---|---|---|
| **Chaque prix relevé sur la page de l'annonce**, avec la date de publication lue | `listing_observations` (M47) : 284 relevés pour 107 annonces, 2 en médiane, 12 au plus | Oui, au jour (`observed_on`) | **Non** : une ligne par annonce et par jour, jamais modifiée |
| Le prix révélé au vendeur | `live_seller_responses` (M96) | Oui | Non : figé à la devinette |
| Le prix au rendez-vous | `comparables.meeting_price` (M127) | Oui | Non : figé à la conclusion |
| Le texte, les adresses des photos, les étiquettes, le prix courant | La ligne du concurrent (`comparables`) | Seulement la date d'import (`created_at`) | **Oui** : la relecture des prix (M105) n'y réécrit que le prix et le retrait, mais le formulaire « Modifier la fiche » laisse le conseiller changer à la main le prix, les photos et le texte, sans historique |
| Les photos elles-mêmes | Nulle part : les adresses pointent chez le portail | — | Elles disparaissent quand le portail les retire |

Conclusion : la **preuve du prix existe** (les relevés datés, immuables). Une **copie de
l'annonce** (texte, photos, prix, date) n'existe pas en l'état : il faudrait la figer à l'import,
dans une table où l'on n'écrit qu'une fois (question 3 de la fiche).

## 2. Nos imports (92 concurrents réels, hors démo et test)

| Source | Annonces | Photos | Texte | Date de publication |
|---|---|---|---|---|
| SeLoger | 54 | **10 en médiane** (1 à 20) | 51 sur 54, complet (médiane 1 112 caractères) ; 46 finissent par « Voir plus », le libellé du bouton de la page, pas une coupure | 51 sur 54 |
| Bien'ici | 22 | **11 en médiane** (5 à 20) | 22 sur 22, complet (médiane 1 258 caractères) | 19 sur 22 |
| Saisis à la main | 15 | aucune | aucun | aucune |
| Créé depuis la recherche (M101, Figaro) | 1 | 5 | aucun | aucune |

- **Les photos vivent encore** : 228 sur 230 testées (les trois premières de chaque annonce)
  s'affichaient le 11/11, jusqu'à plus de 30 jours après l'import. Elles restent sur les serveurs des
  portails (`mms.seloger.com`, `file.bienici.com`) : ACM ne les copie pas (sauf la photo choisie pour
  un courrier, M87).
- **Ce que disent les textes** (73 annonces) : 32 nomment l'agence ou un de ses agents (« VISITES :
  [nom de l'agent] », carte professionnelle, assureur), 19 disent « exclusivité », 6 portent un
  numéro et une rue. Aucun ne donne de téléphone.

## 3. Stream Estate (réponses déjà payées : 8 résultats gardés, 105 biens)

- **Photos** : ACM garde `pictures`, des copies hébergées par Stream Estate (`pictures.notif.immo`) :
  **5 au plus** — 86 biens sur 105 en ont 5 à 9 (plafond observé : 5), 17 n'en ont qu'une. La même
  réponse porte aussi `picturesRemote`, **jusqu'à 20 adresses de photos d'origine** (chez le
  portail), qu'ACM jette aujourd'hui.
- **Texte** : la description complète est dans la réponse, sur le bien et sur chaque annonce
  (1 328 caractères sur le bien mesuré le 10/11), sans coût de plus ; ACM la jette (05/10 ; la M151
  la lira pour juger, sans la garder).
- **Dates** : `createdAt` (le premier passage de Stream Estate, pas la date du portail, M101),
  `updatedAt`, `lastCrawledAt`, `expiredAt` ; les baisses datées (`events`) ; `daysOnMarket` absent
  sur les 45 biens des réponses de test et sur le bien mesuré le 10/11.
- **Ce que garde le résultat payé** (`stream_estate_results`, liste d'autorisation) : clé, adresse
  de l'annonce, commune, prix, titre, étiquettes, terrain, photos (les 5), pièces, DPE, prix au m²,
  surface, type ; **ni texte, ni photos d'origine, ni dates du portail**.

## 4. Les biens de l'agence et les biens proposés

- **Mandat de l'agence** (bien vendeur) : **13 photos en médiane** (20 au plus, 3 biens sur 16 sans
  photo), dans notre stockage ; une description sur 13 biens sur 16, et les points forts.
- **Bien d'une sélection acquéreur** (`buyer_selection_items`, 14 lignes : 12 annonces, 2
  mandats) : `snapshot` garde ce que la recherche disait (sans texte), `imported` ce que l'import
  par l'extension a lu (texte et photos compris) quand le bien a été retenu.
- **Bien démarché** (`buyer_prospects.facts`, M120 A) : ses faits et ses photos, jamais son texte,
  par décision.

## 5. Avant le rendez-vous : ce qui existe

La relecture des annonces par l'extension (M105, `refresh-competitor-price`) sait déjà dire « prix
changé », « annonce retirée » (sur preuve, M103) ou « illisible », sans appel payant ; elle est
**réservée aux dossiers conclus** (`status = meeting_completed`) et ne s'affiche qu'au Suivi et en
Prospection.

## 6. Rappel : la suppression des anciennes tables (M147)

`address_dossiers`, `living_here_sheets`, `buyers.sector_priorities`, `buyers.living_place` et
`buyer_visit_requests.living_place_trip` : suppression promise **deux semaines après la mise en
production de la M147**, après sauvegarde (DECISIONS, 09/11). La partie A est en production depuis
le **09/11** (fusion dans `main` à 21 h 42) : **date limite le lundi 23/11/2026**. Le texte qui le
promet (« effacés au plus tard le [date + 2 semaines] ») est celui proposé au juriste
(`M147-confidentialite-pour-le-juriste.md`) : `/confidentialite` ne le dit pas encore, la page
attend son accord et décrit toujours l'ancien dossier d'adresse et l'ancien « Vivre ici ».
