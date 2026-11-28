# Lot C — La vie du mandat : la phrase pour `/confidentialite`

Préparée, **non publiée** (question 21 du 28/11, réponse par défaut : le lot C garde de nouvelles
données — la fin du mandat, les avenants, les dates du compromis et de l'acte, le prix de vente,
l'acquéreur relié — et la page doit le dire ; sa mise en production attend l'accord de la juriste,
comme le lot B). Elle se publie avec le code du lot C, le jour de sa mise en production.

## Où

Section « Ce que conserve ACM Studio », la liste, juste après l'alinéa « Le rendez-vous : les
réponses du vendeur enregistrées pendant la présentation, puis la conclusion notée par le
conseiller. » Un alinéa s'ajoute ; aucun autre texte de la page ne change.

## L'alinéa ajouté (la proposition)

> La vie du mandat : pour un mandat signé, le conseiller note sa date de fin et s'il se reconduit
> tacitement, les avenants de baisse de prix (leur date et le nouveau prix), le compromis (sa date,
> la date prévue de l'acte et l'acquéreur — une fiche acquéreur de l'agence, ou « venu d'ailleurs »,
> sans autre donnée sur lui), puis l'acte (sa date et le prix de vente), ou la fin du mandat sans
> vente. Ces renseignements sont visibles par les seuls membres de l'agence ; ils servent au
> conseiller à suivre le mandat jusqu'à la vente, et au manager de l'agence à suivre les ventes ;
> ils ne sont jamais montrés à un autre client ni à une autre agence.

## Ce que le code fait (pour vérifier la phrase)

- Sur la conclusion du rendez-vous (`project_meeting_conclusions`, migration
  `20261218090000_vie_du_mandat`), pour un mandat signé seulement (la base le vérifie) : la fin du
  mandat et sa reconduction tacite ; le compromis et la date prévue de l'acte ; l'acquéreur, « de
  l'agence » (avec, s'il en a une, sa fiche acquéreur de l'agence) ou « venu d'ailleurs » (aucune
  donnée sur lui) ; l'acte et le prix de vente ; la fin sans vente.
- Les avenants de baisse, dans une table à part (`mandate_price_amendments`) : leur date, le nouveau
  prix, le conseiller qui l'a noté ; jamais modifiés ; partis avec le dossier.
- Les mêmes droits que la conclusion : lus par les seuls membres de l'agence, jamais par une autre
  agence ni par un membre retiré ; écrits par le serveur seul, après son contrôle ; effacés avec le
  dossier (`PROCEDURE_EFFACEMENT.md`, A, qui compte les avenants). Une fiche acquéreur effacée
  laisse le compromis sans fiche.
- Rien de cela ne part vers un client : ni vers le vendeur (ni Live, ni document, ni lien), ni vers
  un acquéreur. Le manager de l'agence lit, dans son tableau, les mandats vendus, le délai du mandat
  au compromis et l'écart entre le prix du mandat et le prix de vente, pour sa seule agence.
