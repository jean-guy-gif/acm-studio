# MISSION 90 — Une conclusion qui mesure, et des courriers sûrs

**Date** : 11/10/2026 · **Origine** : audit stratégique du 11/10/2026, décisions 4 et 5, validées
par Laurent. Pour les courriers, deux règles restent telles quelles, sur décision de Laurent :
- les chiffres « 5 visites, 10 visites », issus de ses 15 ans d'expérience ;
- la règle « agence sans mention d'exclusivité = mandat simple ».

Ajout : la police Inter est embarquée dans l'application, parce que son téléchargement fait échouer
presque chaque déploiement Vercel.

## Objectif

1. La bêta doit pouvoir mesurer la promesse du produit : combien de rendez-vous finissent en mandat,
   dont combien en exclusif, et à quel prix.
2. Aucun courrier de prospection ne part avec une adresse fausse impossible à corriger, ni sans les
   mentions légales de l'agence.
3. Les déploiements ne tombent plus en panne à cause d'une police.

## Constats de l'audit (code de `main` au 10/10)

- Rien ne collecte « exclusif » ou « simple » pour le mandat du vendeur. Aucune colonne dans
  `project_meeting_conclusions`, rien dans `meeting-conclusion` ni dans `live-seller`.
- L'écran de conclusion n'a pas de champ prix. Si le vendeur n'a pas donné de prix pendant le Live,
  ou s'il signe après une relance, le prix de commercialisation reste vide. Les écarts du Suivi sont
  alors faux, et le dossier de prospection affiche « Même gamme de prix » faute de prix.
- `conclude_meeting` réécrit `concluded_at = now()` à chaque nouvelle conclusion
  (`20261010100000_launch_readiness.sql:117`). Corriger une issue falsifie la date du rendez-vous.
  Aucune date de signature n'est stockée.
- « Changer l'issue » dans le Suivi ne permet ni de saisir un prix ni de dire exclusif ou simple.
- Une adresse confirmée par le Localisateur ne peut plus être corrigée : le serveur refuse
  (`advisor-address.ts:72-73`) et l'écran masque les boutons (`confirm-address-actions.tsx:42-44`).
- L'adresse postale de l'agence est facultative et disparaît du courrier si elle est vide
  (`build-prospecting-file.ts:221`). La mention « Pour ne plus être sollicité » ne donne ni le
  responsable du traitement, ni le droit d'opposition, ni la possibilité de saisir la CNIL.
- Mission 87 : la photo du concurrent est proposée par défaut (`their-photo.ts:69`). Il faut
  « Sans photo » par défaut, pour la question des droits.

## Critères d'acceptation

### A. La conclusion

1. Quand l'issue est « Mandat signé », un choix obligatoire s'affiche : **Exclusif** ou
   **Simple**. On ne peut pas conclure sans ce choix.
2. Toujours pour « Mandat signé » : si aucun prix de commercialisation n'est enregistré, un champ
   « Prix de commercialisation » obligatoire apparaît. S'il en existe un, il s'affiche et reste
   modifiable.
3. Pour « À relancer », le prix reste facultatif. Pour « Vendu ailleurs » et « Retiré », un motif
   facultatif (texte libre) est accepté, comme pour « À relancer ».
4. Le Suivi propose la même chose dans « Changer l'issue » : passer de « À relancer » à « Mandat
   signé » demande exclusif ou simple, et le prix s'il manque. « Changer l'issue » est visible sur
   la ligne, sans ouvrir le détail des prix.
5. Le message d'erreur de `conclude-meeting.ts:40` cite les quatre issues.

### B. Les dates et les données

6. Migration, soumise avant d'être appliquée :
   - `mandate_type` (exclusif ou simple), vide pour les dossiers déjà conclus ;
   - `signed_at`, écrit une seule fois, au premier passage en « Mandat signé » ;
   - `concluded_at` n'est plus réécrit après la première conclusion ;
   - motif autorisé pour toutes les issues.

   Les comptages avant et après sont dans le compte rendu.
7. Les dossiers signés avant cette mission affichent « Type de mandat non renseigné » avec un
   bouton pour le compléter. Aucun type n'est inventé.

### C. Le Suivi

8. Sur une ligne « Mandat signé », un badge « Exclusif » ou « Simple ».
9. Le compteur « Mandats signés » affiche « dont N exclusifs ».
10. Les vendeurs « À relancer » sont triés du plus ancien au plus récent, avec « conclu il y a
    N jours ».

### D. Les courriers de prospection

11. « Corriger l'adresse » est toujours disponible sur une carte, même quand l'adresse vient du
    Localisateur. La correction devient une adresse « saisie par vous » et remplace la précédente
    dans le dossier et la tournée.
12. Version propriétaire, deux conditions avant de générer le PDF :
    - l'adresse postale de l'agence doit être renseignée. Sinon : « Ajoutez l'adresse de l'agence
      dans Administration → Identité pour préparer ce courrier. »
    - le pied de page porte une mention courte, en deux lignes au plus : responsable (nom et
      adresse de l'agence), droit de s'opposer à tout nouveau contact (téléphone ou e-mail du
      conseiller), droit de saisir la CNIL.

    Le texte proposé figure dans le compte rendu : il sera relu par un juriste avant toute vente.
13. Photo du concurrent : « Sans photo » par défaut, sur les deux versions. Les photos de l'annonce
    et « Ma photo » restent au choix du conseiller.
14. Les règles maintenues ne changent pas : les chiffres « 5 visites, 10 visites » et « agence sans
    mention = mandat simple ».

### E. Le déploiement

15. La police Inter est embarquée dans le dépôt (fichiers de police locaux, sous licence libre) au
    lieu d'être téléchargée chez Google à chaque déploiement. Le rendu à l'écran et en PDF reste
    identique : comparer une capture avant et après.

### F. Tests

16. Tests unitaires :
    - conclusion « Mandat signé » refusée sans exclusif ou simple ;
    - conclusion refusée sans prix quand il manque ;
    - `signed_at` écrit une seule fois ;
    - `concluded_at` inchangé après une correction d'issue ;
    - correction d'une adresse venue du Localisateur ;
    - PDF propriétaire refusé sans adresse d'agence.
17. Le parcours e2e « Mandat signé » choisit « Exclusif ». `npm run e2e` vert, tablette comprise.

## Décisions à respecter

- M53 (conclusion), M81 (« Terminer » enregistre le prix), M83 (exclusivité des concurrents, à ne
  pas confondre avec le type de **notre** mandat), M84 (dossier de prospection), M86 (Prospection et
  Suivi), M87 (nom sur les documents et photo du concurrent).
- Pas d'outil de suivi de type CRM : ni rappels, ni historique de contacts.

## Hors périmètre

- Liste « ne plus solliciter » commune à tous les dossiers, plafond Stream Estate par agence : après
  la bêta.
- Mission de simplification (complément replié, « Avant le rendez-vous », etc.) : mission suivante.

## Essai sur l'URL d'essai

1. Live jusqu'au bout, sans saisir de prix, puis conclure « Mandat signé ». Exclusif ou simple est
   exigé, le prix est exigé. Choisir « Exclusif » et saisir 315 000 €.
2. Dans le Suivi, la ligne affiche le badge « Exclusif » et le chemin vers 315 000 €. Le compteur
   indique « dont 1 exclusif ».
3. Un dossier « À relancer » passé en « Mandat signé » dans le Suivi : mêmes questions. La date
   « conclu le » ne change pas.
4. Dans Prospection, sur une adresse venue du Localisateur, « Corriger l'adresse » fonctionne.
5. Vider l'adresse de l'agence de test, puis préparer un dossier propriétaire : le message bloque.
   Remettre l'adresse : le PDF montre la mention en pied de page, et la photo du concurrent est sur
   « Sans photo ».
6. Le déploiement Vercel passe du premier coup.
