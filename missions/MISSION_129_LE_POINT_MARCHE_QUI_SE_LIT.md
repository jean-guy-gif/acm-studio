# MISSION 129 — Le Point marché qui se lit d'un coup d'œil

**Date** : 30/10/2026 · **Origine** : Jean-Guy, après un vrai Point marché imprimé (Biot, 30/10, PDF de
11 pages). Suite de la M127 et de la M127 B. Maquette validée par Jean-Guy :
`missions/maquettes/M129-ou-en-est-votre-prix-v2.png` (la v1 est l'étape d'avant, à ignorer).

Une branche, un `/valide`. Pas de migration : le choix du plus dangereux du jour vit dans le `summary`
du point (M127). Équipe complète ; un seul arrêt pour Jean-Guy : aucun, sauf si une migration devient
nécessaire (alors arrêt et question).

## Constats sur le PDF de Biot

- Page 9 blanche : le titre « Où en est votre prix » reste seul, la figure part à la page suivante.
- Les trois lignes de prix (M127 B) : sept symboles de légende, une échelle, des étiquettes inversées
  sur la ligne 3 (« plus haut 798 000 » à gauche de « plus bas 795 000 »). Un vendeur ne sait pas où il
  est.
- Un « nouveau venu » est « vu sur le marché depuis le 17/06/2025 », plus d'un an avant le rendez-vous
  du 21/10/2026 : il n'aurait jamais dû passer le filtre « vu après le rendez-vous » (M127 B).
- Des nouveaux venus à 400 000 € proposés pour un mandat à 849 000 € : le plafond seul ne suffit pas.
- Le plus dangereux ne se voit pas sur sa fiche.

## A. « Où en est votre prix » devient un classement (remplace les trois lignes)

1. La page suit la maquette v2, de haut en bas :
   - **le verdict**, de la couleur de la place actuelle : « Pas de problème : vous êtes 2e sur 8 »,
     « Attention : vous êtes 4e sur 8 », « Danger : vous êtes 7e sur 8 », et une phrase de fait qui dit
     pourquoi (baisses, disparus, nouveaux venus moins chers) ;
   - **trois étapes** : au rendez-vous → aujourd'hui → avec les nouveaux venus. Chacune : « 2e sur 6 »
     dans la couleur de la place, et une réglette d'autant de cases que de biens, colorées par tiers,
     la case du vendeur cerclée. Sans nouveau venu retenu, la troisième étape dit « Aucun nouveau venu
     retenu » et ne compte rien ;
   - **le classement d'aujourd'hui**, du moins cher au plus cher, nouveaux venus compris, disparus
     exclus (ils restent dans leurs fiches et dans la phrase du verdict) : rang en couleur, barre de
     couleur à gauche, bien (type · pièces · surface · ville), « Nouveau » ou « Le plus dangereux »,
     une ligne de détail (« en vente depuis 121 jours », « arrivé le 22/10 », « a baissé de 5,8 % »),
     prix au rendez-vous en gris, prix d'aujourd'hui en gras ;
   - **la ligne VOTRE BIEN**, pleine, de la couleur de sa place, avec le prix retenu ensemble ;
   - **la légende** en une ligne : vert pas de problème, orange attention, rouge danger.
2. **Règle des couleurs, par tiers du classement** : rang ≤ ⌈N/3⌉ vert ; rang ≤ ⌈2N/3⌉ orange ; au-delà
   rouge (N = nombre de biens classés, vendeur compris). 9 biens : 1-3 / 4-6 / 7-9 ; 8 : 1-3 / 4-6 /
   7-8 ; 6 : 1-2 / 3-4 / 5-6. À égalité de prix, le vendeur prend le meilleur rang. Service pur, testé
   sur ces trois cas et sur N = 1, 2, 3.
3. La couleur M116 du prix (face à l'analyse du conseiller) disparaît de cette page : une seule couleur
   à lire, celle de la place.
4. La page tient en une page A4 avec 9 biens, et ne se coupe jamais (titre et contenu ensemble, saut de
   page avant si besoin). Au-delà de 12 biens, le classement continue sur la page suivante avec son
   en-tête. Sur téléphone, même ordre, les deux prix l'un sous l'autre.
5. Sur le Suivi, la version compacte : le verdict et les trois étapes, sans le classement.

## B. Le plus dangereux

6. **Sur sa fiche**, dans le document et sur le lien : cadre doré tout autour de la fiche (photos,
   caractéristiques, prix), et un bandeau doré en tête « LE PLUS DANGEREUX, SELON VOUS ». Même cadre doré
   sur sa ligne du classement.
7. **Il peut changer.** Sur le Suivi, après une mise à jour, le conseiller peut désigner un autre plus
   dangereux parmi les biens encore en vente, nouveaux venus compris (« Désigner le plus dangereux
   aujourd'hui »). Le choix du vendeur au rendez-vous ne s'efface jamais (`live_seller_summary`) ; le
   choix du jour est gardé dans le `summary` du point.
   - Sans changement : « Le plus dangereux, selon vous » (le choix du rendez-vous).
   - Avec changement : le nouveau porte « Le plus dangereux aujourd'hui », l'ancien garde une mention
     discrète « votre choix au rendez-vous », et la phrase du verdict le dit : « Un nouveau venu devient
     le plus dangereux : 3 pièces · 99 m² · Biot, à 795 000 €, 35 000 € sous votre prix. »
   - Si le plus dangereux du rendez-vous a disparu, le Suivi propose d'en désigner un autre.

## C. Les nouveaux venus (corrections de la M127 B)

8. **Plancher** (décision de Jean-Guy du 30/10) : on cherche entre −5 % du prix de commercialisation et
   ce prix ; si moins de 3 biens, on élargit à −10 %. Plancher et plafond dans la requête Stream Estate
   (`budgetMin`, `budgetMax`) quand elle les accepte, pour la facture ; une seule facturation au plus par
   élargissement, le coût total annoncé avant (« jusqu'à 1,20 € si on élargit »). Le point dit la
   fourchette cherchée.
9. **« Vu après le rendez-vous », vraiment** : un bien dont la première date connue (`createdAt` Stream
   Estate, date de publication de l'annonce, `first_seen_on`) est antérieure au rendez-vous n'est jamais
   proposé. Trouver pourquoi le bien du 17/06/2025 est passé, corriger, test sur ce cas exact. Sur le
   dossier de Biot en base : le bien retenu à tort reste retenu (rien n'est effacé), mais la mention
   devient « en vente avant le rendez-vous, non montré alors », et il ne compte pas dans la troisième
   étape.

## Preuves

- Tests purs : règle des tiers ; classement (égalités, disparus exclus, nouveaux venus inclus) ;
  plancher −5 % puis −10 % ; filtre des dates sur le cas du 17/06/2025 ; changement de plus dangereux.
- e2e démo : le Point marché de M. Lefebvre montre le verdict, les trois étapes, le classement, le cadre
  doré ; « Désigner le plus dangereux aujourd'hui » sur un nouveau venu change le document.
- Rendus : PDF A4 (vérifier qu'aucune page n'est blanche ni coupée), captures 1280 × 800, 1024 × 768,
  390 × 844 ; comparer la page à la maquette v2 côte à côte.

## Décisions à respecter

- M127 (règle des disparus, « estimé »), M127 B (une recherche par point, propositions gardées), M113
  (photos), M96 (mots du vendeur), CLAUDE.md (jamais de donnée inventée).

## Hors périmètre

- La refonte UX du Suivi et du mode acquéreur (mission à part, maquettes d'abord).
