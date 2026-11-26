# MISSION 73 — Un conseiller du pilote installe l'extension et cherche ses comparables en un clic

**Date** : 06/10/2026 · **Origine** : préparation du pilote. Aujourd'hui, l'extension ne s'installe
qu'en mode développeur depuis le dossier de Laurent. Et le bouton Stream Estate dit encore « (essai) »
alors qu'il est devenu la recherche principale (M71).

## Objectif

L'extension est prête à être déposée sur le Chrome Web Store en « non répertorié », et la recherche
Stream Estate devient la recherche par défaut de l'écran Concurrents.

## Critères d'acceptation

1. **Extension** :
   - Icônes 16, 32, 48 et 128 px déclarées dans le manifeste. Monogramme « ACM » sobre aux couleurs
     de l'app, généré par un script du dépôt ; Laurent le valide à l'écran.
   - `npm run extension:zip` produit `dist/acm-studio-extension-<version>.zip`, sans tests ni README.
   - La version passe à 1.0.0.
2. **Fiche du Store** dans `docs/extension-store.md`, prête à copier :
   - nom, description courte (132 caractères au plus) et description longue ;
   - objet unique, et justification de `tabs`, `scripting` et de chaque site autorisé ;
   - déclarations sur les données : rien de collecté ni de vendu ; la page lue part seulement vers ACM
     Studio, et seulement sur une action du conseiller.
3. **Page `/confidentialite`** publique, sans connexion (adapter `proxy.ts`). Elle dit, en clair,
   ce que lit l'extension, ce qu'ACM Studio conserve, où sont les données (Supabase, Vercel), et qui
   contacter.
   - Avant d'écrire la page, demande à Laurent le nom de la société et l'adresse de contact à faire
     figurer.
   - Lien vers cette page dans le pied de la page de connexion.
4. **Recherche** :
   - « Chercher via Stream Estate (essai) » devient « Chercher les comparables », bouton principal
     placé en premier.
   - « Ouvrir mes recherches » et « Lire mes recherches » passent en secondaire, sous un intitulé
     « Ou chercher vous-même sur les portails ».
   - Le bilan ne dit plus « (essai) ». Rien d'autre ne change dans la recherche (M71).

## Hors périmètre

Le dépôt sur le Store, qui est fait par Laurent avec son compte développeur, et toute autre
évolution de l'extension.

## Essai sur l'URL d'essai

Installer le zip en mode développeur à la place de l'ancienne extension : elle affiche 1.0.0 et son
icône. Sur un dossier, « Chercher les comparables » marche comme avant. Ouvrir `/confidentialite`
dans une fenêtre de navigation privée : la page s'affiche sans connexion. `npm run e2e` reste vert.
