# M151 — Le dossier d'essais de l'étape 0 (INVENTÉ)

**Tout est inventé.** Aucun client réel : noms de fiction, téléphones en 06 39 98 (plage que l'ARCEP
réserve à la fiction), e-mails en example.com, aucune adresse. Chaque fichier porte « INVENTÉ ».
Écrit le 11/11/2026 par Claude Code, à la demande de Jean-Guy, qui n'avait ni notes ni fiches.
Les **corrigés sont écrits et commités avant tout appel aux modèles** (`corriges/`).

## Le contenu

| Cas | Fichier | Forme |
|---|---|---|
| N1 | `notes/N1-ferrandi.txt` | note de terrain, abréviations (T3, RDC, SdB, VàV, FAI) |
| N2 | `notes/N2-delmas-dictee.txt` | note dictée au téléphone, sans ponctuation, chiffres en lettres |
| N3 | `notes/N3-okafor-courte.txt` | une ligne |
| N4 | `notes/N4-lindqvist.txt` | note de terrain, maison de caractère |
| N5 | `notes/N5-benali.txt` | note de terrain, conditions |
| N6 | `notes/N6-rocheteau.txt` | liste à puces |
| C1 | `crm/C1-perrichon.pdf` | fiche PDF en tableau |
| C2 | `crm/C2-garnier-huet.csv` | export en colonnes (point-virgule) |
| C3 | `crm/C3-teyssier.txt` | export texte « Libellé : valeur » |
| C4 | `crm/C4-vasseur-lienhart.pdf` | fiche PDF à cases cochées, deux colonnes |
| C5 | `crm/C5-aubertin.vcf` | carte de visite électronique avec une note |

Les PDF sont fabriqués par `fabriquer-pdf.mjs` (Chromium du dépôt) ; leur texte est lu comme le lira
le navigateur (pdfjs, M43). Aucune présentation n'imite un logiciel existant.

## Les pièges

| Piège | Cas |
|---|---|
| Remarque sur la personne (santé, famille, origine, patrimoine, jugement), jamais dans la fiche | N1, N2, N4, N5, N6, C1, C2, C3, C4, C5 |
| Contradiction « pas de travaux » puis « un rafraîchissement ça va » | N1, C3, C5 (et N6 : « gros travaux non, cuisine à refaire OK ») |
| Critère hors liste | N4 (la piscine, ★, va au champ Piscine, jamais en critère doux ; le golf), C2 (« dernier étage ») |
| Financement | N1 et C1 validé, N2, C2 et C3 en cours, N4 comptant, N6 suspendu à une vente, C4 « non renseigné », C5 rien |
| Disponibilité pour visiter | N1, N2, N6, C1, C3, C4 |
| Budget ambigu | N2 (750 ou 800), N3 (« ~150k »), N5 (« autour de 3 »), C3 (« 550 / 600 »), C5 (« max 5 ») |
| Copropriété | N5 (« petite copro ok »), N6 (« PAS de copropriété ») |

## Les corrigés

- `corriges/corriges.json` : pour chaque cas, ce que la fiche doit contenir (`attendu`), ce qui est
  toléré (`accepte`), les ★ attendus, les critères doux attendus et tolérés, ce que les Notes
  doivent dire, et ce qu'elle ne doit **jamais** contenir (`jamais`, cherché dans toute la réponse).
  Un champ que le corrigé ne cite pas doit rester vide.
- `corriges/classement.json` : les jugements attendus sur « au calme » et « du cachet » pour les 73
  annonces réelles de la mesure du 10/11 (repérées par leur identifiant, texte hors du dépôt).

## Les photos

`photos/` : Jean-Guy y ajoute deux notes recopiées à la main et photographiées, nommées d'après la
note recopiée (`N1-….jpg`, `N6-….jpg`) ; le corrigé est celui de la note. Sans photo, la mesure se
fait sans elles et le dit.

## Lancer la mesure

`missions/M151-essais/mesure.mjs` (voir son en-tête) : le SDK d'Amazon Bedrock est installé hors du
dépôt, la clé est lue dans `.env.local`, les résultats sont écrits dans `resultats/` (hors du dépôt
pour les réponses brutes, seul le bilan est gardé).

Le SDK : `npm install @anthropic-ai/bedrock-sdk` dans un dossier hors du dépôt, donné par
`M151_SDK_DIR`. Les 73 annonces : `node missions/M151-essais/extraire-corpus.mjs
~/acm-studio-sauvegardes/<date>/data-public.sql <hors du dépôt>/corpus.json`, donné par `M151_CORPUS`.

**Plan B (12/11)**, en attendant que le compte AWS ait accès aux modèles 5.5 (cas de support
179439470000287) : Sonnet 4.6 et Haiku 4.5 par leurs profils « EU », depuis l'Irlande. Ils valident
le dossier d'essais et la méthode, pas le choix du modèle.

```sh
M151_SDK_DIR=… M151_CORPUS=… M151_TITRE="Mesure provisoire, plan B" \
M151_MODELES=eu.anthropic.claude-sonnet-4-6,eu.anthropic.claude-haiku-4-5-20251001-v1:0 \
node missions/M151-essais/mesure.mjs --fiches --classement
```

**La même mesure sur Claude 5.5**, dès le compte débloqué : `eu.anthropic.claude-sonnet-5-5` et
`eu.anthropic.claude-haiku-5-5`, le profil « EU » appelé depuis l'Irlande (décision de Jean-Guy du
11/11 au soir) ; ce sont les modèles par défaut. Lire d'abord leurs régions de destination par l'API
(`GetInferenceProfile`), comme pour le plan B :

```sh
M151_SDK_DIR=… M151_CORPUS=… M151_TITRE="Mesure de l'étape 0" \
node missions/M151-essais/mesure.mjs --fiches --classement
```

`M151_RENOTER=<horodatage>` renote sans aucun appel les fiches déjà gardées dans `M151_SORTIE` sous
cet horodatage, sur les corrigés du jour (le bilan porte `-renote`). Le score principal est « champs
justes en tout » : les 22 champs de chaque fiche, attendus remplis comme attendus vides.
