# MISSION 40 — Le code couleur de la comparaison

**Date** : 28 août 2026
**Décision produit de Laurent** : gris = équivalent ; un critère dont la donnée
manque ne s'affiche pas.

---

## 1. État des lieux

`build-comparable-feature-comparison` produit quatre valeurs de
`ComparisonStatus` : `same`, `competitor_advantage`, `competitor_weakness`,
`unknown`.

À l'écran, dans `live-feature-comparison.tsx` :

| Statut | Aujourd'hui |
| --- | --- |
| `competitor_advantage` | vert — « Avantage concurrent » |
| `competitor_weakness` | orange — « Faiblesse concurrent » |
| `same` | **gras / noir** — « Équivalent » |
| `unknown` | **gris** — « Non renseigné » |

Deux problèmes, et le second est le plus grave.

**Le gris ne veut pas dire la même chose à l'écran et en formation.** Laurent
enseigne « vert = mieux, gris = pareil, orange = moins bien ». Le logiciel dit
autre chose. Un conseiller formé à la méthode se retrouve à expliquer une
couleur qui ne correspond pas à ce qu'on lui a appris, devant un client.

**Une grille qui annonce « Non renseigné » affaiblit la démonstration.** Le
vendeur n'a pas à voir les trous de nos données : ce n'est pas son sujet, et ça
donne l'impression d'une comparaison bâclée au moment précis où l'on veut qu'il
fasse confiance aux faits.

---

## 2. Ce qu'on fait

- **`same` prend le gris neutre**, libellé « Équivalent ».
- **Les critères `unknown` sont filtrés à l'affichage.** Le moteur continue de
  les produire : c'est l'interface qui les masque. On garde l'information en
  mémoire pour que le rapport conseiller (mission à venir) puisse dire « surface
  non comparable » sans avoir à recalculer quoi que ce soit.
- **Nouvelle légende** en haut de la grille : vert = avantage du concurrent ·
  gris = équivalent · orange = faiblesse.
- **Cas limite** : si tous les critères sont inconnus, afficher une phrase
  honnête plutôt qu'une grille vide.

---

## 3. Garde-fous

- **Le contrat de `build-comparable-feature-comparison` ne change pas.** Seuls
  l'affichage et les couleurs bougent. Aucune modification du moteur, aucune
  suppression de la valeur `unknown` du type.
- **Contraste vérifié en thème clair ET sombre.** Le gris « équivalent » doit
  rester lisible sur la scène sombre du Live sans se confondre avec le fond —
  c'est un écran projeté ou tourné vers un vendeur, pas un tableau de bord.

---

## 4. Barrières

`vitest` · `tsc --noEmit` · `eslint` · `prettier --check` · `next build`.