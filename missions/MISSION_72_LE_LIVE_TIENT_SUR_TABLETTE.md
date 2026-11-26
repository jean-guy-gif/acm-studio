# MISSION 72 — Le Live tient sur tablette, quoi qu'il arrive

**Date** : 06/10/2026 · **Origine** : test e2e de la mission 66 (capture du 06/10, 768 × 1024). La
scène du Live fait 922 px de large pour 768, à cause du halo décoratif. Elle rogne le surplus mais
reste défilable par programme : un focus ou un recentrage peut décaler tout le haut de l'écran
devant le vendeur. Le nom d'agence ne laisse aussi que 42 px de marge.

## Objectif

Sur tablette, le Live ne peut jamais glisser de côté, et un nom d'agence long ne pousse jamais les
boutons.

## Critères d'acceptation

1. Le halo ne fait plus partie de la largeur de la scène : on le contient dans sa propre couche,
   par exemple `absolute inset-0` avec `overflow-clip` ou `hidden` et `pointer-events-none`.
   - Partout, `scrollWidth` de la scène est égal à `clientWidth`.
   - On le vérifie en 768 × 1024, 1024 × 768 et 1366 × 1024, en mode normal et en plein écran.
   - Le rendu visuel ne change pas.
2. Le nom d'agence de l'en-tête du Live est tronqué avec des points de suspension s'il manque de
   place. Les boutons Clair, Plein écran et Quitter restent toujours entiers et cliquables.
3. Le test e2e de la mission 66 :
   - vérifie que la scène ne peut pas être décalée : un `scrollLeft` forcé reste à 0 ;
   - ne remet plus la scène à zéro avant de mesurer (on retire ce contournement).
4. Un test e2e court, à part, ouvre le Live d'un dossier dont l'agence porte un nom de 60
   caractères, en 768 px : aucun débordement. Ce test réutilise l'agence de test et ne crée aucun
   compte ; s'il faut renommer l'agence, demande-le-moi.

## Hors périmètre

Tout autre changement du Live (contenu, ordre des écrans, textes).

## Essai sur l'URL d'essai

Sur un iPad, ou dans Chrome en mode appareil (iPad, 768 × 1024), parcours un Live et touche les
champs de saisie : rien ne glisse sur le côté. Puis `npm run e2e` vert deux fois.
