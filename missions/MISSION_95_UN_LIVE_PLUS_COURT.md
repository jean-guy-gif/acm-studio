# MISSION 95 — Un Live plus court

**Date** : 11/10/2026 · **Origine** : feuille de route « 8 sur 10 » (projet ACM), ordre 2, décidée
par Laurent. Pistes de l'audit n°2 : fluidité 6 → 8.

Cette mission peut tourner **en parallèle de la mission 98** (Prospection), à trois conditions :
- elle travaille dans son propre `git worktree` (`../acm-studio-m95`) ;
- une seule mission à la fois sur l'essai ;
- une seule migration à la fois : appliquer la sienne seulement après le `/valide` de l'autre, en
  repartant de `main` à jour.

## Objectif

Un Live de 6 concurrents tient en 35 à 40 minutes, sans rien céder sur la méthode :
- toujours un concurrent à la fois ;
- jamais un prix avant la devinette ;
- des réponses figées.

## Constats

- Chaque concurrent prend environ 4 écrans : sérieux, devinette du prix, révélation, durée. Avec la
  M94, 7 concurrents donnent environ 65 minutes.
- Le vendeur comprend le principe dès le 2e ou 3e concurrent. Ensuite, la répétition fatigue plus
  qu'elle ne convainc.
- Aucune mesure de la durée réelle d'un Live : on ne peut rien recaler sur les vrais rendez-vous.

## Critères d'acceptation

### A. Le rythme en 2 écrans, à partir du 4e concurrent

1. Les 3 premiers concurrents gardent leur déroulé actuel, sans aucun changement.
2. À partir du 4e concurrent, deux écrans par concurrent :
   - **Écran 1** : la fiche du concurrent, la question du sérieux et la devinette du prix, sur le
     même écran. « Valider » enregistre les deux.
   - **Écran 2** : la révélation du prix et l'écart avec la devinette. Si la durée est connue, la
     devinette de durée apparaît dessous. Une fois validée, la durée réelle s'affiche à sa place,
     sur le même écran, sans changer d'écran.
3. Le contrôle serveur ne bouge pas :
   - le prix n'est envoyé qu'après l'enregistrement de la devinette du prix ;
   - la durée n'est envoyée qu'après l'enregistrement de la devinette de durée.
4. Les règles déjà en place s'appliquent aux deux écrans :
   - réponses figées (M92) ;
   - lecture seule en revenant en arrière ;
   - étape Durée sautée quand la durée est inconnue (M92) ;
   - confirmation en grand des montants.
5. Un concurrent sans prix connu suit le même chemin qu'aujourd'hui.
6. Dans les 3 concurrents et au-delà, l'ordre de passage ne change pas.

### B. Le choix du conseiller

7. Sur « Avant le rendez-vous », un réglage « Rythme du Live » propose deux choix :
   - « Accéléré à partir du 4e concurrent », par défaut ;
   - « Complet pour tous les concurrents ».

   Le choix est enregistré sur le dossier. Il ne se modifie plus une fois le Live commencé.
8. Le déroulé et la durée estimée d'« Avant le rendez-vous » suivent le rythme choisi. L'écran
   affiche les deux estimations : « Accéléré : environ 38 min · Complet : environ 52 min ».
9. L'avertissement au-delà de 6 concurrents (M92) reprend la durée du rythme choisi.

### C. Mesurer la durée réelle

10. Le Live enregistre son heure de début, au premier écran vendeur, et son heure de fin, au
    « Terminer » (M92).
    - Une reprise après « Rendez-vous en pause » ne remet pas le début à zéro.
    - Si ces heures existent déjà en base, ne rien ajouter. Sinon, migration soumise.
11. Le Suivi et la conclusion côté conseiller affichent « Durée du Live : 41 min », jamais côté
    vendeur.
12. Le compte rendu donne la formule de l'estimation, pour la recaler plus tard sur les durées
    réelles.

### D. Les polices

13. Les six polices encore téléchargées à la compilation sont embarquées dans le dépôt, comme
    Inter (M90). Trois déploiements ont déjà échoué à cause d'elles. Après la mission, aucune police
    n'est plus téléchargée à la compilation : le prouver dans le compte rendu.

### E. Preuves

14. Tests :
    - jusqu'au 3e concurrent, le déroulé est inchangé ;
    - à partir du 4e, deux écrans ;
    - prix et durée refusés par le serveur avant leur devinette ;
    - le rythme « Complet » rend le déroulé actuel ;
    - le début n'est pas remis à zéro par une reprise ;
    - l'estimation est juste pour 3, 6 et 8 concurrents.
15. E2E : un Live de 5 concurrents en rythme accéléré, du premier écran au « Merci ».
16. Le test de vocabulaire (2e personne, M89 et M92) couvre les nouveaux écrans. `npm run e2e`
    vert, tablette comprise : sur tablette, l'écran 1 tient sans faire défiler la devinette hors de
    vue.

## Décisions à respecter

- Méthode du Live : M51, M81, M82, M85, M89, M92, M94. Le nouvel écran de la M94 (le prix reformulé)
  et l'analyse des prix ne changent pas.
- « Prix des concurrents » reste calculé et modifiable.
- Jamais d'adresse concurrente côté vendeur.

## Hors périmètre

- Changer le nombre de concurrents conseillé (6).
- Reprendre la fin du Live (M94).

## Essai sur l'URL d'essai

1. Sur un dossier de 6 concurrents, « Avant le rendez-vous » montre le réglage « Rythme du Live » et
   les deux durées estimées.
2. Lancer le Live. Les 3 premiers concurrents se déroulent comme avant. Au 4e, la fiche, le sérieux
   et la devinette sont sur un seul écran, puis la révélation et la durée sur le suivant.
3. Au 4e, revenir en arrière après la révélation : la devinette est en lecture seule.
4. Quitter, puis « Reprendre », et finir le Live : dans le Suivi, la durée du Live tient compte de
   tout le rendez-vous.
5. Refaire un dossier en rythme « Complet » : tous les concurrents ont leurs 4 écrans.
