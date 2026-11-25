# Mission 144 — mesure du Live, avant tout code (07/11/2026)

Mesure faite sans rien modifier : un script Playwright hors du dépôt mène le dossier de démo
« Prêt pour le Live » (Mme Garcia, Vence, 5 concurrents, rythme accéléré), de l'introduction à la
note de 1 à 10, puis remet la démo à zéro. Chaque image affichée est relevée (écran courant, opacité,
texte, première photo chargée), et chaque requête est datée (action serveur, page, image, police).

| Passage | Lieu | Réseau | Processeur |
| --- | --- | --- | --- |
| A | essai | 4G rapide de Chrome (9 Mb/s, 1,5 Mb/s, 165 ms) | ralenti ×4 (tablette) |
| B | essai | 4G lente de Chrome (1,6 Mb/s, 0,75 Mb/s, 563 ms) | ralenti ×4 |
| C | production | 4G rapide | ralenti ×4 |
| D | production | réseau réel (WebKit ne se bride pas) | moteur de Safari, iPad 1080 × 810 |

## Ce qui ne s'est PAS reproduit

L'écran vide de 3 à 4 secondes de l'audit : aucun des quatre passages ne le montre. Entre deux
écrans, le moment sans contenu lisible dure **28 à 99 ms** : c'est le début du fondu d'entrée
(`live-fade-up`, 0,45 s, qui part d'une opacité nulle). Aucune page n'est rechargée entre deux
écrans (le Live change d'écran dans le navigateur), aucune police ne se charge (préchargées, M95).

## Ce qui se voit : trois attentes

En millisecondes, du toucher sur « Valider » au contenu lisible (opacité ≥ 0,5) ; le pire de chaque
type de passage.

| Passage d'écran | A | B | C | D | D'où vient l'attente |
| --- | --- | --- | --- | --- | --- |
| Introduction → Votre bien | 423 | 217 | 216 | 454 | — (photos : voir plus bas) |
| Votre bien → valeur perçue | 418 | **799** | 495 | 481 | action serveur attendue (282–633 ms) |
| Valeur perçue confirmée → 1er concurrent | 468 | ≈ 800 | 706 | 430 | action serveur attendue (220–494 ms) |
| « Oui, sérieux » → devinette du prix | 587 | **800** | 518 | 535 | action serveur attendue (220–592 ms) |
| Devinette → prix révélé (4 écrans) | 757 | **775** | 695 | 759 | révélation gardée : le prix vient du serveur (436–566 ms) |
| Devinette → prix révélé (accéléré) | 775 | **790** | 709 | 711 | idem (471–574 ms) |
| Prix reformulé confirmé → Analyse des prix | 616 | ≈ 800 | 701 | 701 | le marché vient du serveur (486 ms) |
| Tous les autres passages (11 types) | ≤ 220 | ≤ 217 | ≤ 220 | ≤ 271 | enregistrement en fond (M51), fondu seul |
| Durée devinée → durée révélée | ≤ 16 | ≤ 56 | ≤ 16 | ≤ 16 | même écran, déjà livrée |

1. **L'ancien écran reste figé 0,3 à 0,6 s** sur 7 types de passage : l'écran attend une action
   serveur avant d'avancer, et le bouton ne montre rien pendant ce temps. Trois de ces attentes
   sont des enregistrements qui pourraient partir en fond comme les autres (Votre bien, valeur
   perçue, « Un sérieux concurrent ? ») ; les quatre autres sont des **révélations gardées** — le
   prix, la durée, le marché ne quittent le serveur qu'après la réponse du vendeur (M51, M82, M95,
   M96) : elles ne peuvent pas être préchargées. Côté serveur, une révélation relit toute la
   présentation (8 lectures et la signature des photos du bien) pour livrer un seul concurrent.
2. **Le fondu d'entrée** ajoute 0,45 s à chaque passage, dont ~0,17 s avant que le texte soit
   lisible ; c'est lui, partant d'un écran transparent, qui peut se lire comme « vide ».
3. **Les photos arrivent après l'écran** : la première photo du bien vendeur et celles de chaque
   nouveau concurrent se chargent une fois l'écran affiché (`loading="lazy"`, rien de préchargé) —
   0,4 à 0,9 s en 4G rapide, **1,9 à 3,1 s en 4G lente**, cadre vide pendant ce temps. C'est le
   seul trou de l'ordre de 3 secondes mesuré, et seulement en réseau lent.

## Hors des passages

Ouverture du Live : « Lancer le Live » → confirmation 1,1 s (A) à 2,4 s (B) ; « Lancer devant le
vendeur » → introduction 1,3 s (D) à 2,4 s (B). La note de 1 à 10, après la conclusion, recharge
les données de la page (une requête de page, 107 à 572 ms), sans écran vide.

## Limites

Simulation sur un Mac, pas une vraie tablette ni un vrai réseau mobile ; photos de la démo servies
par l'application (une vraie annonce sert ses photos depuis le portail, souvent plus lourdes). Le
script et les relevés bruts : dossier de travail de la session (`scratchpad/m144/`), hors du dépôt.
