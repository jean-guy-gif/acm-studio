# MISSION 89 — Un Live sûr devant le vendeur, et le « Prix des concurrents »

**Date** : 11/10/2026 · **Origine** : audit stratégique du 11/10/2026, décisions 2 et 3, validées
par Laurent. Sur le prix : « Le prix conseillé est calculé automatiquement par rapport au marché des
biens à vendre, il faut garder ça mais changer le nom, par exemple prix des concurrents. »

## Objectif

1. Le prix calculé sur les biens en vente porte son vrai nom, « Prix des concurrents », partout.
2. Rien de réservé au conseiller n'apparaît sur l'écran tourné vers le vendeur.
3. Le Live ne se fige jamais devant le vendeur, et un rendez-vous interrompu reprend là où il
   s'était arrêté.

## Constats de l'audit (code de `main` au 10/10)

- Le « Prix conseillé » est pré-rempli par le calcul (`positioning/page.tsx:127-132`), puis montré
  au vendeur sous ce nom (`live-page-conclusion.tsx:76-77`).
- « Quitter » est un lien sans confirmation vers `/builder/[id]/presentation`
  (`live-comparative-shell.tsx:623`). Cette page affiche tous les prix des concurrents, la
  fourchette et le prix calculé.
- La « Justification » saisie au positionnement est affichée au vendeur
  (`live-page-conclusion.tsx:105-111`), sans l'avertissement que porte le champ voisin
  (`positioning-decision-form.tsx:176-193`). Même chose pour le « Prix souhaité par le vendeur ».
- Un dossier sans concurrent ouvre quand même le Live et affiche au vendeur « Aucun bien concurrent
  retenu : préparez le dossier dans la Préparation avant le rendez-vous. » (observé sur l'essai le
  11/10).
- Les libellés de saisie parlent du vendeur à la 3e personne sur son propre écran : « La réponse du
  vendeur », « Le prix imaginé par le vendeur », « Selon le vendeur, pourquoi ? »
  (`live-page-competition.tsx:356`, `live-page-price.tsx:438`,
  `live-page-price-reveal-pilot.tsx:130`, `live-page-duration.tsx:268, 332`).
- `onValidate` fait `setBusy(true)`, `await`, puis `setBusy(false)`, sans `try/finally`
  (`live-comparative-shell.tsx:341-441, 476-483`). Une erreur réseau laisse « Valider » grisé
  indéfiniment.
- « Lancer le Live » pointe vers `/live/[id]` sans écran (`live/page.tsx:68`). Un rendez-vous
  interrompu repart de l'introduction.
- La reprise exige des réponses que le clic n'exigeait pas (`can-advance-live-page.ts:16-21` face
  à `shell:341-368`) : on peut être renvoyé en arrière.
- La question de 1 à 10 dit « à ce prix » même quand aucun prix n'a été saisi.

## Critères d'acceptation

### A. Le « Prix des concurrents »

1. Partout où le prix calculé s'affichait sous le nom « Prix conseillé », il s'appelle « Prix des
   concurrents » : positionnement, aperçu, Live, conclusion, Suivi (détail des prix), étape
   d'avancement du dossier. Le calcul ne change pas : il reste pré-rempli et modifiable.
2. Si deux libellés désignent aujourd'hui le même calcul (par exemple « Marché calculé » et « Prix
   conseillé » non modifié), Claude Code les liste dans le compte rendu avec leurs valeurs, puis
   propose un seul nom. Il ne fusionne rien sans accord.
3. « Analyse du conseiller » garde son nom : c'est l'avis du conseiller.
4. Le vocabulaire « comparables » visible à l'écran devient « concurrents » sur les écrans touchés.

### B. Rien de réservé au conseiller devant le vendeur

5. « Quitter » demande une confirmation dans l'écran : « Quitter le rendez-vous ? Vos réponses sont
   enregistrées. » avec « Rester » et « Quitter ». Pas de boîte de dialogue du navigateur. On
   arrive sur `/live` (la liste), jamais sur la page de préparation.
6. Sur le positionnement, sous « Justification » et sous « Prix souhaité par le vendeur » :
   « Affiché au vendeur à la fin du Live », comme sous « Analyse du conseiller ».
7. Un dossier sans concurrent retenu ne se lance pas depuis `/live` : le bouton est désactivé et
   affiche la raison côté conseiller. S'il est ouvert quand même par son adresse, l'écran vendeur
   reste neutre, sans consigne au conseiller.
8. Les libellés vus par le vendeur passent à la 2e personne : « Votre réponse », « Le prix que vous
   imaginez », « Selon vous, pourquoi ? », etc. Liste des changements dans le compte rendu.

### C. Un Live qui ne se fige jamais

9. Chaque enregistrement du Live attendu par un bouton est protégé (`try/finally` ou équivalent) :
   en cas d'échec, le bouton redevient actif et un message discret apparaît, « Connexion perdue —
   touchez Valider pour réessayer ». Jamais de blocage sur tablette.
10. Si des enregistrements en arrière-plan ont échoué, quitter ou recharger la page demande une
    confirmation. Un rechargement ne perd plus de réponse sans le dire.
11. `/live` affiche « Reprendre (écran N sur M) » pour un Live commencé : il ouvre au plus loin
    atteint (`maxReachableLiveIndex` existe déjà), avec « Recommencer depuis le début » en lien
    secondaire. Un Live jamais commencé garde « Lancer le Live ».
12. La reprise ne renvoie plus en arrière pour une réponse que le clic n'exigeait pas. La règle
    serveur « jamais le prix avant la devinette » ne bouge pas.
13. La question de 1 à 10 dit « à ce prix » seulement si un prix de commercialisation a été saisi,
    sinon « pour lancer la vente ».
14. Tests : un test unitaire par point 9 (échec simulé → bouton réactivé). Le test e2e
    `expectPriceHidden` reste vert. Ajout d'un parcours e2e : Live commencé, quitter, « Reprendre »
    rouvre au bon écran.
15. Aucune migration attendue. S'il en faut une, la soumettre avant de l'appliquer.
16. `npm run e2e` vert, tablette comprise.

## Décisions à respecter

- Méthode du Live : un concurrent à la fois, jamais le prix avant la devinette (contrôle serveur
  conservé), valeur perçue en début de Live (M82), question de 1 à 10 (M85), Live toujours concluable
  (M81).
- M72 (tablette), M75 (adresses jamais côté vendeur).

## Hors périmètre

- Rythme accéléré du Live, figer la première devinette, reformulation du prix par le vendeur : P1
  de l'audit, après les premiers rendez-vous réels.
- Suppression du « Prix souhaité vendeur » et regroupement des écrans de préparation : mission de
  simplification.

## Essai sur l'URL d'essai

1. Positionnement d'un dossier : le prix calculé s'appelle « Prix des concurrents ». Sous
   « Justification », l'avertissement « Affiché au vendeur » apparaît.
2. Lancer le Live, avancer jusqu'au 2e concurrent, « Quitter » : la confirmation s'affiche, puis on
   arrive sur la liste `/live`, sans aucun prix.
3. « Reprendre » rouvre au 2e concurrent.
4. Couper le wifi de la tablette, toucher « Valider » : le message apparaît et le bouton reste
   actif. Rallumer, toucher « Valider » : on avance.
5. Fin du Live : la conclusion affiche « Prix des concurrents ». La question de 1 à 10 sans prix
   saisi dit « pour lancer la vente ».
6. Dossier sans concurrent : « Lancer le Live » est désactivé, avec la raison.
