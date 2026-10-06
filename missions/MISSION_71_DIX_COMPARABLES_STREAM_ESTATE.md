# MISSION 71 — Stream Estate donne toujours 10 comparables importables, du plus proche au moins proche

**Date** : 06/10/2026 · **Origine** : essai de Laurent à Saint-Laurent-du-Var : 2 comparables
seulement, et le bouton d'import groupé a disparu. « Je veux à chaque fois 10 comparables, on
commence très proche puis on écarte petit à petit, avec le % de correspondance. »

## Objectif

Une recherche Stream Estate renvoie 10 biens importables. Elle commence par les critères identiques
et ne desserre un critère que s'il en manque. Chaque carte affiche son % de correspondance.

## Mesure d'abord (3 appels réels au plus, puis continue sans t'arrêter si c'est conforme)

Vérifie sur `/documents/properties` (doc : docs.stream.estate, get_collection) que :
- `lat` + `lon` + `radius` (en km) fonctionnent ;
- combinés à `includedInseeCodes[]`, ils donnent bien l'intersection ;
- `excludedInseeCodes[]` fonctionne.

Rends un tableau de 3 lignes. Arrête-toi seulement si le rayon ne marche pas.

## Critères d'acceptation

1. **Bouton d'import** : « Retenir et importer les N cochés » est visible dès qu'au moins un
   candidat est affiché. Reproduis la disparition (Saint-Laurent-du-Var), trouve la cause et ajoute
   un test qui l'empêche de revenir.
2. **Les crans, dans cet ordre (décision de Laurent, 06/10).** L'emplacement d'abord : on élargit
   ce qui change peu la comparaison sans quitter le quartier, puis on s'éloigne par petits cercles.
   On s'arrête dès qu'on a 10 biens anciens, importables et vivants :
   1. Identique : à moins de 1 km de l'adresse du bien, dans la commune. Même nombre de pièces,
      surface à ±10 %, fourchette stricte.
   2. Plus grand, même quartier : moins de 1 km, surface de +10 % à +25 % (jamais plus petit).
   3. Une pièce de plus, même quartier : moins de 1 km.
   4. Même ville, à moins de 2 km, avec les élargissements 2 et 3.
   5. Même ville, à moins de 5 km, idem.
   6. Plus loin : rayon de 10 km, communes voisines comprises, idem.
   7. Prix à ±5 % hors fourchette, en dernier recours (10 km).
   - Chaque cran garde les élargissements des crans précédents. Les crans 1 à 5 restent dans la
     commune (`includedInseeCodes[]` + rayon).
   - Sans adresse géocodée sûre (règle de `geocode-subject`), il n'y a pas de quartier. Le cran 1
     prend toute la commune, les crans 2 et 3 aussi, et les crans 4 et 5 sautent. Le rayon de 10 km
     part alors du centre de la commune (geo.api.gouv.fr, champ `centre`).
   - Un bien sans position fiable n'entre qu'avec un cran « toute la commune », avec la mention
     « quartier non vérifié ».
   - Les crans décident où l'on cherche (et ce qu'on paie). L'ordre affiché reste celui du % :
     un bien à 4 km ne passe jamais devant un bien identique à 300 m.
3. **Facturation maîtrisée.** Les tranches de surface, de pièces et de prix sont disjointes. Un
   cercle plus large refacture les quelques biens du cercle précédent, parce qu'on ne peut pas
   exclure un rayon : accepté. On épuise les pages d'un cran avant de passer au suivant. Plafond de
   60 annonces facturées par recherche ; à ce plafond, on s'arrête et on le dit.
4. **% de correspondance** sur chaque carte (portails compris), sur 100 points :
   - **Secteur 25** : moins de 500 m → 25, moins de 1 km → 20, moins de 2 km → 15, moins de 5 km
     → 8, moins de 10 km → 4. Sans position : même commune → 15, commune voisine → 5.
   - **Surface 20** : écart ≤ 5 % → 20, ≤ 10 % → 15, ≤ 25 % → 8.
   - **Prix 20** : dans la fourchette → 20, à 5 % au plus hors fourchette → 10.
   - **Pièces 15** : identique → 15, une de plus → 7.
   - **Stationnement 5, extérieur 5.**
   - **Niveau 2, 10 en tout** : état 2, étage 2, ascenseur 2, année 2, piscine 1, exposition 1.
   - Un critère inconnu d'un côté sort du calcul : % = points obtenus ÷ points possibles.
   - La liste est triée par % décroissant ; à égalité, l'ordre actuel décide.
5. **Sur chaque carte élargie**, une ligne dit l'écart, par exemple « Même ville, à 1,6 km »,
   « Commune voisine : Cagnes-sur-Mer, 6,1 km », « Plus grand : 78 m² (+12 %) », « 5 pièces (+1) »
   ou « Prix 4 % au-dessus de votre fourchette ».
6. **Ligne de bilan** : « 10 comparables : 2 identiques, 3 plus grands, 5 à moins de 2 km — 37
   annonces facturées (0,37 €) ».
   - Moins de 10 après le dernier cran : on affiche ce qu'on a et on dit pourquoi.

## Décisions à respecter

- Les portails gardent exactement leurs filtres (M61, M68, M69). Seul Stream Estate desserre.
  Attention au garde-fou « commune » de `rankCandidates` : il ne doit pas écarter les communes
  voisines venues de Stream Estate.
- On garde : la liste blanche des sites importables, les annonces revues depuis 7 jours au plus, le
  neuf seulement en complément sous 3 biens anciens, les 5 premiers cochés d'office, et la clé jamais
  côté navigateur.

## Hors périmètre

- Élargir les portails ; une surface plus petite ; une pièce de moins ; tout autre critère.

## Tests et coût

- Les tests tournent sur des réponses enregistrées, jamais sur le réseau. Ils couvrent : les tranches
  disjointes, l'arrêt à 10, le plafond de 60, le calcul du %, et la visibilité du bouton.
- Pendant le développement, 5 recherches réelles au plus. Donne leur coût total.

## Essai à l'écran

Le bien de Saint-Laurent-du-Var, puis « Chercher via Stream Estate (essai) ». On doit voir 10 cartes
numérotées avec leur %, l'écart sur chaque carte élargie, la ligne de bilan avec le coût, et le
bouton d'import groupé. On importe les 5 cochés : 5 fiches entrent dans le dossier.
