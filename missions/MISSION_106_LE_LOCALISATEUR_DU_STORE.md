# MISSION 106 — Le Localisateur du Store

**Date** : 16/10/2026 · **Origine** : le Localisateur Academia est publié sur le Chrome Web Store
avec un identifiant attribué par Google, `fpnimjhhiagpfjodphjddobegnelckeg`. ACM ne connaît que
l'identifiant de développement, `bjoapcmbjmollccjocdacbobdpfekmgk`, lu dans
`NEXT_PUBLIC_LOCALISATEUR_ID` (M75). Une prochaine version du Localisateur du Store contiendra le pont
vers ACM (ACM_PING, ACM_BIENS_PAR_URL, ACM_OUVRIR_BIEN). ACM doit alors la reconnaître, sans casser
le Chrome de Laurent qui garde la version de développement.

C'est une petite mission, sans migration. Elle se lance seule, depuis `main` à jour.
- Pas de push forcé.
- On ne modifie ni `extension/` ni le Localisateur.

## Objectif

ACM parle au Localisateur installé, qu'il vienne du Store ou du mode développeur.

## Critères d'acceptation

1. ACM accepte une **liste** d'identifiants de Localisateur, séparés par des virgules, dans
   `NEXT_PUBLIC_LOCALISATEUR_ID`. Chaque identifiant malformé est ignoré. Une seule valeur, comme
   aujourd'hui, continue de marcher.
2. Au premier besoin, ACM envoie `ACM_PING` à chaque identifiant, dans l'ordre de la liste, et garde
   le premier qui répond pour l'onglet. Les messages suivants vont à celui-là seulement. Si aucun ne
   répond, le comportement reste celui d'aujourd'hui (Localisateur absent, avis discret de la M75).
3. Ordre recommandé dans Vercel, production et essai :
   `fpnimjhhiagpfjodphjddobegnelckeg,bjoapcmbjmollccjocdacbobdpfekmgk` (le Store d'abord). Le
   compte rendu donne la valeur exacte à poser. Claude Code ne touche pas lui-même à Vercel.
4. Sur « Bienvenue », la ligne facultative « Localisateur Academia, pour retrouver l'adresse d'un
   bien » (M97) mène à la page du Store :
   `https://chromewebstore.google.com/detail/fpnimjhhiagpfjodphjddobegnelckeg`. Elle se coche
   quand un Localisateur répond. Si la ligne n'existe pas encore, l'ajouter.
5. `.env.example` et `docs/ETAT_DU_PRODUIT.md` disent que la variable accepte une liste.

## Preuves

6. Tests :
   - une seule valeur, comme aujourd'hui ;
   - deux identifiants : le premier ne répond pas, le second répond, et il est gardé ;
   - aucun ne répond : Localisateur absent ;
   - un identifiant malformé dans la liste est ignoré ;
   - la ligne de Bienvenue se coche quand un Localisateur répond.
7. `npm run e2e` vert, tablette comprise.

## Décisions à respecter

- M75 (pont vers le Localisateur, trois messages, données revalidées), M97 (« Bienvenue »), M105
  (détection de l'extension ACM gardée pour l'onglet).
- Le build ACM du Localisateur (3.1.1-acm1) ne s'installe jamais chez les conseillers. C'est la
  version du Store, avec le pont intégré, qui leur est distribuée.

## Essai sur l'URL d'essai

1. Après avoir posé la variable dans Vercel et redéployé : sur le Chrome de Laurent (version de
   développement), la Prospection reçoit toujours les adresses du Localisateur.
2. Sur un Chrome avec le seul Localisateur du Store, une fois sa version avec le pont publiée : les
   adresses arrivent aussi.
3. « Bienvenue » : la ligne du Localisateur mène à la page du Store.
