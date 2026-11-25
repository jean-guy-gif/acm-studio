# MISSION 118 — Le mode acquéreur et les biens idéaux

**Date** : 24/10/2026 · **Origine** : Jean-Guy, 24/10 : « pas un onglet supplémentaire sur le côté »
(navigation, option C retenue : un interrupteur Vendeur | Acquéreur qui change le menu) ; dossier
stratégique du 22/10, étapes 2 et 3 : « Trouver les biens idéaux », trois catégories, sélection validée.

Deux parties, **une branche et un `/valide` par partie**, A puis B. Pas de push forcé. `npm run sauvegarde`
avant la migration (B), soumise avant d'être appliquée, comptage avant et après. Pas de `/valide` sans CI
verte ni e2e vert.

## Partie A — L'interrupteur et le menu acquéreur

1. En haut du menu de gauche, un interrupteur à deux positions, **Vendeur | Acquéreur**, mémorisé par
   conseiller (`profiles.workspace_mode`, 'seller' par défaut ; migration minuscule, aucune ligne
   modifiée). Il se voit : couleur et mot du mode en tête du menu, sur bureau comme sur tablette.
2. **Mode Vendeur** : le menu d'aujourd'hui, à l'identique (Préparation, Live, Suivi, Prospection).
3. **Mode Acquéreur** : **Acquéreurs** (les fiches, M117), **Biens idéaux** (partie B ; d'ici là,
   l'entrée mène à la fiche avec « Rapprocher »), **Visites** (M119 ; d'ici là, absent), **Prospection**
   (la même liste que le mode Vendeur, M120 y ajoutera l'origine « recherche acquéreur »).
4. Communs aux deux modes : Administration, Aide, Erreurs, Ma démo, Mon profil. L'adresse
   `/acquereurs` reste ; l'interrupteur ne change que le menu, jamais les droits ni les données.
5. Une page du mode absent reste accessible par son adresse (un lien envoyé par un collègue
   fonctionne) : l'interrupteur se place alors sur le mode de la page.
6. Le dossier d'exemple et la démo ne changent pas ; l'e2e vérifie les deux menus et la mémoire du mode.

## Partie B — Trouver les biens idéaux

7. Sur une fiche acquéreur, **« Trouver les biens idéaux »** lance, dans l'ordre et sur un seul écran :
   - **ce que l'agence a déjà** : le rapprochement de M86 (mandats signés, vendeurs à relancer,
     concurrents à prospecter), gratuit, rendu d'abord ;
   - **le marché** : la recherche Stream Estate de M99/M110, avec les réglages déduits de la fiche
     (type, communes, budget plafond + 5 %, pièces et chambres minimum, surface minimum, DPE, étage,
     extérieur, piscine) ; c'est une recherche payante : avertissement avant (M111), réservation du
     budget de l'agence (M105), « Chercher encore » et élargissements comme pour un bien vendeur ;
     simulée dans l'agence de démo (M114), sans un centime.
8. **Trois catégories**, décidées par un service pur à partir des indispensables de la fiche (M117) :
   - **Correspondance forte** : tous les indispensables satisfaits, et les préférences aussi ;
   - **Bon compromis** : tous les indispensables satisfaits, une ou plusieurs préférences non, chacune
     nommée (« Pas de piscine », « 2 chambres au lieu de 3 ») ;
   - **À explorer** : un indispensable **non indiqué** par l'annonce (M61 : la donnée absente est le
     critère) ; la carte dit lequel vérifier.
   Un indispensable **contredit** écarte le bien, compté (« 7 écartés : budget dépassé, pas
   d'extérieur… »). Le % de correspondance de M71 classe à l'intérieur de chaque catégorie.
9. **La sélection** : le conseiller coche jusqu'à **3 biens**, par défaut vides, puis « Retenir la
   sélection ». Elle s'enregistre (table `buyer_selections` : buyer_id, agency_id, created_at,
   et pour chaque bien : source (dossier vendeur, concurrent, annonce), référence, prix affiché,
   catégorie, écarts nommés, ordre). Une sélection précédente reste lisible ; une nouvelle la remplace.
   Les annonces du marché retenues s'importent comme des concurrents (photos, prix, durée, « Vendu
   par », exclusivité, M-import), rattachées à l'acquéreur et non à un dossier vendeur.
10. Jamais devant l'acquéreur à cette étape : l'écran est réservé au conseiller. Le dossier remis à
    l'acquéreur est la M119 ; le courrier au propriétaire ou au confrère, la M120.
11. Une recherche n'est pas une disponibilité : la carte dit « affiché le [date] », jamais « disponible ».
12. Un acquéreur archivé ne cherche plus. Tablette ok (M72). Vocabulaire : « Acquéreur »,
    « Biens idéaux », « Correspondance forte / Bon compromis / À explorer » ; jamais « estimation ».

## Preuves

13. Tests : mode mémorisé et mode déduit de l'adresse ; réglages déduits de la fiche (budget + 5 % une
    fois, M117) ; les trois catégories, l'écart nommé, l'écarté compté, l'indispensable non indiqué en
    « À explorer » ; sélection limitée à 3, remplacée ; aucun appel payant dans les tests ; démo simulée.
14. `npm run e2e` vert : bascule des deux menus ; sur l'acquéreur de l'exemple… l'exemple n'en a pas
    (M117) : l'e2e crée une fiche, lance « Trouver » (Stream Estate simulé par le compte de test, comme
    aujourd'hui), lit les trois catégories, retient 2 biens, les retrouve ; l'e2e `demo` retient 3 biens
    pour la famille Keller.

## Décisions à respecter

- M61 (donnée absente), M71 (classement), M86/M99 (rapprochement), M100/M105/M111 (budget, réservation,
  avertissement payant), M110 (réglages), M114 (démo : mêmes chemins), M117 (fiche), M72.
- Jamais « estimation ». On ne modifie ni `extension/` ni le Localisateur.

## Hors périmètre

- Le dossier remis à l'acquéreur et la demande de visite (M119) ; les courriers dérivés (M120) ;
  l'apprentissage des retours acquéreur ; la micro-analyse de secteur.

## Essai sur l'URL d'essai

- **A** : l'interrupteur en haut du menu ; Acquéreur → quatre entrées ; Vendeur → le menu habituel ;
  recharger : le mode est retenu ; ouvrir `/acquereurs` en mode Vendeur : l'interrupteur bascule.
- **B**, compte démo : famille Keller → « Trouver les biens idéaux » → d'abord les biens de l'agence
  (le mandat de Mougins), puis le marché simulé en trois catégories avec les écarts nommés et les
  écartés comptés → retenir 3 → « Retenir la sélection » → la fiche montre la sélection. Compte réel :
  l'avertissement du coût s'affiche avant la recherche (ne pas la lancer).
