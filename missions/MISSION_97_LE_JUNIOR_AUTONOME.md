# MISSION 97 — Le junior autonome

**Date** : 11/10/2026 · **Origine** : feuille de route « 8 sur 10 » (projet ACM), ordre 4, décidée
par Laurent. Pistes de l'audit n°2 :
- juniors : 4 → 8 ;
- simplicité : 6 → 8 ;
- préparation : 6 → 8.

Cette mission se lance **après le `/valide 96`**, seule, depuis `main` à jour, dans une seule
conversation (décision de Laurent du 11/10 au soir : on revient à une conversation à la fois).
- Sa migration est datée après la dernière migration de `main`.
- Avant de passer sur l'essai, fusionner `main` dans `essai` par une fusion normale.
- Pas de push forcé.

## Objectif

Un conseiller qui n'a jamais vu l'outil prépare son premier dossier seul, sans appeler Laurent : il
sait ce qu'il lui faut, il comprend chaque mot, et il sait ce qu'il doit vérifier.

## Critères d'acceptation

### A. L'accueil au premier usage

1. À sa première connexion, tant qu'il n'a aucun dossier, un conseiller arrive sur « Bienvenue ». Il
   peut y revenir plus tard par « Aide » dans le menu. L'écran comprend :
   - **Ce qu'il vous faut**, coché automatiquement quand c'est détectable :
     - le navigateur Chrome ;
     - l'extension ACM, détectée par le ping existant, avec le lien d'installation sinon ;
     - le téléphone renseigné dans le profil, nécessaire aux courriers (M90).
   - **Les 4 étapes**, une ligne chacune :
     1. le bien du vendeur ;
     2. les concurrents ;
     3. avant le rendez-vous ;
     4. le Live et le suivi.
   - **« Ouvrir le dossier d'exemple »**.
2. Le dossier d'exemple est créé à la demande pour ce conseiller :
   - il contient un bien fictif, des concurrents fictifs sans aucune adresse réelle, et il est
     prêt pour le Live ;
   - il porte un badge « Exemple » ;
   - il est exclu de tous les compteurs, du Suivi et de la Prospection ;
   - il peut être archivé ;
   - il sert aussi à s'entraîner au Live : c'est ce qui remplace « Recommencer » (M92).

   Ses réponses de Live ne comptent dans aucune mesure.
3. L'extension Localisateur n'est mentionnée nulle part : elle ne s'installe jamais chez les
   conseillers.

### B. Un seul mot par notion

4. Avant toute modification, faire l'inventaire des mots employés à l'écran pour une même notion.
   Puis appliquer ce lexique partout :
   - **Fourchette** : la fourchette de prix du conseiller. Jamais « cran », « palier » ou « tranche ».
   - **Décision de prix** : le bloc « Votre décision » d'« Avant le rendez-vous ».
   - **Concurrents retenus** : ceux qui passeront au Live.
   - **Concurrents** : jamais « comparables », à l'écran.
   - **Appartement**, **Maison** : jamais « apartment », « house » ou une autre valeur anglaise venue
     d'une source.
5. Toutes les surfaces sont arrondies au m² près à l'affichage, comme dans les courriers (M87). La
   base n'est pas modifiée.
6. Un test de vocabulaire refuse les mots bannis dans les composants concernés, sur le modèle du
   test existant (M89, M92).
7. Le compte rendu donne le tableau « ancien mot → nouveau mot → écrans concernés ».

### C. Le pourcentage de correspondance

8. À côté de chaque pourcentage, une ligne courte : « Ressemblance avec votre bien : type, surface,
   pièces, prix et secteur ».
9. Un toucher sur le pourcentage déplie le détail de ce qui a pesé, à partir du calcul existant
   (M71), sans le changer. Par exemple : « Surface : 68 m² pour 72 m² ✓ ; Prix : hors fourchette ✗ ».

### D. Ce qui vient d'un import se vérifie

10. Sur la fiche du bien vendeur et sur la fiche d'un concurrent importé, chaque champ rempli par un
    import porte une pastille « À vérifier ».
11. La pastille disparaît quand le conseiller modifie le champ, ou quand il touche « Tout est juste »
    en haut du bloc.
12. Les pastilles restantes n'empêchent rien. « Avant le rendez-vous » les compte : « 3 informations
    importées à vérifier ».

### E. Moins de pages, moins de champs

13. Ouvrir un dossier mène directement à l'étape à faire. La page intermédiaire qui ne liste que les
    étapes disparaît. Les étapes deviennent une barre en haut de chaque écran du dossier, d'où l'on
    peut aller à n'importe laquelle. L'ancienne adresse redirige vers l'étape à faire.
14. Sur la fiche du bien vendeur, les champs que ni la recherche, ni le Live, ni les courriers
    n'utilisent passent dans « Compléments (facultatif) » (M91).
    - Le compte rendu liste ces champs.
    - Aucun n'est supprimé en base.

### F. Preuves

15. Migration soumise avant d'être appliquée, avec comptages avant et après :
    - le repère « dossier d'exemple » ;
    - le repère « vérifié » des champs importés, si l'existant ne suffit pas.
16. Tests :
    - le dossier d'exemple est exclu de tous les compteurs et de la Prospection ;
    - lexique (test de vocabulaire) ;
    - surfaces arrondies ;
    - pastille posée par l'import, retirée par une modification ou par « Tout est juste » ;
    - redirection de l'ancienne page du dossier ;
    - le détail du pourcentage reprend le calcul existant.
17. E2E :
    - un nouveau conseiller voit « Bienvenue » ;
    - il ouvre le dossier d'exemple ;
    - il le mène jusqu'au Live.

    `npm run e2e` vert, tablette comprise.

## Décisions à respecter

- M71 (calcul de la correspondance), M87, M88, M89, M90, M91 (« Avant le rendez-vous », compléments
  repliés), M92, M93, M94, M95.
- On ne modifie pas l'extension. Jamais de mention du Localisateur aux conseillers.

## Hors périmètre

- Une refonte du Suivi ou de la conclusion. Le lexique s'y applique, sans rien changer d'autre.
- Une vidéo ou un tutoriel animé.

## Essai sur l'URL d'essai

1. Se connecter avec un compte de conseiller sans dossier : l'écran « Bienvenue » s'affiche, avec les
   prérequis cochés ou non.
2. Ouvrir le dossier d'exemple : il porte le badge « Exemple » et n'apparaît ni dans le Suivi ni
   dans la Prospection.
3. Ouvrir un dossier depuis la liste : on arrive directement sur l'étape à faire, avec la barre des
   étapes en haut.
4. Importer un bien : les champs portent « À vérifier ». « Tout est juste » les retire.
5. Toucher un pourcentage de correspondance : le détail s'affiche.
6. Parcourir la préparation : plus de « cran », plus d'« apartment », des surfaces arrondies.
