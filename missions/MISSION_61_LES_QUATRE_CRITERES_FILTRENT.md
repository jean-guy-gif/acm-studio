# MISSION 61 — Les quatre critères qui comptent filtrent, ils ne marquent pas des points

**Date** : 1er octobre 2026
**Origine** : Laurent — « pour un 4 pièces il me remonte des 3P et des 2P, ça n'a rien à
voir. Mon bien fait 80 m² et il me sélectionne des 50 m². Les quatre caractéristiques
les plus importantes sont le secteur, le prix, le type (nombre de pièces) et la surface.
Ensuite viennent les autres — stationnement privatif pour un appartement, piscine pour
une maison. »

---

## 1. Le défaut, nommé

C'est le même qu'en mission 54 avec maison/appartement, un cran plus bas.

`scoreCandidate` **pondère** le nombre de pièces et la surface. Un 2 pièces bien placé au
bon prix marque assez de points pour remonter malgré ses deux pièces de moins. La
correction de la semaine dernière a fait du type de bien un **filtre** ; pièces et
surface sont restées des points.

**Les quatre critères de Laurent filtrent. Ils ne marquent pas des points.** Un candidat
qui sort des bornes n'apparaît pas, quel que soit son total. Le score ne sert plus qu'à
**ordonner ce qui est déjà admissible**, sur les critères secondaires — stationnement,
piscine, extérieurs, état.

---

## 2. Les bornes, données par Laurent

- **Pièces** : **exactement le même nombre.** Élargi à ±1 **seulement si le compte est
  trop faible**, jamais au-delà.
- **Surface** : **±5 % au départ**, élargie progressivement **jusqu'à ±10 % au
  maximum**. Jamais au-delà. Pour 80 m² : 76–84 m² d'abord, 72–88 m² au pire.
- **Prix** : la fourchette du conseiller. **Elle ne s'élargit pas** — c'est sa décision,
  prise à froid, pas une variable d'ajustement.
- **Secteur** : filtre, voir §4.

---

## 3. Le desserrage est visible — correction de la mission 50

La mission 50 §3 disait : *« le conseiller ne voit pas ce mécanisme : il voit une
liste. »* **C'était une erreur, et la plainte de Laurent en est la preuve** : un
élargissement silencieux produit exactement la surprise du 2 pièces qui n'a rien à voir.

Désormais :

- L'écran dit **quand** il a dû élargir, et **quoi** — « élargi à ±1 pièce et ±10 % de
  surface, faute de candidats dans les bornes serrées ».
- La carte d'un bien retenu grâce à un élargissement **porte la mention**.
- **Ordre du desserrage, du moins grave au plus grave** : surface d'abord (5 → 10 %),
  puis pièces (exact → ±1). Et **on s'arrête là** : si le compte est toujours
  insuffisant, l'écran le dit plutôt que de ramener n'importe quoi. *Une liste courte et
  juste vaut mieux qu'une liste pleine et fausse* — c'est la règle du dépôt depuis le
  premier jour.

---

## 4. Le secteur, et les doublons : mesurer avant de décider

Laurent signale deux autres défauts. **Aucun des deux ne se corrige avant d'être
compté.**

**Le secteur est mal cadré.** À quelle maille la recherche travaille-t-elle aujourd'hui —
commune ? quartier ? Le marché se joue souvent au quartier, et une recherche à la
commune ramène l'autre bout de la ville. Mesure la maille actuelle et dis ce que
coûterait la maille quartier (les identifiants de lieu par portail, restés en suspens
depuis la mission 50).

**Les doublons entre portails.** Sur une vraie recherche, **combien d'annonces
apparaissent sur deux portails ou plus ?** Compte avant tout. S'il y en a trois sur
quatre-vingts, ce n'est pas le sujet du jour. Et **n'invente aucun rapprochement flou** :
si on déduplique, ce sera sur quelque chose de publié, pas sur une ressemblance de prix
et de surface.

---

## 5. Ce qu'il faut mesurer avant d'écrire une ligne

1. **Pièces et surface : filtrent ou pondèrent ?** Où exactement, et avec quels poids.
2. **Le desserrage progressif de la mission 50 existe-t-il dans le code ?** Que
   relâche-t-il, dans quel ordre, et à partir de quel seuil de candidats ? S'il relâche
   les pièces tôt, c'est l'explication du 2 pièces.
3. **La maille du secteur** aujourd'hui, et le coût de la maille quartier.
4. **Le compte des doublons** sur une vraie recherche.

Rends ces quatre réponses avant de dessiner.

---

## 6. Ce qui ne change pas

- **Le type de bien reste un filtre dur** (mission 54) — maison et appartement ne se
  comparent pas, et ça ne se desserre jamais.
- **La fourchette du conseiller ne sort pas vers le vendeur** et ne s'élargit pas.
- **Les cartes disent ce qui rapproche et ce qui éloigne**, avec les écarts chiffrés.
- **Aucune valeur inventée**, aucun rapprochement par ressemblance.
- Un critère non renseigné sur un bien ne le fait pas disparaître en silence : il
  apparaît avec sa mention, comme pour le type non reconnu.

---

## 7. Barrières

`vitest` · `tsc --noEmit` · `eslint` · `prettier --check` · `next build`

Les tests qui doivent exister :

1. Une recherche pour un 4 pièces ne retourne **aucun** 2 pièces ni 3 pièces tant que le
   desserrage n'a pas été déclenché — quel que soit leur score.
2. Une recherche pour 80 m² ne retourne aucun bien hors de 76–84 m² au départ, ni hors
   de 72–88 m² après desserrage complet.
3. Un bien retenu grâce à un desserrage porte sa mention, et l'écran dit qu'il a élargi.
4. La fourchette de prix du conseiller n'est jamais élargie.
5. Trop peu de candidats même après desserrage complet : l'écran le dit, il ne complète
   pas avec des biens hors bornes.

**Et l'essai à l'écran, d'une traite** : la recherche que Laurent décrit — un
4 pièces de 80 m² — et la vérification que ni un 2 pièces ni un 50 m² n'apparaissent.
C'est son cas, c'est lui qui juge.