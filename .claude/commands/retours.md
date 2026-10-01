---
description: Trie des retours de rendez-vous réels (bloquant / gênant / idée) et rédige au plus une mission
argument-hint: [retours bruts, copiés-collés]
---

Retours bruts, issus de rendez-vous vendeur réels :

$ARGUMENTS

1. Classe chaque retour en une ligne :
   - **BLOQUANT** : il a empêché ou dégradé un vrai rendez-vous (réponse perdue, écran faux devant le
     vendeur, dossier impossible à préparer, prix montré trop tôt) ;
   - **GÊNANT** : il ralentit, mais le rendez-vous a eu lieu ;
   - **IDÉE** : nouvelle fonctionnalité ou confort.
2. Pour chaque BLOQUANT, cherche la cause dans le code (fichier et ligne) et dis s'il est reproductible.
3. Ajoute les GÊNANTS et les IDÉES à `docs/IDEES.md` (datés, une ligne chacun). Ne crée aucune mission
   pour eux.
4. S'il y a au moins un BLOQUANT : rédige UNE mission à partir de `missions/_GABARIT.md` (40 lignes
   au plus), numérotée à la suite de la dernière, qui ne traite que les bloquants. Ne code rien.
5. Termine par : « Mission prête : /mission NN » ou « Rien de bloquant : on continue le pilote ».
