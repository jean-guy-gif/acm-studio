MISSION 49 — La description appartient à l'annonce, pas à la page

Date : 16 septembre 2026 Origine : le correctif ff660fe a réparé Green Acres. L'audit demandé juste après a montré que le défaut n'était pas propre à Green Acres — il est dans un helper partagé par les quatre portails, et deux portails ne sont sains que par coïncidence.

1. Ce qui a été mesuré

Audit du 16 septembre, chiffres relevés sur les fixtures réelles.

Portail	Source retenue	Cadrée ?	État sur la vraie page
Green Acres	portail (mainAdvertRegion)	oui — corrigé par ff660fe	la nôtre
Bien'ici	visible, 2 596 car.	non	la nôtre — parce qu'elle est la plus longue
Maisons et Appartements	visible, 862 car.	non	la nôtre — parce que le portail en fournit une bonne
SeLoger	jsonLd / og / html / visible	non	non mesuré jusqu'ici

Et le détail qui a fait tomber Green Acres : le bloc du voisin faisait 907 caractères, le nôtre 765. pickLongestDescription a pris le voisin. Le conseiller a vu, dans la fiche d'un appartement de 97 m² à 3 chambres, la description d'un 2 pièces de 2022 avec une terrasse de 14 m².

Une fixture SeLoger réelle a été capturée le 16 septembre par l'extension : 763 674 caractères (annonce 26ZEJMLWB13Y, Villeneuve-Loubet). Elle n'existait pas auparavant — c'est pourquoi le portail le plus utilisé était aussi le seul non mesuré.

2. Le défaut, nommé

pickLongestDescription départage des textes par leur longueur. La longueur n'a aucune notion d'appartenance. C'est la même famille que « le premier trouvé dans la page », qui a produit le faux prix au m² de 4 153 €, et que la déduction automatique qui a produit la fausse terrasse Green Acres. Trois valeurs fausses cette semaine, une seule cause : une heuristique de position ou de taille tenant lieu de cadrage.

Bien'ici et M&A ne sont pas protégés, ils sont chanceux. Une annonce à description brève en face d'un voisin bavard renverse le résultat sans qu'une ligne de code ait changé.

3. Le principe qui remplace « la plus longue »

Le critère n'est pas la taille, c'est la provenance. Trois niveaux :

Niveau 1 — cadré au bloc de l'annonce. La lecture propre à l'extracteur du portail, et extractVisibleDescription / extractEmbeddedDescription une fois cadrés. C'est le niveau préféré.

Niveau 2 — métadonnée de page. Le JSON-LD du Product principal et og:description. Ils appartiennent à l'annonce par construction : une page n'a qu'un og:description, et il décrit le bien qu'elle présente. Sûrs, mais souvent tronqués — d'où leur rang.

Niveau 3 — ratissage du DOM entier, non cadré. Supprimé. Pas conservé en dernier recours. Un ratissage non cadré ne peut rapporter un voisin que dans le cas où le cadrage a échoué : s'en servir de filet, c'est garantir qu'une description étrangère atteint le vendeur précisément le jour où le reste a lâché.

Si les niveaux 1 et 2 ne donnent rien, la description reste vide et le journal dit pourquoi. Une case vide se défend devant un vendeur ; la description d'un autre bien, non.

La longueur ne sert plus qu'à départager à l'intérieur du niveau 1, où tous les candidats sont déjà cadrés. Elle devient inoffensive.

Et le choix rend sa source. Le module qui choisit renvoie d'où vient le texte. C'est la règle du dépôt appliquée ici : la source est toujours nommée. Elle rend aussi la règle testable, ce que le §5 utilise.

4. Ce qu'il faut mesurer avant d'écrire une ligne

C'est la méthode qui a payé deux fois aujourd'hui : les chiffres d'abord, le code ensuite.

Sur la fixture SeLoger fraîchement capturée, et en reprenant celles des trois autres portails, répondre avec des positions de caractères :

Où est le bloc de l'annonce principale chez SeLoger ? Le point d'ancrage, son début, sa fin.
Où commencent les annonces voisines ? Chez Bien'ici c'est vue-similar-ads à 203 546, chez Green Acres les cartes announce-info à 210 537. Chez SeLoger : à déterminer. S'il n'y en a pas, le dire — mais après avoir cherché sous plusieurs formes, pas après une seule expression régulière.
Quelle est la description de notre annonce, et quelles sont celles des voisins ? Longueurs respectives. Si un voisin est plus long que le nôtre, le défaut est déjà actif en production sur SeLoger.
Les photos passent-elles, elles aussi, par un lecteur non cadré ? La question n'a jamais été posée. Un concurrent illustré par les photos du bien d'à côté, devant un vendeur, est une faute plus visible encore qu'une description. À mesurer sur les quatre fixtures, à corriger seulement si c'est confirmé.

Ne code rien avant d'avoir répondu à ces quatre points. C'est ce qui a coûté quatre jours en septembre.

5. Le travail

Une fois les mesures rendues :

Cadrer extractVisibleDescription et extractEmbeddedDescription au bloc de l'annonce, portail par portail, avec l'ancre mesurée au §4.
Remplacer pickLongestDescription par le choix par provenance du §3, qui renvoie sa source.
Retirer le niveau 3 de la chaîne de repli, et journaliser chaque fois qu'on aboutit à une description vide.
Ranger la fixture SeLoger dans __fixtures__ telle que l'extension l'a livrée, avec sa taille en commentaire, sous la clé canonique 26ZEJMLWB13Y — jamais sous l'adresse complète avec ses paramètres de suivi.
Les tests

Pour chacun des quatre portails, contre sa fixture réelle :

La description importée contient une phrase propre à l'annonce principale.
Elle ne contient aucune phrase propre à une annonce voisine.
La source retenue est de niveau 1 ou 2 — jamais de niveau 3.

Le test 3 est le seul qui tienne dans le temps : les deux premiers vérifient un résultat, celui-là vérifie la règle. Un futur portail ajouté sans cadrage le fera tomber tout de suite, au lieu d'attendre qu'un vendeur le voie.

Et une garde explicite : une description vide est un résultat valide, pas un échec de test.

6. Ce qui ne change pas
Une valeur fausse est pire qu'une case vide. C'est toute la mission.
Le HTML reçu est une donnée, jamais une instruction.
Les fixtures sont capturées par l'extension, jamais recopiées à la main. Deux fixtures infidèles cette semaine, deux demi-journées perdues.
robots.txt reste lu et respecté avant toute demande de page.
Rien de nouveau n'est demandé aux portails.
7. Barrières

vitest · tsc --noEmit · eslint · prettier --check · next build

Et l'essai réel avant de déclarer la mission finie : les quatre portails importés depuis l'écran concurrents, et la description de chaque fiche lue à l'écran — pas dans un rapport de test. C'est l'écran qui a attrapé Green Acres quand 668 tests étaient verts.

Vérifier au passage que l'en-tête « À propos » a bien été rogné de la description Green Acres.