# MISSION 78 — Une grande maison trouve ses comparables, et un chauffage lu ne bloque plus rien

**Date** : 08/10/2026 · **Origine** : essai de Laurent sur le dossier
`03051b17-ec71-4102-b4ed-993d64fb0d99` (annonce Bien'ici de Cagnes, maison 9 pièces, fourchette
600–750 k€). « Le type de chauffage est obligatoire pour valider » ; « aucun comparable trouvé
avec Stream Estate, alors que Bien'ici en montre 30 et SeLoger 8 (maisons ≥ 155 m², 600–750 k€) ».
Causes lues dans le code : le lecteur Bien'ici recopie le chauffage en texte brut (« chauffage :
… »), qui n'est pas dans la liste : le champ affiche « Non renseigné » mais garde la valeur cachée,
d'où « Valeur non autorisée ». Et `stream-estate-tiers.ts` exige 9 ou 10 pièces à TOUS les crans.

## Partie A — le chauffage (et toute liste)

1. Le chauffage lu sur une annonce (tous portails) est traduit dans la liste (électrique, gaz,
   pompe à chaleur, fioul, bois, collectif…) ; s'il ne se reconnaît pas, le champ reste vide.
2. Garde générale : à l'import, un champ à liste (chauffage, exposition, état, GES…) ne reçoit
   jamais une valeur hors liste. Un champ n'affiche jamais « Non renseigné » en gardant autre chose.

## Partie B — les pièces ne bloquent plus une grande maison

Étape 1 (diagnostic, sans rien changer) : rejoue la cascade sur ce dossier. Par cran : paramètres
envoyés, annonces reçues, gardées, coût. 1 € au plus. Si la cause n'est pas le nombre de pièces
(par exemple le filtre des 30 derniers jours), arrête-toi et dis-le-moi avant de changer quoi que ce soit.

Étape 2, si les pièces sont bien la cause :
3. Les crans 1 à 5 ne changent pas. Puis on libère le nombre de pièces, et il reste libre ensuite :
   même ville (pièces libres), puis 10 km, puis prix ±5 % hors fourchette.
4. Dans ces crans libérés, la surface reste « jamais plus petit » (−10 % au plus) mais n'a plus de
   plafond : la fourchette stricte borne déjà.
5. La carte dit son écart : « 7 pièces au lieu de 9 ». Le % de correspondance compte déjà les pièces.
6. Toujours 10 comparables au plus et 60 annonces payées au plus en automatique (M71 inchangé).

## Décisions à respecter

- M54 (type filtre dur), M61 (fourchette stricte), M71 sauf « jamais une pièce de moins », qui
  devient : « les pièces se libèrent après la ville à 5 km ; la surface, jamais plus petite ».
- La clé Stream Estate ne s'affiche jamais et ne se commite jamais.

## Hors périmètre

- Les liens « Ouvrir mes recherches » des portails, l'extension (en examen sur le Chrome Web Store).

## Essai sur l'URL d'essai

Nouveau dossier, import de la même annonce Bien'ici : le chauffage est traduit ou vide, et
« Enregistrer » passe sans y toucher. Fourchette 600–750 k€, « Trouver des concurrents » : Stream
Estate en propose au moins 8 autour de Cagnes, dont des maisons vues dans la recherche SeLoger.
Le dossier de Saint-Laurent-du-Var de la mission 71 (10 trouvés) donne les mêmes résultats qu'avant.
