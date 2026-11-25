# Livraison — jeudi 26 novembre 2026

La liste du lancement (`missions/LANCEMENT.md`) est faite : ses douze premières missions sont en
production. Cette feuille dit ce qui part, où en est la production, ce qui reste éteint exprès, et
ce que Jean-Guy a à faire lui-même.

## Ce qui part

- **Le produit**, en production : acm-studio-henna.vercel.app.
- **Le guide de prise en main**, pour les conseillers : `public/guide/guide-de-prise-en-main.pdf`,
  deux pages A4, à imprimer ou à envoyer ; chaque conseiller l'ouvre aussi depuis « Aide », par le
  lien « Guide de prise en main ». Sa source est `docs/guide/guide-de-prise-en-main.html` ; après
  une correction, `npm run guide:pdf` refait le PDF et refuse de l'écrire si un texte dépasse de sa
  page. Sa ligne des portails dit que Belles Demeures et Leboncoin se saisissent à la main ; un
  test la compare au code.
- **Les douze missions**, une ligne chacune dans `missions/LANCEMENT.md`.

## Les contrôles

Faits le mercredi 25/11 ; ceux marqués ↻ se refont le jeudi 26/11 au soir, avant de dire « livré ».

| Contrôle                                              | Résultat le 25/11                                                                                                                                         |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| ↻ La production sert le dernier code                  | Oui (`npm run verifier:production`)                                                                                                                       |
| ↻ Les tests automatiques de chaque envoi (CI)         | Verts                                                                                                                                                     |
| ↻ Le produit rejoué de bout en bout (suite e2e)       | 37 sur 37 : 33 au premier passage, 4 rejouées (la connexion du test tombée pendant que la base était figée, voir plus bas)                               |
| ↻ Le journal d'erreurs de la production (`/erreurs`)  | Aucun défaut depuis le 24/11 à midi (le règlement du coût de l'IA, corrigé le jour même)                                                                  |
| Les erreurs relevées par l'hébergeur, sur sept jours  | Toutes expliquées : la coupure du 23/11 (quota de Supabase, réglé par l'offre Pro), des sessions expirées, un délai dépassé du service des communes       |
| Les tâches de nuit                                    | Les cinq purges de la base : dix passages réussis sur dix en 36 heures, aucun échec en sept jours ; la veille des acquéreurs a tourné les 19 et 21/11     |
| Les sauvegardes                                       | Supabase sauvegarde la base chaque nuit ; la nôtre, qui prend aussi les photos et les signatures, est faite et vérifiée par restauration le 25/11         |
| Le compte de Jean-Guy                                 | Parcours complet joué le 25/11, les deux recherches du forfait jouées ; les dossiers et l'acquéreur de test sont archivés, la visite de test est annulée |

## Ce qui reste éteint, exprès

| Quoi                                                         | Pourquoi                                                 | Qui l'allume                                                               |
| ------------------------------------------------------------ | -------------------------------------------------------- | -------------------------------------------------------------------------- |
| La lecture des notes par l'IA, agence par agence             | C'est un coût                                            | Jean-Guy : en bas de `/erreurs`, un plafond « IA » au-dessus de 0 €        |
| La lecture des photos des annonces par l'IA                  | La page de confidentialité ne parle que des textes       | Jean-Guy : sa décision et la phrase de la page (`missions/L9-mesure.md`)   |
| L'offre d'achat avec prêt (seule l'offre au comptant se signe) | La clause attend la juriste                              | Jean-Guy, après son accord                                                 |
| La traduction jointe du bon de visite et de l'offre          | Elle attend la juriste                                   | Jean-Guy, après son accord                                                 |
| Le bon de visite d'une tournée à plusieurs titres            | Éteint en production sur l'ordre de Jean-Guy, le 12/11   | Jean-Guy                                                                   |
| L'italien, l'allemand, le russe                              | Chaque langue attend son relecteur natif                 | Jean-Guy, langue par langue                                                |

## Pour ouvrir une agence

1. Créer le compte du manager dans la console Supabase (Authentication, « Create new user »,
   confirmé d'office). À sa première connexion, il crée son agence.
2. En bas de `/erreurs`, sur la ligne de l'agence : ses plafonds. La recherche (30 € par mois par
   défaut), la veille (10 €), l'IA (fermée tant qu'aucun plafond n'est posé).
3. Lui envoyer le guide. Il remplit Administration › Identité de l'agence, puis invite ses
   conseillers dans Administration › L'équipe.
4. Chaque conseiller installe l'extension ACM Studio (le lien est sur « Aide ») et remplit « Mon
   profil ».

## Ce qui attend Jean-Guy

Rien de tout cela ne retient la livraison ; le point sur la base se décide avant d'ouvrir d'autres
agences.

- **Le guide** : validé par Jean-Guy le 25/11, avec l'adresse de l'outil et le contact qui y sont
  écrits (acm-studio-henna.vercel.app, formation@start-academy.fr).
- **Les points à trancher**, notés en route (`docs/DECISIONS.md`, `missions/PLUS_TARD.md`) :
  - la phrase de la page de confidentialité pour les photos lues par l'IA (Lancement 9) ;
  - une veille reprise par un manager retrouve son plafond par défaut, même si l'opérateur l'avait
    baissé (Lancement 5) ;
  - le texte de la veille sur `/confidentialite` dit « un budget mensuel réglé par l'agence » : à
    signaler ou non à la juriste (Lancement 5) ;
  - deux classements par l'IA comptés au pire en novembre, 1,29 € en tout (correctif du 24/11) ;
  - un dossier conclu ne se supprime pas depuis l'écran, et une visite faite d'un acquéreur archivé
    reste comptée dans le Suivi (Lancement 11).
- **Avant d'ouvrir d'autres agences : la base. Fait le 25/11 au soir.** Décidé par Jean-Guy le
  25/11 et fait le soir même, sur ses gestes (`missions/BASE_JEUDI_MATIN.md`) : la base de la
  production est en « Small » (2 Go, 90 connexions ; un peu moins de deux minutes d'arrêt,
  mesurées), et la base d'essai est séparée : les tests et leur démo n'écrivent plus dans la base
  de la production. Ce qui suit dit pourquoi. Avant, la production, l'essai, les tests et la démo
  écrivaient dans la même base, la plus petite de l'offre Pro (1 Go de mémoire, 60 connexions). Lu dans ses journaux le
  25/11 : pendant les suites de tests, elle s'est figée plusieurs fois, dix à vingt secondes à
  14 h 10, 14 h 13 et 14 h 51, et une minute et demie à 11 h (« plus de connexion libre », des
  réponses en erreur). Chaque fois juste après une remise à zéro de la démo par les tests, qui
  écrit environ 450 lignes et 60 photos en 30 secondes. Pendant ces moments, un vrai conseiller
  aurait attendu lui aussi. Rien de tel la nuit ni en usage normal d'un seul compte ; mais les
  pages lourdes lisent beaucoup (plusieurs centaines de lectures pour un affichage sur le compte
  de Jean-Guy), et plusieurs conseillers au même moment pèseront comme les tests.
  - Tout de suite, sans décision : la suite complète ne tourne que la nuit (règle du 23/11 ; le
    25/11 elle a tourné à 14 h, à tort), et en journée les seules specs concernées.
  - Décidé par Jean-Guy le 25/11, ce sont des coûts (tarifs lus dans la documentation de
    Supabase le 25/11) : la base passe à la taille juste au-dessus, « Small » (2 Go et
    90 connexions, environ 15 $ par mois au lieu de 10), un réglage chez Supabase avec moins de
    deux minutes d'arrêt, et pas plus (« Medium », 4 Go et 120 connexions, environ 60 $, n'est
    pas retenue) ; et une base d'essai séparée, environ 10 $ par mois, pour que les tests et
    leur démo ne pèsent plus sur les vraies agences. La démo des closers reste dans la
    production.
  - Plus tard : faire lire moins à « Aujourd'hui » et à la liste des dossiers
    (`missions/PLUS_TARD.md`).
- **Après la livraison, pas avant (Jean-Guy, 25/11 au soir), et avant le 31/12/2026 : les clés de Supabase.** Sa documentation annonce la fin des anciennes
  clés (« anon », « service_role ») pour la fin de 2026. Si les variables de la production en
  portent (une valeur qui commence par « eyJ »), elles sont à remplacer par les nouvelles : deux
  valeurs dans Vercel, un redéploiement. La base d'essai, créée le 26/11, prend les nouvelles :
  c'est la répétition (`missions/PLUS_TARD.md`).
- **La démo en production** : Jean-Guy la remet à zéro lui-même, de préférence hors des heures
  de rendez-vous tant que la base est commune.
- **Chaque semaine** : `npm run sauvegarde`, puis `npm run sauvegarde:verifier` (la sauvegarde de
  Supabase ne prend pas les fichiers du stockage).

## Si quelque chose casse

1. Le chef revient tout de suite à la version précédente sur Vercel, puis prévient Jean-Guy (règle
   du 23/11).
2. Le journal d'erreurs : `/erreurs`, pour les opérateurs seuls.
3. Les sauvegardes : `docs/SAUVEGARDE.md`.

## Après la livraison

`missions/PLUS_TARD.md` garde tout ce qui a été vu en route et n'était pas sur la liste.
`docs/ETAT_DU_PRODUIT.md` date du 6 octobre : il est à refaire.
