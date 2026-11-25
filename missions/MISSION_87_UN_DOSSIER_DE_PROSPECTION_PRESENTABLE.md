# MISSION 87 — Un dossier de prospection présentable, avec la photo du concurrent

**Date** : 11/10/2026 · **Origine** : Laurent, après avoir sorti les deux versions du dossier
(propriétaire et confrère) : « il y a des mots comme test automatique, ne pas utiliser, nom d'agence
trop long, que ce soit en haut du document ou en bas ; il faut aussi la possibilité de choisir la
photo du concurrent ».

Constat : les deux PDF ont été préparés **avec le compte de test automatique** (agence
« TEST AUTOMATIQUE — ne pas utiliser — agence au nom très long », conseiller « test automatique »,
adresse e2e). Ce nom est voulu par l'e2e (60 caractères, sans logo). Mais il montre deux vrais
défauts : un nom d'agence long casse l'en-tête, le pied de page et la carte contact, et rien dans
l'application ne signale qu'on travaille dans l'agence de test.

## Objectif

1. Le dossier reste propre quel que soit le nom de l'agence.
2. On ne peut plus confondre le compte de test avec un vrai compte.
3. Le conseiller choisit la photo du bien concurrent.

## Critères d'acceptation (testables à l'écran)

### A. Le nom de l'agence sur les documents

1. Administration → habillage : un champ facultatif « Nom sur les documents » (40 caractères
   maximum, compteur visible). S'il est vide, on prend le nom de l'agence.
2. En-tête du dossier : le logo s'il existe, sinon ce nom, sur **deux lignes au plus**. La taille
   du texte se réduit si besoin, sans jamais passer sous la taille du texte courant.
3. Pied de page et carte contact (« Conseiller · … ») : ce nom sur **une seule ligne**, jamais
   coupé au milieu d'un mot.
4. Migration soumise avant d'être appliquée (une colonne facultative, aucune ligne écrite).
5. Avec le nom de 60 caractères de l'agence de test et le champ vide, les deux versions tiennent
   leur mise en page : en-tête sur deux lignes au plus, pied de page sur une ligne. Ajouter ce cas
   aux tests.

### B. Le compte de test se voit

6. Quand l'agence connectée est l'agence de l'e2e (nom commençant par « TEST AUTOMATIQUE »), un
   bandeau orange fixe s'affiche en haut de toutes les pages : « Compte de test automatique — ne
   préparez pas de vrai dossier ici ». Rien de visible pour les autres agences.
7. Le bandeau n'apparaît ni dans le Live côté vendeur ni dans les documents imprimés.
   L'e2e reste vert.

### C. La photo du concurrent

8. Cette mission remplace la règle M84 « jamais les photos du concurrent » : c'est désormais un
   choix du conseiller.
9. Dans l'éditeur du dossier, sous la photo de notre bien, un sélecteur « Photo de son bien »
   propose :
   - les photos de l'annonce du concurrent (`comparables.photo_urls`), en vignettes ;
   - « Ma photo » : une photo importée par le conseiller (par exemple la façade prise sur place),
     rangée dans le stockage de l'agence comme les autres photos ;
   - « Sans photo » : le cadre gris actuel.
   Par défaut : la première photo de l'annonce si elle existe, sinon « Sans photo ».
10. Le choix est enregistré avec le dossier et repris à la réouverture, comme la photo de notre
    bien. Migration soumise (même migration que le point 4 si c'est plus simple).
11. Même choix et même rendu sur les deux versions, propriétaire et confrère. La photo est
    recadrée comme celle de notre bien (même hauteur, cadrage centré).
12. À l'impression, si l'image de l'annonce ne se charge pas (lien expiré, portail qui bloque),
    on affiche le cadre gris, jamais une image cassée. Vérifier sur une annonce de chaque portail
    importé ; si un portail bloque l'affichage, copier la photo choisie dans le stockage de
    l'agence au moment du choix.
13. `never-leaks.test.ts` est mis à jour : la photo du concurrent est permise seulement si le
    conseiller l'a choisie. Tous les autres interdits restent : jamais le nom du propriétaire,
    jamais nos données réservées (valeur perçue, analyse, fourchette).

### D. Finitions vues sur les PDF

14. Surfaces arrondies au m² entier dans le dossier (« 56,53 m² » → « 57 m² »), avec le
    formateur M74.
15. Version propriétaire, en-tête : l'adresse ne se coupe plus au milieu.
    - « Aux copropriétaires du »
    - « 8 avenue Docteur Hochet »
    - « 06160 Antibes · 2e étage »
16. `npm run e2e` vert, tablette comprise.

## Décisions à respecter

- M84 (dossier de prospection, versions, prix masqués au-delà de 5 %, aucun mot « mandat » côté
  propriétaire), M83, M74, M86.
- On ne renomme pas l'agence de test : l'e2e a besoin de son nom long.

## Hors périmètre

- Déplacer des dossiers d'une agence à une autre.
- Retouche des photos (luminosité, recadrage manuel).

## Essai sur l'URL d'essai

1. Avec le compte de test : le bandeau orange est en haut de chaque page. Préparer un dossier
   propriétaire et un dossier confrère : l'en-tête tient sur deux lignes au plus, le pied de page
   sur une ligne, la surface est arrondie et l'adresse ne se coupe pas.
2. Choisir la 2e photo de l'annonce du concurrent, enregistrer, rouvrir : elle est gardée et
   imprimée. Passer à « Ma photo » avec une photo importée, puis à « Sans photo ».
3. Avec le compte de Laurent : aucun bandeau, le logo est en haut du dossier, et le nom sur les
   documents (s'il est rempli) est en bas.
