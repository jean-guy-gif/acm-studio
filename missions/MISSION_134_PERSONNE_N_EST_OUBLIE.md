# MISSION 134 — Personne n'est oublié

**Date** : 06/11/2026 · **Origine** : retours des agences relayés par Jean-Guy : « la peur d'oublier un
client quand un nouveau produit rentre » et « beaucoup de temps pour peu d'envois ». Feuille de route :
`FEUILLE_DE_ROUTE_LA_BOUCLE.md`. Suite de la 133 (tâche du mandat signé, « Envoyer le lien »).

Équipe allégée. Migration seulement si nécessaire (arrêt).

## A. Chaque nouveau bien appelle ses acquéreurs
1. Un bien devient « nouveau » pour la boucle quand :
   - un mandat est signé (déjà fait en 133) ;
   - un vendeur passe « à relancer » avec un prix (un bien de l'agence, à proposer avec prudence) ;
   - un concurrent est retenu sur un dossier vendeur, ou un nouveau venu est retenu (M127 B) ;
   - un bien démarché entre en Prospection (M120).
2. Pour chacun, le rapprochement de la 133 (budget + 5 %, ★, archivés exclus) donne les acquéreurs qui
   correspondent. S'il y en a au moins un **prêt à visiter**, une tâche entre dans « À faire aujourd'hui »
   (M130) : « 3 acquéreurs pour la maison de Vence (135 m², 735 000 €) ». Une tâche par bien, jamais une
   par acquéreur.
3. Un bien du marché ou démarché porte son origine : la tâche le dit (« bien du marché : à vérifier avant
   d'envoyer », « vendeur à relancer : à proposer après son accord »).
4. Une tâche n'est jamais recréée pour le même bien et le même acquéreur : un acquéreur déjà contacté
   pour ce bien n'y figure plus.

## B. L'envoi en série
5. La tâche ouvre « Proposer ce bien » : la liste des acquéreurs qui correspondent, les prêts d'abord,
   chacun avec ses ★ remplies et son écart au budget. Tous sont cochés ; le conseiller décoche.
6. « Envoyer à 3 acquéreurs » ouvre une série, un acquéreur à la fois : son message prêt, avec son prénom
   et ce que le bien a de ce qu'il cherche (« la piscine que vous vouliez, à Vence, 15 000 € sous votre
   budget »), le lien de son dossier acquéreur (M119/M122) avec ce bien ajouté en tête de sa sélection,
   et Copier / SMS / WhatsApp / E-mail. Puis « Envoyé, suivant » ou « Passer ». ACM n'envoie rien
   lui-même (comme partout) : il prépare et note.
7. Chaque envoi noté devient un échange sur la fiche (« Ce qui s'est passé » : « Maison de Vence proposée
   le 06/11 ») et compte pour le dernier échange (132). La tâche se vide au fil des envois.

## C. Ce que la fiche acquéreur en garde
8. Sur la fiche, « Biens proposés » : chaque bien envoyé, quand, et sa réponse s'il a répondu par le lien.
   Un bien proposé n'est jamais reproposé sans le dire (« déjà proposé le 06/11 »).

## Démo
Un nouveau venu de Vence retenu sur le dossier des Bernard fait naître « 4 acquéreurs pour … » ; la série
se joue avec les acquéreurs de démo (téléphones en 06 39 98, e-mails en example.com).

## Preuves
- Tests : naissance des tâches selon l'origine, un acquéreur déjà contacté exclu, une tâche par bien.
- e2e : retenir un concurrent → la tâche apparaît → série de 3 envois → la tâche se vide → les fiches
  disent « proposé le … ».
