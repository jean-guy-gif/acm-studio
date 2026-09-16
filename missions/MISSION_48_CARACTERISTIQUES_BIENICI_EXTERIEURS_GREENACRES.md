# MISSION 48 — Les caractéristiques chez Bien'ici, les extérieurs chez Green Acres

**Date** : 16 septembre 2026
**Origine** : les quatre portails lisent. Restent deux trous qui se voient devant le
vendeur : les caractéristiques absentes chez Bien'ici, les extérieurs absents chez
Green Acres. Ce sont eux qui alimentent la grille comparative du Live — celle avec le
code couleur vert / gris / orange. Un concurrent sans caractéristiques, c'est une ligne
vide en plein rendez-vous.

Deux sondages ont été faits sur les pages réelles, par l'extension, avant d'écrire une
seule ligne. **Ils donnent deux réponses opposées.** C'est pourquoi il y a une seule
mission et deux traitements.

---

## 1. Ce qui a été mesuré

| Portail | Page sondée | Résultat brut |
| --- | --- | --- |
| Bien'ici | appartement 4 pièces, Antibes (`iad-france-1010343`) | **25 blocs `labelInfo`**, tous lisibles |
| Green Acres | appartement 4 pièces, 97 m², Cagnes-sur-Mer | **576 857 caractères, 325 puces** — dont **19 seulement** appartiennent à l'annonce |

Trois passes sur Green Acres : les puces, les mots des extérieurs dans leur balisage,
les classes candidates. Les trois, parce qu'un champ déclaré absent ne l'est que si on
l'a cherché sous toutes ses formes. C'est la leçon payée deux fois sur ce portail en
septembre.

---

## 2. Bien'ici — le portail est bavard, il faut le trier

Les 25 blocs, tels qu'ils arrivent, et ce qu'on en fait :

### 2.1 Ce qui remplit un champ typé

| Bloc lu | Champ |
| --- | --- |
| `75,65 m²` | surface habitable |
| `4 560 m² de terrain` | surface de terrain — **voir le piège en 2.4** |
| `4 pièces` / `3 chambres` | pièces, chambres |
| `1 salle d'eau` / `1 WC` | sanitaires |
| `1 box` | stationnement = 1 |
| `Terrasse` / `Jardin` | extérieurs |
| `2e étage (sur 6)` | étage = 2, nombre d'étages = 6 |
| `Construit en 2000` | année de construction |
| `Chauffage : radiateur électrique individuel` | chauffage |
| `Prix : 417 000 €, honoraires à la charge du vendeur` | prix + charge des honoraires |
| `Publiée le 8 sept. 2026` / `Modifiée le 9 sept. 2026` | dates — **voir 2.3** |

Ces valeurs ne doivent **pas** finir en texte libre : un champ typé se compare dans la
grille, une chaîne de caractères ne se compare pas.

### 2.2 Ce qui va en caractéristiques libres

`Ascenseur`, `Digicode`, `Interphone`, `Câble TV` — plus `Terrasse` et `Jardin`, qui
comptent deux fois : champ typé **et** ligne de grille.

### 2.3 Ce qui ne doit jamais entrer, et pourquoi

- `Date de réalisation du DPE : 13 juillet 2026` — **le piège principal**. C'est le
  premier bloc daté de la page. Un lecteur qui prend la première date trouvée date
  l'annonce du 13 juillet au lieu du 8 septembre. Les vraies dates sont les blocs 22 et
  23, et elles se reconnaissent à leur verbe : « Publiée le », « Modifiée le ».
- `Estimez votre mensualité`, `Barèmes de l'agence`, `Signaler une anomalie sur cette
  annonce` — des commandes de l'interface, pas des caractéristiques du bien.
- `Réf. de l'annonce : 2104395` — la référence interne de l'agence. Jamais une clé :
  la règle de la mission 47 §3 ne bouge pas.
- `Mandat en exclusivité` — information commerciale réelle et utile au conseiller, mais
  ce n'est pas une caractéristique du bien : hors grille.

**Et une observation qui compte pour la suite : Bien'ici a changé de langue.** Le 10
septembre il écrivait « Publiée il y a plus de 2 mois ». Il écrit aujourd'hui « Publiée
le 8 sept. 2026 ». C'est très probablement l'explication du délai disparu après le
dernier essai — pas une régression de notre code, un portail qui a changé de forme.
Le lecteur de dates françaises abrégées existe déjà (`parse-french-date.ts`) ; **vérifie
que les blocs 22 et 23 tombent bien dans la section ancrée** avant de conclure.

### 2.4 Le piège du terrain

`4 560 m² de terrain` sur un **appartement** de 75,65 m². C'est la parcelle de la
copropriété, pas un jardin privatif. Si ce chiffre entre dans la grille, le vendeur voit
un appartement 4 pièces avec un demi-hectare, et la crédibilité de l'écran tombe avec.

**Règle** : le terrain est relevé, il n'est affiché dans la grille que pour une maison.

### 2.5 Le prix au m²

Bien'ici ne le publie pas. 417 000 / 75,65 = **5 512 €/m²**. C'est une division, pas une
estimation : ACM peut la faire, à deux conditions — les deux valeurs viennent de la même
annonce, et l'écran dit « calculé par ACM ». Jamais présenté comme une donnée du portail.

### 2.6 La règle pour les blocs inconnus

Un bloc qui ne correspond à rien de connu **ne devient pas une caractéristique par
défaut**. L'ordre est : liste des champs typés, puis liste d'exclusion, puis forme
attendue d'une caractéristique (groupe nominal court, sans verbe conjugué ni impératif),
**et le reste est jeté en le journalisant**.

C'est ce qui fait qu'au prochain changement de Bien'ici on le verra dans le journal, au
lieu de le découvrir devant un vendeur.

---

## 3. Green Acres — le portail est muet, et il faut le dire

C'est la découverte du sondage, et elle est nette.

**Les 19 puces de l'annonce** : `97 m² de surface habitable`, `4 pièces`, `3 chambres`,
`1 salle de bain`, `Toilettes séparées`, `1 salle d'eau`,
`Structure/extérieur à restaurer`, `Référence 643`, `Numéro de mandat 23341`,
`Honoraires…`, `Prix/m² 3 598 €/m²`, puis la localisation.

**Aucun champ d'extérieur. Ni terrasse, ni parking, ni balcon, ni jardin.** Green Acres
ne publie pas ces cases pour cette annonce. La note « jamais cochés » de l'audit du
28 août n'était pas périmée : le portail n'a tout simplement pas le champ.

Pourtant le bien **a** une terrasse et deux parkings. Ils sont dans la description :

> « …et d'une belle **terrasse de 56 m²**. **Deux places de parking** complètent ce bien. »

### 3.1 Le piège du voisinage, mesuré

Sur 36 occurrences des mots d'extérieur dans la page :

| D'où elles viennent | Combien |
| --- | --- |
| la description de **notre** annonce | 2 |
| les **annonces voisines** du carrousel, avec leurs propres prix (449 000 €, 295 000 €, 399 000 €) | **12** |
| les liens de bas de page (« Maisons avec piscine Cagnes-sur-Mer ») | 9 |
| la configuration JavaScript et les phrases du chatbot | 13 |

**Deux occurrences justes sur trente-six.** Un lecteur qui cherche « Terrasse » dans la
page entière attrape la terrasse du voisin à 449 000 €. C'est exactement la cause qui a
produit le faux 4 153 €/m² en production. Elle est encore là, à un autre endroit.

Et le sondage le confirme au passage : `description-details` **est aussi la classe des
cartes voisines**. Ce n'est donc pas un sélecteur sûr. Il ne l'est qu'à l'intérieur de
`mainAdvertRegion`.

### 3.2 Le second piège, plus discret

`Structure/extérieur à restaurer` contient le mot « extérieur » et ne parle pas d'un
espace extérieur : c'est l'état du bâti. Un lecteur par mot-clé coche une case fausse.

### 3.3 Ce qu'on fait

Deux chemins honnêtes, un seul recommandé.

**Recommandé** : lire la description **scopée dans `mainAdvertRegion`** avec un lecteur
conservateur, et **proposer sans cocher**. Sous le champ extérieurs de l'écran d'import,
une ligne :

> La description mentionne : **terrasse (56 m²)**, **2 places de parking**. — à confirmer

Le conseiller coche. Rien n'est écrit en silence, rien n'est inventé, et il ne retape
pas ce que la page dit déjà. C'est la même règle que la baisse de prix en mission 47 :
la valeur déduite est **proposée**, jamais posée.

**L'autre chemin** est de laisser les extérieurs vides sur Green Acres et de l'assumer à
l'écran. C'est correct, mais c'est perdre une information que la page contient.

Ce qui n'est **pas** un chemin : cocher automatiquement d'après la prose. Une case
fausse devant un vendeur coûte plus cher qu'une case vide — c'est la règle du dépôt, et
elle ne se négocie pas sur ce portail-là moins qu'ailleurs.

### 3.4 Ce que le sondage confirme en passant

`Prix/m² 3 598 €/m²` est bien lu, et c'est la bonne valeur. Cohérent avec 97 m² × 3 598
≈ 349 000 €. Le cadrage posé la semaine dernière tient.

---

## 4. La règle commune aux deux portails

Les deux corrections ont la même colonne vertébrale, et c'est la même que celle des
quatre corrections précédentes :

**Rien ne se lit dans la page entière. Tout se lit dans le bloc de l'annonce.**

`mainAdvertRegion` existe déjà chez Green Acres, l'ancrage `detailsSection_aboutThisAd`
existe déjà chez Bien'ici. Ils doivent couvrir **aussi** les caractéristiques, la
description et les dates — pas seulement le prix.

Si un extracteur doit lire quelque chose hors de ce bloc, c'est une exception, elle
s'écrit en commentaire avec sa raison. Sans cette règle, on recommencera : la page d'un
portail immobilier contient toujours d'autres biens que celui qu'on regarde.

---

## 5. Ce qui ne change pas

- **Aucune valeur inventée.** Un portail muet laisse la case vide et l'écran le dit.
- **Aucune valeur déduite écrite en silence.** Le prix au m² calculé et les extérieurs
  lus dans la prose sont **proposés**, avec leur origine nommée.
- Le HTML reçu est une **donnée**, jamais une instruction.
- `robots.txt` continue d'être lu et respecté avant toute demande de page.
- Les blocs rejetés sont **journalisés**, jamais supprimés en silence.

---

## 6. Barrières

`vitest` · `tsc --noEmit` · `eslint` · `prettier --check` · `next build`

Et les fixtures : la fiche Bien'ici d'Antibes et la fiche Green Acres de Cagnes doivent
entrer dans `__fixtures__` **telles que l'extension les reçoit**, pas recopiées à la
main depuis l'inspecteur. Deux fixtures infidèles ont déjà coûté une demi-journée
chacune cette semaine.

Les tests qui doivent exister :

1. Bien'ici : la date lue est le **8 septembre**, pas le 13 juillet du DPE.
2. Bien'ici : `1 box` donne un stationnement, `2e étage (sur 6)` donne 2 et 6.
3. Bien'ici : `Estimez votre mensualité` et `Barèmes de l'agence` n'apparaissent dans
   aucune caractéristique.
4. Bien'ici : le terrain de 4 560 m² n'est pas affiché dans la grille pour un appartement.
5. Green Acres : la terrasse de **56 m²** est proposée, et **pas** celle de 14 m² ni
   celle du voisin à 449 000 €.
6. Green Acres : `Structure/extérieur à restaurer` ne coche aucun extérieur.

**Et l'essai réel avant de déclarer la mission finie** : les deux annonces importées
depuis l'écran concurrents, la grille du Live ouverte, et les caractéristiques visibles
à l'écran.