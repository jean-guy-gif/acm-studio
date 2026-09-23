# MISSION 55 — L'identité de l'agence

**Date** : 22 septembre 2026
**Origine** : Laurent — « l'agence glisse son logo et l'adresse de son site, et la
plateforme prend sa charte graphique exacte : couleurs, logo, typographie. Pas de logo
déformé, les bonnes couleurs. »

Aujourd'hui le Live affiche le logo Start Academy. Un vendeur assis en face d'un
conseiller d'une agence cliente regarde donc, pendant tout le rendez-vous, le nom de
quelqu'un d'autre. C'est ce qui rend l'outil vendable ou non.

**Décidé** : la charte s'applique à **tout l'outil** · l'extraction est **proposée puis
validée sur un aperçu** · le logo est fourni en **deux versions, claire et sombre**.

---

## 1. Ce que fait l'agence

Trois gestes, une fois :

1. elle dépose son logo — version claire et version sombre ;
2. elle donne l'adresse de son site ;
3. elle regarde l'aperçu et valide.

L'aperçu montre **le Live tel que son vendeur le verra**, pas un nuancier. C'est le seul
écran qui prouve quelque chose.

---

## 2. Les couleurs : provenance, jamais fréquence

C'est la règle du dépôt, appliquée ici. Une couleur extraite d'une page peut être
fausse, et une couleur de marque fausse s'affiche devant un vendeur.

**Niveau 1 — la couleur que le site déclare sienne.** `<meta name="theme-color">`, les
variables CSS nommées (`--brand`, `--primary`, `--accent`), le `theme_color` du manifeste.
Le site les a écrites pour dire « voici ma couleur ». C'est le niveau préféré.

**Niveau 2 — la couleur d'un élément identifiable.** Le fond de l'en-tête, celui du
bouton d'action principal. Elle appartient à la marque par construction, mais c'est une
lecture, pas une déclaration.

**Niveau 3 — la couleur la plus fréquente de la page. Supprimé.** La fréquence n'a
aucune notion d'appartenance : sur la plupart des sites elle rend du blanc. C'est
exactement la famille d'erreur des missions 48 à 51 — une statistique tenant lieu de
source.

**Et chaque proposition dit d'où elle vient.** « Couleur déclarée par le site » ne se
présente pas comme « couleur du bouton principal ». Le conseiller doit pouvoir juger.

Si les niveaux 1 et 2 ne donnent rien, **on ne propose rien** et l'écran le dit. Une
case vide se corrige à la main ; une couleur inventée part en rendez-vous.

---

## 3. La typographie : ce qu'on a le droit d'utiliser

Lis les `@font-face` et les liens Google Fonts du site.

- **Google Font** → utilisable, on la propose en le disant.
- **Police sous licence** → on ne la sert pas. La licence de l'agence couvre son site,
  pas notre application. L'outil le dit en clair et propose la plus proche parmi celles
  dont on dispose.

On ne télécharge jamais un fichier de police depuis le site d'un client pour le
re-servir.

---

## 4. Le logo : jamais déformé, jamais encadré

- **Deux versions**, claire et sombre, parce que c'est ce que toute charte contient
  déjà, et parce que le Live est sur fond sombre.
- **Le ratio est préservé, toujours.** Boîte réservée, `object-fit: contain`. Un logo
  étiré, c'est le premier signe qu'un outil n'est pas sérieux.
- **Format** : SVG préféré (net à toute taille). Sinon PNG avec transparence. Un JPEG
  porte un fond opaque, donc un rectangle blanc au milieu du Live — **dis-le au moment
  du dépôt**, pas à l'écran devant un vendeur.
- L'aperçu montre le logo **sur les deux fonds réels** : celui du Live et celui des
  écrans de travail.

---

## 5. La lisibilité n'est pas négociable

Une agence dont la couleur de marque est un jaune pâle : appliquée à du texte, elle
devient illisible — devant un vendeur.

Le contraste est vérifié. Là où il échoue, **l'outil ne livre pas un écran illisible** :
il ajuste la couleur pour son usage en texte, garde la couleur de marque exacte pour les
aplats et les accents, et **dit ce qu'il a fait**. Même principe que partout ailleurs :
on ne produit rien de cassé en silence.

---

## 6. Ce que la charte n'a pas le droit de toucher

**Le code couleur de la grille comparative** — vert = avantage du concurrent, gris =
équivalent, orange = faiblesse. Ces trois couleurs portent un **sens** devant le
vendeur. Une agence dont la marque est verte ou orange ne doit pas pouvoir les écraser,
sous peine de rendre la grille illisible au moment précis où elle sert.

Ces couleurs sont sémantiques, pas décoratives. Elles sortent du périmètre de la charte.

---

## 7. Le chemin manuel existe toujours

Un site bâti sur un modèle, tout en styles en ligne, ou simplement injoignable, ne doit
bloquer personne. Les sélecteurs de couleurs manuels sont disponibles en permanence,
pas seulement en cas d'échec.

`robots.txt` reste lu et respecté avant de demander la page — y compris celle d'un
client qui nous en donne l'adresse. S'il refuse, l'écran le dit et la saisie manuelle
prend le relais.

---

## 8. Ce qui reste hors de portée de l'agence

L'administration porte **l'identité et les gens**, jamais la méthode : le minimum de
trois concurrents, les tolérances de rapprochement, le déroulé du Live, l'ordre des
écrans. Ce qui est vendu, c'est autant le déroulé que le logiciel ; une agence qui
descendrait le minimum à un concurrent abîmerait la crédibilité de l'ACM, pas seulement
son écran.

---

## 9. Ce qu'il faut mesurer avant d'écrire une ligne

1. **Où vivent les couleurs aujourd'hui ?** Jetons Tailwind, variables CSS, ou valeurs
   en dur dans les composants ? Si c'est en dur, il faut les extraire en jetons avant de
   pouvoir substituer quoi que ce soit — et c'est là qu'est le vrai travail.
2. **Où vivent le logo et le fond du Live ?** Combien d'endroits les portent.
3. **Qu'est-ce qu'il y a déjà côté agence en base ?** Table, colonnes, ce qui est déjà
   stocké.
4. **Quelles couleurs sont sémantiques** (grille comparative, états, alertes) et doivent
   être exclues de la substitution. Rends-en la liste.

Rends ces quatre réponses avant de dessiner.

---

## 10. Barrières

`vitest` · `tsc --noEmit` · `eslint` · `prettier --check` · `next build`

Les tests qui doivent exister :

1. Un logo de ratio quelconque n'est jamais déformé — la boîte s'adapte, l'image non.
2. Une couleur de marque au contraste insuffisant est ajustée **pour le texte**, la
   couleur exacte reste pour les aplats, et l'écran le signale.
3. Les couleurs sémantiques de la grille ne sont **jamais** remplacées par la couleur
   de marque, quelle qu'elle soit.
4. Une police sous licence n'est pas servie ; on propose un repli en le disant.
5. Un site injoignable ou illisible n'empêche pas de configurer l'identité à la main.
6. Aucune couleur n'est proposée quand les niveaux 1 et 2 ne donnent rien.

**Et l'essai à l'écran, d'une traite** : déposer le logo d'une vraie agence et l'adresse
de son vrai site, lire les propositions et leur provenance, valider, ouvrir le Live en
plein écran et regarder — c'est le seul juge.