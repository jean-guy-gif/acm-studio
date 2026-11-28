# Lot B4 — « Comment finance-t-il ? » lu dans les notes : la mesure du 28/11/2026

Ce qui est mesuré : la lecture des notes par l'IA propose-t-elle le bon mode de financement
(Comptant, Avec prêt), seulement quand les notes le disent, avec la ligne d'où il vient ?

## Comment

- **Neuf notes inventées.** Sept viennent de la mission 151 (`missions/M151-essais`) : N1, N2, N4,
  N6, et les exports C2, C3, C5. Deux sont écrites pour cette mesure (`missions/LB4-essais/notes`) :
  N7, « paiement comptant, pas de prêt », et N8, une dictée, « sans crédit sur ses fonds propres ».
  Aucun client réel.
- **Les corrigés écrits avant l'appel** (`missions/LB4-essais/corriges.json`, commit `0e375018`).
  Trois notes ne disent ni comptant ni prêt, et pièges compris :
  - N6, « doivent vendre leur maison de Grasse avant » ;
  - C3, « Financement : À l'étude » ;
  - C5, « Rentier, très fortuné, se méfie des banques », un jugement sur le patrimoine.
- **La demande de la production, telle quelle**, et la réponse passée par la garde du serveur
  (`missions/LB4-essais/notes.mesure.mjs`).
- **Le modèle de la production** : Claude Sonnet 4.6, profil « EU », par Amazon Bedrock.
  Deux passes par note.

## Résultat

| | |
|---|---|
| Lectures | 18 (9 notes × 2 passes) |
| Mode juste | **18 sur 18** |
| État du financement juste | 18 sur 18 |
| Mode inventé (proposé alors que les notes ne le disent pas) | **0** |
| Mode manqué | 0 |
| Refusé par la garde du serveur | 0 : le modèle n'a jamais proposé un mode faux |
| Les deux passes identiques | 9 sur 9 |
| Coût réel | **0,39 €** (0,02 € par lecture) |

| Note | Ce que disent les notes | Mode proposé | Ligne montrée au conseiller |
|---|---|---|---|
| N1 | accord de principe de la banque | Avec prêt | « accord de principe CA ok » |
| N2 | prêt à l'étude à la banque | Avec prêt | « ils ont un prêt en cours d'étude à la banque » |
| N4 | comptant | Comptant | « cash (vente Stockholm), pas de prêt » |
| N6 | une vente avant l'achat | rien : « Pas encore dit » | — |
| C2 | prêt chez un courtier | Avec prêt | « prêt en cours chez courtier » |
| C3 | « Financement : À l'étude » | rien : « Pas encore dit » | — |
| C5 | un jugement sur le patrimoine | rien : « Pas encore dit » | — |
| N7 | comptant | Comptant | « paiement comptant, pas de prêt » |
| N8 | sans crédit | Comptant | « elle achète sans crédit sur ses fonds propres » |

## À savoir

- **N4.** La ligne montrée au conseiller garde « (vente Stockholm) », l'origine des fonds.
  - Elle n'est que montrée, au conseiller qui l'a écrite, et n'est jamais gardée.
  - C'est la règle de la mission 151 : une mention dans une source est tolérée et comptée à part.
  - Rien d'autre n'est relevé : ni l'apport de N1, ni la fortune de C5.
- **Une lecture n'était pas partie au premier lancement** : le plafond de 0,50 € compte au pire les
  appels en cours. Elle a été jouée seule ensuite (N8, passe 2, juste).
- **Corrigé après la mesure, dans la garde** : « pas de banque », « sans banque », « pas
  d'emprunt » et « pas besoin d'un crédit » se lisent « Comptant ».
  - Avant, la garde les aurait refusés : un comptant manqué, jamais un faux mode.
  - « A besoin d'un prêt » reste « Avec prêt ».
  - Un test le prouve.

Les réponses brutes sont restées hors du dépôt.
