# Lancement, mission 4 — la preuve que les annonces se lisent, site par site (24/11)

Essai fait dans le Chrome de Jean-Guy, avec l'extension ACM, sur son compte et en production :
une vraie annonce de chaque site collée dans « Ajouter un bien concurrent ». Le dossier « TEST
lecture des portails » créé pour l'essai est archivé ; aucun concurrent n'a été enregistré.

| Site                   | Résultat après correction                                                                                                                              | Reste à compléter par le conseiller           | Capture                                              |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------- | ---------------------------------------------------- |
| SeLoger                | Se lit : titre, prix, prix au m², surface, pièces, chambres, **ville, quartier**, DPE, GES, description, durée (187 jours), 11 photos                   | Salles de bains                               | `maquettes/L4-portails-seloger.jpg`                  |
| Bien'ici               | Se lit : titre, prix, surface, pièces, chambres, ville, DPE, description, durée, 4 photos (30 à 40 secondes de lecture)                                 | Prix au m² du site, salles de bains, quartier, GES | `maquettes/L4-portails-bienici.jpg`             |
| Figaro Immobilier      | **Se lit de nouveau** : titre, prix, surface, terrain, pièces, chambres, salles de bains, ville, code postal, description, durée (29 jours), 6 photos   | Quartier ; DPE et GES (non publiés sur cette annonce) | `maquettes/L4-portails-figaro.jpg`           |
| Green Acres            | Se lit : titre, prix, prix au m², surface, terrain, pièces, chambres, salles de bains, **ville**, description, durée (49 jours), 20 photos              | Quartier, DPE, GES                            | `maquettes/L4-portails-green-acres.jpg`              |
| Maisons & Appartements | Se lit : titre, prix, surface, pièces, ville, DPE, description, 2 photos                                                                                | Chambres, salles de bains, quartier, GES, durée | `maquettes/L4-portails-maisons-et-appartements.jpg` |

## Ce qui échouait, et ce qui est corrigé

- **Figaro Immobilier** était refusé depuis le 10/11 (« ne se lit plus ») : son titre ne porte plus
  le prix et la surface là où le lecteur les cherchait. Ils se lisent maintenant dans les données de
  l'annonce elle-même.
- **SeLoger** : la ville manquait dans 4 fiches sur 41 de vrais dossiers, le quartier dans 39. La
  page écrit la ville sous deux formes (« Nice », « Nizza ») et le lecteur n'en retenait aucune ; il
  lit maintenant le bloc d'adresse de l'annonce.
- **Green Acres** : une villa de prestige recevait la ville « de luxe Vence » ; c'est « Vence ».

## Ce que disent les vrais dossiers (30 derniers jours)

- SeLoger : 47 concurrents, dont 41 lus sur la page et 6 créés depuis la recherche parce que la
  page n'a pas pu être obtenue (le concurrent est alors gardé, avec ses champs « À vérifier »).
- Bien'ici : 27 concurrents, tous lus sur la page.
- Figaro : 1 seul, page illisible (avant la correction).
- Green Acres et Maisons & Appartements : aucun.

## Ce qui n'est pas corrigé (dans `missions/PLUS_TARD.md`)

- Une annonce **périmée** de Maisons & Appartements s'importe comme une annonce en ligne.
- Les 5 pages SeLoger restées illisibles en 14 jours.
