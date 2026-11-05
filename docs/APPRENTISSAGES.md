# Apprentissages — ce que l'atelier a appris en travaillant (tenu par les agents, relu par Jean-Guy)

Une ligne datée par apprentissage. Ce fichier est lu par l'architecte, le parcoureur et le testeur avant
de commencer. Ce qui devient une règle produit va dans `docs/DECISIONS.md` ; ici, c'est la cuisine.

## L'essai

- 25/10 · L'URL d'essai est protégée par Vercel Authentication : un navigateur sans session Vercel tombe
  sur `vercel.com/login`. Pour un téléphone ou un navigateur neuf, ouvrir une fois
  `https://acm-studio-essai.vercel.app/?x-vercel-protection-bypass=<E2E_VERCEL_BYPASS>&x-vercel-set-bypass-cookie=true`
  (jeton de 32 caractères dans `.env.e2e.local`, jamais dans un message ni un commit). En production, pas
  de protection.
- 25/10 · Les adresses `acm-studio-<hash>-jean-guy-s-projects.vercel.app` sont des aperçus de branche :
  utiles pour regarder, jamais pour valider. L'essai, c'est `acm-studio-essai.vercel.app`.
- 25/10 · `/api/version` dit le commit servi ; l'essai doit contenir le dernier commit de la branche
  avant tout parcours ou essai.
- 30/10 · M120 B · Le testeur a joué des copies temporaires de la démo e2e (`zz-…-tmp.spec.ts`), puis
  les a supprimées : impossible ensuite de savoir ce qu'il y avait changé. Règle de Jean-Guy : le
  testeur ne joue que le code de la branche, jamais une copie, et rejoue seulement ce qui a échoué.
- 30/10 · M120 B · « Préparation… » d'un courrier au-delà des 20 s du test, sans erreur au journal :
  le geste aboutit après coup (l'origine est écrite en base). Les fonctions tournent en iad1, la
  base à Paris : aléa de latence, la mission 128 les met en cdg1. Le rejeu suivant est vert.
- 30/10 · M120 B · La variable de contournement de l'essai s'appelle `E2E_VERCEL_BYPASS` : une
  attente de `/api/version` avec un autre nom tourne dix minutes sur une page 401 sans le dire.
- 05/11 · M128 · Mesurer une page qui part en flux : le premier octet arrive en 20 ms quelle que soit
  la région, il ne dit rien. On compare le chargement complet (`loadEventEnd`), médiane de trois
  chargements après un premier qui chauffe la fonction, connecté au compte de démo. La première
  mesure après un déploiement est plus lente (0,8 s puis 0,4 s sur /suivi).
- 05/11 · M128 · `x-vercel-id` dit l'entrée puis la fonction : `cdg1::iad1` avant, `cdg1::cdg1`
  après `"regions": ["cdg1"]` dans `vercel.json` ; /suivi 2,9 s → 0,4 s, /acquereurs 1,7 s →
  0,3 s, /builder 0,9 s → 0,2 s. La région se lit sur l'essai dès son déploiement.
- 05/11 · M128 B · Compter les requêtes d'une page dans les journaux de Supabase (`edge_logs`, une page à la fois, 4 s de silence entre deux) : les journaux perdent parfois une ligne (un `auth/v1/user` absent), et l'essai partage la base avec d'autres sessions (des lectures `buyer_*` d'un autre onglet sont tombées dans une fenêtre) ; lire le détail avant de conclure, faire deux passes, et donner les comptes à ±1.

## La démo et les tests

- 05/11 · M129 · Une recherche des nouveaux venus par point : des rendus faits À LA MAIN sur le
  dossier de Mougins (mise à jour, recherche, retenue) font tomber l'e2e démo suivant à la l.641
  (`newcomers-proposal` introuvable), qui réutilise les dossiers existants. Les rendus se font
  APRÈS l'e2e, puis « Remettre ma démo à zéro » ; trois passages rouges d'affilée le 05/11 pour
  cette seule raison, verts après remise à zéro (démo 4,5 min).
- 05/11 · M129 · Un testeur qui rend la main avec une tâche de fond encore active continue d'agir :
  il a refait ses rendus sur la démo pendant qu'un second testeur la rejouait. Le chef attend la
  fin d'un agent avant d'en lancer un autre sur la même démo.
- 05/11 · M129 · Le faux client Supabase répond d'après la dernière table appelée : une règle à
  tester dans un `Promise.all` (le report du plus dangereux) passe dans une fonction pure.
- 25/10 · L'e2e `demo` utilise le compte `demo@start-academy.fr`, le même que Jean-Guy et les closers :
  « Remettre ma démo à zéro » en début de passage efface les dossiers, sélections et liens de ce compte.
  Ne jamais essayer à la main pendant que le testeur tourne. À séparer (compte e2e dédié, à créer).
- 26/10 · « Remettre ma démo à zéro » met 15 à 25 s avant que les acquéreurs réapparaissent : attendre,
  pas conclure à un défaut.
- 24/10 · Aléas e2e connus, verts au second passage : le bouton « 10 » du Live en tablette ; le clic
  « Préparation » de Bienvenue. Un troisième passage rouge est un défaut, pas un aléa.
- 25/10 · Budgets e2e : démo et parcours 8 min (M125) ; la démo monte de 0,2 à 0,5 min à chaque mission
  acquéreur, surveiller.
- 25/10 · Un passage e2e interrompu (réseau) laisse un dossier « TEST AUTOMATIQUE … » dans l'agence de
  démo et fait rougir la démo suivante (cartes de Prospection partagées, M98) : nettoyer avant de rejouer.
- 29/10 · La remise à zéro de la démo écrit les photos en URL absolue de l'hôte où elle est faite. Faite
  depuis l'essai (protégé), la démo montre « Photo indisponible » en production, qui partage la base.
  Toujours des chemins relatifs dans ce que la démo écrit (M120 B, R3).
- 29/10 · M127 : une démo préparée AVANT une mission ne porte pas ses nouvelles données (les
  annonces qui disparaissent, mou-09 et mou-13) ; l'e2e démo ne prépare que si les dossiers
  manquent, donc rouge au premier passage, vert après « Remettre ma démo à zéro ». Quand une
  mission change le jeu de données, remettre la démo à zéro avant la suite e2e.
- 29/10 · `npx vitest run` seul laisse quatre fichiers rouges (« Missing required environment
  variable: NEXT_PUBLIC_SUPABASE_URL ») : lancer `npm test` avec les mêmes variables factices que
  le build (`NEXT_PUBLIC_SUPABASE_URL=https://example.supabase.co NEXT_PUBLIC_SUPABASE_ANON_KEY=x`).
- 29/10 · Durées de la mission 127 (une migration, 3 parties) : architecte 6 min, designer
  maquettes 13 min, gardien-sql 9 min, barrières ~3 min, relecteur 3 à 6 min par passage (quatre
  passages), testeur 31 min rendus compris (suite e2e 12,4 min : démo 5,2 à 6,9, parcours 5,5,
  bienvenue 0,9, Live tablette 0,6), parcoureur 9 min, designer sur les rendus 6,6 min ; de
  `/mission` (17:47) à l'essai (19:00) puis au Point marché prêt sur le compte de démo (19:50).
- 30/10 · M127 B · La démo e2e est passée à 7,9 min et a débordé une fois le budget de 8 min
  (« Test timeout of 480000ms exceeded » dans « Remettre ma démo à zéro ») : budget à 10 min
  (décision de Jean-Guy, 30/10). Chaque mission acquéreur ou Point marché l'allonge de 0,3 à
  0,5 min ; un jour, la couper en deux passages.
- 30/10 · M127 B · Le client factice (`fake-supabase.ts`) répond d'après la DERNIÈRE table
  appelée : trois lectures dans un `Promise.all` reçoivent toutes la réponse de la dernière. Pour
  qu'une écriture se prouve, lire ce qui a sa propre réponse AVANT le `Promise.all` (le dernier
  point dans `write-market-update.ts`), et faire les lectures à réponses distinctes une par une.
- 30/10 · M127 B · Un texte dans un SVG se coupe en plusieurs `<text>` : l'e2e ne le cherche pas
  par son texte, il compte des éléments (`[data-line="newcomers"] [data-testid="price-lines-point"]`).
- 30/10 · M127 B · Après un correctif, l'agent déjà lancé rejoue sur la vieille version si on ne
  le lui dit pas : chaque fusion dans `essai` s'accompagne d'un message au testeur en cours
  (« quand `/api/version` répond X, rejoue sur X »), et un seul rapport est demandé.
- 30/10 · M120 B · L'e2e démo joue les Keller APRÈS « Remettre ma démo à zéro » : aucun nouveau
  venu retenu chez M. Lefebvre, donc aucune carte de Prospection à deux origines dans ce parcours.
  Une mesure qui en dépend se fait à la main, après l'e2e (Point marché, retenir mou-07 : la carte
  de C, 8 allée du Décor, fusionne et porte les deux origines).
- 30/10 · M120 B · Une carte « Remis » n'affiche plus aucun « Préparer » : pour mesurer ses actions,
  « Annuler » la ramène d'un cran, puis « Marquer remis » la remet.
- 30/10 · M120 B · Le faux client Supabase répond à toutes les lectures d'un `Promise.all` avec la
  réponse de la dernière table : une lecture testée sort du `Promise.all`, ou sa règle passe dans
  une fonction pure testée à part (`newcomerSeenDays`).
- 04/11 · Les tests de l'atelier lisaient leurs journaux d'exemple (30/10) à l'heure réelle : au-delà
  de 24 h, la mission se ferme et trois tests tombaient seuls, sur `main` aussi. Un test qui dépend
  de « maintenant » reçoit une heure fixe.
- 05/11 · M128 · Un `loading.tsx` met la page en flux : un `notFound()` ou un `redirect()` sous lui
  répond 200 au lieu de 404 ou 307 (doc de Next 16 installée, « Status Codes »). Une attente se
  pose donc sur les listes seulement : un groupe `(liste)/` garde l'adresse et laisse les fiches
  hors de l'attente. Changer un filtre (`?origine=`, `?issue=`) ne montre pas le squelette,
  vérifié sur l'essai.
- 05/11 · Correctif 128 · Les `loading.tsx` de la M128, partis sans e2e (« barrières seulement »),
  cassaient deux gestes en production : après une action serveur qui revalide, le Suivi gardait
  l'ancien écran (la relance écrite en base n'apparaissait qu'au rechargement) ; un lien vers un
  espace déjà visité ouvrait une page au `main` vide (Prospection depuis le Suivi). Ni la
  documentation de Next 16 ni les barrières ne le disaient : l'e2e du parcours sur l'essai, rouge
  avec les attentes, vert sans elles (2,9 min), l'a prouvé. Une mission qui touche le rendu ou la
  navigation de l'App Router joue l'e2e, même « sans comportement nouveau ».
- 05/11 · Correctif 128 · Les journaux d'exécution Vercel répondent 403 par le connecteur ; la
  connexion du compte de test échoue sur un `next start` local en http : un défaut de l'essai se
  prouve sur l'essai, par une branche d'expérience fusionnée dans `essai`, puis retirée.
- 05/11 · M128 · `npm run typecheck` en local lit aussi `.next/dev/types`, les types d'un serveur
  de développement lancé plus tôt : déplacer une page y laisse une erreur que la CI, partie d'un
  dépôt propre, ne voit pas. Le build régénère `.next/types`, pas `.next/dev`.

- 05/11 · Correctif 129 · Après le retrait des `loading.tsx` (M128), `npm run typecheck` local tombe sur `.next/dev/types/validator.ts`, laissé par un ancien `next dev` (« Cannot find module …/builder/page.js ») : ce n'est pas le code, la CI part d'un dépôt propre ; on le vérifie avec un tsconfig temporaire qui exclut `.next/dev` (l'effacer demande l'accord de Jean-Guy).
- 05/11 · M128 B · Le poids de zod se mesure sur `next build` : le morceau qui contient `ZodError` (≈ 390 Ko non compressés) et les `page_client-reference-manifest.js` qui le citent (13 pages avant, 4 après). Un worktree avec `node_modules` en lien symbolique ne construit pas (Turbopack refuse un lien qui sort du dossier) : on construit `main` dans le dépôt, après un commit de la branche. Un composant client qui EXÉCUTE un schéma (Localisateur, réglages de la recherche) garde zod : le sortir demande de réécrire la validation.
- 05/11 · M128 B · Sous Vitest, le `cache` de React ne mémorise rien et un crochet ne joue pas ses effets (`renderToStaticMarkup`, environnement node) : la veille coupée du Localisateur n'est prouvée que sur le texte du crochet, faute d'outil de rendu avec effets.

- 05/11 · M130 A · Le testeur a lancé l'e2e en tâche de fond et n'a jamais rendu son second rapport : le chef a joué démo et parcours lui-même. Règle de Jean-Guy depuis : e2e au premier plan, et le chef le joue après 20 minutes sans rapport (`testeur.md`, `mission.md`).
- 05/11 · M130 A · Un `<Link>` vers la même page avec d'autres paramètres (`/suivi?point=…`) ne remonte pas les composants clients : leur `useState` initial ne relit pas l'adresse. Deux défauts e2e en sont venus (« Faire le point », « Relancer » sans effet) ; le remède : un état dérivé du changement de prop pendant le rendu, et un événement pour un second clic sur le même lien.
- 05/11 · M130 A · Le parcours e2e a trouvé un texte en double que rien d'autre ne voyait (« Ce qui lui manquait pour être à 10 » dans le détail ET dans « Ce que le vendeur a dit ») : `getByText` en mode strict est un bon détecteur de doublons d'écran.
- 05/11 · M130 A · `npm test` sans les deux variables Supabase factices de la CI fait tomber six fichiers au chargement (« Missing required environment variable ») : ce n'est pas le code ; les exporter avant (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
- 05/11 · M130 A · Durées : démo 4,3 à 4,5 min, parcours 2,8 à 3,0 min ; relecteur sept passages (2 bloquants), designer et parcoureur une fois chacun, en parallèle.

- 05/11 · M130 B · Première mission en équipe allégée : une passe de relecteur (0 bloquant, 4 « à corriger »), la suite e2e jouée par le chef au premier plan, verte du premier coup (démo 4,5 min, parcours 2,8 à 3,1 min, bienvenue et Live tablette 40 s).
- 05/11 · M130 B · Le test de vocabulaire refuse « disponible » partout sur les pages acquéreur (M118), même dans « indisponible » : un message d'échec s'écrit « illisible pour l'instant ».
- 05/11 · M130 B · Une colonne posée « à la création » (`buyers.status_changed_at = now()`) n'est pas un fait : un « dernier échange » calculé dessus aurait dit « aujourd'hui » pour une fiche neuve ; lire la migration avant de dater un fait.

## La base

- 29/10 · `npx supabase db push --linked` est refusé par la garde de permissions de Claude Code (lu comme
  un déploiement). C'est Jean-Guy qui l'applique, dans un terminal, après le rapport du gardien-sql et
  l'accord donné ici.
- 01/10 · Une migration verte en local sur base vide n'est pas vérifiée : compter sur la vraie base avant,
  prédire après, et la transaction doit pouvoir annuler.
- 29/10 · Réécrire une fonction dans une migration : le gardien-sql diffe contre la version posée
  par la migration précédente (`chiffres_justes.sql` pour `conclude_meeting`) et y a trouvé un
  changement non annoncé du prédicat de statut ; le faire soi-même avant de soumettre.
- 29/10 · Pendant que Jean-Guy applique la migration, le chef continue : code, barrières, commit,
  push de la branche (la CI tourne) et trois passages du relecteur ; seule la fusion dans `essai`
  attend « appliquée ».
- 04/11 · La CLI Supabase 3.0 refuse toute requête sur la base en ligne en mode agent sans
  confirmation (« Confirmation required »). En lecture : `npx supabase db query --remote --read-only
"…"`, sans confirmation. `--linked` est déprécié au profit de `--remote`, et `migration list
--linked` échoue sur la configuration locale : lire `supabase_migrations.schema_migrations`.
- 30/10 · M120 B · Le gardien-sql a fait trois passages sur la migration (six « à corriger ») :
  une copie cible doit être une copie RETENUE de la même annonce, un bien démarché déjà présent se
  complète sans écraser, et le complément ne pose jamais un mandat à côté d'une collaboration
  obtenue (CHECK de M115). Un miroir de fonction se relit cas par cas contre l'original.
- 30/10 · M120 B · L'état d'hier en base ne se retrouve plus après une remise à zéro de la démo :
  pour vérifier un défaut constaté la veille, demander l'heure du constat et lire le journal
  d'erreurs, avant toute remise à zéro.

## Les rendus

- 05/11 · M129 · `meetingDay()` écrit la date en toutes lettres (« 9 octobre 2026 ») : coupée à cinq
  caractères pour une étiquette, elle donnait « 9 OCT » et « 30 OC ». Une étiquette courte lit une
  date `jj/mm`.
- 05/11 · M129 · `break-after: avoid` sur un titre ne tient pas dans un conteneur flex sous Chromium :
  le titre « 02 » restait seul en bas de page. Une section de fiches commence une page neuve
  (`print:break-before-page`).
- 05/11 · M129 · Le cadre du plus dangereux, en `amber-600`, avait la couleur du tiers « attention » :
  le designer l'a vu sur la planche côte à côte, aucun test. Une couleur qui porte un sens n'en sert
  qu'un. Mesurer qu'une page A4 tient (9 biens : 926 px pour 1 017) se fait sur un rendu imprimé de
  la feuille de style construite, pas à l'œil.
- 25/10 · Un test vert ne dit pas qu'un document donne envie : le testeur produit le PDF et les captures,
  le parcoureur joue le scénario, Jean-Guy et son relecteur produit regardent AVANT l'essai humain.
- 26/10 · Une réponse touchée sur un téléphone peut tomber sur une barre fixée en bas : jamais de bouton
  sous une barre fixe, et le bouton choisi devient plein, les autres en contour.
- 29/10 · Une capture pleine page cache ce qui est sous le pli : les boutons « Enregistrer » et
  « Télécharger le PDF » du courrier étaient invisibles en 1280 × 800 dans un panneau collant, et les
  18 captures étaient « sans défaut ». Le testeur vérifie désormais chaque action principale dans la
  fenêtre sans défiler, et chaque image chargée (M120 B, R1 et R3).
- 29/10 · Une règle de placement qui compare des prix ne garantit rien sur des étiquettes : après
  un correctif « un côté chacun » Jean-Guy a encore vu deux étiquettes chevauchées sur l'essai. La
  règle qui tient compare des largeurs estimées (6,5 px par caractère, ligne de 700 px) sur trois
  niveaux de chaque côté, dans un service pur testé sur le cas exact de l'essai.
- 29/10 · Deux bloquants que la suite verte n'a pas vus, trouvés par le designer sur les rendus et
  par le relecteur : sur téléphone les repères colorés avaient quitté la ligne (`hidden sm:flex`
  emportait le trait avec le texte) ; une annonce disparue sans durée connue se lisait « toujours
  en vente ». Un rendu lu et une relecture à regard neuf restent indispensables.
- 30/10 · M127 B · La figure des trois lignes s'est validée sur une maquette SVG du designer
  (générateur `node`, règle de placement incluse) AVANT le code, puis sur un rendu Chromium de la
  figure réelle (un test écrit le HTML, Playwright le capture, Read le lit) : trois défauts vus
  avant l'essai (étiquettes hors page, flèche partant du trait de la médiane, légende sans la
  flèche). Un rendu lu vaut dix descriptions.
- 30/10 · M127 B · « Ça gêne » du parcoureur sur un détail de données de démo (photos mélangées,
  prix de vente estimé juste avant le prix du vendeur) : à noter, pas à corriger ; la règle de
  l'agence et l'ordre des phrases sont des décisions, pas des défauts.

## L'atelier et les hooks

- 29/10 · Les hooks de `.claude/settings.json` et les fiches de `.claude/agents/` ne prennent effet
  qu'au démarrage d'une session Claude Code : après la mission 126 (ou un nouvel agent), relancer
  la session, sinon l'atelier reste muet et « Agent type 'architecte' not found ».
- 29/10 · Contrat documenté des hooks (code.claude.com/docs/en/hooks, lu le 29/10, à confirmer sur
  une vraie session) : stdin JSON avec `session_id`, `cwd`, `hook_event_name` ; `UserPromptSubmit`
  reçoit `prompt` tel que tapé (`/mission 120`) ; `SubagentStart`/`SubagentStop` reçoivent
  `agent_type` (le `name` de la fiche) et `agent_id`, le Stop aussi `last_assistant_message` ;
  `PostToolUse` reçoit `tool_name`, `tool_input`, `tool_response` ; le filtre `if` d'un hook
  (`Bash(git push *)`) est « au mieux », jamais une garde ; `$CLAUDE_PROJECT_DIR` est fourni. Un hook
  de journal sort toujours en 0 : un code 2 bloque.
- 29/10 · La mission n'est pas dans les hooks : elle se lit dans la branche (`mission-NN-…`), et
  pour un `/mission NN` tapé depuis `main`, dans le prompt, retenu par session. Le chef crée donc la
  branche AVANT de lancer un agent.
- 29/10 · Playwright vide `test-results/` à chaque passage : les rendus vont hors du dépôt,
  `~/acm-studio-rendus/<mission>/`, et le journal de l'atelier hors du dépôt,
  `~/acm-studio-atelier/journal.jsonl`.
- 29/10 · `git pull` sur `essai` depuis une chaîne de commandes échoue sur un auto-stash
  (« fatal: stash failed ») : `git fetch` puis `git merge --ff-only origin/essai`.
- 29/10 · Premier `/mission` avec les hooks actifs (M126) : `PostToolUse` porte bien `agent_type`
  pour un sous-agent (les lignes du relecteur et du testeur sont à leur nom) ; le filtre `if` d'un
  hook n'est PAS honoré — trois handlers `PostToolUse` sur Bash écrivaient trois lignes par
  commande — : un seul handler, le script filtre ; `last_assistant_message` d'un `SubagentStop`
  est souvent vide quand l'agent répond par `SubagentHandback` (« Terminé »).
- 29/10 · Le serveur de l'atelier de Jean-Guy est mort à 15:48 : le parcoureur, à qui le chef avait
  donné le port 4871, a fait `pkill -f "atelier/serveur.mjs"` puis occupé le port avec ses exemples.
  Règle (testeur.md, parcoureur.md, mission.md) : un agent ne tue jamais un processus qu'il n'a pas
  lancé, un serveur d'essai prend `--port 0` ; l'atelier tient désormais `serveur.log`, refuse
  proprement un port pris, et chaque lecture de carte a son délai (entrée fermée, groupe tué).
- 29/10 · Barrières toujours ; la suite e2e complète seulement si `src/`, `extension/` ou `supabase/`
  changent (décision de Jean-Guy) : la 126, pure outillage, n'avait pas à la jouer.
- 29/10 · Conséquences acceptées de la règle du chef (bleu « attend ses agents » dès qu'un agent
  tourne, orange seulement sans agent et avec une question posée) et de la fermeture à 24 h : une
  permission demandée PENDANT qu'un agent tourne s'écrit « attend Jean-Guy » mais s'affiche en bleu
  jusqu'à la fin de l'agent, et une permission accordée dans la boîte de Claude Code ne laisse
  aucune ligne — l'orange reste jusqu'au prochain prompt ou à une note du chef ; après 24 h sans
  ligne, une migration encore en attente dans un worktree quitte la page avec sa mission ; un agent
  dont le `SubagentStop` n'arrive jamais laisse le chef « attend ses agents » jusqu'à la fermeture.
- 29/10 · Soir du 29/10 : ghcr.io a jeté « toomanyrequests » sur toutes les courses de la CI
  (tâche `sql`), identifiées ou non, trois relances comprises ; `checks` verte à chaque fois. Décision
  de Jean-Guy : une CI rouge pour une cause extérieure (registre, réseau) ne bloque pas une mission
  sans migration (`valide.md`). `supabase db start` tire QUATRE images (postgres, gotrue, realtime,
  storage-api), pas une : la branche `ci-image-postgres` les garde dans le cache des Actions.
- 29/10 · Durées de la mission 126 (outillage) : barrières ~3 min, suite e2e 12,8 min (jouée une
  fois, avant la règle « e2e seulement si src/, extension/ ou supabase/ changent »), relecteur 4 à
  6 min par passage (six passages), designer sur les rendus 2 min, parcoureur 6,5 min.
- 29/10 · Première mission en « mode autonome » (M127) : les neuf questions de l'architecte et les
  six du designer tranchées par le chef, un seul arrêt (la migration), tous les « à corriger »
  appliqués sans demander ; les deux remontées produit (concurrents hors Live, 3 photos par fiche)
  tranchées dans la ligne de DECISIONS et dites au rapport. Jean-Guy a ensuite demandé deux
  corrections à vue sur l'essai (étiquettes, couverture), barrières seules, 10 min chacune.
- 30/10 · M127 B · Une relecture par delta après chaque correction (sept passages, 4 bloquants
  trouvés dont deux sur des régressions de corrections précédentes : un panneau démonté par le
  refresh, un e2e qui cherchait un texte changé). Le relecteur sur le delta coûte 3 à 6 min et a
  rattrapé ce que les barrières ne voient pas. Durées : architecte 4 min, designer 7 + 12 min,
  testeur 20 à 30 min par passage (quatre), parcoureur 9 min, designer sur les rendus 7 min.
