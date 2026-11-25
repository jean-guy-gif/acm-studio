# MISSION 82 — Le vendeur dit son prix en début de rendez-vous, on mesure le chemin parcouru

**Date** : 09/10/2026 · **Origine** : Laurent. « La page "Votre valeur perçue" doit venir juste
après la vérification avec le client que c'est bien son bien, pour savoir en début de rendez-vous
ce qu'il a en tête, et voir à la fin à quel prix il part en commercialisation. Ça nous fera de la
donnée à comparer et à communiquer pour la force de l'outil. »
Aujourd'hui (`build-live-pages.ts`) : Votre valeur perçue est l'avant-dernière page (16/18), avec
la révélation « Positionnement observé sur le marché concurrentiel » (M51).

## Objectif

Le vendeur donne son prix AVANT de voir le moindre concurrent ; à la fin, ce premier prix et le
prix de commercialisation sont gardés côte à côte, dossier par dossier.

## Critères d'acceptation (testables à l'écran)

1. Ordre du Live : Introduction → Votre bien → **Votre valeur perçue** → concurrents → DPE →
   concurrent le plus dangereux → Analyse des prix → Conclusion.
2. En début de rendez-vous, la page ne révèle RIEN : ni positionnement du marché, ni prix, ni
   fourchette. Seulement la question et la saisie du vendeur, puis « Valider et continuer ».
3. La révélation du positionnement observé passe sur « Analyse des prix », avec un rappel :
   « Votre prix en début de rendez-vous : 750 000 € ». Toujours sans saisie conseiller (M58).
4. Rien n'est perdu : la valeur perçue reste enregistrée et figée à la conclusion comme
   aujourd'hui (M56), quel que soit l'endroit où elle est saisie.
5. Suivi : chaque dossier conclu affiche « Prix du vendeur en début de rendez-vous » et
   « Prix de commercialisation », avec l'écart en € et en %. Côté conseiller seulement.
6. `tests/e2e` suit le nouvel ordre ; `npm run e2e` est vert (tablette comprise, M72).

## Décisions à respecter

- M39 (Votre bien : ni prix ni fourchette), M51 (devine puis révèle : la révélation vient
  après la réponse, ici bien plus tard), M56, M58, M66 (aucun prix de concurrent avant la devinette).

## Hors périmètre

- Le tableau de bord agrégé (moyenne des écarts, communication) : mission suivante, quand il y
  aura assez de rendez-vous réels.

## Essai sur l'URL d'essai

Lancer le Live d'un dossier prêt : la 3e page demande le prix au vendeur, sans rien révéler.
Saisir 750 000, aller au bout : « Analyse des prix » rappelle 750 000 € et révèle le marché.
Conclure avec un prix de commercialisation : le Suivi montre les deux prix et l'écart.
