# Jeudi 26/11 au matin — la base d'essai séparée, et la taille au-dessus

Décisions de Jean-Guy du 25/11 : une base d'essai séparée, et la base actuelle à la taille juste
au-dessus (« Small », environ 15 $ par mois), pas plus. Ses conditions : une sauvegarde vérifiée
avant ; ses gestes donnés un par un, Supabase puis Vercel, dans l'ordre ; aucune variable de
l'environnement Production ne change ; le changement de taille à un moment où personne n'est
connecté, avec la durée d'indisponibilité. D'ici là, aucune spec en journée sur la base commune.

Niveau Sensible. Compter une heure, d'une traite, tôt le matin.

## Ce qui change, ce qui ne change pas

- **La base actuelle reste la base de la production.** Les vrais dossiers, les comptes, les mots de
  passe et les photos ne bougent pas : rien n'est copié. Aucune variable de Production n'est
  touchée, ni dans Vercel ni ailleurs.
- **Elle grossit d'une taille** : de « Micro » (1 Go de mémoire, 60 connexions) à « Small » (2 Go,
  90 connexions). Environ 15 $ par mois au lieu de 10 ; l'offre Pro donne 10 $ de crédit, donc
  5 $ de plus.
- **Une seconde base, vide, `acm-studio-essai`** (« Micro », environ 10 $ par mois) : l'essai y
  écrit, les tests aussi. Elle reçoit la même structure que la production, l'agence des tests et
  l'agence de démonstration des tests. Aucune donnée réelle n'y entre.
- **En tout : environ 15 $ de plus par mois** (tarifs lus dans la documentation de Supabase le
  25/11, à relire sur l'écran au moment de valider).

## Avant de commencer (Claude Code, 20 minutes, sans geste de Jean-Guy)

1. `npm run sauvegarde`, puis `npm run sauvegarde:verifier` : on ne va pas plus loin sans
   « Vérification réussie ».
2. Le comptage de référence de la production (le 25/11 à 16 h 30 : 54 dossiers, 5 agences,
   7 profils, 24 acquéreurs, 268 concurrents, 1 062 fichiers ; 53 tables, 58 politiques,
   69 fonctions, 38 déclencheurs, 171 index, 5 tâches de nuit).
3. « Personne n'est connecté » : la dernière activité d'un vrai compte, lue dans les journaux de
   la base. Claude Code la donne, et Jean-Guy décide du moment.

## Geste 1 — Supabase : la taille de la base actuelle

**La base est indisponible moins de deux minutes d'après Supabase** (« usually less than 2
minutes ») ; comptez cinq minutes par prudence. Pendant ce temps, la production affiche une
erreur à qui s'en sert. Claude Code sonde la base toutes les cinq secondes et donne la durée
réelle.

1. supabase.com, l'organisation, le projet actuel (celui de la production).
2. **Project Settings** (la roue), puis **Compute and Disk**.
3. Sous « Compute size », choisir **Small**. Ne rien changer d'autre (ni le disque, ni la région).
4. Valider : Supabase annonce le prix et un redémarrage. Confirmer.
5. Dire « taille changée ».

Claude Code vérifie alors : la base répond, elle annonce 90 connexions, le comptage de la
production n'a pas bougé, la production s'affiche.

## Geste 2 — Supabase : la base d'essai

1. **New project**, dans la même organisation.
   - Nom : `acm-studio-essai`.
   - Mot de passe de la base : celui que Supabase propose, rangé dans le gestionnaire de mots de
     passe. Il ne se colle nulle part ailleurs.
   - Région : la même que le projet actuel (West EU, Paris).
   - Taille : **Micro**, la plus petite.
2. Attendre que le projet soit prêt (deux minutes environ).
3. **Authentication**, puis **Sign In / Providers** : décocher « Allow new users to sign up »,
   comme sur le projet actuel.
4. **Authentication**, puis **Users**, « Add user », « Create new user », deux fois, avec « Auto
   Confirm User » coché :
   - le compte des tests : l'adresse et le mot de passe de `E2E_EMAIL` et `E2E_PASSWORD` ;
   - le compte de démonstration des tests : `E2E_DEMO_EMAIL` et `E2E_DEMO_PASSWORD`.
     Les quatre valeurs sont dans le fichier `.env.e2e.local` du poste.
5. Dire « base créée ».

Claude Code fait alors, sans autre geste :

- il lit la référence du nouveau projet (les vingt lettres de son adresse, ce n'est pas un secret)
  et l'ajoute à `.env.e2e.local` : `E2E_SUPABASE_REF=…` ;
- `npm run essai:preparer -- --structure` : toutes les migrations du dépôt, dans la base d'essai.
  Si la commande demande le mot de passe de la base, Jean-Guy la lance lui-même dans son terminal
  et le tape ;
- `npm run essai:preparer -- --agences` : l'agence des tests et l'agence de démonstration des
  tests, avec le profil de leur compte ;
- `npm run essai:preparer` : la comparaison. Même nombre de tables, de politiques, de fonctions,
  de déclencheurs, d'index, de tâches de nuit et de migrations que la production ; les deux
  comptes en place.

Le script refuse de tourner sur la base de la production (un test le prouve).

## Geste 3 — Vercel : trois variables, pour l'essai seulement

Les trois variables de la base (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`) sont aujourd'hui trois entrées communes à « Production » et à
« Preview ». **On ne les modifie pas.** On en **ajoute** trois, réservées à la branche `essai`,
comme le sont déjà `NEXT_PUBLIC_SITE_URL` et `STREAM_ESTATE_API_KEY` : sur l'essai, l'entrée de la
branche l'emporte.

1. Dans Supabase, projet `acm-studio-essai` : **Project Settings**, puis **API** (ou « API
   Keys »). Garder la page ouverte : l'adresse du projet (« Project URL »), la clé publique
   (« anon »), la clé secrète (« service_role »).
2. Vercel, le projet `acm-studio`, **Settings**, **Environment Variables**, « Add » : trois fois.
   Pour chacune : décocher « Production » et « Development », garder « Preview », choisir la
   branche **`essai`**.

   | Nom                             | Valeur, lue dans la base d'essai      |
   | ------------------------------- | ------------------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`      | « Project URL »                       |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la clé « anon »                       |
   | `SUPABASE_SERVICE_ROLE_KEY`     | la clé « service_role » (« Sensitive ») |

   Ces trois valeurs ne se collent que dans Vercel : ni dans la conversation, ni dans un fichier
   du dépôt.

3. Ne toucher à aucune autre ligne. Les trois entrées « Production, Preview » restent telles
   quelles.
4. Dire « variables posées ».

Claude Code redéploie l'essai (un envoi sur la branche `essai`), sans geste de Jean-Guy.

## Ensuite (Claude Code, 30 à 45 minutes)

1. **La preuve, avant tout test** : l'essai parle bien à la base d'essai. Une connexion du compte
   des tests, relue dans le journal de la base d'essai, et rien de neuf dans celui de la
   production. Si l'entrée de la branche ne l'emportait pas sur l'entrée commune, l'essai lirait
   encore la production : on s'arrête là, aucune spec ne part, et Claude Code le dit.
2. La référence de la base d'essai devient obligatoire pour les tests (`TESTS_ON_SEPARATE_BASE`) :
   sans elle, ils s'arrêtent au lieu de retomber sur la production.
3. Les specs en attente (« Aide » et le guide, la fiche acquéreur repliée), puis la suite
   complète : de jour, puisque ce n'est plus la base de la production.
4. Le comptage de la production, refait : il n'a pas bougé.
5. `CLAUDE.md`, `docs/DECISIONS.md` et `docs/PASSAGE_PAYANT.md` : la base n'est plus commune à la
   production et à l'essai.

## Ce qui reste comme avant

- Les prévisualisations des autres branches (celles des missions) lisent encore la base de la
  production, par les trois entrées communes : aucune spec ne s'y joue, les specs ne tournent que
  sur l'essai. Les faire passer sur la base d'essai demande de modifier les entrées communes : à
  faire plus tard, à tête reposée (`missions/PLUS_TARD.md`).
- La sauvegarde (`npm run sauvegarde`) et les migrations visent toujours la production, le projet
  lié au dépôt. Une migration se joue désormais d'abord sur la base d'essai.
- L'agence des tests et l'agence de démonstration des tests restent dans la production, vides et
  inutilisées : leur retrait se décide plus tard.

## Si quelque chose se passe mal

- **La taille** : si la base ne répond toujours pas dix minutes après la confirmation, Claude Code
  le dit ; on revient à « Micro » par le même écran. La sauvegarde du matin est là.
- **La base d'essai** : elle est vide. On la supprime et on recommence, la production n'est pas
  concernée.
- **Vercel** : on supprime les trois entrées ajoutées ; l'essai retrouve la base commune, comme
  aujourd'hui.
