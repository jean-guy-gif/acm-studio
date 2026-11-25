# MISSION 85 — Après le prix, une question qui aide à signer

**Date** : 10/10/2026 · **Origine** : Laurent. « À la fin, quand le client donne son prix de
commercialisation, je voudrais un écran avec une question qui apparaisse pour le client, afin
d'aider le conseiller dans son closing pour signer plus facilement son mandat. » Choix retenu :
l'échelle de 1 à 10.

## Objectif

Juste après le prix de commercialisation, le vendeur se situe sur une échelle de 1 à 10. En dessous
de 10, l'écran fait sortir la dernière objection ; à 10, on passe à la signature.

## Critères d'acceptation (testables à l'écran)

1. Nouvel écran du Live, juste après la saisie du prix de commercialisation et avant « Terminer le
   rendez-vous » : « Sur une échelle de 1 à 10, où en êtes-vous pour lancer la vente à ce prix ? »
   Dix grands boutons 1 à 10, lisibles et touchables sur tablette (M72).
2. Le vendeur touche un chiffre :
   - **de 1 à 9** : la question suivante apparaît sur le même écran, « Qu'est-ce qui vous
     manquerait pour être à 10 ? », avec un champ que le conseiller peut remplir (réponse du
     vendeur, facultative) ;
   - **10** : « Alors, on lance la vente ? » et le bouton « Terminer le rendez-vous ».
   Le conseiller peut changer le chiffre (après avoir traité l'objection, le vendeur passe à 10).
3. Aucun prix, aucun montant de plus sur cet écran que celui déjà décidé ; ton positif, jamais de
   pression écrite (« vous devez », « dernière chance »…).
4. La note donnée (la première, et la dernière si elle a changé) et la réponse « ce qui manquerait »
   sont enregistrées et figées à la conclusion, comme la valeur perçue (M56). Migration soumise
   avant d'être appliquée.
5. Suivi : la carte du dossier conclu montre « Prêt à lancer : 7/10 → 10/10 » et la réponse.
6. L'écran est facultatif pour avancer : « Terminer le rendez-vous » reste possible sans note
   (un rendez-vous ne se bloque jamais, M81).
7. `npm run e2e` vert, tablette comprise.

## Décisions à respecter

- M51 (un seul bouton, enregistrement en fond), M56, M58, M72, M81, M82 (« Terminer » enregistre
  d'abord le prix saisi).

## Hors périmètre

- Statistiques agrégées des notes (plus tard, avec assez de rendez-vous réels).

## Essai sur l'URL d'essai

Live d'un dossier prêt jusqu'au prix de commercialisation ; l'écran demande la note. Toucher 7 :
« Qu'est-ce qui vous manquerait pour être à 10 ? » ; saisir « le délai » ; toucher 10 ; terminer et
conclure. Le Suivi affiche « 7/10 → 10/10 » et « le délai ».
