# MISSION 105 — Les finitions

**Date** : 14/10/2026 · **Origine** : mission « Finitions », seconde moitié. Ce sont les P1 des audits
n°3 et n°4 du 12/10 hors Live, plus deux points relevés depuis : le cas « extension sans accès aux
sites » et l'attente de 4 secondes du correctif de détection.

La mission se lance seule, depuis `main` à jour, **après le `/valide 104`**, dans une seule
conversation.
- Pas de push forcé.
- `npm run sauvegarde` avant chaque migration. Les migrations sont datées après la dernière de `main`.

## Objectif

Le conseiller ne paie jamais deux fois sans le vouloir. Il comprend chaque message. Le Suivi lui dit
quand relancer et ce qui a bougé. Un membre retiré n'a plus accès à rien. Le budget ne se dépasse
jamais.

## Commencer par vérifier, sans rien coder

Relire chaque constat dans le code de `main` et dire en une ligne s'il est toujours présent (numéros
de ligne du 12/10). Pour le critère 12, dire aussi ce que la recherche Stream Estate déjà payée
fournit sur l'évolution des prix, sans appel payant. Attendre l'accord de Laurent si l'inventaire
contredit cette mission.

## Critères d'acceptation

### A. Recherche : ne jamais payer deux fois sans le savoir

**Constats** : « Relancer la recherche » repaie sans confirmation, et le résultat payé n'est gardé
que dans l'onglet (`competitor-search-panel.tsx:620, 1002`).

1. « Relancer la recherche » demande une confirmation : « Nouvelle recherche payante : jusqu'à
   0,60 €. Le résultat actuel sera remplacé. ». Le montant suit les réglages (M99).
2. Le dernier résultat payé est enregistré sur le dossier, côté serveur. Il se rouvre sur un autre
   appareil ou le lendemain sans nouvel appel. Les réglages (M99) l'annulent toujours.

### B. Import : un bien, une fiche, la vraie cause

**Constats** : un doublon est possible si le serveur répond après le délai, parce que rien n'empêche
deux fiches pour la même annonce dans un dossier. Une extension absente est comptée et affichée comme
« le site refuse la lecture ».

3. Une même annonce ne peut exister qu'une fois par dossier, garanti en base. Un import répété
   renvoie la fiche existante sans erreur.
   - Avant la contrainte, compter les doublons existants. Proposer à Laurent la fusion (on garde la
     fiche la plus complète) et attendre son accord.
4. « Extension absente ou désactivée » est une cause à part, dans les messages et dans « Échecs de
   lecture par portail ». Message : « Installez ou activez l'extension ACM, puis réessayez ».

### C. Des mots qu'un junior comprend

**Constats** :
- « Décision de prix », dans la liste des dossiers, affiche la fourchette calculée par l'outil et non
  celle du conseiller (`builder/page.tsx:137`) ;
- « Fourchette » a encore trois sens ;
- les messages parlent de « code INSEE », de « console Stream Estate » ou d'« URL invalide »
  (`search-stream-estate.ts:170, 310`).

5. « Décision de prix » affiche la fourchette du conseiller, ou « À décider » s'il n'en a pas.
6. « Fourchette » désigne seulement celle du conseiller (M97). Proposition :
   - la valeur calculée par l'outil devient « Estimation de l'outil » ;
   - les bornes envoyées à la recherche deviennent « Prix recherchés ».

   Le compte rendu donne le tableau « ancien mot → nouveau mot → écrans ». Le test de vocabulaire
   l'applique.
7. Aucun message à l'écran ne contient de terme technique. Chaque message dit quoi faire, par exemple
   « Commune introuvable : vérifiez le code postal du bien ». Le détail technique part dans le journal
   des erreurs (M100).

### D. Un Suivi qui dit quand relancer et ce qui a bougé

**Constats** :
- « Ont baissé depuis le rendez-vous » ne bouge que si le conseiller modifie la fiche d'un concurrent
  à la main (`get-seller-insights.ts:103`) ;
- il n'y a pas de date de prochaine relance : un « projet pas encore daté » revient dans la pastille
  tous les 7 jours.

8. Chaque relance enregistrée (M96) propose une date de prochaine relance, modifiable :
   - par défaut 7 jours ;
   - 1 mois si le vendeur réfléchit ;
   - la date du projet si le vendeur en a donné une.
9. Le dossier ne revient dans la pastille et dans « À relancer » qu'à cette date. Les dossiers
   existants gardent la règle actuelle tant qu'aucune date n'est posée.
10. Sur le Suivi d'un dossier, un bouton « Mettre à jour les prix des concurrents » relit, par
    l'extension, les annonces des concurrents retenus. Il ne fait aucun appel payant.
    - Chaque changement de prix est enregistré avec sa date.
    - Une annonce disparue est marquée « Retirée depuis le rendez-vous », sur preuve (M103).
11. « Ont baissé depuis le rendez-vous » se calcule à partir de ces relectures. Le message de relance
    (M96) peut les citer, sans jamais donner l'adresse d'un concurrent.
12. Si la recherche déjà payée fournit l'évolution des prix sans nouvel appel, s'en servir en plus.
    Sinon, le dire au compte rendu.

### E. Un membre retiré n'a plus accès à rien

**Constat** : un membre retiré garde l'accès aux photos de l'agence et aux fonctions de déplacement.
La fonction du stockage ne regarde pas `removed_at` (`project_photos_storage.sql:23`).

13. Toute vérification d'appartenance à une agence exclut les membres retirés : règles des tables,
    stockage, fonctions SQL. Le compte rendu liste celles qui ont été corrigées.
14. Le test SQL de cloisonnement (M100) vérifie aussi qu'un membre retiré ne lit ni n'écrit rien : ni
    table, ni photo, ni fonction.

### F. Le budget ne se dépasse jamais

**Constat** : des recherches simultanées peuvent dépasser le plafond Stream Estate de l'agence.

15. Le coût maximal d'une recherche est réservé avant l'appel, en une seule opération en base qui
    verrouille le compteur de l'agence. La part non utilisée est rendue après l'appel. Deux recherches
    simultanées ne peuvent pas franchir le plafond. Un test le prouve.

### G. Prospection : courriers en lot et photos

16. Dans les courriers en lot (M98, M102), chaque adresse exclue est listée en tête avec sa raison :
    « Ne plus solliciter », « adresse à confirmer », « carte professionnelle manquante », etc. Si
    c'est déjà le cas, le dire.
17. Photos des concurrents dans le courrier. La photo d'une annonce appartient à son auteur. Pendant
    la bêta, l'option est retirée de l'éditeur de courrier. Les courriers déjà préparés avec une photo
    sont comptés au compte rendu.
17 bis. Les oppositions « commune non vérifiée » (M104) sont revérifiées chaque nuit, avec la purge
    de la M100, dès que le service des communes répond.
    - Commune reconnue : le repère est retiré, et la clé ne change pas.
    - Commune inconnue : le manager voit « Opposition à vérifier : commune inconnue ».
    - Une opposition n'est jamais retirée ni affaiblie par cette vérification.

### H. L'extension : détection plus claire

18. Une fois l'extension détectée, l'application s'en souvient pour l'onglet. Les clics suivants
    n'attendent plus les 4 secondes du correctif de détection.
19. Cas « extension installée sans accès aux sites ». Le service worker répond déjà à
    `onMessageExternal` (`extension/background.js:495`), et l'identifiant du Store est fixe
    (`podbdogdackjabnpnngndpkdnhfakfgb`, dans une variable d'environnement). Si le relais de la page
    ne répond pas, l'application tente cet appel direct :
    - il répond : Bienvenue et la recherche affichent « Extension installée, mais sans accès à ACM
      Studio : Chrome → Extensions → ACM Studio → Détails → Accès aux sites → Sur tous les sites » ;
    - il ne répond pas : « Installer l'extension », comme aujourd'hui, avec en dessous « Déjà
      installée ? Vérifiez l'accès aux sites ».

    On ne modifie pas l'extension.

### I. Preuves

20. Migrations soumises avant d'être appliquées, avec comptages avant et après. Elles couvrent le
    résultat payé, l'unicité des annonces, la date de prochaine relance, l'historique des prix, la
    réservation du budget et les règles d'appartenance.
21. Tests de chaque critère, dont :
    - la confirmation avant de payer ;
    - l'import répété sans doublon ;
    - le membre retiré refusé partout ;
    - les deux recherches simultanées au plafond ;
    - la pastille qui attend la date de relance ;
    - les deux cas de détection de l'extension.
22. Aucun appel Stream Estate payant dans les tests ni dans l'e2e. `npm run e2e` vert, tablette
    comprise.

## Décisions à respecter

- M93 (extension vérifiée avant l'appel), M96 (relance, message sans pression), M97 (lexique,
  « À vérifier »), M98 et M102 (cartes, courriers en lot, blocages), M99 (réglages), M100 (journal,
  plafond, cloisonnement testé), M101 et M103 (import, « Annonce retirée » sur preuve).
- On ne modifie pas l'extension.
- Les adresses des concurrents n'apparaissent jamais côté vendeur.

## Hors périmètre

- Mémoriser les réglages de recherche d'un dossier à l'autre, et de nouveaux critères (DPE, étage,
  extérieur). On verra avec les conseillers experts.
- Une mise à jour automatique des prix la nuit : sans extension, le serveur ne lit pas les portails.

## Essai sur l'URL d'essai

1. Sur un dossier déjà cherché, « Relancer la recherche » demande une confirmation. Ouvrir le même
   dossier sur la tablette : le résultat est là, sans nouvel appel.
2. Importer deux fois la même annonce : une seule fiche.
3. La liste des dossiers affiche ta fourchette, ou « À décider ».
4. Enregistrer une relance dans 1 mois : le dossier sort de la pastille. « Mettre à jour les prix des
   concurrents » relit les annonces et affiche les baisses.
5. Couper l'accès aux sites de l'extension dans Chrome, puis ouvrir Bienvenue : le message « sans
   accès » s'affiche. Rétablir l'accès : la coche passe au vert, et les clics suivants sont
   immédiats.
6. Dans l'éditeur de courrier, l'option photo n'apparaît plus.
