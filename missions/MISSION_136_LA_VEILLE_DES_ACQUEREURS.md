# MISSION 136 — La veille des acquéreurs

**Date** : 06/11/2026 · **Origine** : retours des agences relayés par Jean-Guy : « beaucoup de temps de
recherche pour trouver des biens ». Décision du 06/11 : **seulement les acquéreurs « Prêts à visiter »,
et un plafond mensuel par agence**. Feuille de route : `FEUILLE_DE_ROUTE_LA_BOUCLE.md`.

Équipe allégée. Une migration probable (le plafond de la veille, l'horodatage du dernier passage) :
gardien-sql, arrêt, Jean-Guy applique.

## A. Qui est veillé
1. Seuls les acquéreurs **« Prêt à visiter »** (132 : financement validé, échange venu de l'acquéreur il y
   a moins de 30 jours, budget max), non archivés. Un acquéreur qui sort de « Prêt » n'est plus veillé ;
   il revient dès qu'il y rentre.
2. Une recherche par acquéreur **et par semaine**, au plus. Les acquéreurs veillés passent du plus
   récemment actif au plus ancien, jusqu'au plafond.

## B. Le plafond
3. La veille a **son propre plafond mensuel**, pris **dans** le budget de recherche de l'agence (M100,
   30 € par défaut) : par défaut 10 € par mois, réglable par le manager dans Administration (« Veille des
   acquéreurs : jusqu'à … € par mois »). Le reste du budget reste aux recherches des conseillers : la veille
   ne peut jamais les priver.
4. Chaque recherche réserve son coût maximal avant l'appel (M105, `reserve_stream_estate_budget`) et le
   règle après. Plafond de la veille atteint : elle s'arrête jusqu'au 1er du mois suivant ; le manager le
   voit (« Veille en pause : plafond du mois atteint »), le conseiller non.

## C. Ce que la veille ramène
5. La recherche est celle des biens idéaux (M118) avec la fiche de l'acquéreur ; ne sont gardés que les
   biens **vus sur le marché depuis le passage précédent** (date Stream Estate, `first_seen_on`), absents
   de ses sélections, de ses propositions (134) et de ses refus.
6. Ce qui est trouvé arrive dans « À faire aujourd'hui » (M130) : « 2 nouveaux biens pour la famille
   Keller », qui ouvre la page des biens idéaux de l'acquéreur avec ces biens en tête (« Nouveau cette
   semaine »), prêts à « Retenir » puis à proposer (134). Rien n'est envoyé à l'acquéreur sans le
   conseiller.
7. Un bien trouvé pour plusieurs acquéreurs fait une seule tâche « N acquéreurs pour … » (134).

## D. Quand et comment
8. Un passage planifié chaque nuit (cron Vercel, comme `verifier-oppositions`, à une heure creuse),
   qui traite les acquéreurs dont le dernier passage date de 7 jours ou plus. Côté serveur seulement,
   avec la clé de service ; journal des passages (acquéreurs veillés, biens trouvés, coût) lisible par le
   manager.
9. Sur la fiche de l'acquéreur : « Veille : dernière recherche le …, prochaine le … » ou « Veille arrêtée :
   pas prêt à visiter ».

## Démo
Pas d'appel payant : la démo simule un passage (deux nouveaux biens pour les Keller), comme la M127 B.

## Preuves
- Tests : qui est veillé (bornes de « Prêt »), une recherche par semaine, plafond de veille séparé du
  budget des conseillers, filtrage des biens déjà vus, proposés ou refusés.
- e2e : la veille simulée de la démo fait naître la tâche des Keller ; plafond atteint → aucun appel.
