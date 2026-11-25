# MISSION 139 — Après la visite

**Date** : 06/11/2026 · **Origine** : réunion Plaud du 03/11 (« comptes rendus de visite », « suivi de
recherche hebdomadaire », « point physique tous les quinze jours ») et anciennes missions 124 (compte rendu
dans la langue du client) jamais écrites. Feuille de route : `FEUILLE_DE_ROUTE_LA_BOUCLE.md`.

Équipe allégée. Une migration probable (biens écartés par le conseiller, comptes rendus envoyés) :
gardien-sql, arrêt, Jean-Guy applique. Jean-Guy ne teste que sur la production après le `/valide`.

## A. Le compte rendu de visite
1. Sur une visite, « Visite faite » ouvre un écran court : l'avis de l'acquéreur en boutons (Coup de cœur ·
   Intéressé · Mitigé · Pas pour moi), ce qui a plu et ce qui a déplu en étiquettes (les mêmes raisons que
   la M122 : quartier, surface, extérieur, parking, prix, travaux, luminosité, vis-à-vis, bruit, autre),
   une note libre facultative, et la suite (Offre envisagée · Deuxième visite · On continue à chercher).
2. ACM rédige aussitôt **deux messages prêts**, modifiables :
   - **à l'acquéreur** : merci, ce qu'il a aimé, ce qui l'a gêné, la suite proposée ; Copier / SMS /
     WhatsApp / E-mail ;
   - **au vendeur** (bien de l'agence) : le retour honnête et sans nom de l'acquéreur, pour nourrir le
     Suivi et le prix (« 3 visites, 2 retours sur le prix » apparaît sur la carte du mandat).
3. **Dans la langue du client** : français, anglais, italien, allemand, russe (langue choisie sur la fiche,
   français par défaut). Les messages viennent de **modèles écrits et relus**, pas d'une IA (décision du
   23/10). Les étiquettes sont traduites dans chaque modèle.
4. Le retour compte comme un échange (132) et s'inscrit dans « Ce qui s'est passé ».

## B. Les biens écartés par le conseiller
5. Sur les biens idéaux d'un acquéreur (M118) et sur « Nouveau cette semaine » (M136), à côté de
   « Retenir », « Écarter pour lui » avec une raison en un geste (terrasse trop petite, stationnement non
   conforme, étage, secteur, prix au-dessus du budget, état, autre). Le bien sort de ses propositions et ne
   revient plus (veille comprise).
6. Ces biens écartés sont la preuve du travail fait : ils nourrissent le § C.

## C. Le compte rendu de recherche, chaque semaine
7. Chaque lundi, pour chaque acquéreur actif, une tâche « Envoyer le point de la semaine aux Keller » dans
   « À faire aujourd'hui ». Elle ouvre un message prêt (dans sa langue) : « Cette semaine pour vous : 14
   biens étudiés, 11 écartés (5 pour le stationnement, 3 pour le prix…), 3 retenus, 1 visite. » Les chiffres
   viennent de la veille, des biens écartés, des sélections et des visites de la semaine ; rien d'inventé :
   une semaine vide le dit (« pas de nouveau bien correspondant cette semaine ; je reste attentif »).
8. Pour les acquéreurs « Prêt à visiter », toutes les deux semaines : « Proposer un point avec les Keller »
   (rendez-vous à l'agence ou en visio), avec un message prêt.
9. « Envoyé » note un envoi (pas un échange : seul ce qui vient de l'acquéreur compte, M135).

## Démo
Les Keller : une visite faite avec un compte rendu « Intéressé · aimé : piscine, extérieur · gêné : prix »,
6 biens écartés cette semaine, et la tâche du point hebdomadaire ; un acquéreur anglophone (« Mr and Mrs
Wilson ») pour montrer le message en anglais.

## Preuves
- Tests : messages générés depuis les modèles (chaque langue, chaque avis), chiffres de la semaine exacts,
  semaine vide, bien écarté jamais reproposé.
- e2e : visite faite → compte rendu → message prêt ; point de la semaine des Keller.
