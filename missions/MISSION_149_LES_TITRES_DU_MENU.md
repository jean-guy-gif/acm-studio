# Mission 149 — Les titres du menu

Demande de Jean-Guy (10/11) : les titres de groupe du menu de gauche (« Vendeurs », « Acquéreurs »,
« Les deux ») sont trop fondus dans la masse. Ils doivent se voir au premier coup d'œil, sans
alourdir le menu.

Maquettes validées par Jean-Guy le 10/11, **variante A (typographique)** :
`missions/maquettes/M149-1-menu-ordinateur.png` (ordinateur) et
`missions/maquettes/M149-2-menu-telephone.png` (téléphone, menu ☰ ouvert). La variante B (une icône
par groupe) n'est pas retenue.

## Le constat

Le titre fait 11 px, gras, en capitales espacées, gris zinc-500 (4,8:1) : le même gris que les
sous-titres des entrées et 4 px plus petit qu'elles. L'œil le lit comme une légende. Seuls 12 px le
séparent de l'entrée du dessus, sans filet.

## Ce qui change (variante A)

1. **Le titre de groupe** : 13 px au lieu de 11, extra-gras, capitales espacées, dans la couleur
   foncée de l'agence (`brand-deep`). Son contraste sur blanc est d'au moins 4,5:1 pour toute
   charte (`ensureTextContrast`, M143) ; 8,4:1 avec la charte par défaut.
2. **Un filet fin** (1 px, zinc-200) au-dessus de chaque groupe titré, avec 12 px d'air au-dessus du
   filet et 14 px entre le filet et le titre. « Aujourd'hui », en tête et sans titre, n'a pas de
   filet au-dessus de lui.
3. **Mode sombre** : le titre prend la couleur claire de l'agence (`brand`, 7,1:1 sur le fond
   sombre avec la charte par défaut) ; le filet, blanc à 10 %.
4. **Téléphone** (menu ☰ ouvert, M132) : la même règle.

## Ce qui ne change pas

Les entrées, leurs sous-titres, la pastille d'« Aujourd'hui », l'entrée choisie en bleu clair,
l'ordre des groupes, les adresses, la carte du conseiller. Aucune icône. Aucun droit, aucune donnée.

## Preuves attendues

- Un test du menu : les titres de groupe portent la couleur foncée de l'agence (`text-brand-deep`),
  plus le gris zinc-500, et chaque groupe titré a son filet ; « Aujourd'hui » n'en a pas.
- Les barrières ; la suite e2e (le menu est sur chaque page) ; le contrôle des boutons pleins et des
  débordements inchangé.

## Hors périmètre

Les icônes (variante B), les entrées du menu, la carte du conseiller, la barre compacte du
téléphone.
