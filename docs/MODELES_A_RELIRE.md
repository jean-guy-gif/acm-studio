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

Relu par le relecteur produit de Jean-Guy (07/11) : « Your listing price » pour le prix retenu
ensemble, « Asking price » pour le prix affiché d'un concurrent, « competing property / competing
properties » partout où le vendeur lit « concurrent » ; « estimated » accepté. La relecture d'un
locuteur natif reste à faire.

## Mission 140 B — ce que voit l'acquéreur, dans sa langue

La présentation, le lien et le PDF du dossier acquéreur, les messages de proposition, de relance,
du lien et de la réponse du vendeur à son offre lisent leurs mots dans les mêmes fichiers
(`src/lib/client-texts/fr.ts` et `en.ts`, section `buyer`). Le message au notaire reste en français.

**Le bon de visite et l'offre d'achat** : la version française reste la seule signée. Une traduction
anglaise, à joindre « pour information — seule la version française fait foi », est écrite dans
`src/features/legal-translation/legal-translation.ts` et **désactivée**
(`TRADUCTION_DOCUMENTS_JURIDIQUES_VALIDEE = false`) : à faire relire par le juriste et par un
locuteur natif avant de l'allumer. Le bon la recompose depuis ses champs figés ; l'offre ne garde pas
tous ses champs à la signature (parcelles, honoraires, dates) : l'allumer pour l'offre demandera de
garder sa traduction à la signature (une colonne, une migration).

## Mission 159 — le quartier montré au vendeur

Les écrans du quartier au Live, et ses pages dans la synthèse et l'Étude de marché, lisent leurs mots
dans `src/lib/client-texts/fr.ts` et `en.ts`, section `quartier` : des phrases recomposées depuis les
chiffres (jamais une phrase d'Academia), écrites par Claude Code. Le français est à relire par
Jean-Guy, l'anglais **à faire relire par un locuteur natif**. Points à vérifier : les noms des
catégories d'urbanisme (« site reserved for a road »…), les échelles officielles (« zone 4 of 5:
“medium” », « category 1 of 3: “low” potential »), « Listed municipality » pour une commune classée
en territoire à risque important d'inondation, « Actual sales » et « What your neighbours sold ».

## Mission 163 A — l'Étude de marché en fil conducteur

Les pages de l'Étude (couverture, « Four things this study tells you », les titres-conclusions des
chapitres, « … ’s view », la suite) lisent leurs mots dans `src/lib/client-texts/study-en.ts`,
composés depuis les chiffres du dossier, écrits par Claude Code d'après la maquette française
validée par Jean-Guy le 20/11. L'anglais est **à faire relire par un locuteur natif**. Points à
vérifier : « Dear Mr and Mrs Bernard, here is what the listings… », « Your house in Vence and the
market », « … are for sale today », « At €745,000, three houses for sale are cheaper than yours »,
« What your buyer will ask: nothing recorded on your plot », les avis (« Claire Dumas’s view ») et
« What comes next, in three steps ».

## Correctifs 163 — l'Étude imprimée

`src/lib/client-texts/study-en.ts`, phrases nouvelles, **à faire relire par un locuteur natif** :
« The six sales most like your house », « Chosen first on the number of rooms, then on floor area:
5 rooms, from 123 to 136 m² », « I selected six, the ones most like your house: … », « The six most
recent sales », « half the houses for sale have been waiting for a buyer at least this long », et les
sources « Planning », « Building permits », « Risks », « Residents ».

## Lancement, mission 1 — « Voir les biens et leurs prix »

- Sur « Votre valeur perçue » du Live, quatre textes en anglais (`src/lib/client-texts/en.ts`,
  `live.perceived`) : « See the competing properties and their asking prices », « Shall we look at
  the competing properties and their asking prices now? », « Yes, see the prices », « Back to the
  question ». À faire relire par un locuteur natif, avec le reste de l'anglais du Live.
