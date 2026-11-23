# MISSION 164 — Un Live rouvert oublie le prix qu'il avait enregistré

**Date** : 23/11/2026 · **Origine** : relecture de la 163 C (décision de Jean-Guy, 23/11) : « à la
réouverture, le prix enregistré au Live ne doit plus servir au classement ».

## Le problème

Un opérateur peut rouvrir un Live figé par erreur (M104, `reopen_live`). La réouverture efface les
réponses et le résumé du Live, et remet à zéro son heure de début et de fin. Elle ne touche pas
`project_meeting_conclusions.commercialization_price`, que « Sur quel prix partons-nous ? » a
écrit par `save_commercialization_price` (M81, M111).

Le Live rouvert repart donc avec « Sur quel prix partons-nous ? » vide, mais l'ancien prix est
toujours en base. L'Étude de marché (163 C) classe le bien à ce prix, alors que le Live a été
annulé. La conclusion et la synthèse le relisent aussi.

Ce n'est pas nouveau : `main` classait déjà ce prix avant la 163 C.

## Ce qui est attendu

1. À la réouverture d'un Live, `reopen_live` retire le prix enregistré pendant ce Live. Deux
   formes possibles, à trancher avec le gardien-sql :
   - supprimer la ligne de conclusion quand elle n'a pas d'issue (créée par la seule saisie du prix,
     M111) ;
   - sinon, mettre son prix à `null`.
   La réouverture reste refusée sur un dossier conclu (M104) : une ligne avec une issue ne devrait
   pas exister à ce moment-là, à vérifier sur la vraie base.
2. La trace de la réouverture (`live_reopenings`) dit que le prix a été retiré, sans son montant.
   Le montant ne s'y garde pas, comme les réponses effacées.
3. Après la réouverture, l'Étude, la synthèse et l'écran de conclusion ne voient plus aucun prix ;
   un nouveau prix saisi au Live classe de nouveau le bien.

## Contraintes

- Une migration : `reopen_live` modifiée, rien d'autre. Comptage sur la vraie base avant
  application : combien de lignes de conclusion sans issue avec un prix, combien de Lives rouverts.
- Gardien-sql obligatoire. Application par Jean-Guy.
- Compatible avec le code de `main` (la base est partagée).
- Test SQL dans `live_reopening.sql` :
  - prix retiré à la réouverture ;
  - refus inchangés (dossier conclu, Live pas commencé, conseiller, manager) ;
  - rien d'autre n'est touché sur la conclusion d'un autre dossier.
- Sans maquette : aucun écran ne change.

## Hors périmètre

- Changer ce que voit le conseiller à la réouverture.
- Le Point marché.
