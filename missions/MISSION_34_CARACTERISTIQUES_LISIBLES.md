# MISSION 34 — Les caractéristiques que l'outil ne voyait pas

**Date** : 19 août 2026
**Demande** : « as-tu réglé l'implémentation de toutes les caractéristiques, car
quelquefois elles n'y sont pas ou des fois elles sont cachées dans le texte ? »

---

## 1. Le diagnostic

Le pipeline d'import complet a été passé sur les **cinq pages réelles** fournies.
Deux défauts, tous deux invisibles jusqu'ici :

### 1.1 La liste des caractéristiques n'était lue par personne

`listingFeatures` sortait **vide sur les cinq portails**. Un seul lecteur la
remplissait (celui des données structurées) et aucune des pages n'en contenait.

Autrement dit : les « Terrasse », « Box de stationnement », « Ascenseur »,
« Piscine » que le portail affiche noir sur blanc à côté de l'annonce n'entraient
jamais dans l'outil. Or c'est précisément ce texte que la déduction des
extérieurs et des stationnements va lire.

### 1.2 La description n'était qu'un titre

| Portail                 | Description récupérée |
| ----------------------- | --------------------- |
| SeLoger                 | 1 023 caractères      |
| Maisons et Appartements | 495                   |
| Le Figaro               | 200                   |
| Belles Demeures         | 109                   |
| **Green Acres**         | **38**                |

Trente-huit caractères sur Green Acres : c'était la balise `meta`, c'est-à-dire
le titre. Le vrai texte — celui qui dit « exposition sud-ouest », « balcons »,
« cave », « espaces de stationnement » — était bien dans la page, mais **encodé**
(`&#xE9;` pour é, `&#xD;&#xA;` pour un retour à la ligne) et hors de tout bloc de
données. Personne ne le lisait.

D'où la remarque de Laurent : « il ne coche jamais les extérieurs et les
stationnements ». Il n'y avait tout simplement rien à lire.

---

## 2. Ce qui a été écrit

Quatre modules génériques — aucun code spécifique à un portail.

**`decode-html-text.ts`** — rend lisible un fragment de page : entités décodées
(numériques et nommées), balises retirées, `</li>` et `<br>` transformés en
retours à la ligne. Sans ce dernier point, « Terrasse</li><li>Garage »
deviendrait « TerrasseGarage » et ni l'un ni l'autre ne serait reconnu.

**`extract-visible-blocks.ts`** — isole un bloc de la page à partir de ses
attributs, en **appariant correctement les fermetures**. Un simple « jusqu'au
prochain `</div>` » couperait la description au premier bloc imbriqué.

**`extract-visible-description.ts`** — retient le bloc de description le plus
long (classes `description`, `descriptif`, `texte-annonce`…), entre 120 et 8 000
caractères : en deçà c'est une étiquette, au-delà on a happé une section entière.

**`extract-visible-features.ts`** — lit la liste des caractéristiques sous ses
deux formes rencontrées :

1. une liste d'éléments dans un bloc « caractéristiques / critères / atouts » ;
2. une énumération en une phrase — Belles Demeures écrit
   « dispose des atouts suivants: Piscine,Terrasse,3 Parkings ».

Les étiquettes d'interface (« Voir plus », « Partager »), les puces vides et les
doublons sont écartés. Les lignes qui répètent une colonne dédiée (« Année de
construction 1980 », « Sources d'énergie Électrique ») sont retirées de la liste
affichée — la règle du projet interdit le doublon — mais **restent lues** pour en
déduire l'état et les équipements.

### Trois motifs corrigés

- **« parking fermé » → box.** Un stationnement dit fermé est un box ; ce n'est
  pas une supposition. Couvre « emplacement / place de stationnement fermé(e) ».
- **« entièrement rénové » → excellent état.** SeLoger affiche « État :
  Entièrement rénové » et la case restait vide. À ne pas confondre avec « à
  rénover », qui est l'inverse : un test verrouille les deux, et une annonce qui
  contient les deux mentions ne tranche pas.
- **Commune et code postal SeLoger.** Ils sortaient nuls alors que la page les
  porte — mais avec les guillemets échappés. Ils ne sont retenus que s'il n'y en
  a **qu'un seul** dans la page : une page contient aussi l'adresse de l'agence,
  et confondre les deux placerait le bien dans la mauvaise ville.

---

## 3. Mesure avant / après, sur les pages réelles

|                       | SeLoger                          | Green Acres              | Belles Demeures | Le Figaro                | M. et App. |
| --------------------- | -------------------------------- | ------------------------ | --------------- | ------------------------ | ---------- |
| Description           | 1 023 → **1 049**                | 38 → **1 760**           | 109             | 200 → **708**            | 495        |
| Caractéristiques lues | 0 → **9**                        | 0 → **9**                | 0 → **3**       | 0                        | 0          |
| Extérieurs            | terrasse, véranda → **+ jardin** | ∅ → **balcon, terrasse** | terrasse        | ∅ → **terrasse, jardin** | terrasse   |
| Stationnement         | box                              | ∅                        | ∅               | ∅                        | garage     |
| État                  | ∅ → **excellent**                | ∅ → **excellent**        | ∅               | ∅                        | ∅          |
| Exposition            | ∅                                | ∅ → **sud-ouest**        | ∅               | ∅                        | sud        |
| Commune / CP          | ∅ → **Antibes / 06600**          | Paris 16ème / Muette     | ∅               | Antibes (06)             | ∅          |

---

## 4. Ce qui reste volontairement vide

**Un stationnement dont la nature n'est pas dite.** Green Acres écrit « deux
espaces de stationnement » ; Belles Demeures, « 3 Parkings ». Couvert ou
extérieur ? La page ne le dit pas. Le modèle n'a pas de valeur « stationnement,
nature inconnue » : on ne coche donc rien plutôt que de supposer.

Ce n'est plus un angle mort pour autant : la ligne « 1 place de parking » ou
« 3 Parkings » **apparaît désormais dans les caractéristiques de la fiche**. Le
conseiller la voit et coche en un clic, au lieu de devoir aller la chercher.

Si Laurent préfère une case « Stationnement (non précisé) », c'est une décision
produit — elle touche aussi la fiche du bien du vendeur, pour que la comparaison
reste symétrique.

**Piscine** n'existe pas dans les extérieurs du modèle (balcon, terrasse, jardin,
loggia, véranda, toit-terrasse). Elle apparaît en caractéristique libre.

**Belles Demeures, Maisons et Appartements, Le Figaro** n'ont pas d'extracteur
dédié : prix, surface, commune et quartier y restent partiels. Ces pages les
portent (M. et App. affiche « Antibes (06600) » et le quartier « Fontmerle ») —
c'est une mission à part entière, un extracteur par portail.

---

## 5. Barrières

513 tests (dont 26 nouveaux) · `tsc --noEmit` · `eslint` · `prettier --check` ·
build de production.

Coût de lecture mesuré : **4 à 17 ms par page**, y compris sur une page de 995 Ko.
Aucune requête sortante ajoutée, aucune donnée inventée.
