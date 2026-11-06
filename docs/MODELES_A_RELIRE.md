# Modèles de messages à faire relire

Mission 139 (décision de Jean-Guy, 06/11) : les messages envoyés aux acquéreurs — le compte rendu de
visite, le point de la semaine, le point proposé — s'écrivent dans leur langue, depuis des modèles
écrits et relus, jamais par une IA (décision du 23/10). Le code ne fait qu'assembler, dans l'ordre,
les phrases que chaque modèle a écrites.

Une langue n'est proposée sur la fiche acquéreur qu'une fois ses modèles relus par un locuteur natif.
Pour l'allumer, Jean-Guy passe sa constante à `true` dans
`src/features/buyer-messages/languages.ts`, puis `/mission` ou un correctif.

| Langue   | Fichier                                       | Constante                  | État                                            |
| -------- | --------------------------------------------- | -------------------------- | ----------------------------------------------- |
| Français | `src/features/buyer-messages/templates/fr.ts` | toujours proposé           | écrit par Claude Code, à relire par Jean-Guy    |
| Anglais  | `src/features/buyer-messages/templates/en.ts` | `LANGUE_ANGLAIS_PROPOSEE`  | proposé ; **à faire relire avant le `/valide`** |
| Italien  | `src/features/buyer-messages/templates/it.ts` | `LANGUE_ITALIEN_PROPOSEE`  | caché ; à faire relire par un locuteur natif    |
| Allemand | `src/features/buyer-messages/templates/de.ts` | `LANGUE_ALLEMAND_PROPOSEE` | caché ; à faire relire par un locuteur natif    |
| Russe    | `src/features/buyer-messages/templates/ru.ts` | `LANGUE_RUSSE_PROPOSEE`    | caché ; à faire relire par un locuteur natif    |

## Ce que le relecteur vérifie

- **Le ton** : un conseiller immobilier qui écrit à un client, poli, sans pression ni urgence.
- **Le bien** : « la maison de Mougins », « the house in Mougins »… ; en allemand et en russe, la forme
  attendue après « Besichtigung » / « просмотр » (le génitif). La commune reste en lettres latines,
  comme l'annonce.
- **Les étiquettes** (ce qui a plu, ce qui a gêné) : chacune doit se lire dans la phrase « Ce qui vous a
  plu : … » / « Ce qui vous a gêné : … » de la langue, reliées par « et ».
- **Les chiffres du point de la semaine** : les formes au singulier et au pluriel (« 1 bien étudié »,
  « 14 biens étudiés ») ; en russe, la forme « изучено объектов: 14 » évite les trois pluriels.
- **Les dates** : écrites par le navigateur dans la langue (« 6 novembre », « 6 November »,
  « 6. November », « 6 ноября »).

Chaque phrase de chaque langue est prouvée par un test (`src/features/buyer-messages/messages.test.ts`) :
une phrase relue et corrigée met le test à jour dans le même commit.

## Mission 140 — ce que voit le vendeur, dans sa langue

Le Live (interactif et présentation directe), la synthèse, le Point marché, l'Étude de marché, leurs
liens et leurs messages d'envoi lisent leurs mots dans un seul fichier par langue, mêmes clés (un test
échoue si une clé manque ou diffère d'arguments). Le relecteur relit **un seul fichier**. Les mentions
légales de l'agence (carte professionnelle, garantie, « Ne peut recevoir aucun fonds ») restent en
français jusqu'à la décision du juriste (Jean-Guy, 06/11) : elles ne sont pas dans ces fichiers.

| Langue   | Fichier                      | État                                                     |
| -------- | ---------------------------- | -------------------------------------------------------- |
| Français | `src/lib/client-texts/fr.ts` | les phrases d'avant la mission, mot pour mot             |
| Anglais  | `src/lib/client-texts/en.ts` | proposé (`LANGUE_ANGLAIS_PROPOSEE`) ; **à faire relire** |

L'italien, l'allemand et le russe viendront un par un, chacun avec son relecteur natif (décision de
Jean-Guy, 06/11) : d'ici là, un dossier dans une de ces langues se lit en français, jamais un mélange.

Ce que le relecteur vérifie en plus : l'anglais est britannique (« 6 November 2026 », « €1,639,500 »,
« flat ») ; jamais « estimate » ni « valuation » (l'outil n'estime pas le bien) — « estimated » ne dit
que la négociation déduite d'une annonce disparue, comme « estimée » en français ; « EPC » pour le DPE ;
le Live parle au vendeur à la 2e personne.
