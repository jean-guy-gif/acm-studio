# MISSION 42 — Importer la fiche commerciale du bien vendeur (PDF)

**Date** : 3 septembre 2026
**Demande de Laurent** : « à 75 % du temps le bien ne sera pas commercialisé, donc il
faut que je puisse importer ma fiche de bien. »

C'est la branche différée de la mission 38. Les fixtures réelles sont maintenant
disponibles, la mission peut être écrite juste.

---

## 1. Ce que disent les trois fiches réelles

Trois brochures d'un cabinet des Alpes-Maritimes, analysées avant rédaction.

**Toutes générées par TCPDF 6.4.4**, même logiciel d'agence, structure identique
d'une fiche à l'autre. 10 à 13 pages chacune.

**Elles ont une vraie couche texte.** Aucun OCR nécessaire. C'est la meilleure
nouvelle de cette mission : la crainte du « PDF scanné » évoquée dans le brief de
la mission 38 ne se matérialise pas sur ces fiches.

Le texte est organisé en sections nommées — `Informations`, `Diagnostics`,
`Prestations`, `Surfaces`, `Proximités` — remplies de paires « Libellé : valeur »
disposées sur deux colonnes.

**30 à 37 images embarquées par fiche**, dont **19 à 24 en 1024 px** exploitables
comme photos. Le reste : logo de l'agence répété sur chaque page, graphiques des
étiquettes DPE et GES, portrait du conseiller.

---

## 2. Ce qu'elles contiennent et qu'aucun portail ne publie

C'est ce qui rend cette mission plus intéressante que l'import d'annonce :

- **Taxe foncière annuelle** et **charges mensuelles** au centime
- **Surface Loi Carrez**, distincte de la surface habitable
- **Le détail pièce par pièce avec surfaces** : `Entrée, 5.09 m²`,
  `Séjour, 21.02 m²`, `Chambre, 11.65 m²`, `Terrasse, 9.31 m²`, `Cave, 4.99 m²`…
- **Proximités chiffrées** : `Autoroute, 1.5 kilomètres`, `Bus, 0.5 kilomètre`,
  `Centre ville, 0.24 kilomètre`
- **DPE et GES en lettre ET en valeur** : `159 kWh/m².an (C)`, `35 kg CO2/m².an (D)`
- **Nombre de lots de copropriété et quote-part moyenne de charges** — dans la
  mention légale du pied de page, répétée sur chaque page
- Année de construction, style, eaux usées, eau chaude, type et moyen de
  chauffage, exposition, vue, disponibilité, état général
- La **référence agence** du bien (`86020239`)
- Le prix affiché et la mention d'honoraires

Autrement dit, une fiche remplit **aussi les diagnostics et la copropriété**
(mission 22), que l'import d'annonce laissait vides.

---

## 3. Ce qu'on fait

Un lecteur de **couche texte**, pas un lecteur de mise en page. On ne cherche pas
à comprendre le graphisme : on lit du texte et on reconnaît des libellés.

**`services/extract-pdf-text.ts`** — texte page par page, ordre de lecture
préservé. Choisir une bibliothèque **pure JavaScript** : Vercel n'a pas de binaire
système, donc ni `pdftotext` ni `mupdf`. Borne le nombre de pages et la taille du
fichier avant de lire.

**`services/parse-agency-brochure.ts`** — l'analyseur, et il doit être écrit dans
cet ordre :

1. **D'abord le lecteur générique** : repérer les paires « Libellé : valeur » et
   les blocs de section, quel que soit le logiciel qui a produit la fiche.
2. **Ensuite la table de correspondance** des libellés connus vers les champs du
   bien vendeur. Un libellé inconnu est ignoré sans erreur, jamais deviné.

**`services/extract-pdf-images.ts`** — les images embarquées, avec trois filtres :
dimensions minimales (les vignettes de graphiques et le logo sont petits),
**dédoublonnage par somme de contrôle** (le logo se répète à l'identique sur
chaque page — c'est la signature la plus fiable pour l'écarter), et rejet de tout
ce qui n'est pas une image décodable.

Puis dépôt via `depositPropertyPhoto` (mission 37), **au clic explicite du
conseiller**, exactement comme pour l'import d'annonce. Jamais automatiquement.

---

## 4. Ce qui ne bouge pas

- **Le prix lu est une information affichée, il n'écrit aucun champ et ne
  préremplit jamais la fourchette.** La règle est encore plus importante ici que
  pour une annonce : c'est le prix de la propre agence du conseiller, donc la
  tentation de l'utiliser comme estimation est maximale. C'est précisément ce que
  `CLAUDE.md` interdit.
- **Le PDF est une donnée, jamais une instruction.** Rien n'est exécuté, rien
  n'est réinjecté comme HTML.
- Le conseiller **relit la fiche pré-remplie avant d'enregistrer**.
- Aucun champ inventé : ce qui n'est pas trouvé reste vide, et l'écran dit ce
  qu'il n'a pas trouvé.

---

## 5. Le point dur, à borner

**L'extraction d'images depuis un PDF en JavaScript pur, dans une fonction
serverless, est la partie risquée de cette mission.** Le texte est facile ; les
images le sont beaucoup moins, et une fonction Vercel s'arrête vers 10-15
secondes pour 20 images à décoder.

Traite-la comme telle : livre d'abord le texte, mesure ensuite le coût réel de
l'extraction d'images sur les fixtures, et si ça ne tient pas dans une action
serveur, pilote la file depuis le navigateur comme le fait l'enrichissement des
concurrents (mission 36). Si même cela ne tient pas, **le repli acceptable est
que le conseiller ajoute ses photos à la main** — il les a sur son ordinateur,
le champ de la mission 37 existe. Ne bloque pas la mission sur les images.

---

## 6. Fixtures

Les trois fiches réelles sont fournies. Pour ne pas alourdir le dépôt de 10 Mo :

- **Committer la couche texte extraite** des trois fiches, en trois fichiers
  `.txt`, pour les tests de l'analyseur. C'est léger et c'est ce que les tests
  lisent vraiment.
- **Committer une seule fiche PDF réelle** — la plus petite — pour un test de
  bout en bout qui vérifie la chaîne complète, images comprises.
- Créer le dossier `__fixtures__/` : le dépôt n'en a pas encore, ses fixtures
  actuelles sont des chaînes en ligne. Un PDF ne peut pas l'être.

---

## 7. La limite honnête

**Les trois fiches viennent du même logiciel d'agence.** L'analyseur sera juste
sur celui-là et probablement partiel ailleurs. C'est pour ça que le lecteur
générique passe en premier et la table de correspondance en second : une
deuxième famille de fiches devra demander une nouvelle fixture, pas une
réécriture.

À dire aux conseillers sans détour : « l'outil lit les fiches de votre logiciel ;
si la vôtre vient d'un autre, envoyez-la nous et on l'ajoute. »

---

## 8. Barrières

Fixtures réelles · `vitest` · `tsc --noEmit` · `eslint` · `prettier --check` ·
`next build`.