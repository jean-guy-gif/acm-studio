# MISSION 98 — Une prospection sans doublons

**Date** : 11/10/2026 · **Origine** : feuille de route « 8 sur 10 » (projet ACM), décidée par
Laurent. Pistes de l'audit n°2 : valeur de la prospection 6 → 8.

Cette mission peut tourner **en parallèle de la mission 94**, à trois conditions :
- elle travaille dans son propre `git worktree` ;
- une seule mission à la fois sur l'essai ;
- une seule migration à la fois, appliquée seulement après le `/valide` de l'autre, en repartant de
  `main` à jour.

## Objectif

Une même personne n'est jamais démarchée deux fois, ni recontactée après avoir dit non. Le
conseiller prépare sa tournée en quelques gestes.

## Constats (audit n°2)

- Aucun regroupement entre dossiers (`prospecting/queries/get-agency-prospecting.ts`). Une même
  annonce retenue dans deux mandats donne deux cartes, deux statuts et potentiellement deux courriers
  au même propriétaire.
- « Pas intéressé » vaut pour un seul concurrent d'un seul dossier. Le courrier propose pourtant de
  « s'opposer à tout nouveau contact », et aucune liste commune n'existe.
- Pour un confrère, « Marquer remis » exige une adresse confirmée (`prospecting-status.ts:58-61`) :
  tout le parcours confrère sort de la mesure.
- Les courriers se préparent un par un : environ 5 gestes par concurrent.
- La tournée imprimable couvre toute l'agence. Elle inclut des biens sans adresse, des confrères et
  des rendez-vous déjà obtenus, et elle est groupée par bien vendeur, sans ordre géographique.

## Critères d'acceptation

### A. Une carte par bien

1. Dans Prospection, les concurrents qui désignent le même bien sont regroupés en une seule carte.
   C'est le cas quand la clé d'annonce est la même (`extractListingKey`, déjà utilisée), ou quand
   l'adresse confirmée est la même après normalisation.
2. La carte rappelle tous les biens vendeurs concernés : « Pour : Martin · Vence ; Dupont ·
   Vence ».
3. Un statut posé sur la carte (remis, RDV, mandat, pas intéressé) vaut pour toutes les copies.
4. Les compteurs comptent le bien une seule fois.

### B. « Ne plus solliciter », pour toute l'agence

5. Une liste d'opposition par agence, sur l'adresse normalisée. On l'alimente de deux façons :
   - par un nouveau bouton « Ne plus solliciter » sur la carte, avec confirmation ;
   - par la procédure d'effacement (M93), à mettre à jour.
6. Une adresse de la liste porte le badge « Ne plus solliciter (demandé le JJ/MM) » partout où elle
   apparaît, y compris dans de futurs dossiers. Le courrier propriétaire devient impossible pour
   elle : « Ce propriétaire a demandé à ne plus être sollicité ».
7. « Pas intéressé » garde son sens actuel : pas maintenant, pour ce bien. Il ne bloque pas un
   futur contact. « Ne plus solliciter », lui, bloque tout. Le compte rendu explique la différence
   en une phrase, pour l'aide aux conseillers.

### C. Le parcours confrère

8. Pour un confrère (exclusivité), « Marquer contacté » est possible sans adresse. Le dossier
   confrère suit ensuite les mêmes étapes (RDV, mandat) et entre dans les compteurs.

### D. Les courriers en une fois

9. Sur la page Prospection filtrée sur un bien vendeur, un bouton « Préparer tous les courriers »
   ouvre un seul document à imprimer.
   - Il contient un courrier par concurrent « prêt à envoyer », dans la bonne version
     (propriétaire ou confrère).
   - Il reprend les textes et photos déjà enregistrés, ou ceux par défaut s'il n'y en a pas.
   - Les blocages de la mission 90 (adresse de l'agence, téléphone) s'appliquent : un concurrent
     bloqué est listé en tête avec sa raison, et il n'est pas imprimé.
10. Après impression, « Marquer tous remis » pose le statut « remis » sur les concurrents
    imprimés, avec une confirmation.

### E. La tournée

11. « Imprimer ma tournée » ne garde que les propriétaires :
    - à adresse confirmée ;
    - ni en rendez-vous, ni en mandat, ni « pas intéressé », ni sur la liste « Ne plus solliciter ».

    Les confrères sont listés à part, en bas, avec leur numéro d'annonce, à appeler.
12. Les adresses sont triées par commune, puis par rue, puis par numéro, pour enchaîner les portes.
    Pas de calcul d'itinéraire.
13. Un filtre « Mes dossiers / Toute l'agence » ; par défaut, les dossiers du conseiller connecté.

### F. Preuves

14. Migration soumise avant d'être appliquée : la liste d'opposition, avec cloisonnement par agence
    et droits limités aux membres de l'agence. Comptages avant et après.
15. Tests :
    - regroupement par clé d'annonce et par adresse ;
    - le statut d'une carte vaut pour ses copies ;
    - l'opposition bloque le courrier et la tournée ;
    - le confrère est contacté sans adresse ;
    - la tournée est triée et filtrée.
16. Un test SQL vérifie qu'une agence ne lit pas la liste d'opposition d'une autre.
17. `npm run e2e` vert, tablette comprise.

## Décisions à respecter

- M75, M83 (« agence sans mention = mandat simple », décision maintenue), M84, M86, M87, M90 (mention
  légale, adresse corrigeable), M93 (procédure d'effacement).
- Jamais d'adresse concurrente côté vendeur (`never-seller-side.test.ts`).

## Hors périmètre

- Vérifier qu'une annonce est toujours en ligne.
- Calcul d'itinéraire.
- Lien automatique « mandat rentré → nouveau dossier ».

## Essai sur l'URL d'essai

1. Deux mandats signés qui ont retenu le même concurrent : une seule carte, « Pour : … ; … ».
2. « Ne plus solliciter » sur une carte : le badge apparaît et le courrier propriétaire est refusé.
   La même adresse, retenue dans un autre dossier, porte aussi le badge.
3. Sur une exclusivité sans adresse, « Marquer contacté » fonctionne.
4. Filtré sur un bien vendeur, « Préparer tous les courriers » ouvre un document avec tous les
   courriers prêts. « Marquer tous remis » les fait passer en « Dossier remis ».
5. « Imprimer ma tournée » : les propriétaires seuls, triés par commune et par rue, et les confrères
   à appeler en bas.
