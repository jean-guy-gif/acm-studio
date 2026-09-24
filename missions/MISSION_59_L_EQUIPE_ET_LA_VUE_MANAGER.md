# MISSION 59 — L'équipe, et ce qu'un manager voit en plus

**Date** : 24 septembre 2026
**Origine** : l'écran Administration porte l'étiquette « Agence et équipe ». L'identité
est faite (missions 55 et 57) ; restent les gens.

**Décidé** : on n'enlève rien à personne. La visibilité des dossiers ne change pas —
tout le monde continue de voir ceux de l'agence, parce que c'est ce qui permet de
reprendre le rendez-vous d'un collègue absent. **Le manager gagne une vue en plus.**

---

## 1. L'équipe : inviter, retirer

Un manager peut inviter un conseiller dans son agence, et l'en retirer.

**Retirer quelqu'un ne supprime pas son travail.** Les dossiers qu'il a préparés restent
à l'agence, avec son nom dessus. Un conseiller qui part ne doit pas emporter le
portefeuille — c'est le genre de perte qu'on ne découvre que le jour où elle arrive.

---

## 2. Le manager est un droit, pas une personne à part

Dans une agence de trois, le manager prépare et joue des Live comme les autres. Le rôle
**ajoute** un accès, il ne change rien à son travail quotidien.

Un seul niveau, pas de hiérarchie à construire : **conseiller** ou **manager**. Un
manager peut donner le rôle à quelqu'un d'autre. Rien de plus — pas de permissions fines,
pas d'écran de rôles.

---

## 3. Ce que le manager voit en plus

**Une vue d'ensemble de l'activité de son agence**, orientée action, pas statistique :

- **Où en est chacun** : dossiers en préparation, prêts, conclus, par conseiller.
- **Ce qui dort** : un dossier en préparation depuis des semaines sans avancer ; un « à
  relancer » dont l'issue n'a pas bougé depuis longtemps. La date du dernier changement
  d'issue existe déjà (mission 54) — elle sert exactement à ça.
- **Les mandats signés** : le chiffre qui compte, par conseiller et pour l'agence.

**Ce qui n'entre pas dans cette mission** : les moyennes, les écarts de prix par
conseiller, les tendances. Ce sont des statistiques, et des statistiques sur cinq
dossiers ne disent rien. Elles viendront quand il y aura de quoi les calculer — et la
donnée, elle, est déjà capturée (mission 56). On ne perd rien à attendre.

**Rien d'inventé** : un conseiller sans dossier affiche zéro, pas une moyenne. Un
dossier sans conclusion n'est compté nulle part ailleurs que dans son état réel.

**Et ces chiffres restent dans l'agence.** Aucune comparaison entre agences — c'est
l'autre chemin, celui du tableau de bord de l'éditeur, qui a ses propres règles.

---

## 4. Ce qu'il faut mesurer avant d'écrire une ligne

La première mesure décide du découpage de la mission.

1. **Qu'existe-t-il aujourd'hui côté gens ?** Comment un utilisateur est rattaché à une
   agence, quelle table, quelles colonnes, y a-t-il déjà une notion de rôle. Comment
   les comptes actuels ont été créés.
2. **Y a-t-il un chemin d'invitation ?** Création de compte, envoi d'e-mail, acceptation.
   Si tout est à construire, **dis-le avant de commencer** : l'invitation est un
   chantier d'authentification, la vue manager n'en est pas un. On jalonnera comme pour
   l'identité — la vue d'abord si l'invitation est lourde, puisqu'elle sert dès
   aujourd'hui avec les gens déjà présents.
3. **Ce que dit la RLS sur les dossiers** : par agence, par utilisateur ? Et ce qu'il
   faudrait pour que la vue manager lise l'activité de toute l'agence sans l'ouvrir à
   autre chose.

Rends ces trois réponses avant de dessiner.

---

## 5. Ce qui ne change pas

- **Personne ne perd un accès.** Aucun conseiller ne voit moins qu'aujourd'hui.
- **Le manager continue de travailler comme un conseiller** ; le rôle n'ajoute qu'une
  vue.
- **Aucune valeur inventée**, aucune moyenne sur des effectifs qui n'en supportent pas.
- **Les chiffres ne sortent pas de l'agence.**

---

## 6. Barrières

`vitest` · `tsc --noEmit` · `eslint` · `prettier --check` · `next build`

Les tests qui doivent exister :

1. Un conseiller retiré de l'agence ne peut plus s'y connecter — **et ses dossiers sont
   toujours là**, avec son nom.
2. Un conseiller sans le rôle manager n'atteint pas la vue manager, ni par l'écran ni
   par l'adresse.
3. La vue manager ne montre que l'activité de sa propre agence.
4. Un conseiller sans dossier apparaît avec zéro, pas absent de la liste.

**Et l'essai à l'écran, d'une traite** : avec deux comptes dans la même agence, l'un
manager et l'autre non — voir ce que chacun voit, et vérifier que le second ne perd rien
de ce qu'il avait.