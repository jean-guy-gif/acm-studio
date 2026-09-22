# MISSION 52 — La préparation se lit d'un coup d'œil, et bascule dans le Live quand elle est prête

**Date** : 22 septembre 2026
**Origine** : Laurent — « dans Préparation je veux plus de détail sur chaque dossier :
le type appartement/maison 3P, 4P, la fourchette de prix, et l'état d'avancement. Et
quand le dossier est prêt il bascule dans le Live vendeur et disparaît de Préparation.
Dans le Live, jamais de brouillon, que des dossiers prêts. »

Aujourd'hui les cartes de Préparation portent un nom, un e-mail, un téléphone et une
date de création. Rien qui dise de quel bien il s'agit, ni où en est le travail.

---

## 1. Ce que la carte doit dire

Trois informations s'ajoutent, dans cet ordre de lecture :

**Le bien** — type et nombre de pièces, tels que le conseiller les a saisis :
« Appartement · 4 pièces · 97 m² · Cagnes-sur-Mer ». Pas d'invention : un champ non
renseigné ne s'affiche pas, il ne s'affiche pas non plus en « — » systématique.

**La fourchette du conseiller** — « 320 000 – 390 000 € ». Si elle n'est pas saisie,
la carte le dit en clair, parce que c'est précisément un des éléments qui manquent
pour être prêt.

**L'avancement** — pas un pourcentage nu. Le conseiller doit savoir **quoi faire
ensuite** : ce qui est fait, et ce qui manque, nommé. « Bien vendeur ✓ · 6 concurrents
✓ · fourchette manquante ».

---

## 2. Comment un dossier devient prêt — les deux chemins

**Quand tout est rempli : la bascule est automatique.** Le dossier passe dans le Live
sans que le conseiller ait à appuyer sur quoi que ce soit.

**Quand il manque des éléments : le conseiller décide.** L'outil affiche ce qui manque
et laisse le bouton disponible. Un conseiller qui sait qu'un champ est sans objet pour
ce bien ne doit pas être bloqué par l'outil.

Ce qui n'est pas permis : que l'outil **empêche** de déclarer prêt. Il informe, il ne
barre pas la route.

**Et la bascule automatique se voit.** Un dossier qui disparaît tout seul de l'écran
qu'on est en train de regarder est désorientant. Au moment où il bascule, l'écran le
dit en une phrase, avec le moyen d'aller le voir à sa nouvelle place.

---

## 3. Le Live ne contient que des dossiers prêts

Plus aucun brouillon dans la liste du Live. C'est la demande, elle est nette.

**Mais un dossier prêt reste modifiable.** Décision prise faute de réponse contraire :
il disparaît de la liste **par défaut** de Préparation, et reste accessible par un
filtre « Prêts » sur ce même écran. Un conseiller qui veut corriger une coquille ou
ajouter un concurrent dix minutes avant le rendez-vous doit pouvoir le faire — un
dossier figé dès qu'il est prêt est un piège qu'on découvre en voiture.

*Laurent : si tu préfères un bouton « Remettre en préparation » depuis le Live, dis-le
avant que ce soit câblé.*

---

## 4. Ce qu'il faut mesurer avant d'écrire une ligne

Quatre questions, réponses dans le code, pas de supposition :

1. **Quels champs existent réellement sur le dossier vendeur ?** Type de bien, pièces,
   surface, commune, fourchette. Lesquels sont typés, lesquels sont du texte libre ?
   *Attention : le type du bien vendeur est saisi en texte libre français, alors que
   `comparables.property_type` est en vocabulaire canonique. Ce sont deux choses
   différentes — ne pas les confondre à l'affichage.*
2. **Où vit l'état « Brouillon » aujourd'hui ?** Quelle colonne, quelles valeurs
   possibles, qui l'écrit.
3. **Quelles sont les vraies étapes d'une préparation ?** Ne les invente pas : lis ce
   que l'écran de préparation demande réellement au conseiller, et c'est cette liste
   qui fait l'avancement.
4. **Que contient la liste du Live aujourd'hui ?** Sur quoi elle filtre, et ce qui
   change quand on ne lui laisse que les dossiers prêts.

Rends ces quatre réponses avant de dessiner quoi que ce soit.

---

## 5. Ce qui ne change pas

- **Aucune valeur inventée.** Un champ absent reste absent, et l'écran le dit.
- **Ces cartes sont des écrans conseiller**, jamais montrés au vendeur. La fourchette
  du conseiller y a sa place — elle n'en a aucune dans le Live avant l'écran d'analyse
  (mission 51, §4.2).
- Les règles laissées par la mission 51 s'appliquent, en particulier : **une garde de
  rendu n'est pas une garde de donnée**, et **liste d'autorisation, jamais liste
  d'exclusion**.

---

## 6. Hors périmètre

Ce que devient un dossier **après** le rendez-vous (un troisième état « Terminé »)
n'est pas traité ici. La liste du Live s'encombrera avec le temps ; c'est un sujet
pour lui-même.

---

## 7. Barrières

`vitest` · `tsc --noEmit` · `eslint` · `prettier --check` · `next build`

Les tests qui doivent exister :

1. Un dossier complet bascule dans le Live et sort de la liste par défaut de
   Préparation.
2. Un dossier incomplet ne bascule pas tout seul, et reste déclarable prêt par le
   conseiller.
3. La liste du Live ne contient aucun dossier non prêt.
4. Un dossier prêt reste ouvrable et modifiable par le filtre « Prêts ».

**Et l'essai à l'écran, d'une traite, avant de déclarer la mission finie** : créer un
dossier, le remplir, le voir basculer, le retrouver dans le Live, le rouvrir par le
filtre. Sans recharger entre chaque étape — c'est la leçon de la mission 51, et elle a
coûté une soirée.