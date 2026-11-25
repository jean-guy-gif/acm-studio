# MISSION 99 — L'expert

**Date** : 12/10/2026 · **Origine** : feuille de route « 8 sur 10 » (projet ACM), ordre 6, décidée
par Laurent. Piste de l'audit n°2 : experts 5 → 8.

La mission se lance seule, depuis `main` à jour, après le `/valide 97`, dans une seule conversation.
- Sa migration éventuelle est datée après la dernière migration de `main`.
- Pas de push forcé.
- Faire `npm run sauvegarde` avant toute migration.

## Objectif

Un conseiller expérimenté règle lui-même sa recherche de concurrents, comme il le ferait sur un
portail, sans perdre la recherche automatique pour les autres. Et l'outil fonctionne dans les trois
villes à arrondissements.

## Commencer par un inventaire, sans rien coder

Rendre d'abord, en 15 lignes au plus :
1. Les critères qu'envoie aujourd'hui la recherche Stream Estate : rayon ou communes, prix, surface,
   pièces, type. Préciser ce qui vient de la fiche du bien, ce qui vient de la fourchette, et ce que
   les élargissements changent (M71, M78, M97).
2. Comment une adresse est rattachée à une commune et à un code INSEE, de l'import à la recherche,
   pour la Prospection et pour le rapprochement acquéreur (alias de la M86).
3. Ce qui casse aujourd'hui pour un bien à Paris 15e, Lyon 3e ou Marseille 8e. Un essai **sans
   appel payant** : en local, sur les fonctions de rattachement et de construction de la requête.

Puis attendre l'accord de Laurent si l'inventaire contredit cette mission.

## Critères d'acceptation

### A. Des critères réglables

1. Sur l'écran de recherche, au-dessus de « Chercher les concurrents », un bloc « Réglages de la
   recherche ». Il est replié par défaut et affiche les valeurs que l'outil utiliserait seul. On
   peut régler :
   - **Secteur** : la commune du bien, ou un rayon de 1, 2, 5 ou 10 km autour du bien ;
   - **Prix** : la fourchette du conseiller, modifiable ici sans changer celle de la fiche ;
   - **Pièces** : de… à… ;
   - **Surface** : de… à… m² ;
   - **Élargir automatiquement si moins de N concurrents** : oui (par défaut) ou non.
2. Sans réglage, la recherche reste exactement celle d'aujourd'hui. Un test le prouve.
3. Un réglage modifié porte la mention « réglé par vous » et peut être remis par défaut.
   - Les réglages sont enregistrés sur le dossier.
   - Ils annulent le résultat gardé de la M93, pour qu'on ne relise pas un ancien résultat.
4. Le rappel du coût (« Coût maximal : 0,60 € par recherche », M93) reste affiché. Si le nombre
   d'appels possibles change à cause des réglages, la mention le dit.
5. Le bilan de la recherche dit quels critères ont servi : « Rayon 2 km · 300 000 – 380 000 € · 3 à
   4 pièces · 60 à 80 m² · élargie 1 fois ».

### B. Paris, Lyon, Marseille

6. Un bien situé dans un arrondissement est rattaché à son arrondissement :
   - Paris : 75101 à 75120 ;
   - Lyon : 69381 à 69389 ;
   - Marseille : 13201 à 13216.

   L'adresse peut venir d'un import, d'une saisie ou d'un code postal (75015, 69003, 13008…).
7. La recherche porte par défaut sur l'arrondissement du bien. Le premier élargissement ajoute les
   arrondissements voisins, jamais toute la ville d'un coup.
   - La liste des voisins est écrite dans le code, avec sa source.
   - Le rayon (A.1) reste possible.
8. Partout où une commune s'affiche, l'arrondissement s'écrit « Paris 15e », « Lyon 3e »,
   « Marseille 8e ». Cela vaut pour la fiche, les cartes de concurrents, la Prospection, la tournée
   et le Suivi.
9. La tournée (M98) trie par arrondissement, puis par rue, puis par numéro.
10. Rapprochement acquéreur (M86) : « Paris » chez l'acquéreur couvre tous les arrondissements, et
    « Paris 15e » ne couvre que le 15e. Même chose pour Lyon et Marseille.

### C. Preuves

11. Tests :
    - sans réglage, la requête est identique à celle d'aujourd'hui ;
    - chaque réglage modifie la requête comme prévu ;
    - un réglage annule le résultat gardé ;
    - rattachement des codes postaux et des adresses des trois villes ;
    - voisins pour au moins 3 arrondissements par ville ;
    - affichage « Paris 15e » ;
    - tri de la tournée ;
    - rapprochement « Paris » face à « Paris 15e ».
12. Aucun appel Stream Estate payant dans les tests ni dans l'e2e.
13. `npm run e2e` vert, tablette comprise.
14. Le compte rendu donne :
    - pour Laurent, un essai réel à faire sur un bien à Paris (une seule recherche payante) ;
    - un exemple de requête construite pour chaque ville.

## Décisions à respecter

- M71, M78 (recherche par élargissements), M93 (extension vérifiée avant l'appel, résultat gardé,
  deux bornes de fourchette), M97 (« élargissement », pourcentage expliqué).
- M86 et M98 (alias de communes, tournée).
- On ne modifie pas l'extension.

## Hors périmètre

- D'autres sources que Stream Estate.
- Un plafond de dépense par agence (avec la M100).

## Essai sur l'URL d'essai

1. Sur un dossier niçois, ouvrir « Réglages de la recherche » : les valeurs par défaut sont
   affichées, et rien n'est changé.
2. Régler un rayon de 2 km et 3 à 4 pièces, puis chercher : le bilan dit les critères utilisés.
3. Remettre par défaut : la mention « réglé par vous » disparaît.
4. Créer un bien au 15e arrondissement de Paris (code postal 75015) : la fiche affiche
   « Paris 15e ». Une recherche reste dans le 15e, puis s'élargit aux arrondissements voisins.
5. Un acquéreur « Paris » voit ce bien en rapprochement ; un acquéreur « Paris 16e » ne le voit pas.
