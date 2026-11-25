# MISSION 93 — Ne plus payer ni perdre, et une sauvegarde avant les vrais vendeurs

**Date** : 11/10/2026 · **Origine** : audit n°2 du 11/10/2026, décisions 3, 4 et 5, validées par
Laurent : « valider ».

## Objectif

1. Aucune recherche Stream Estate payée pour rien.
2. Aucune saisie perdue sans prévenir, et aucun dossier supprimé par erreur.
3. Une page de confidentialité exacte.
4. Une sauvegarde de la base qu'on sait restaurer, avant le premier vrai vendeur.

## Constats de l'audit (code de `main` au 11/10 au soir)

- La recherche Stream Estate part sans vérifier l'extension (`competitor-search-panel.tsx:460-512`),
  alors que seule l'extension permet d'importer (`:678`). Ses résultats ne vivent que dans l'état de
  la page (`:354, 388`) : une actualisation ou un retour arrière fait repayer.
- Une seule borne de fourchette fige la recherche sur un prix exact : la borne sert de minimum et de
  maximum (`stream-estate-tiers.ts:131-132`). La validation n'exige pas les deux bornes
  (`validate-subject-property.ts`).
- Le seul garde contre la sortie de page est dans le Live (`live-comparative-shell.tsx:525`). La
  fiche du bien sait qu'elle a des modifications en attente (`subject-property-import-form.tsx`),
  mais une actualisation ou un clic dans le menu les perd.
- « Supprimer » un dossier :
  - n'a aucune confirmation (`builder/page.tsx:182-187`) ;
  - fait une suppression définitive (`delete-project.ts:22-26`) ;
  - échoue dès qu'il existe un bien vendeur ou un concurrent, faute de suppression en cascade
    (`initial_schema.sql:51,74`).
- La page `/confidentialite` dit encore que le courrier ne reprend « ni photo du bien concurrent »
  et parle d'un « numéro à appeler pour ne plus être sollicité » (`confidentialite/page.tsx:94-95`).
- La base est partagée entre l'essai et la production, sans sauvegarde attestée (CLAUDE.md, M64).

## Critères d'acceptation

### A. Stream Estate

1. « Chercher les concurrents » vérifie d'abord l'extension ACM (le ping existe déjà).
   - Si elle manque : message d'installation, **aucun appel facturé**.
   - Si elle répond : la recherche part, comme aujourd'hui.
2. Le dernier résultat et son bilan sont gardés pour ce dossier le temps de la séance, dans le
   stockage de l'onglet. Une actualisation ou un retour arrière les réaffiche sans nouvel appel.
3. Ils sont invalidés dès que le bien vendeur ou la fourchette change. Un bouton « Relancer la
   recherche » reste disponible.
4. Sous le bouton, en petit : « Coût maximal : 0,60 € par recherche ».

### B. La fourchette

5. Sur la fiche du bien, saisir une seule borne de la fourchette affiche « Indiquez les deux
   montants » et bloque l'enregistrement de ce champ. Les autres champs s'enregistrent normalement.
6. La recherche ne reçoit plus jamais une borne seule.

### C. Ne rien perdre

7. Sur la fiche du bien, quitter la page avec des modifications non enregistrées demande
   confirmation. Cela vaut pour l'actualisation, la fermeture de l'onglet et les liens du menu.
8. Même chose sur l'éditeur du dossier de prospection.

### D. Supprimer un dossier

9. « Supprimer » demande une confirmation dans l'écran : « Supprimer le dossier [nom] ? Il
   disparaîtra de vos listes. », avec « Annuler » et « Supprimer ».
10. La suppression devient un **archivage** : statut `archived`, le dossier disparaît de
    Préparation, Live, Suivi et Prospection. Ce n'est plus une suppression définitive, conforme à la
    « suppression douce » de CLAUDE.md. Ça fonctionne aussi pour un dossier qui a un bien et des
    concurrents.
11. Le nettoyage des photos de prospection (M87) ne se déclenche pas sur un archivage.
12. `docs/PROCEDURE_EFFACEMENT.md` décrit, pas à pas, comment répondre à une demande d'effacement
    RGPD pendant la bêta :
    - pour un vendeur : son dossier, ses photos, ses réponses ;
    - pour le propriétaire d'un bien concurrent : son adresse dans tous les dossiers, ses dossiers
      de prospection, les photos copiées.

    La procédure donne les requêtes à lancer, avec comptage avant et après, et ce qu'il faut retirer
    du stockage. Elle est faite pour être exécutée par Claude Code sur demande de Laurent, jamais
    automatiquement.

### E. La page de confidentialité

13. `/confidentialite` est mise à jour selon le code actuel :
    - la photo du concurrent est possible au choix du conseiller (« Sans photo » par défaut, copie
      dans le stockage de l'agence, supprimée avec le dossier) ;
    - le courrier porte une mention légale (responsable, opposition, CNIL) ;
    - les rôles sont précisés : l'agence est responsable du traitement, Start Academy est
      sous-traitant.

    Le compte rendu liste les phrases changées, pour la relecture du juriste.

### F. Une sauvegarde avant les vrais vendeurs

14. Un script `npm run sauvegarde` fait une sauvegarde datée de la base partagée :
    - la structure, les données, les comptes et l'index du stockage ;
    - les fichiers du stockage ;
    - rangée hors du dépôt, jamais commitée.

    Il reprend la méthode du 10/10.
15. Un script `npm run sauvegarde:verifier` restaure la dernière sauvegarde sur la base locale et
    compare les nombres de lignes, table par table. Le compte rendu montre un passage réussi.
16. `docs/SAUVEGARDE.md` explique, en trois lignes pour Laurent, quand la lancer (avant chaque
    migration, et chaque semaine pendant la bêta) et où elle se trouve. Il rappelle que la vraie
    solution est l'offre Supabase payante avec sauvegardes quotidiennes, sans rien activer.

### G. Preuves

17. Tests unitaires : recherche refusée sans extension, résultat gardé puis invalidé, borne seule
    refusée, archivage au lieu de suppression.
18. Migration éventuelle soumise avant d'être appliquée. `npm run e2e` vert, tablette comprise.

## Décisions à respecter

- M74 (extension ACM), M87 (photos de prospection), M88 (droits), M90 (mention légale), M91.
- Pas de nouvelle fonctionnalité : on protège ce qui existe.

## Hors périmètre

- Base Supabase séparée (mise de côté par Laurent), plafond Stream Estate par agence, liste
  d'opposition commune : après la bêta.

## Essai sur l'URL d'essai

1. Désactiver l'extension ACM dans Chrome, puis « Chercher les concurrents » : le message
   s'affiche, et aucune recherche n'est facturée. Réactiver l'extension, lancer la recherche,
   actualiser la page : les résultats sont toujours là.
2. Fiche du bien : saisir seulement « De 300 000 » : « Indiquez les deux montants ». Modifier la
   surface sans enregistrer, cliquer sur « Suivi » dans le menu : confirmation.
3. Supprimer un dossier qui a des concurrents : la confirmation s'affiche, puis le dossier disparaît
   des listes.
4. Lire `/confidentialite` : la photo du concurrent et la mention légale y figurent.
5. Lancer `npm run sauvegarde`, puis `npm run sauvegarde:verifier` : les comptes sont identiques.
