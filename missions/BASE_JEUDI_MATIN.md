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
3. « Personne n'est connecté » : `npm run base:qui`, en lecture seule — par agence, la dernière
   activité de session des vrais comptes (les comptes de test écartés ; ni nom ni adresse e-mail).
   Une activité de moins d'une heure veut dire « peut-être connecté », un onglet resté ouvert
   compte aussi. Claude Code la donne, et Jean-Guy décide du moment. Le 25/11 à 18 h 20 : aucune
   session active depuis une heure.
4. La liste des variables de Vercel, relue avant tout geste — leurs noms, leurs cibles, leur
   branche et leurs dates, jamais leurs valeurs : le 25/11, 23 entrées ; les trois de la base sont
   communes à « Production » et « Preview », modifiées pour la dernière fois le 15/09/2026 (les
   deux premières) et le 06/10/2026 (la clé du serveur). C'est le relevé de référence du geste 3.

## Geste 1 — Supabase : la taille de la base actuelle

**La base est indisponible moins de deux minutes d'après Supabase** (« usually less than 2
minutes ») ; comptez cinq minutes par prudence. Pendant ce temps, la production affiche une
erreur à qui s'en sert. Claude Code sonde la base toutes les cinq secondes (`npm run base:sonde`,
en lecture seule) et donne la durée réelle.

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
   - Si l'écran propose une version de Postgres : **17**, celle de la production.
   - L'écran peut porter des cases à cocher sur l'accès aux données : « Enable Data API »,
     « Automatically expose new tables and functions », et peut-être une case sur la RLS
     automatique. **Ne changez aucune de ces cases** : laissez-les comme Supabase les propose.
     Une seule vérification : « Enable Data API » est cochée (l'application passe par elle). Pour
     les deux autres, le script s'adapte, voir plus bas.
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
  comptent dessus ; depuis le 30/05/2026, Supabase ne les donne plus d'office à un projet neuf
  (lu dans sa documentation le 25/11). Sans eux, l'essai répondrait « permission refusée »
  partout. Le script les pose sur la base encore vide, les relit, et s'arrête s'ils ne sont pas
  ceux de la production. De même pour les fonctions : si le projet neuf ne donne plus d'office à
  tous le droit de les exécuter (le réglage d'origine de Postgres, celui de la production), le
  script le rend avant la première migration. Chaque ordre s'affiche avant de partir.
  Si la commande demande le mot de passe de la base, Jean-Guy la lance lui-même dans son terminal
  et le tape. Le script vérifie aussi que le projet lié au dépôt reste la production : la
  sauvegarde et les migrations ne changent pas de cible ;
- `npm run essai:preparer -- --agences` : l'agence des tests et l'agence de démonstration des
  tests, avec le profil de leur compte, **sous les identifiants qu'elles ont dans la production**
  (le code reconnaît l'agence des tests par son identifiant : elle reste fermée à l'API réelle
  d'Academia, décision du 19/11) ;
- `npm run essai:preparer` : la comparaison. Même nombre de tables — toutes avec leur
  cloisonnement (la RLS) —, de politiques, de fonctions, de déclencheurs, d'index, de tâches de
  nuit et de migrations que la production, la même version de Postgres ; **mêmes droits** (sur
  les tables, des colonnes, les fonctions, et ceux donnés d'office) ; les deux comptes en place ;
  l'agence des tests fermée à Academia. Si Supabase a allumé sa « RLS automatique » sur le projet
  neuf, le script le dit sans s'y arrêter : sa fonction n'est pas du dépôt, et toutes nos tables
  ont déjà leur cloisonnement.

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
   - L'adresse du projet : Claude Code vous la donne (`https://<référence>.supabase.co`, la
     référence lue plus haut ; ce n'est pas un secret).
   - Les deux clés : dans l'onglet **« Publishable and secret API keys »**, « Publishable key » et
     « Secret key » (un bouton « Create new API keys » les crée s'il n'y en a pas). Un projet neuf
     n'a sans doute plus les anciennes clés (« anon », « service_role ») ; s'il les propose encore
     dans un onglet « Legacy », ne les prenez pas. L'application passe les clés telles quelles
     à Supabase, qui accepte les deux genres : ce sera notre premier déploiement sur les
     nouvelles, et la répétition du changement de clés de la production (voir « À savoir »).
2. Vercel, le projet `acm-studio`, **Settings**, **Environment Variables**, « Add » : trois fois.
   Pour chacune : décocher « Production » et « Development », garder « Preview », choisir la
   branche **`essai`**.

   | Nom                             | Valeur, lue dans `acm-studio-essai`                       |
   | ------------------------------- | --------------------------------------------------------- |
   | `NEXT_PUBLIC_SUPABASE_URL`      | l'adresse donnée par Claude Code                          |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | « Publishable key »                                       |
   | `SUPABASE_SERVICE_ROLE_KEY`     | « Secret key », à marquer « Sensitive »                   |

   Ces trois valeurs ne se collent que dans Vercel : ni dans la conversation, ni dans un fichier
   du dépôt.

3. Ne toucher à aucune autre ligne. Les trois entrées « Production, Preview » restent telles
   quelles.
4. Dire « variables posées ».

Claude Code relit alors la liste des variables dans Vercel — leurs noms, leurs cibles, leur
branche et leurs dates, **jamais leurs valeurs** — et la compare au relevé du 25/11 :

- les trois entrées communes n'ont pas bougé : mêmes identifiants, mêmes dates de dernière
  modification (`NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` : le 15/09/2026 ;
  `SUPABASE_SERVICE_ROLE_KEY` : le 06/10/2026), toujours « Production, Preview » ;
- trois entrées neuves existent, « Preview », branche `essai` ; la liste passe de 23 à 26 entrées.

C'est la preuve de la condition « aucune variable de Production ne change ». Si une entrée
commune a été modifiée au lieu d'une entrée ajoutée, la production tourne encore (Vercel
n'applique un changement qu'aux déploiements suivants) mais son prochain déploiement lirait la
base d'essai : **Claude Code s'arrête, ne déploie rien en production** (la Mission 10 bis attend)
et le dit à Jean-Guy, qui remet la valeur d'origine depuis son gestionnaire de mots de passe.

Puis Claude Code redéploie l'essai (un envoi sur la branche `essai`), sans geste de Jean-Guy.

## Ensuite (Claude Code, 30 à 45 minutes)

1. **La preuve, avant tout test** (`npm run essai:preuve`) : l'essai parle bien à la base
   d'essai. Le 25/11, la même commande disait, comme attendu : « l'essai lit encore la base de la
   production ».
   - Le compte de démonstration des tests se connecte sur l'essai : « Ma démo » n'a aucun dossier
     (la base d'essai est neuve ; dans la production, cette agence en a douze).
   - Cette connexion se relit dans la base d'essai (une session neuve), et rien de neuf pour ce
     compte dans celle de la production à la même minute.
   - **Si l'entrée de la branche ne l'emportait pas sur l'entrée commune**, l'essai lirait encore
     la production : Claude Code s'arrête là, aucune spec ne part, rien n'est touché à la
     production, et il le dit à Jean-Guy (son ordre du 25/11).
2. La bascule (`TESTS_ON_SEPARATE_BASE`) : la référence de la base d'essai devient obligatoire
   pour les tests — sans elle, ils s'arrêtent au lieu de retomber sur la production — et les specs
   ne se jouent plus que sur l'essai (`acm-studio-essai.vercel.app`) : ailleurs, la configuration
   des tests refuse de démarrer (« À trancher », question 1).
3. Les specs en attente : « Aide » et le guide, puis les dix specs de la fiche acquéreur repliée
   (Mission 10 bis), qui part ensuite en production — après une seconde relecture de la liste des
   variables de Vercel, juste avant ce déploiement.
4. La suite complète, selon la réponse de Jean-Guy (« À trancher », question 3).
5. Le comptage de la production, refait : il n'a pas bougé.
6. `docs/DECISIONS.md` et `docs/PASSAGE_PAYANT.md` : la base n'est plus commune à la production et
   à l'essai. `CLAUDE.md` le dit encore (« La base Supabase est partagée entre la production,
   l'essai et les prévisualisations ») : la phrase est à Jean-Guy, Claude Code la lui propose.

## À trancher par Jean-Guy, avant la bascule

Chaque question a sa réponse par défaut ; sans autre mot de Jean-Guy, Claude Code avance avec elle.

1. **Où se jouent les specs d'une mission.** Les prévisualisations des autres branches (celles des
   missions) liront encore la base de la production, par les trois entrées communes. Sa règle du
   23/11 dit : « le chef teste sur sa branche, en local ou sur la prévisualisation Vercel de la
   branche ». Par défaut : les specs ne se jouent plus que sur l'essai (la configuration des tests
   refuse toute autre adresse), une mission s'y teste en la fusionnant dans `essai`, une à la
   fois ; regarder une prévisualisation dans un navigateur reste permis. L'autre voie : passer
   toutes les prévisualisations sur la base d'essai, ce qui demande de modifier les trois entrées
   communes, donc de toucher à une entrée de Production.
2. **Où se joue une migration.** Par défaut : le chef la joue d'abord sur la base d'essai (le
   gardien-sql la relit avant, comme aujourd'hui), puis Jean-Guy l'applique lui-même à la
   production, après sauvegarde et comptage, comme aujourd'hui.
3. **La suite complète de ce jeudi.** La règle du 23/11 la veut la nuit. Par défaut : une fois, de
   jour, sur la base d'essai, pour le contrôle d'avant la livraison ; ensuite, la nuit comme avant.

## Ce qui reste comme avant

- La sauvegarde (`npm run sauvegarde`) et les migrations de la production visent toujours le
  projet lié au dépôt, `acm-studio-staging`.
- Dans la production restent, telles qu'elles sont, l'agence des tests (vide) et l'agence de
  démonstration **du compte de test** (ses douze dossiers) : plus aucune spec n'y écrit ; les
  retirer est une suppression de données, sur décision de Jean-Guy, par la procédure
  d'effacement. À ne pas confondre avec l'autre agence de démonstration, celle des closers, qui
  porte le même nom : c'est la démo du produit, elle ne change pas, et Jean-Guy la remet à zéro
  lui-même.
- Une prévisualisation ouverte avec un compte de test écrit encore dans ces deux agences de la
  production, que `npm run nettoyer:test` ne nettoie plus (il vise la base d'essai).
- **Le compte de Jean-Guy n'existe pas dans la base d'essai.** Le jour où une mission Sensible lui
  demande d'essayer lui-même sur l'essai : dans `acm-studio-essai`, « Create new user » avec son
  adresse (confirmé d'office), puis sa première connexion sur l'essai crée son agence
  (`missions/LIVRAISON.md`, « Pour ouvrir une agence »). Son adresse est déjà opérateur pour
  l'essai (`ACM_OPERATOR_EMAILS`).

## À savoir, lu en route

- **Les clés de Supabase.** Supabase remplace ses anciennes clés (« anon », « service_role ») par
  de nouvelles (« Publishable », « Secret »). Sa documentation dit que les anciennes fonctionnent
  « jusqu'à la fin de 2026 » ; son annonce dit « fin 2026, à confirmer ». Tout indique que la
  production porte les anciennes (ses variables datent de septembre et d'octobre, et la clé
  publique a la longueur d'une ancienne clé) : par prudence, elles sont à remplacer avant le
  31/12/2026 — deux valeurs dans Vercel et un redéploiement, par Jean-Guy. La base d'essai, sur
  les nouvelles dès jeudi, en est la répétition (`missions/PLUS_TARD.md`).
- **Les droits par défaut.** Supabase a annoncé pour le 30/10/2026 le même retrait sur les projets
  existants ; le 25/11, il n'était pas encore appliqué à la production : c'est donc d'un jour à
  l'autre. Les tables d'aujourd'hui gardent leurs droits. Mais ce jour-là, une migration qui
  crée une table sans lui donner ses droits en toutes lettres, rôle du serveur compris, la
  laisserait hors d'atteinte de l'application (« permission denied »). Aucune migration n'est
  prévue avant la livraison ; la prochaine devra les donner (`missions/PLUS_TARD.md`).
- **Ce que la commande écrit.** La CLI de Supabase écrit « · production » après le nom de tout
  projet : c'est sa branche principale, pas notre production. Seul le nom compte :
  `acm-studio-essai` pour l'essai, `acm-studio-staging` pour la production.

## Si quelque chose se passe mal

- **La taille** : si la base ne répond toujours pas dix minutes après la confirmation, Claude Code
  le dit. Revenir à « Micro » redémarrerait encore la base : ce n'est pas un remède. On ouvre une
  demande au support de Supabase (dans son tableau de bord, « Support », projet
  `acm-studio-staging`, urgence la plus haute), et la sauvegarde vérifiée du matin est là
  (`docs/SAUVEGARDE.md`).
- **Les droits par défaut refusés** : si le script ne peut pas les poser, il s'arrête avant de
  construire et il a affiché ses ordres. Jean-Guy les colle dans l'éditeur SQL du projet
  **`acm-studio-essai`** (« SQL Editor », « Run »), puis Claude Code relance `-- --structure`, qui
  les relit avant de construire.
- **Les nouvelles clés** : si l'essai ne se connecte pas avec elles, Claude Code s'arrête et le
  dit ; on regarde ensemble l'onglet des anciennes clés du projet d'essai. Rien de cela ne touche
  la production.
- **La base d'essai** : elle est vide. S'il faut recommencer, on supprime le projet
  **`acm-studio-essai`** — jamais `acm-studio-staging`, qui est la production malgré son nom ; c'est
  le seul geste de la matinée qui pourrait la détruire, Supabase demande de retaper le nom du
  projet avant de supprimer : on le relit deux fois. Un projet recréé a une autre référence :
  Claude Code refait `-- --reference`, et les trois valeurs de Vercel sont à reposer. C'est aussi
  le remède si la structure a été construite avant ses droits par défaut.
- **Vercel** : on supprime les trois entrées ajoutées (celles de la branche `essai`, et elles
  seules), **puis Claude Code redéploie l'essai** (les variables publiques sont figées à la
  compilation) : l'essai retrouve la base commune, comme aujourd'hui. Il retire aussi
  `E2E_SUPABASE_REF` de `.env.e2e.local`, et laisse `TESTS_ON_SEPARATE_BASE` à faux.
