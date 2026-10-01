# MISSION 66 — Le parcours qui ne casse plus

**Date** : 1er octobre 2026 · **Origine** : plan de déblocage §3. Après chaque mission, le parcours
complet est revérifié à la main, et des régressions passent quand même (M53 : le dernier écran du
Live ne menait plus à la conclusion). Avant d'ouvrir le pilote, un test doit rejouer le parcours
entier tout seul.

## Objectif

`npm run e2e` rejoue dans un vrai navigateur, sur l'URL d'essai, un dossier de bout en bout, en
quelques minutes et sans passer par un portail.

## Critères d'acceptation

1. `@playwright/test` est ajouté en devDependency. Justification (règle 19) : aucun outil existant ne
   pilote un navigateur dans les tests. Script `e2e` dans package.json, configuration dans
   `playwright.config.ts`, tests dans `tests/e2e/`.
2. Un compte et une agence de test dédiés, nommés « TEST AUTOMATIQUE — ne pas utiliser ». Je les crée
   moi-même par invitation (M60) : Claude Code ne crée aucun compte en base. Les identifiants vont
   dans `.env.e2e.local` (ignoré par git) : `E2E_BASE_URL`, `E2E_EMAIL`, `E2E_PASSWORD`.
3. Le scénario :
   - connexion → nouveau dossier → bien vendeur saisi à la main (appartement, 3 pièces, 65 m², une
     vraie commune) → fourchette ;
   - 3 concurrents saisis à la main, intitulés « TEST » → le dossier passe en « prêt » ;
   - Live : chaque écran est parcouru avec une réponse saisie → conclusion « à relancer » avec un
     motif → le dossier apparaît dans Suivi ;
   - en fin de test, le dossier est supprimé avec l'action existante.
4. Assertions sur les règles absolues : aucun prix de concurrent dans la page avant la devinette, un
   seul concurrent par écran du Live, et la fourchette du conseiller jamais affichée côté vendeur.
5. Le Live est aussi rejoué en 768 × 1024 (tablette), sans défilement horizontal.
6. Le test ne tourne PAS dans la CI de M62, puisqu'il lui faut l'URL d'essai et un compte. Il se lance
   à la main, ou après chaque déploiement d'essai.

## Hors périmètre

Portails, extension, import PDF : ils dépendent de sites extérieurs.

## Essai

`npm run e2e` est vert deux fois de suite. Ensuite, casse volontairement une chose en local (par
exemple masquer le bouton de conclusion) : le test échoue avec un message lisible. Annule la casse.
