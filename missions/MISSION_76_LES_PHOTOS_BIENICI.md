# MISSION 76 — Les photos d'une annonce Bien'ici arrivent toutes dans le bien vendeur

**Date** : 07/10/2026 · **Origine** : essai de Laurent. Import dans le bien vendeur de
https://www.bienici.com/annonce/vente/cagnes-sur-mer/maison/9pieces/laforet-immo-facile-52960884 :
« 1 seule photo intégrée et 18 échecs ».

## Objectif

Toutes les photos de l'annonce, et seulement elles, arrivent dans le bien vendeur. Une photo qui
échoue dit pourquoi.

## Étape 1 — diagnostic (continue sans t'arrêter, sauf cas prévu plus bas)

Reproduis l'import sur cette annonce. Pour chacune des 19 adresses d'image, donne :

- l'adresse ;
- s'il s'agit vraiment d'une photo de l'annonce (et non d'un logo, d'une vignette ou d'un bien
  similaire) ;
- le résultat du téléchargement côté serveur : code, type, taille, message renvoyé.

Pistes à vérifier :

- la galerie de Bien'ici se charge au fil de l'eau : des vignettes ou des images de remplacement
  peuvent être lues au lieu des photos ;
- le serveur d'images peut refuser un téléchargement depuis Vercel ;
- un format peut être refusé ;
- le plafond de 20 photos peut être atteint si le bien en avait déjà.

## Critères d'acceptation

1. Pour Bien'ici, la liste des photos vient des données structurées de l'annonce, si la page les
   contient, en pleine taille et sans doublon. Sinon, on garde les images de la galerie.
2. Les 19 photos (ou le nombre réel) arrivent dans le bien vendeur, dans la limite des 20.
3. Une photo en échec affiche sa cause en clair, et le compte « N échec(s) » ne compte plus que de
   vraies photos.
4. Test sur une page Bien'ici enregistrée (fixture), sans réseau.

## Ce qu'on ne fait pas

- On ne se fait pas passer pour un navigateur pour contourner un refus du site.
- On ne modifie pas l'extension : elle est en examen sur le Chrome Web Store.

Si la seule solution passe par l'un de ces deux points, arrête-toi après l'étape 1 et propose.

## Essai sur l'URL d'essai

Nouveau dossier, puis import de cette annonce dans le bien vendeur : toutes les photos arrivent.
Recommencer avec une annonce SeLoger : rien n'a changé. `npm run e2e` est vert.
