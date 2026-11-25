# Jeudi 26/11 au matin — la base d'essai séparée, et la taille au-dessus

Décisions de Jean-Guy du 25/11 : une base d'essai séparée, et la base actuelle à la taille juste
au-dessus (« Small », environ 15 $ par mois), pas plus. Ses conditions : une sauvegarde vérifiée
avant ; ses gestes donnés un par un, Supabase puis Vercel, dans l'ordre ; aucune variable de
l'environnement Production ne change ; le changement de taille à un moment où personne n'est
connecté, avec la durée d'indisponibilité. D'ici là, aucune spec en journée sur la base commune.

Niveau Sensible. Compter une heure, d'une traite, le matin. Pas entre 3 h 15 et 5 h 45 : ce sont
les heures des tâches de nuit (la veille des acquéreurs, les purges) et de la sauvegarde de
Supabase.

**Un nom qui trompe.** Dans Supabase, la base de la production s'appelle **`acm-studio-staging`**
(son nom d'origine, jamais changé). C'est elle, la production. L'organisation contient cinq
projets ; les deux qui nous concernent sont `acm-studio-staging` (la production, à ne jamais
confondre) et `acm-studio-essai` (à créer jeudi).

## Ce qui change, ce qui ne change pas

- **La base actuelle reste la base de la production.** Les vrais dossiers, les comptes, les mots de
  passe et les photos ne bougent pas : rien n'est copié. Aucune variable de Production n'est
  touchée, ni dans Vercel ni ailleurs.
- **Elle grossit d'une taille** : de « Micro » (1 Go de mémoire, 60 connexions) à « Small » (2 Go,
  90 connexions). Environ 15 $ par mois au lieu de 10 ; l'offre Pro donne 10 $ de crédit, donc
  5 $ de plus.
- **Une seconde base, vide, `acm-studio-essai`** (« Micro », environ 10 $ par mois) : l'essai y
  écrit, les tests aussi. Elle reçoit la même structure et les mêmes droits que la production,
  l'agence des tests et l'agence de démonstration des tests, sous leurs identifiants d'aujourd'hui.
  Aucune donnée réelle n'y entre.
- **En tout : environ 15 $ de plus par mois** (tarifs lus dans la documentation de Supabase le
  25/11, à relire sur l'écran au moment de valider).

## Avant de commencer (Claude Code, 20 minutes, sans geste de Jean-Guy)

1. `npm run sauvegarde`, puis `npm run sauvegarde:verifier` : on ne va pas plus loin sans
   « Vérification réussie ».
2. Le comptage de référence de la production (le 25/11 à 16 h 30 : 54 dossiers, 5 agences,
   7 profils, 24 acquéreurs, 268 concurrents, 1 062 fichiers ; 53 tables, 58 politiques,
   69 fonctions, 38 déclencheurs, 171 index, 5 tâches de nuit ; et ses droits : 639 sur les tables,
   27 sur des colonnes, 115 sur les fonctions).
3. « Personne n'est connecté » : la dernière activité d'un vrai compte, lue dans les journaux de
   la base. Claude Code la donne, et Jean-Guy décide du moment.

## Geste 1 — Supabase : la taille de la base actuelle

**La base est indisponible moins de deux minutes d'après Supabase** (« usually less than 2
minutes ») ; comptez cinq minutes par prudence. Pendant ce temps, la production affiche une
erreur à qui s'en sert. Claude Code sonde la base toutes les cinq secondes et donne la durée
réelle.

1. supabase.com, l'organisation, le projet **`acm-studio-staging`** (c'est la production).
2. **Project Settings** (la roue), puis **Compute and Disk**.
3. Sous « Compute size », choisir **Small**. Ne rien changer d'autre (ni le disque, ni la région).
4. Valider : Supabase annonce le prix et un redémarrage. Confirmer.
5. Dire « taille changée ».

Claude Code vérifie alors : la base répond, elle annonce 90 connexions, le comptage de la
production n'a pas bougé, la production s'affiche.

## Geste 2 — Supabase : la base d'essai

1. **New project**, dans la même organisation.
   - Nom : **`acm-studio-essai`**, exactement (le script refuse tout autre nom).
   - Mot de passe de la base : celui que Supabase propose, rangé dans le gestionnaire de mots de
     passe. Il ne se colle nulle part ailleurs.
   - Région : la même que la production (West EU, Paris).
   - Taille : **Micro**, la plus petite.
   - Si l'écran propose une case sur l'exposition des tables (« Automatically expose new tables
     and functions », ou « Default privileges for new entities »), la laisser comme elle est : le
     script s'en occupe, voir plus bas.
2. Attendre que le projet soit prêt (deux minutes environ).
3. **Authentication**, puis **Sign In / Providers** : décocher « Allow new users to sign up »,
   comme sur la production.
4. **Authentication**, puis **Users**, « Add user », « Create new user », deux fois, avec « Auto
   Confirm User » coché :
   - le compte des tests : l'adresse et le mot de passe de `E2E_EMAIL` et `E2E_PASSWORD` ;
   - le compte de démonstration des tests : `E2E_DEMO_EMAIL` et `E2E_DEMO_PASSWORD`.
     Les quatre valeurs sont dans le fichier `.env.e2e.local` du poste.
5. Dire « base créée ».

Claude Code fait alors, sans autre geste :

- `npm run essai:preparer -- --reference` : il trouve le projet par son nom et lit sa référence
  (les vingt lettres de son adresse, ce n'est pas un secret), qu'il ajoute à `.env.e2e.local` :
  `E2E_SUPABASE_REF=…` ;
- `npm run essai:preparer -- --structure` : d'abord **les droits par défaut**, alignés sur ceux de
  la production, puis toutes les migrations du dépôt. Pourquoi les droits : la production donne
  d'office, à chaque table créée, des droits aux trois rôles de l'application, et nos migrations
  comptent dessus ; depuis le printemps, Supabase ne les donne plus d'office à un projet neuf
  (lu dans sa documentation le 25/11). Sans eux, l'essai répondrait « permission refusée »
  partout. Le script les pose sur la base encore vide, les relit, et s'arrête s'ils ne sont pas
  ceux de la production.
  Si la commande demande le mot de passe de la base, Jean-Guy la lance lui-même dans son terminal
  et le tape ;
- `npm run essai:preparer -- --agences` : l'agence des tests et l'agence de démonstration des
  tests, avec le profil de leur compte, **sous les identifiants qu'elles ont dans la production**
  (le code reconnaît l'agence des tests par son identifiant : elle reste fermée à l'API réelle
  d'Academia, décision du 19/11) ;
- `npm run essai:preparer` : la comparaison. Même nombre de tables, de politiques, de fonctions,
  de déclencheurs, d'index, de tâches de nuit et de migrations que la production ; **mêmes
  droits** (sur les tables, des colonnes, les fonctions) ; les deux comptes en place ; l'agence
  des tests fermée à Academia.

Le script ne construit que dans le projet nommé `acm-studio-essai` : il refuse la production
(`acm-studio-staging`) et tout autre projet du compte, avant d'y lancer quoi que ce soit (des tests
le prouvent, et ces refus ont été joués le 25/11).

## Geste 3 — Vercel : trois variables, pour l'essai seulement

Les trois variables de la base (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`) sont aujourd'hui trois entrées communes à « Production » et à
« Preview ». **On ne les modifie pas.** On en **ajoute** trois, réservées à la branche `essai`,
comme le sont déjà `NEXT_PUBLIC_SITE_URL` et `STREAM_ESTATE_API_KEY` : sur l'essai, l'entrée de la
branche l'emporte.

1. Dans Supabase, projet **`acm-studio-essai`** (pas `acm-studio-staging` : ses clés sont celles de
   la production) : **Project Settings**, puis **API Keys**. Garder la page ouverte.
   - L'adresse du projet : « Project URL » (dans la fenêtre « Connect », ou en haut de
     **Project Settings › Data API**).
   - Les deux clés : dans l'onglet **« Legacy anon, service_role API keys »** s'il existe, « anon »
     et « service_role » (le genre de clés que portent nos variables). S'il n'existe pas, dans
     l'onglet « Publishable and secret API keys » : « Publishable key » et « Secret key ».
     L'application accepte les deux genres.
2. Vercel, le projet `acm-studio`, **Settings**, **Environment Variables**, « Add » : trois fois.
   Pour chacune : décocher « Production » et « Development », garder « Preview », choisir la
   branche **`essai`**.

   | Nom                             | Valeur, lue dans `acm-studio-essai`                       |
   | ------------------------------- | --------------------------------------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`      | « Project URL »                                           |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | la clé « anon » (ou « Publishable key »)                  |
   | `SUPABASE_SERVICE_ROLE_KEY`     | la clé « service_role » (ou « Secret key »), « Sensitive » |

   Ces trois valeurs ne se collent que dans Vercel : ni dans la conversation, ni dans un fichier
   du dépôt.

3. Ne toucher à aucune autre ligne. Les trois entrées « Production, Preview » restent telles
   quelles.
4. Dire « variables posées ».

Claude Code redéploie l'essai (un envoi sur la branche `essai`), sans geste de Jean-Guy.

## Ensuite (Claude Code, 30 à 45 minutes)

1. **La preuve, avant tout test** : l'essai parle bien à la base d'essai.
   - Le compte de démonstration des tests se connecte sur l'essai : « Ma démo » n'a aucun dossier
     (la base d'essai est neuve ; dans la production, cette agence en a douze).
   - Cette connexion se relit dans la base d'essai (une session neuve), et rien de neuf pour ce
     compte dans celle de la production à la même minute.
   - **Si l'entrée de la branche ne l'emportait pas sur l'entrée commune**, l'essai lirait encore
     la production : Claude Code s'arrête là, aucune spec ne part, rien n'est touché à la
     production, et il le dit à Jean-Guy (son ordre du 25/11).
2. La référence de la base d'essai devient obligatoire pour les tests (`TESTS_ON_SEPARATE_BASE`) :
   sans elle, ils s'arrêtent au lieu de retomber sur la production ; et les specs ne se jouent
   plus que sur l'essai (`acm-studio-essai.vercel.app`) — ailleurs, la configuration des tests
   refuse de démarrer.
3. Les specs en attente : « Aide » et le guide, puis les dix specs de la fiche acquéreur repliée
   (Mission 10 bis), qui part ensuite en production.
4. La suite complète : la règle du 23/11 la veut la nuit. Sur la base d'essai, elle ne pèse plus
   sur la production ; à Jean-Guy de dire si elle se joue de jour ce jeudi, pour le contrôle
   d'avant la livraison.
5. Le comptage de la production, refait : il n'a pas bougé.
6. `docs/DECISIONS.md` et `docs/PASSAGE_PAYANT.md` : la base n'est plus commune à la production et
   à l'essai. `CLAUDE.md` le dit encore (« La base Supabase est partagée entre la production,
   l'essai et les prévisualisations ») : la phrase est à Jean-Guy, Claude Code la lui propose.

## Ce qui reste comme avant

- **Les prévisualisations des autres branches** (celles des missions) lisent encore la base de la
  production, par les trois entrées communes. Aucune spec ne s'y joue : une fois la séparation
  faite, la configuration des tests refuse toute autre adresse que l'essai. Une mission se teste
  donc en la fusionnant dans `essai`, une à la fois. Faire passer toutes les prévisualisations sur
  la base d'essai demande de modifier les entrées communes, donc de toucher à une entrée de
  Production : à décider par Jean-Guy, plus tard (`missions/PLUS_TARD.md`).
- La sauvegarde (`npm run sauvegarde`) et les migrations visent toujours la production, le projet
  lié au dépôt. Une migration se joue désormais d'abord sur la base d'essai.
- L'agence des tests et l'agence de démonstration des tests restent dans la production, vides et
  inutilisées : leur retrait se décide plus tard.
- **Le compte de Jean-Guy n'existe pas dans la base d'essai.** Le jour où une mission Sensible lui
  demande d'essayer lui-même sur l'essai : dans `acm-studio-essai`, « Create new user » avec son
  adresse (confirmé d'office), puis sa première connexion sur l'essai crée son agence
  (`missions/LIVRAISON.md`, « Pour ouvrir une agence »). Son adresse est déjà opérateur pour
  l'essai (`ACM_OPERATOR_EMAILS`).

## À savoir, lu en route

- **Les clés de Supabase.** Sa documentation dit que les anciennes clés (« anon »,
  « service_role ») fonctionnent jusqu'à la fin de 2026, puis laissent la place aux nouvelles
  (« Publishable », « Secret »). Si les variables de la production portent des anciennes clés (une
  valeur qui commence par « eyJ »), elles sont à remplacer avant le 31/12/2026 : deux valeurs
  dans Vercel et un redéploiement. À essayer d'abord sur l'essai, après la livraison
  (`missions/PLUS_TARD.md`).
- **Les droits par défaut.** Supabase annonce le même retrait pour les projets existants : le jour
  où il s'applique à la production, une migration qui crée une table sans lui donner ses droits,
  rôle du serveur compris, casserait. Les prochaines migrations les donneront en toutes lettres
  (`missions/PLUS_TARD.md`).

## Si quelque chose se passe mal

- **La taille** : si la base ne répond toujours pas dix minutes après la confirmation, Claude Code
  le dit ; on revient à « Micro » par le même écran. La sauvegarde du matin est là.
- **La base d'essai** : elle est vide. On la supprime et on recommence, la production n'est pas
  concernée. C'est aussi le remède si sa structure a été construite avant ses droits par défaut.
- **Vercel** : on supprime les trois entrées ajoutées, **puis Claude Code redéploie l'essai** (les
  variables publiques sont figées à la compilation) : l'essai retrouve la base commune, comme
  aujourd'hui. Il retire aussi `E2E_SUPABASE_REF` de `.env.e2e.local`, et laisse
  `TESTS_ON_SEPARATE_BASE` à faux.
