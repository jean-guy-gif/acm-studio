# MISSION 54 — Le Suivi qui sert : filtrer, rapprocher un acheteur, faire évoluer l'issue

**Date** : 22 septembre 2026
**Origine** : Laurent — « dans le Suivi, un filtre pour sélectionner mes biens à relancer
ou signés ; si j'ai un acheteur dans le pipe, pouvoir mettre sa recherche pour voir si
j'ai un bien présenté en Live qui correspond ; et quand je relance et que le bien est
vendu, je ne peux pas changer le statut. »

Trois manques d'un même écran. Le troisième est un vrai blocage : une issue posée une
fois et jamais modifiable transforme le Suivi en archive morte.

---

## 1. Quatre issues, et l'issue devient modifiable

Aujourd'hui : **Signé** et **À relancer**. On ajoute :

- **Vendu ailleurs** — le bien est parti, définitivement.
- **Retiré de la vente** — le bien peut revenir dans six mois.

Ce sont deux choses différentes pour un conseiller qui relance, et c'est pour ça qu'on
ne les fond pas en un seul « perdu ».

**L'issue se change depuis le Suivi.** Un dossier « à relancer » qui signe devient
signé ; un qui a été vendu ailleurs se clôt. C'est l'acte normal du suivi, pas une
exception.

**Ce qui ne bouge pas quand l'issue change :**

- **`projects.status` reste `meeting_completed`.** Les quatre issues sont toutes
  « le rendez-vous a eu lieu, le dossier est en Suivi ». C'est exactement la règle
  posée en mission 53 — le statut porte la position, jamais l'issue — et elle rend
  cet ajout gratuit : aucune valeur d'enum à créer.
- **Les quatre montants figés ne se re-figent jamais.** Changer l'issue ne recalcule
  rien. Un `update` qui repasserait par le figeage réécrirait l'histoire du
  rendez-vous ; c'est le défaut à ne pas commettre.

**Deux dates, distinctes** : celle du rendez-vous, et celle du dernier changement
d'issue. Sans la seconde, on ne sait plus depuis quand un dossier dort. Pas d'historique
complet des changements — c'est une autre mission si le besoin apparaît.

---

## 2. Le filtre

Sur l'écran Suivi, un filtre par issue : **Signé · À relancer · Vendu ailleurs ·
Retiré de la vente**, plus « Tous ».

Aucune issue n'est masquée sans que le filtre le dise. On ne cache pas des dossiers par
défaut — c'est la règle de la mission 52, et elle vaut ici aussi.

---

## 3. La recherche acheteur

Un panneau sur l'écran Suivi. Le conseiller tape les critères de son acheteur — type,
pièces, surface, budget, secteur — et voit **quels dossiers du Suivi correspondent**,
avec leur issue affichée.

**Rien n'est enregistré.** C'est une recherche jetable : pas de fiche acheteur, pas de
contact, pas d'historique. ACM ne devient pas un CRM dans cette mission.

**Le rapprochement porte sur tout le Suivi**, pas seulement les « à relancer » :

- un acheteur qui correspond à un **mandat signé**, c'est la meilleure nouvelle de la
  journée ;
- un acheteur qui correspond à un **à relancer**, c'est le prétexte pour rappeler le
  vendeur — et c'est le meilleur qui existe.

### 3.1 Quel prix sert de référence — à dire, jamais à deviner

Un dossier signé a un **prix de commercialisation convenu**. Un « à relancer » n'en a
pas : sa référence est le **prix conseillé** figé au rendez-vous.

**La carte dit lequel des deux elle a utilisé.** Un rapprochement par budget sur un prix
dont on ignore la nature ne vaut rien. Et un dossier sans aucun prix de référence n'est
pas écarté en silence : il apparaît avec la mention, à charge du conseiller de juger.

### 3.2 Le piège du type de bien

`subject_properties.property_type` est du **texte libre français**, saisi par le
conseiller — pas du vocabulaire canonique (c'est le piège identifié en mission 52). Un
acheteur qui cherche un « appartement » ne doit pas rater un bien saisi « Appartement »,
« appart », ou « T3 ».

Normalise les deux côtés avec `normalizePropertyType`. Et **quand le type saisi ne se
normalise pas, le dossier n'est pas exclu en silence** : il apparaît avec la mention
« type non reconnu ». Un dossier écarté sans le dire, c'est un acheteur perdu sans que
personne ne le sache.

### 3.3 Ne construis pas un second moteur de rapprochement

La recherche de concurrents en a déjà un : critères pondérés, tolérances, et des cartes
qui **disent en clair ce qui rapproche et ce qui éloigne**. Regarde-le avant d'écrire
quoi que ce soit, et réutilise-le si sa forme convient.

La règle d'affichage est la même qu'ailleurs dans l'outil : un bien correspond « à peu
près », et la carte dit où ça coince — « 5 m² sous le minimum », « 20 000 € au-dessus du
budget ». Un rapprochement muet ne se conteste pas, donc ne sert à rien.

---

## 4. Ce qu'il faut mesurer avant d'écrire une ligne

1. **Comment l'issue est stockée** dans `project_meeting_conclusions` : forme,
   contrainte, et ce qu'il faut pour en ajouter deux sans toucher à `projects.status`.
2. **Le moteur de rapprochement des concurrents** : où il est, ce qu'il prend en
   entrée, et s'il se réutilise ici ou pas. Dis-le franchement plutôt que d'en écrire
   un second par confort.
3. **Les valeurs réelles de `subject_properties.property_type`** en base : il y a cinq
   dossiers, compte-les. Et dis si `normalizePropertyType` les couvre toutes.

Rends ces trois réponses avant de dessiner.

---

## 5. Ce qui ne change pas

- **Aucune valeur inventée.** Un critère non saisi par le conseiller ne filtre rien ;
  un bien sans prix de référence le dit.
- **Les montants figés sont de l'histoire**, jamais recalculés.
- **`projects.status` porte la position, jamais l'issue** (règle mission 53).
- **Aucun dossier invisible** (règle mission 52) : chaque issue a son filtre, et
  « Tous » les montre.

---

## 6. Barrières

`vitest` · `tsc --noEmit` · `eslint` · `prettier --check` · `next build`

Les tests qui doivent exister :

1. Changer l'issue d'un dossier ne modifie **aucun** des quatre montants figés.
2. Les quatre issues sont posables, et `projects.status` reste `meeting_completed`
   dans les quatre cas.
3. Le filtre par issue rend exactement les dossiers de cette issue ; « Tous » les rend
   tous.
4. Un bien dont le type ne se normalise pas apparaît dans les résultats avec sa
   mention, il n'est pas écarté.
5. La carte de rapprochement nomme le prix de référence utilisé (convenu ou conseillé).

**Et l'essai à l'écran, d'une traite, sans recharger** : ouvrir le Suivi, filtrer,
passer un « à relancer » en « vendu ailleurs » et vérifier que les montants n'ont pas
bougé, puis taper une recherche acheteur et lire les cartes de rapprochement.