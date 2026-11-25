# MISSION 110 — Pour convaincre et aller vite

**Date** : 19/10/2026 · **Origine** : audit n°6 du 19/10/2026. Les trois critères les plus bas sont l'aide à
la prise de mandat (7,5), la simplicité (7) et les experts (6, puis environ 7 après la M109). Laurent :
« je te suis sur tout ». Cette mission se lance **après le `/valide 109`**, pendant que les premiers
conseillers commencent.

C'est une mission plus large que les précédentes. Elle se fait en trois parties, **une branche et un
`/valide` par partie**, dans l'ordre A, B, C. Pas de push forcé. `npm run sauvegarde` avant chaque
migration.

## Commencer par un inventaire, sans rien coder

Pour chaque idée ci-dessous, dire en une ligne ce qui existe déjà (M81 conclusion, M83 exclusivité,
M85 question de closing, M91 compléments repliés, M96 relance, M99 réglages), ce qui manque, et
l'estimation de taille (petite, moyenne, grande). Attendre l'accord de Laurent avant de coder.

## A. Aide à la prise de mandat

1. **La synthèse à laisser au vendeur.** Après le Live, un document d'une ou deux pages, à imprimer ou à
   envoyer par lien :
   - ce que le vendeur a dit (prix imaginé, valeur perçue, prix reformulé) ;
   - le marché vu ensemble : bande des prix et position, avec les libellés neutres ;
   - le prix retenu par le conseiller et ses arguments ;
   - les coordonnées et la carte professionnelle de l'agence.

   Jamais d'adresse, de titre ni de lien d'annonce d'un concurrent, ni de « Vendu par ». Le lien
   expire après 30 jours, et le document n'est jamais indexé.
2. **Les objections en fin de Live.** À la conclusion, le conseiller coche ce qui freine : prix,
   exclusivité, délai, autre agence, projet pas mûr. Une ligne libre en plus. Le message de relance
   (M96) part de ces objections.
3. **Le tableau du manager.** Sur la page de l'agence : rendez-vous menés, mandats signés (au
   rendez-vous ou après relance), part d'exclusifs, délai médian avant signature, objections les plus
   fréquentes. Par conseiller et pour l'agence. Le dossier d'exemple n'y entre jamais.

## B. Simplicité

4. **Une fiche du bien courte.** Au premier affichage, 8 champs au plus : type, surface, pièces,
   commune, adresse, prix affiché, DPE, extérieur. Le reste passe dans « Compléments (facultatif) »
   (M91). Le compte rendu liste les champs déplacés. Aucun n'est supprimé en base.
5. **« Étape suivante ».** Chaque écran du dossier porte un seul bouton principal, qui dit quoi faire
   maintenant (« Chercher les concurrents », « Décider votre prix », « Lancer le Live »…). Les autres
   actions restent accessibles, en second plan.
6. **Un Live plus court.** Au-delà de 6 concurrents retenus, « Lancer le Live » propose les 6 plus
   pertinents (correspondance M71), modifiables. Le conseiller peut garder tout le monde. Le compte
   rendu donne le nombre d'écrans avant et après pour 8 concurrents.

## C. Les experts

7. **Plus de critères de recherche** dans « Réglages de la recherche » : DPE (classes acceptées), étage
   minimum, extérieur (balcon, terrasse, jardin), terrain minimum, piscine. Pour chacun, l'inventaire
   dit d'abord si Stream Estate sait filtrer, ou s'il faut trier après coup sans repayer.
8. **Des recherches nommées.** « Enregistrer cette recherche » sous un nom (« Villas Vence ») :
   secteur, élargissement et critères du point 7. Jamais de prix, pièces ni surface d'un bien
   (leçon de la M109). On la rappelle d'un clic sur un autre dossier.
9. **Le mode expert**, réglé dans « Mon profil » :
   - les aides pédagogiques et l'écran « Bienvenue » sont masqués ;
   - l'ordre des concurrents au Live se choisit par glisser-déposer ;
   - « Exporter le comparatif » (tableur) pour son propre usage, réservé au conseiller, jamais
     transmis au vendeur. Les adresses des concurrents n'y figurent que si le conseiller les a lui-même
     confirmées.

## Preuves

10. Migrations soumises avant d'être appliquées, avec comptages avant et après.
11. Tests de chaque point. En particulier :
    - la synthèse au vendeur ne contient jamais d'adresse, de titre, de lien d'annonce ni de « Vendu
      par », avec le titre piège de la M107 ;
    - le tableau du manager exclut le dossier d'exemple et respecte le cloisonnement par agence ;
    - une recherche nommée ne garde jamais de prix, pièces ni surface ;
    - aucun appel Stream Estate payant dans les tests.
12. Test de vocabulaire étendu aux nouveaux textes. `npm run e2e` vert, tablette comprise, à chaque
    partie.

## Décisions à respecter

- Jamais « estimation » à l'écran ; l'outil n'estime jamais un bien.
- Ni adresse, ni titre, ni lien d'annonce, ni « Vendu par » côté vendeur (M75, M83, M107).
- M92 (méthode infalsifiable), M96 (relance sans pression), M97 (lexique, dossier d'exemple), M99 et
  M109 (réglages), M102 (mentions de l'agence).
- On ne modifie ni `extension/` ni le Localisateur.

## Hors périmètre

- Supabase Pro (décision de Laurent du 19/10 : plus tard).
- Recaler le rythme du Live sur les durées réelles : on attend la bêta.

## Essai sur l'URL d'essai (à la fin de chaque partie)

- **A** : conclure le dossier d'exemple avec deux objections, ouvrir la synthèse au vendeur, vérifier
  qu'aucune adresse n'y figure ; le tableau du manager n'inclut pas l'exemple.
- **B** : la fiche du bien montre 8 champs ; chaque écran a un bouton « étape suivante » ; un dossier
  à 8 concurrents propose 6 concurrents au lancement.
- **C** : régler un DPE et un étage, enregistrer la recherche sous un nom, la rappeler sur un autre
  dossier ; activer le mode expert et réordonner les concurrents du Live.
