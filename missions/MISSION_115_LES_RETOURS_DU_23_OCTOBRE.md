# MISSION 115 — Les retours du 23 octobre

**Date** : 23/10/2026 · **Origine** : Jean-Guy, après le premier parcours complet de l'agence de démo
sur l'essai, le 23/10 : « impossible de rajouter la photo du concurrent sur le dossier remis », « quand
c'est un dossier de confrère […] je devrais plutôt avoir accord de collaboration obtenu », « sur la
timeline des prix […] il y a un autre point, j'imagine que c'est le plus dangereux concurrent, c'est pas
noté ». Les trois valent pour l'outil réel comme pour la démo.

Trois parties, **une branche et un `/valide` par partie**, A puis B puis C. Pas de push forcé.
`npm run sauvegarde` avant toute migration. Pas de `/valide` sans CI verte ni e2e vert.
Vient après le `/valide` de la mission 114 partie A.

## Partie A — La photo du concurrent sur le courrier

1. L'option « Photo de son bien » revient dans l'éditeur de courrier, propriétaire comme confrère :
   la photo que montre le Live (M58), au choix du conseiller, décochée par défaut comme avant la M105.
   Décision de Jean-Guy du 23/10, en connaissance du risque (la photo appartient à son auteur) ;
   **remplace M105** (« option retirée pendant la bêta ») et s'aligne sur la synthèse (M113).
2. Un courrier préparé avec la photo l'imprime, à l'unité comme en lot ; sans photo, la mise en page
   ne laisse aucun cadre vide. Un courrier déjà enregistré sans photo ne change pas.
3. `/confidentialite` dit que le courrier peut porter une photo tirée de l'annonce, au choix du
   conseiller. Texte signalé pour la relecture juridique.

## Partie B — La frise des prix nomme le plus dangereux

4. Dans la synthèse au vendeur (section 06, M113) comme sur l'écran « Analyse des prix » du Live, la
   bande des prix porte trois repères nommés : « Au début » (prix du vendeur), « Après le marché »
   (prix révisé, M94) et « Le plus dangereux selon vous » (prix affiché du concurrent désigné, M110).
   Le troisième est visible au premier regard : libellé, couleur de l'agence, pas un point muet.
5. Absent si le vendeur n'a désigné personne. Un « Non » au Live n'y figure jamais (M41).
6. Rien ne se recalcule : montants figés à la conclusion (M111).

## Partie C — Le confrère : collaboration obtenue ou refusée

7. Pour un concurrent en exclusivité (confrère, M98), après « Contacté », les choix ne sont plus
   « Rendez-vous obtenu » mais **« Collaboration obtenue »** et **« Collaboration refusée »**.
8. « Collaboration obtenue » clôt la prospection de ce concurrent, comme « Mandat rentré » : il sort
   des biens à prospecter, et le tableau du manager le compte à part (« collaborations »).
9. « Collaboration refusée » **remet le bien en courrier propriétaire** : adresse à confirmer si elle
   ne l'est pas, courrier propriétaire, avec une ligne proposée (modifiable) : son agence a refusé une
   collaboration en mandat exclusif. La suite est celle d'un propriétaire : remis → rendez-vous → mandat.
10. Deux faits datés nouveaux sur le concurrent (`prospecting_collaboration_at`,
    `prospecting_collaboration_declined_at`), un cran à la fois, retour d'un cran possible (M86). Le
    propriétaire ne voit pas ces choix. « Ne plus solliciter » reste possible à tout moment (M109).
11. Migration soumise avant d'être appliquée, comptage avant et après ; la CI la joue.

## Preuves

12. Tests : courrier avec et sans photo (unité et lot) ; trois repères nommés, le troisième absent sans
    désignation ; parcours confrère dans les deux sens, parcours propriétaire inchangé ; vocabulaire.
13. `npm run e2e` vert, tablette comprise, à chaque partie ; l'e2e `demo` (M114) rejoue le courrier avec
    photo et la collaboration refusée.

## Décisions à respecter

- M58 (photo du Live), M86 et M98 (statuts de prospection), M94, M110, M111, M113 (synthèse).
- Remplacées par cette mission, à écrire au `/valide` : M105 (photo retirée du courrier).
- Jamais « estimation ». Ni titre, ni adresse, ni lien d'annonce côté vendeur. On ne modifie ni
  `extension/` ni le Localisateur.

## Hors périmètre

- La photo prise par le conseiller lui-même (M90) : inchangée.
- Un courrier au confrère après refus de collaboration.

## Essai sur l'URL d'essai

- **A** : ouvrir un courrier propriétaire, cocher « Photo de son bien », imprimer : la photo y est ;
  décocher, imprimer : aucun cadre vide. Même chose en lot.
- **B** : sur un dossier conclu avec un plus dangereux désigné, ouvrir la synthèse et l'écran
  « Analyse des prix » : trois repères nommés. Sur un dossier sans désignation : deux.
- **C** : sur un confrère, « Contacté » → « Collaboration refusée » : il repasse en courrier
  propriétaire avec la ligne proposée ; sur un autre, « Collaboration obtenue » : il sort de la liste.
