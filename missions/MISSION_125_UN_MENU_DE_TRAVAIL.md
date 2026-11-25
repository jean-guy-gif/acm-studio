# MISSION 125 — Un menu de travail, rien d'autre

**Date** : 25/10/2026 · **Origine** : Jean-Guy, 25/10 : « la partie Administration, Aide doit être mise
ailleurs, ça surcharge le côté gauche de l'appli et renforce le "ça doit être compliqué" du conseiller ;
je dois avoir que de Préparation à Prospection ».

Petite mission, sans migration. Une branche, un `/valide`.

## Objectif

Le menu de gauche ne montre que le travail : l'interrupteur Vendeur | Acquéreur (M118) et les quatre
espaces du mode. Tout le reste passe derrière la carte du conseiller, en bas.

## Critères d'acceptation (testables à l'écran)

1. **Menu de gauche, mode Vendeur** : Préparation, Live, Suivi, Prospection. **Mode Acquéreur** :
   Acquéreurs, Biens idéaux, Visites, Prospection. Rien d'autre au-dessus de la carte du conseiller.
2. **La carte du conseiller** (nom, e-mail, agence, en bas du menu) devient un bouton qui ouvre un menu :
   **Mon profil · Administration · Aide · Ma démo** (agence de démo seulement, M114) **· Erreurs**
   (opérateurs seulement, M100) **· Sombre / Clair · Déconnexion**. Fermeture par Échap, clic dehors, ou
   choix d'une entrée ; navigable au clavier ; libellé accessible « Mon compte et l'agence ».
3. Le compteur des erreurs (« 1 erreur depuis hier ») devient une pastille sur la carte pour un opérateur,
   reprise à côté de « Erreurs » dans le menu ; rien pour un conseiller.
4. Les adresses ne changent pas (`/admin`, `/aide` ou équivalent, `/ma-demo`, `/erreurs`, `/profil`) ; une
   page ouverte depuis ce menu ne surligne aucun des quatre espaces.
5. « Bienvenue » et le dossier d'exemple qui renvoient vers l'Aide gardent leur lien ; rien d'autre ne
   pointait vers les entrées retirées du menu (à vérifier par recherche dans le code).
6. Tablette (M72) : la carte et son menu tiennent en 768 × 1024 et en 1024 × 768 ; le Live n'est pas touché.
7. Vocabulaire inchangé ; aucun droit modifié : l'interrupteur et ce menu ne changent que l'affichage.

## Preuves

8. Tests : les deux menus ne contiennent que leurs quatre espaces ; le menu de la carte montre « Ma démo »
   dans l'agence de démo seulement, « Erreurs » et sa pastille à un opérateur seulement.
9. `npm run e2e` vert, tablette comprise : les e2e qui cliquaient « Administration », « Aide », « Ma démo »
   ou « Erreurs » dans le menu de gauche passent par la carte ; l'e2e `demo` et le livret de Natacha
   (Aide → Ma démo) suivent le nouveau chemin.

## Décisions à respecter

- M100 (opérateurs), M114 (démo), M118 (interrupteur, mode déduit de l'adresse), M72.

## Hors périmètre

- Le contenu des pages Administration, Aide, Erreurs ; la page Visites (M119) n'est pas modifiée.

## Essai sur l'URL d'essai

Compte Start Academy (opérateur) : le menu de gauche n'a que quatre espaces, dans chaque mode → la carte
en bas porte une pastille → clic : Mon profil, Administration, Aide, Erreurs (avec son compteur), Sombre,
Déconnexion → Échap ferme. Compte démo : « Ma démo » dans le menu de la carte, pas « Erreurs ».
