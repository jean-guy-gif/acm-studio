# MISSION 94 — Le Live qui convainc

**Date** : 11/10/2026 · **Origine** : feuille de route « 8 sur 10 » (projet ACM), décidée par
Laurent : « on va continuer à améliorer, par ordre de priorité, avec au début le plus d'impact ».
Pistes de l'audit n°2 : Live 7 → 9, aide au positionnement prix 6 → 9.

Cette mission peut tourner **en parallèle de la mission 98**, à deux conditions :
- elle travaille dans son propre `git worktree` ;
- une seule mission à la fois sur l'essai, une seule migration à la fois.

## Objectif

Le vendeur qui surestime doit arriver lui-même au bon prix. Il reformule son prix après avoir vu le
marché, il voit où ce prix le placerait parmi les concurrents, et il comprend d'où viennent les
chiffres.

## Constats (audit n°2)

- Le Live passe directement de la valeur perçue initiale à l'analyse. L'Acte 5 du Storyboard
  (`docs/01_Method/Storyboard.md`, « Après avoir observé le marché… quel prix vous semblerait
  cohérent ? ») n'existe pas. Le vendeur ne reformule jamais lui-même son prix.
- L'écran « Analyse des prix » ne montre qu'un chiffre central et des écarts. Il ne dit ni la
  répartition des prix, ni le nombre de baisses, ni sur quels concurrents porte le calcul.
- Le champ « Sur quel prix partons-nous ? » accepte tout montant, sans dire où ce prix placerait le
  bien parmi les concurrents.
- Un « Prix des concurrents » ajusté par le conseiller est présenté au vendeur comme « observé sur
  le marché ».

## Critères d'acceptation

### A. Le vendeur reformule son prix (Acte 5)

1. Un nouvel écran, après « Le concurrent le plus dangereux » et avant « Analyse des prix » :
   « Après avoir vu ces biens, à quel prix mettriez-vous votre bien en vente ? ». Un champ, rappel
   du montant en grand avant d'enregistrer (comme la valeur perçue, M92).
2. La réponse est figée en base dès la première valeur, comme la valeur perçue (M92). Elle est
   facultative : « Passer » reste possible, et rien n'est enregistré dans ce cas.
3. Sur « Analyse des prix », le chemin du vendeur s'affiche : « Au début : 350 000 € → Après avoir vu
   le marché : 325 000 € ». Si l'écran a été passé, seul le premier chiffre s'affiche.
4. Le Suivi et le bloc de conclusion côté conseiller affichent aussi ce prix reformulé.

### B. La lecture du marché

5. « Analyse des prix » ajoute, sur les concurrents **dont le prix a été révélé** pendant le Live :
   - le prix affiché le plus bas et le plus haut ;
   - le prix médian ;
   - le nombre de concurrents qui ont déjà baissé leur prix ;
   - l'ancienneté médiane.

   Une donnée inconnue ne s'affiche pas. Rien n'est jamais inventé.
6. Une bande horizontale montre les prix affichés des concurrents révélés, en points, avec deux
   repères : « Votre prix de départ » et, s'il existe, « Votre prix après le marché ». Aucun prix
   non révélé n'y figure. La règle « jamais le prix avant la devinette » reste contrôlée côté
   serveur.
7. Sous le « Prix des concurrents », une ligne dit sur quoi il porte : « Calculé sur les 6
   concurrents retenus par votre conseiller ». Si le conseiller l'a ajusté, la mention devient
   « Prix retenu par votre conseiller à partir des 6 concurrents », au lieu de « observé sur le
   marché ».

### C. Le prix choisi, situé

8. Sur « Sur quel prix partons-nous ? », dès qu'un montant est saisi, une ligne factuelle
   s'affiche sous le champ, calculée sur les concurrents révélés :
   - « À 380 000 €, votre bien serait le plus cher des 6 biens comparés » ;
   - ou « … le 3e moins cher sur 6 » ;
   - ou « … dans la moyenne des 6 ».

   Aucun conseil, aucune couleur d'alerte, aucune formule de pression (M85). C'est un repère.

### D. Preuves

9. Migration soumise avant d'être appliquée : une colonne pour le prix reformulé, figée par le même
   mécanisme que M92. Comptages avant et après.
10. Tests :
    - la bande et les chiffres n'utilisent que des concurrents révélés ;
    - le prix reformulé est figé ;
    - la phrase de position est juste pour le moins cher, le plus cher et un prix au milieu ;
    - « Passer » n'enregistre rien.
11. E2E : le Live complet passe par le nouvel écran, puis « Analyse des prix » montre le chemin
    350 000 → 325 000. `npm run e2e` vert, tablette comprise.

## Décisions à respecter

- Méthode : un concurrent à la fois, jamais le prix avant la devinette (contrôle serveur), valeur
  perçue en début de Live (M82), réponses figées (M92), question de 1 à 10 (M85).
- « Prix des concurrents » reste calculé et modifiable (décision de Laurent, M89).
- Vocabulaire à la 2e personne côté vendeur (M89, test de vocabulaire étendu en M92).

## Hors périmètre

- Raccourcir le Live (mission 95).

## Essai sur l'URL d'essai

1. Live avec une valeur perçue de 350 000 €. Après « Le concurrent le plus dangereux », le nouvel
   écran demande un prix. Saisir 325 000 € : le rappel en grand s'affiche, puis l'enregistrement.
2. « Analyse des prix » montre « Au début : 350 000 € → Après avoir vu le marché : 325 000 € », la
   bande des prix des concurrents révélés et les chiffres du marché.
3. Sur « Sur quel prix partons-nous ? », taper un prix plus haut que tous les concurrents : la
   phrase dit « le plus cher des N ».
4. Revenir sur le nouvel écran : la réponse est en lecture seule.
