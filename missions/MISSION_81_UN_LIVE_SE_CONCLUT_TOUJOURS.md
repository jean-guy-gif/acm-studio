# MISSION 81 — Un rendez-vous mené dans le Live se conclut toujours

**Date** : 09/10/2026 · **Origine** : essai de Laurent, dossier `03051b17-ec71-4102-b4ed-993d64fb0d99`.
« À la fin de mon Live, j'ai une erreur 404 juste après la décision du prix de commercialisation. »
Cause lue dans le code : « Lancer le Live » est proposé sur la page du dossier quel que soit son
statut, et la scène `/live/[id]` ne vérifie pas le statut. Mais « Terminer le rendez-vous » mène
à `/builder/[id]/conclusion`, qui renvoie 404 si le dossier est encore en préparation (`draft`),
et `conclude-meeting.ts` refuse aussi ce statut. Le prix de commercialisation, lui, est bien
enregistré (`save-commercialization-price.ts` ne regarde pas le statut).

## Objectif

Un rendez-vous réellement mené ne se perd jamais : quel que soit le statut du dossier, la fin du
Live mène à la conclusion, et conclure fait passer le dossier dans le Suivi.

## Critères d'acceptation (testables à l'écran)

1. La page de conclusion s'ouvre pour un dossier en préparation, prêt ou conclu. Jamais de 404
   pour un dossier de l'agence.
2. Conclure un dossier en préparation le fait passer directement dans le Suivi
   (`draft` → `meeting_completed`), dans la même écriture que l'issue, comme aujourd'hui pour un
   dossier prêt.
3. Les réponses du Live et le prix de commercialisation déjà saisis sont repris sur la page de
   conclusion, comme pour un dossier prêt.
4. Le dossier `03051b17…` de Laurent se conclut sans rien ressaisir.
5. Un test couvre les trois statuts (page et action) ; `npm run e2e` reste vert.

## Décisions à respecter

- M52 (la bascule en « prêt » reste automatique ; on n'y touche pas), M53 (la conclusion est un
  écran conseiller, jamais vu du vendeur).

## Hors périmètre

- Bloquer le Live d'un dossier en préparation : on garde la liberté de le lancer.

## Essai sur l'URL d'essai

Ouvrir le dossier `03051b17…` (en préparation), « Lancer le Live », aller au bout, « Terminer le
rendez-vous » : la conclusion s'affiche avec le prix déjà saisi. Conclure « mandat signé » : le
dossier est dans le Suivi, avec « Concurrents à prospecter ».
