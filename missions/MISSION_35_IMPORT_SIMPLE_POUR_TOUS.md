# MISSION 35 — Rendre l'import utilisable par un conseiller, pas par un développeur

**Date** : 19 août 2026
**Demande** : « Si demain je fais la démo à un agent immobilier juste à l'aise ou
pas à l'aise avec l'informatique, c'est fini, il n'utilisera jamais ça. Trop
complexe de faire Cmd+Option+U […] C'est quoi les solutions ? »

---

## 1. Trois pannes, pas une

La copie d'écran envoyée par Laurent a permis de trancher : le message affiché
était **« Le site a refusé l'accès à l'annonce »**, c'est-à-dire un refus HTTP.
En cherchant pourquoi, deux autres pannes bien plus graves sont apparues.

### 1.1 Une lecture qui prenait 24 secondes

Mesure du pipeline complet sur la page Green Acres réelle (872 Ko) :

| Étape               | Avant             |
| ------------------- | ----------------- |
| `extractGreenAcres` | **14 942 ms**     |
| `extractHtml`       | **9 678 ms**      |
| tout le reste       | 1 à 16 ms         |
| **Total**           | **≈ 24 secondes** |

Cause : des expressions régulières comme `([\d][\d\s.,]*)\s*(?:€|eur)`. La classe
`[\d\s.,]` contient déjà l'espace, et le `\s*` qui suit le contient aussi : le
moteur peut découper la même suite de caractères d'une infinité de façons et les
essaie toutes. Sur une page de 872 Ko, l'explosion est garantie.

**C'est une panne de production, pas une lenteur.** Une fonction Vercel s'arrête
au bout de 10 à 15 secondes : l'import Green Acres ne pouvait _jamais_ aboutir.

Correction : bornes explicites (`{0,14}`) et suppression du `\s*` redondant.

| Étape                     | Avant     | Après      |
| ------------------------- | --------- | ---------- |
| `extractGreenAcres`       | 14 942 ms | **65 ms**  |
| `extractHtml`             | 9 678 ms  | **29 ms**  |
| Pipeline complet ×3 pages | 46 700 ms | **346 ms** |

Résultats d'extraction identiques, au champ près.

### 1.2 Le collage était refusé avant même d'arriver

Notre action serveur acceptait 4 Mo de page collée… mais Next.js refuse par
défaut toute action de plus de **1 Mo**, en amont de notre code. Une page
d'annonce pèse 195 Ko à 995 Ko, et l'encodage du formulaire gonfle encore le
tout. Le collage échouait donc souvent **sans message compréhensible**.

Correction : `serverActions.bodySizeLimit = '8mb'` dans `next.config.ts`.

### 1.3 Le refus des portails

Testé le 19/08 depuis un serveur, sur les vraies annonces :

| Portail                     | Import à distance                  |
| --------------------------- | ---------------------------------- |
| SeLoger (annonce d'Antibes) | ✅ répond, données complètes       |
| Green Acres                 | ✅ répond                          |
| Maisons et Appartements     | ✅ répond                          |
| Belles Demeures             | ❌ **interdit par son robots.txt** |
| Le Figaro                   | ❌ refus                           |

Autrement dit : **les portails ne nous bloquent pas en masse**, contrairement à ce
qu'on croyait. L'adresse essayée par Laurent était par ailleurs une page
`/recherche/…`, c'est-à-dire une page de résultats, pas une annonce.

Ce qui a été changé côté client HTTP :

- **Identité honnête.** `Mozilla/5.0 (compatible; ACMStudioBot/1.0; +<contact>)`.
  Le préfixe « compatible » est la convention des moteurs (Googlebot, Bingbot) :
  ce n'est pas un déguisement en navigateur, le nom du robot et une adresse de
  contact y figurent en clair. **Nous ne prétendons jamais être autre chose que
  ce que nous sommes** — si un portail refuse un robot qui se nomme, il refuse,
  et l'on passe au copier-coller.
- **robots.txt lu et respecté** (nouveau module `robots-policy.ts`, 7 tests) :
  groupes `User-agent`, `Allow` / `Disallow`, motifs `*` et `$`, règle la plus
  précise gagnante. Belles Demeures est donc refusé par nous-mêmes, avant tout
  appel, avec un message qui dit quoi faire.
- Délai porté de 8 à 15 s, taille de 2 à 6 Mo, en-tête `Accept-Language`.

---

## 2. Le nouveau geste

Ce qui disparaît : « clic droit → afficher le code source de la page », `Cmd+U`,
`Cmd+Option+U`. Aucun conseiller ne fera ça devant un client.

Ce qui le remplace, quand un portail refuse :

> **1.** Sur l'annonce : `Cmd+A` — **2.** `Cmd+C` — **3.** ici : `Cmd+V`

Trois raccourcis que tout le monde connaît déjà. Rien à installer, aucune barre
de favoris à faire apparaître, `Ctrl` au lieu de `Cmd` sur PC — l'outil détecte
la machine et affiche la bonne touche. La zone de collage est un grand cadre en
pointillés : on clique dedans, on colle, l'analyse démarre seule.

**Pourquoi c'est aussi techniquement meilleur.** Le « code source » renvoie ce que
le serveur a envoyé ; `Cmd+C` met dans le presse-papiers la page **telle qu'elle
s'affiche**. C'est exactement ce qui manquait : sur Bien'ici, le code source ne
contient aucune annonce.

Mesure comparée, page complète contre page collée :

|                            | SeLoger                   | Green Acres           | M. et App.     |
| -------------------------- | ------------------------- | --------------------- | -------------- |
| Prix, surface, DPE         | perdus (dans les scripts) | **identiques**        | **identiques** |
| Description                | identique (1 049)         | **identique (1 760)** | 450 / 495      |
| Caractéristiques           | **9 = identique**         | **9 = identique**     | 0              |
| Extérieurs / stationnement | **identiques**            | **identiques**        | **identiques** |

Green Acres et Maisons et Appartements donnent **exactement** le même résultat que
la page complète. SeLoger perd le prix et la surface — mais SeLoger répond à
l'import par adresse, donc n'a pas besoin du collage.

Le raccourci de barre de favoris n'est pas supprimé : il est replié dans un
« Vous importez souvent depuis ce portail ? », pour ceux que ça intéresse.

---

## 3. Ce qui reste à faire

**Une extension de navigateur.** C'est la vraie réponse pour 95 % des
conseillers : un bouton qui apparaît directement sur l'annonce, installé une fois
depuis un lien. C'est ce que fait Castorus. Coût : un compte développeur Chrome
(5 $, une fois) et quelques jours de validation par Google — donc pas pour une
démo demain, mais c'est la cible.

**Un extracteur par portail** pour Belles Demeures, Maisons et Appartements et
Le Figaro : prix, surface et quartier y restent partiels (voir MISSION 34).

---

## 4. Barrières

523 tests (dont 10 nouveaux) · `tsc --noEmit` · `eslint` · `prettier --check` ·
build de production.
