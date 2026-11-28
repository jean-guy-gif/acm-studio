# Lot B — Le mode de financement de l'acquéreur : la phrase pour `/confidentialite`

Préparée, **non publiée** (réponse 3 du 27/11 : la fiche gardera l'apport et le montant du prêt, la
page doit le dire ; le lot B attend l'accord de la juriste avant la production). Elle se publie
avec le code du lot B, le jour de sa mise en production.

## Pourquoi la page change

Aujourd'hui, la page dit que le conseiller note l'état du financement de l'acquéreur « sans montant
ni justificatif ». Avec le lot B, la fiche acquéreur garde aussi comment il finance son achat et,
s'il emprunte, son apport et le montant de son prêt : la phrase deviendrait fausse.

## Où

Section « Les fiches acquéreur », la phrase qui commence par « Le conseiller peut aussi noter l'état
de son financement ». Le reste du paragraphe ne change pas.

## Avant (le texte validé, en ligne aujourd'hui)

> Le conseiller peut aussi noter l'état de son financement (validé, en cours ou inconnu, sans
> montant ni justificatif) et le jour de son dernier échange avec lui ; l'outil en déduit, sans
> rien envoyer, s'il est prêt à visiter ou s'il est à recontacter, pour la seule agence.

## Après (la proposition)

> Le conseiller peut aussi noter l'état de son financement (validé, en cours ou inconnu, sans
> justificatif) et le jour de son dernier échange avec lui ; l'outil en déduit, sans rien envoyer,
> s'il est prêt à visiter ou s'il est à recontacter, pour la seule agence. Il peut noter aussi
> comment l'acquéreur finance son achat (comptant, avec un prêt, ou pas encore dit) et, s'il
> emprunte, son apport, le montant de son prêt et s'il a l'accord de principe de sa banque, chacun
> seulement s'il le donne ; ces renseignements servent à préparer une offre d'achat et ne sont
> jamais montrés à un vendeur.

Deux changements seulement : « sans montant ni justificatif » devient « sans justificatif », et la
seconde phrase s'ajoute. Aucun autre texte de la page ne change.

## Ce que le code fait (pour vérifier la phrase)

- Quatre colonnes sur la fiche acquéreur (`buyers`, migration
  `20261217090000_mode_de_financement`) : le mode (comptant, avec prêt, pas encore dit — le défaut),
  et, avec un prêt seulement, l'apport, le montant du prêt et l'accord de principe (oui / non), tous
  facultatifs. La base refuse un apport, un prêt ou un accord sans prêt.
- Les mêmes droits que le reste de la fiche : lue par les seuls membres de l'agence, jamais par une
  autre agence ni par un membre retiré ; écrite par le serveur seul, après son contrôle ; effacée
  avec la fiche (`PROCEDURE_EFFACEMENT.md`, inchangée).
- Aucun justificatif n'est demandé ni gardé : ni document, ni relevé, ni offre de prêt.
- Rien de cela n'est montré au vendeur : ni au rendez-vous (les acquéreurs montrés restent
  anonymes, avec le seul « financement validé », comme aujourd'hui), ni dans un document, ni par un
  lien. Rien n'est montré non plus à un autre acquéreur.
- L'offre d'achat ne change pas d'un mot. Comme aujourd'hui, une offre comptant dit elle-même que
  l'acquéreur ne recourt pas à un prêt, et c'est cette offre signée que le vendeur lit. Une offre
  avec prêt reste fermée dans ACM : l'écran renvoie au modèle de l'agence.
- La lecture des notes par l'intelligence artificielle (texte validé le 12/11) peut proposer le
  mode, quand les notes le disent, « à vérifier » comme les autres champs ; jamais un montant
  d'apport, de prêt ou de patrimoine, qui ne viennent que du conseiller. Le paragraphe de la lecture
  des notes reste vrai tel qu'il est : il n'a pas besoin de changer.
