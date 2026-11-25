# MISSION 104 — Un Live sans faux pas

**Date** : 14/10/2026 · **Origine** : mission « Finitions », première moitié. Ce sont les P1 des audits
n°3 et n°4 du 12/10 qui touchent ce que le vendeur voit. Laurent : « on continue sur les
améliorations/corrections ». La seconde moitié (préparation, import, Suivi, socle) fera la M105.

La mission se lance seule, depuis `main` à jour, dans une seule conversation.
- Pas de push forcé.
- `npm run sauvegarde` avant la migration éventuelle, qui sera datée après `20261022090000`.

## Objectif

Rien de faux ni de technique ne s'affiche devant le vendeur. Chaque chiffre du Live dit exactement
sur quoi il est calculé. Un conseiller ne fige plus un vrai dossier par erreur.

## Commencer par vérifier, sans rien coder

Relire chaque constat ci-dessous dans le code de `main` et dire en une ligne s'il est toujours présent.
Les numéros de ligne datent du 12/10. Si un constat est déjà corrigé, le dire et passer au suivant.

## Critères d'acceptation

### A. Un « Non » n'enregistre jamais de prix

**Constat** : en rythme accéléré, « Non » avec un prix tapé enregistre ce prix comme révélé. Cela
fausse la bande des prix, la médiane et le Suivi (`live-comparative-shell.tsx:503`).

1. « Non » n'enregistre aucun prix révélé. Un prix tapé avant « Non » est ignoré et effacé du champ.
   Seule la réponse prévue pour un prix (M96) l'enregistre.
2. Les réponses déjà en base sont relues. Le compte rendu dit combien de lignes ont à la fois « Non »
   et un prix révélé. Ne rien corriger en base sans l'accord de Laurent : donner la liste (dossier,
   date) et la correction proposée.

### B. Jamais « Dossier indisponible » devant le vendeur

**Constat** : avec 0 concurrent retenu, le Live bloque sur « Dossier indisponible ». Les liens
« Lancer le Live » ne vérifient rien (`build-seller-presentation.ts:399`).

3. Tous les boutons et liens « Lancer le Live » vérifient avant d'ouvrir le Live :
   - 0 concurrent retenu : le bouton est désactivé, avec « Retenez au moins un concurrent pour lancer
     le Live », et un lien vers l'étape des concurrents ;
   - 1 ou 2 concurrents retenus : le Live s'ouvre, après l'avertissement « Peu de concurrents : la
     lecture du marché sera fragile » ;
   - aucun autre blocage.
4. Si le Live est ouvert quand même avec 0 concurrent (ancien lien, onglet resté ouvert), le vendeur
   voit l'écran neutre de pause de la M92, jamais un message d'erreur. Le conseiller voit la raison
   sur son propre écran, s'il en a un.

### C. Chaque chiffre dit sur quoi il est calculé

**Constats** :
- le libellé « Calculé sur les N concurrents » compte aussi les valeurs aberrantes exclues du calcul
  (`market-reading.ts:56`) ;
- le rang « Position (prix/m²) n/N » est calculé sur tous les concurrents, y compris ceux pas encore
  devinés (`build-seller-presentation.ts:303`) ;
- le « Prix des concurrents » n'est pas placé sur la bande des prix (audit n°3, M94).

5. N compte seulement les concurrents qui entrent dans le calcul. Devant le vendeur : « Calculé sur
   5 concurrents ». Le conseiller voit en plus, sur « Avant le rendez-vous » : « 2 écartés : prix au
   m² trop éloigné ».
6. Le rang n/N se calcule seulement sur les concurrents déjà révélés au moment de l'écran, comme la
   bande et la phrase de position (M94). Il ne dévoile rien d'un concurrent à venir.
7. Le « Prix des concurrents » est placé sur la bande des prix, comme le prix choisi.

### D. Les informations à vérifier ne passent pas en silence

**Constat** : les champs « À vérifier » d'un concurrent créé depuis la recherche (M101) entrent dans
le prix au m² sans aucune alerte.

8. Sur « Avant le rendez-vous », une ligne : « 2 concurrents retenus ont un prix ou une surface à
   vérifier », avec un lien vers chacun. Elle s'ajoute au compteur de la M97.
9. Au lancement du Live, si des prix ou des surfaces restent à vérifier, la confirmation (critère 10)
   le rappelle. Rien n'est bloqué : le choix reste au conseiller.

### E. Un vrai dossier ne se fige plus par erreur

**Constat** : un vrai dossier testé en Live est figé dès le deuxième écran, sans avertissement
(`live-comparative-shell.tsx:733`).

10. Lancer le Live sur un vrai dossier, pas sur le dossier d'exemple, demande une confirmation,
    côté conseiller : « Vous êtes devant le vendeur ? Ses réponses seront enregistrées pour de bon.
    Pour vous entraîner, ouvrez le dossier d'exemple. ». Deux boutons : « Lancer devant le vendeur »
    et « Ouvrir le dossier d'exemple ».
11. Sur « Avant le rendez-vous », près du bouton du Live, une phrase dit la même chose.
12. Un opérateur (`ACM_OPERATOR_EMAILS`) peut rouvrir un Live figé par erreur, depuis la fiche du
    dossier. Il donne un motif, et l'action est tracée : qui, quand, motif. Les réponses effacées
    sont gardées dans la trace. Un conseiller ou un manager ne le peut pas : la méthode reste
    infalsifiable (M92).

### F. Preuves

13. Migration seulement si la trace du critère 12 l'exige. Elle est soumise avant d'être appliquée,
    avec comptage avant et après.
14. Tests :
    - « Non » avec un prix tapé : aucun prix révélé enregistré ;
    - lancement avec 0, 1 et 3 concurrents retenus ;
    - Live ouvert à 0 concurrent : écran de pause, aucun texte technique ;
    - N exclut les valeurs aberrantes ;
    - rang n/N sur les seuls concurrents révélés ;
    - « Prix des concurrents » placé sur la bande ;
    - ligne « à vérifier » et rappel au lancement ;
    - confirmation sur un vrai dossier, absente sur le dossier d'exemple ;
    - réouverture par un opérateur tracée, refusée à un manager.
15. Le test de vocabulaire (M89, M92, M97) couvre les nouveaux textes. `npm run e2e` vert, tablette
    comprise.

## Décisions à respecter

- M92 (méthode infalsifiable, écran de pause), M94 (bande et position sur les seuls concurrents
  révélés), M95 (rythme accéléré), M96 (prix révélé figé), M97 (dossier d'exemple, « À vérifier »),
  M101 (création depuis la recherche), M103 (avertissement sur une annonce retirée recochée).
- Les adresses des concurrents n'apparaissent jamais côté vendeur.
- On ne modifie pas l'extension.

## Hors périmètre

- Raccourcir encore le Live (31 écrans à 8 concurrents). On le recalera avec les durées réelles de
  la bêta.
- La M105 : préparation, import, Suivi, équipe, plafond.

## Essai sur l'URL d'essai

1. Dans le dossier d'exemple, en rythme accéléré, taper un prix puis répondre « Non » : le prix
   n'apparaît ni sur la bande ni dans le Suivi.
2. Retirer tous les concurrents d'un dossier : « Lancer le Live » est désactivé, avec la raison.
   Avec 2 concurrents : l'avertissement s'affiche, puis le Live s'ouvre.
3. Sur un dossier avec une valeur écartée, le libellé dit le bon nombre. Le rang n/N grandit à chaque
   concurrent révélé.
4. Lancer le Live sur un vrai dossier : la confirmation s'affiche. Sur le dossier d'exemple : pas de
   confirmation.
5. Avec le compte de Laurent, rouvrir un Live figé : le motif est demandé. Avec un compte de
   conseiller, l'action n'existe pas.
