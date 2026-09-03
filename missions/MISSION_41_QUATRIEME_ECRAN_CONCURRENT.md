# MISSION 41 — Le quatrième écran par concurrent

**Date** : 28 août 2026
**Décision produit de Laurent** : on aligne le code sur le Storyboard.

---

## 1. État des lieux

`build-live-pages.ts` produit trois écrans par concurrent :
`comparable_competition`, `comparable_price`, `comparable_duration`.

Le Storyboard officiel (`docs/01_Method/Storyboard.md`, acte 2) en prévoit
quatre : slides A, B, C et D. L'écart vient de l'écran « prix », qui fait
aujourd'hui deux choses à la fois — recueillir l'estimation du vendeur, puis
révéler le prix réel.

Le Storyboard sépare les deux, et il a raison. Entre la devinette et la
révélation, il y a le temps de réaction du vendeur, et c'est ce temps-là qui
produit la prise de conscience. Le condenser, c'est escamoter le seul moment du
rendez-vous où le vendeur se corrige lui-même.

---

## 2. Ce qu'on fait

Découper l'écran prix en deux.

| Écran | Titre | Contenu |
| --- | --- | --- |
| 1 | Un sérieux concurrent ? | Fiche, photos, comparaison critère par critère. Prix et délai masqués. |
| 2 | À quel prix ? | Le vendeur devine. Le prix reste masqué. |
| 3 | Ce prix vous paraît-il cohérent ? | Révélation : prix réel, écart en € et en %, rang au prix/m². Le vendeur réagit. |
| 4 | Pourquoi toujours en vente ? | Durée devinée puis révélée, baisses de prix, motif. |

- **Persistance** : nouvelle colonne `seller_price_coherence` sur
  `live_seller_responses` (contrainte `coherent` / `too_high` / `too_low` /
  `unsure`), plus son commentaire libre, dans la même limite de 2 000 caractères
  que les autres.
- **Le saut existant est conservé et étendu** : « ce n'est pas un concurrent »
  sur l'écran 1 saute les écrans 2, 3 et 4.
- **`can-advance-live-page.ts`** : le verrou actuel — le prix ne se révèle
  qu'après la saisie de l'estimation du vendeur — doit survivre au nouveau
  découpage.

---

## 3. Le risque principal

**Le verrou de révélation est la règle la plus importante du protocole ACM.**
« Ne jamais révéler un prix avant que le vendeur l'ait deviné » est ce qui
distingue cette méthode d'un diaporama. C'est exactement le genre de garantie
qui se perd dans un refactoring de découpage, sans que rien ne casse
visiblement.

Écris le test de non-régression **avant** de découper.

---

## 4. Garde-fous

- Test de non-régression sur le verrou de révélation, sur le nouveau découpage.
- Test sur le nombre de pages produites : 4 par concurrent retenu, 1 pour un
  concurrent écarté par le vendeur.
- Le prix du bien vendeur et la fourchette du conseiller n'apparaissent à aucun
  moment — la garantie posée en mission 39 doit rester verte.

---

## 5. Barrières

Migration + test SQL · `vitest` · `tsc --noEmit` · `eslint` ·
`prettier --check` · `next build`.