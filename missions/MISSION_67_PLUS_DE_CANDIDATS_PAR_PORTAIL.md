# MISSION 67 — Plus de vrais candidats par portail : les pièces dans l'adresse, et les pages suivantes là où c'est permis

**Date** : 1er octobre 2026 · **Origine** : essai du 01/10 sur Nice, 4P 80 m², 400–480 k€. Les 3
propositions sont des 3 pièces, « retenues après élargissement des pièces » : aucun vrai 4P sur les
1res pages. Laurent : « quelle est la possibilité pour qu'il parcoure les 3/4 pages de chaque
plateforme ? »

## Ce que disent les robots.txt (relevés en M50, à RELIRE avant de coder : ils ont pu changer)

| Portail | Pages suivantes | Filtre dans l'adresse |
| --- | --- | --- |
| SeLoger | **interdites** (`*/?page=*`) | **`piece-1` à `piece-5`** et le quartier, dans le chemin |
| Bien'ici | `?page=2` permis (paramètre unique, sans `&`) | type dans le chemin ; pièces : à vérifier |
| Green Acres | non relevé, à vérifier ; `Crawl-delay: 1` | non relevé |
| Maisons & Appartements | `&page=N` permis | à vérifier |

## Mesure d'abord (rends un tableau, puis arrête-toi)

1. Relis les 4 robots.txt (curl depuis ce poste) et confirme ou corrige le tableau ci-dessus.
2. Pour chaque portail : quelle forme d'adresse donne une page de résultats **filtrée par le nombre de
   pièces** sans enfreindre son robots.txt ? Donne un exemple d'adresse par portail, ou « aucune ».
3. Estime le gain sur la fixture de Nice : combien de vrais 4P 76–84 m² dans 400–480 k€ avec (a) les
   pièces dans l'adresse, (b) 3 pages là où c'est permis, (c) les deux. Dis aussi le temps ajouté
   (attente de rendu par page, délai entre pages, `Crawl-delay`).

## Critères d'acceptation (après mon accord sur la mesure)

1. Le constructeur d'adresses met le nombre de pièces dans l'adresse quand le robots.txt le permet
   (SeLoger : `piece-N`). Une adresse interdite reste **refusée** par `assertAllowedSearchUrl`, et un
   test le prouve pour chaque forme nouvelle.
2. Pages suivantes : jusqu'à 3 pages par portail, **seulement** là où c'est permis. On s'arrête dès
   qu'une page n'apporte aucune carte nouvelle. Le délai entre pages et le `Crawl-delay` sont
   respectés.
3. L'écran dit ce qui a été lu : « SeLoger : 30 annonces (1 page, 4 pièces) · Bien'ici : 78
   annonces (3 pages) … » et combien de temps ça a pris. Pendant la lecture, la progression portail
   par portail est visible.
4. Un portail en échec à la page 2 garde les cartes de la page 1, sans bloquer les autres.
5. Corrige au passage la phrase de l'écran devenue fausse avec M61 (`competitor-search-panel.tsx`,
   « Rien n'est masqué : une annonce éloignée descend dans la liste, elle ne disparaît pas ») et le
   commentaire de `types.ts` qui dit la même chose.

## Hors périmètre

Le quartier (chantier en suspens), le prix et la surface dans l'adresse, la lecture de l'onglet du
conseiller (M65).

## Essai

Nice, 4P 80 m², 400–480 k€ : on compare le nombre de vrais 4P proposés avant et après, et la durée
de la recherche. Si on n'atteint pas 3 vrais 4P, la M65 (« Lire ma recherche ») passe en priorité.
