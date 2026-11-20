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

- 09/11 · M147 A · `.env.e2e.local` a des lignes indentées : une lecture par `grep '^E2E_…='`
  ne trouve rien, et l'attente de `/api/version` a tourné dix minutes sur la page de protection de
  Vercel. Lire les clés en retirant les espaces de tête (`sed -nE 's/^[[:space:]]*CLE=//p'`).
- 09/11 · M147 A · Le parcours a échoué quatre fois de suite, à quatre endroits différents, tous
  réseau (`ERR_NETWORK_IO_SUSPENDED`, une connexion à 20 s, deux pages Concurrents dont l'événement
  `load` n'arrivait pas en 45 s) ; puis 60 requêtes sans lenteur, les pages mesurées entre 0,9 et
  1,7 s, et le parcours vert en 2,9 min. Avant de nommer un aléa après plusieurs échecs, mesurer
  le réseau du poste et la page en cause.
- 10/11 · M147 B · Le Mac s'est mis en veille en plein e2e (`pmset -g log` : réveil à 11:55) :
  six tests de `presentation-directe` rouges d'un coup (`ERR_NETWORK_IO_SUSPENDED`, connexion du
  compte en `chrome-error://`, la remise à zéro de la démo « connexion perdue »). Lancer un long
  passage sous `caffeinate -dimsu`, et lire `pmset -g log` avant de chercher un défaut.
- 10/11 · M147 B · Un passage e2e lancé par la Bash tool au-delà de 10 minutes part en tâche de
  fond sans le dire tout de suite : lancer chaque lot (moins de 10 minutes) avec la sortie dans un
  fichier, puis lire ce fichier à la notification.
- 14/11 · Correctif · Le parcours e2e rouge deux fois sur des coupures entre le poste et l'essai (`ERR_TIMED_OUT` sur `/synthese/…`, puis « L'inscription n'a pas été confirmée ») à des étapes que le correctif ne touchait pas, journal d'erreurs vide ; vert au troisième passage (3,3 min). Lire `app_errors` (colonnes `source`, `page`, pas `origin` ni `path`) avant de conclure à un défaut.

- 17/11 · M157 · La suite e2e jouée depuis une copie figée du dépôt (`git worktree`, pour pouvoir
  coder pendant qu'elle tourne) a besoin de `supabase/.temp` copié à côté de `.env.e2e.local` : sans
  lui, `supabase db query --remote` échoue et les specs qui lisent la base (`demo`,
  `depuis-mes-notes`) tombent, sans défaut du code. Une suite complète dure 36 à 38 min (28 specs).
- 17/11 · M157 · Le Mac a perdu Internet pendant une suite : 26 specs sur 28 rouges, toutes sur
  `ERR_INTERNET_DISCONNECTED` dès la page de connexion, et le nettoyage de l'agence de test laissé
  à moitié (8 lignes, vidées par `npm run nettoyer:test -- --supprimer`). Compter
  `ERR_INTERNET_DISCONNECTED` dans le journal avant de chercher un défaut.
- 17/11 · M157 · Après un `git switch essai` dans une chaîne de commandes, vérifier la branche
  courante avant le commit suivant : un commit est parti sur `essai` sans passer par la branche
  (repris par un `cherry-pick`, trouvé parce que le nombre de tests avait baissé de trois).
- 17/11 · M157 · Aléas du jour, verts au rejeu : `live-d-un-coup-d-oeil` (un enregistrement de fond
  coupé par le réseau, la bannière « Réponse non enregistrée » masque « Réglages ») et le parcours
  à la Prospection (geo.api.gouv.fr au-delà de son délai, deux fois au journal).

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
- 05/11 · M131 · Un fork en parallèle (l'Étude de marché, ses fichiers à lui seul, sans commit ni e2e) pendant que le chef codait le Live : 9 min, rien à reprendre ; la frontière de fichiers écrite dans la consigne a suffi.
- 05/11 · M131 · Le compilateur React (`preserve-manual-memoization`) refuse une fonction qui lit une valeur mémorisée déclarée PLUS BAS (`pages` lu par la sortie de l'écran du prix) : déplacer la fonction après la valeur, pas la sortir du composant.
- 05/11 · M131 · Le test « rien en dehors de guardedSave » refuse tout `await` d'une fonction maison dans la scène du Live, même si elle passe elle-même par `guardedSave` : l'appeler avec `void`.
- 05/11 · M131 · E2E d'un réglage enregistré « dès qu'il change » (transition) : attendre que les choix se réactivent avant de recharger, sinon le rechargement coupe l'action et l'ancien choix revient ; `innerText` rend les libellés en capitales (CSS) : comparer sans la casse.
- 05/11 · M131 · `comparables.price` est NOT NULL : un cas de test « concurrent sans prix » ne s'insère pas ; le gardien proposait une défense pour ce cas, gardée, mais son test retiré.
- 06/11 · M132 · Deux `parisDay` existent : celui de `point-day.ts` rend « jj/mm/aaaa » (affichage), celui de `follow-up-contacts` « aaaa-mm-jj » (calcul) ; compter des jours avec le premier donnait des écarts faux. Pour un calcul, `parisDay` de `follow-up-contacts` et `daysBetween`.
- 06/11 · M132 · Une regex de clés d'environnement `^[A-Z_]+=` ne lit pas `E2E_EMAIL` (le chiffre) ; et `npm test` hors CI exige `NEXT_PUBLIC_SUPABASE_URL` et `…_ANON_KEY` (six fichiers tombent sans elles, sur `main` aussi) : les poser comme la CI, valeurs factices.
- 06/11 · M132 · Le serveur local (`next dev`) parle à la base Supabase LOCALE (127.0.0.1:54321) : sans `supabase start`, la connexion répond « indisponible ». Une mise en page se mesure plus vite sur l'essai (déploiement ≈ 3 min, script Playwright avec l'en-tête de contournement Vercel) ; e2e parcours 2,7 à 2,8 min, la saisie rapide 1,8 s (Playwright tape d'un coup : les 30 s se vérifient au pouce).
- 06/11 · M133 · Insertion groupée PostgREST : une colonne présente sur certaines lignes et absente des autres vaut NULL sur celles-ci, pas sa valeur par défaut — les dates de création données aux seuls acquéreurs de Vence faisaient échouer « Préparer ma démo » (`created_at` NOT NULL) ; l'e2e l'a vu (« Aucun acquéreur ne correspond »), pas les tests unitaires : chaque ligne porte toutes ses colonnes, et un test le vérifie.
- 06/11 · M133 · Un fichier `'use server'` n'exporte que des fonctions asynchrones : une constante exportée (un message) casse le build seul, pas le typecheck ni les tests ; les messages vont dans un service.
- 06/11 · M133 · Un élément `fixed` placé dans une barre qui a `backdrop-blur` se positionne par rapport à la barre (le filtre crée un bloc conteneur) : la pastille va dans la barre, l'écran plein reste au niveau de la scène.
- 06/11 · M133 · Le test « jamais côté vendeur » (M96) lit le TEXTE des fichiers du Live : importer `follow-up-contacts` pour un simple `parisDay` le fait tomber ; passer par un service hors de ces dossiers. Durées : architecte 6 min, gardien-sql 2 min, relecteur 5 min ; e2e de la boucle 1,1 à 1,3 min, suite complète 7,8 min ; une base locale en retard de migrations se rattrape dans la transaction annulée du test (migrations utiles + test, puis rollback).
- 06/11 · M134 · Le client factice partagé (`fake-supabase`) choisit sa réponse sur le DERNIER `from` noté : des lectures parties ensemble (`Promise.all`) reçoivent toutes la même table. Pour un chargeur qui lit plusieurs tables à la fois, un petit client qui répond table par table (dans le test lui-même).
- 06/11 · M134 · Une retenue de concurrent s'achève juste après « Import en cours… » : un e2e qui ouvre le Suivi aussitôt ne voit pas encore la tâche ; relire la page (`expect.poll` avec `page.goto`) jusqu'à elle. Avant d'accuser le code, sonder la page en question sur l'essai (un script Playwright de 20 lignes avec l'en-tête de contournement) : la tâche y était.
- 06/11 · M134 · Safari et iPad refusent une copie ou une fenêtre ouverte APRÈS l'attente d'une action serveur : préparer d'abord par un geste à part (« Préparer son lien »), puis copier ou ouvrir dans le geste suivant. Le relecteur l'a vu, pas les tests.
- 06/11 · M134 · Une liste lue sans `.range` est coupée à 1 000 lignes sans erreur : un chargeur de toute l'agence lit par pages (`readPages`, `.order('id')`). Durées : architecte 6 min, gardien-sql 3 min, relecteur 6 min puis 1,5 min sur le delta ; suite e2e 10,2 min (9 tests).
- 06/11 · M135 · Une nouvelle donnée de démo change les comptes des e2e qui la traversent : les deux refus semés des Keller ont fait passer « 6 réponses » à 8 dans `demo.spec.ts`, rouge deux fois sans défaut de l'outil ; avant de semer, chercher dans les e2e les comptes des fiches touchées.
- 06/11 · M135 · Le relecteur a fait tomber deux fois le même bloquant : un message dit à un client (« coche ce que vous cherchez ») doit se juger sur TOUTES les ★, pas sur la liste utile au rapprochement (une sélection déjà retenue n'a pas forcément passé ses règles) ; et `price ?? 0` fait remplir une ★ budget à un prix inconnu.
- 06/11 · M135 · Une contrainte qui « plafonne » un nombre de lignes (deux relances) se vérifie sous verrou (`perform … for update` sur la ligne parente), et les colonnes d'un fait daté se figent à la mise à jour : le gardien-sql l'a vu, pas les tests. Durées : architecte 7 min, gardien-sql 2 min, relecteur 4,5 min puis 1 min deux fois sur les deltas ; e2e de la boucle 2,8 min, suite complète 10,8 min.
- 06/11 · M136 · Une mesure payante avant de coder a changé la conception : `fromCreatedAt` est
  ignoré par Stream Estate (même total de 2 802 biens, même avec une date de 2030), `order[createdAt]`
  est honoré ; 4 appels, 0,04 €, hors compteur de l'agence. La veille trie donc par création, 20
  annonces au plus. Mesurer avec un paramètre absurde (2030) dit tout de suite s'il est lu.
- 06/11 · M136 · Un résultat payé gardé pour plus tard (les biens de la veille) se juge comme l'écran
  le jugera : le relecteur a trouvé qu'une tâche « 2 nouveaux biens » pouvait ouvrir une page qui en
  montrait 1 (un indispensable que la requête ne filtre pas). Le même classement à l'écriture ET à
  la lecture, sur la fiche du jour.
- 06/11 · M136 · La démo n'avait aucune annonce libre pour un nouveau bien des Keller : toutes celles
  de Mougins sous leur plafond étaient déjà concurrentes du mandat (donc connues de l'agence). Deux
  annonces ajoutées au jeu (mou-14, mou-15), loin du prix de la villa et sous la fourchette des
  nouveaux venus, pour ne bouger ni les concurrents ni le Point marché ; les Keller devenus prêts
  ont changé le compte « Prêt à visiter » de l'e2e démo (5 → 6), vu à la suite complète.
- 06/11 · M136 · `cat > fichier` sans `<<EOF` attend l'entrée standard et fige la commande jusqu'au
  délai : toujours un heredoc. Le nettoyage de fin d'e2e (CLI Supabase) a échoué une fois, vert au
  passage suivant : aléa connu. Suite e2e complète 10,7 min (démo 3,8 à 4,9 min).
- 06/11 · M137 A · Une route ajoutée sans être relue dans le middleware ne s'ouvre pas : la tâche de
  nuit de la veille (M136) partait vers /login, trouvée en écrivant le chemin public du bon. Un test
  exige désormais que chaque cron de `vercel.json` soit un chemin public ; les barrières et l'e2e ne
  voient pas une tâche planifiée, seul un test de configuration la voit.
- 06/11 · M137 A · Un verrou « jamais modifié » doit laisser passer les `on delete set null` (auteur,
  fiche) : la leçon de la M109 rejouée par le gardien-sql, qui a aussi fait calculer l'empreinte par
  la base plutôt que la croire du serveur. Le relecteur a trouvé le « Garantie financière : »
  doublé dans les courriers : un texte « recomposé » se relit dans tous les documents qui le lisent.
- 06/11 · M137 A · E2E : lire `page.url()` juste après un clic de lien donne l'ancienne adresse ; on
  clique le bouton de la page suivante, ou on attend `toHaveURL`. L'adresse de l'agence de démo
  n'avait ni code postal ni commune (« Fait à » vide) : une donnée de démo réglée à la main se
  vérifie en base avant d'écrire un e2e qui la lit. Suite e2e 10,5 min ; un ECONNRESET sur le
  parcours, vert au second passage.
- 06/11 · M137 B · Deux genres de documents dans une même table (bon, offre) : chaque lecture filtre
  sur le genre. Le relecteur a trouvé que la visite affichait l'offre comme son « bon signé » (un
  lien vers une page introuvable, le vrai bon caché) ; un rattachement partagé (`buyer_document_visits`)
  se lit toujours avec le genre du document.
- 06/11 · M137 B · Un correctif annoncé « testé » doit l'être : une réécriture de test par script a
  échoué en silence (Prettier avait déjà reformaté le bloc visé) ; le relecteur l'a vu sur le delta.
  Après une édition scriptée, relire le fichier ou compter les tests avant de l'annoncer.
- 06/11 · M137 B · Un texte « mot pour mot » a des formats aussi : « ( 136 / 10 000 èmes) » (chiffres
  groupés, lettres « dix millièmes ») ne se devine pas depuis la fiche, il se vérifie sur le modèle
  (Jean-Guy) ; « troisièmes » : ne retirer le « s » que de « cents » et « vingts ». Suite e2e
  13/13 au premier passage, 13,1 min.
- 06/11 · M138 · Une clé React faite de la fiche et du genre de tâche confond deux tâches d'une même
  fiche (deux offres répondues) : l'état d'un panneau passait de l'une à l'autre. Une tâche qui porte
  un objet (une offre) a son identifiant dans la clé ; l'e2e met les deux tâches côte à côte.
- 06/11 · M138 · Un « appliquée » recollé n'est pas une migration appliquée : la liste en ligne
  (`migration list --remote`) se relit avant d'enchaîner, à chaque fois.
- 06/11 · M138 · Une tâche ajoutée en tête pousse les autres derrière « Voir les N autres tâches » :
  un e2e qui clique une tâche ouvre d'abord la liste repliée si elle y est. La démo d'avant la mission
  (préparée par l'ancien code) a fait rougir l'e2e démo une fois ; vert au second passage, après sa
  remise à zéro. Suite : 12 sur 13 au premier passage (11,0 min), démo 4,6 min au second.
- 06/11 · Finitions · Un nom qui en contient un autre (« M. et Mme Lambert-Duval », « M. et Mme
  Lambert ») fait correspondre deux lignes à un filtre `hasText` de Playwright : le filtre de
  l'acquéreur devient une expression qui refuse la suite (`/Lambert(?!-)/`) ; un test vérifie que
  les cinq vendeurs de la démo sont cinq foyers, aucun au nom d'un acquéreur.
- 06/11 · M139 · Une insertion groupée met NULL sur la colonne qu'une ligne n'a pas (postgrest-js,
  `defaultToNull`) : un champ facultatif ajouté à un seul acquéreur de démo (la langue des Wilson)
  cassait « Préparer ma démo » sur une colonne `not null`. Chaque ligne d'un lot porte chaque
  colonne ; les types ne le voient pas (relecteur).
- 06/11 · M139 · Une action qui revalide la page démonte le composant qui l'a appelée quand la ligne
  change de liste (« À planifier » → « Visites faites ») : son état d'après (« messages prêts »)
  disparaît. Ce qui doit suivre un enregistrement se porte par l'adresse (`?messages=<id>`), pas par
  l'état du formulaire (relecteur).
- 06/11 · M139 · Le client factice partagé (`fakeSupabase`) répond selon la DERNIÈRE table appelée :
  deux lectures en parallèle (`Promise.all`) y reçoivent la même réponse. Un test de lectures
  parallèles prend un client par table ; une action testée par lui lit en séquence.
- 06/11 · M139 · Un test de modèle a trouvé « la visite de le bien » : la préposition se met dans
  la forme du bien que la phrase attend (« du bien », « de la maison ») ; chaque langue, chaque avis,
  chaque suite sont joués par un test. En e2e, un élément qui change à l'ouverture (« Écarter pour
  lui » remplacé par ses raisons) se tient par son libellé, jamais par le filtre qu'il ne remplit
  plus. Suite e2e : 13 sur 14 (13,4 min), le test de la mission vert après correction du test.
- 07/11 · M140 A · Déplacer les textes d'un écran vers un fichier de langue coupe les phrases
  françaises de leurs espaces insécables (« «\u00a0Avec les nouveaux venus\u00a0» », « 64\u00a0jours ») :
  une recherche-remplacement exacte échoue en silence ou les perd. Avant de copier, lister les
  caractères U+00A0 et U+202F de la source d'origine (`git show main:<fichier>`), pas de la branche
  déjà modifiée ; puis un test de rendu « sans langue, le français d'avant ».
- 07/11 · M140 A · Un garde « jamais côté vendeur » qui refuse `.title` dans le code d'un document
  refuse aussi une clé de texte nommée `title` (`t.title`) : les clés des documents s'appellent
  `coverTitle`. Un détecteur de mots en `\b` sans drapeau `u` ne voit pas « étude » ni « à » : les
  frontières se prennent en Unicode (`(?<!\p{L})…(?!\p{L})`, drapeau `u`).
- 07/11 · M140 A · Un document relu tel qu'il a été écrit (le Point marché, son `summary` en
  français) ne se traduit pas en relisant ses libellés : ils se recomposent depuis les champs, hors
  français seulement, pour laisser le français identique. La suite e2e : 15 sur 15 au premier
  passage (13,8 min) ; la spec de la langue, 48 à 60 s.
- 07/11 · M140 B · Un même déroulé sert deux lecteurs : l'acquéreur dans sa langue, le conseiller
  en français. Le traduire pour l'un faisait passer l'anglais sur les écrans de l'autre (« Avant de
  présenter », la fiche). Le remède : calculer les deux sur les mêmes faits, en une seule lecture,
  et prendre au déroulé français ses libellés et ses critères ; ses mots et ses phrases « Pourquoi »
  restent ceux que l'acquéreur lira. Une langue « choisie mais cachée » (M139) se garde sur la
  fiche et retombe en français au seul moment d'écrire au client (`spokenLanguage`).
- 07/11 · M140 B · Un refus du serveur traduit par l'écran se reconnaît à son texte français exact :
  c'est une égalité de chaînes, pas un code. Un texte de refus qu'on change d'un côté sans l'autre
  retombe sur le message générique. Les constantes du serveur se lisent donc dans `FRENCH_TEXTS`,
  là où l'écran les compare. Une offre signée qui ne garde pas tous ses champs ne se traduit pas
  après coup : la traduction jointe attend une migration (`docs/IDEES.md`). Suite e2e : 16 sur 16
  (14,6 min) au premier passage ; les deux specs de langue en 1,4 min.

- 07/11 · M141 · Les sources publiques se mesurent avant de coder, puis se rejouent en vrai sur
  deux ou trois adresses (Vence, Paris 15e, Boulogne) par un test jetable qui appelle les vraies
  lectures hors de la base. Quatre écarts ne se voyaient qu'ainsi :
  - les argiles répondent par un corps vide hors zone (ce n'est pas une panne) ;
  - la sismicité rend aussi les communes voisines ;
  - le registre des copropriétés écrit « 32 r de la convention » ;
  - geo.api rend « Paris » quand les fichiers de ventes sont par arrondissement.

  Une vente symbolique à 1 € cassait la relecture du bloc : la liste d'autorisation passe aussi à
  l'écriture. Les durées de construction : 3 s à Paris 15e, 6 s à Vence, 13 s à Boulogne.

- 07/11 · M141 · Le client factice des tests (`fake-supabase`) note tous les appels d'un client
  dans une seule liste : trois lectures lancées ensemble par `Promise.all` y répondent toutes comme
  la dernière. L'action lit donc à la suite, le dossier d'abord. Suite e2e : 17 sur 17 au premier
  passage (16,5 min, en quatre groupes de moins de 10 minutes pour rester au premier plan).

- 07/11 · M142 · Ce qui part vers le client se relit champ par champ, même un objet « interne » :
  la fiche « Vivre ici » partait entière vers le lien, clé du bien comprise, et cette clé peut
  contenir l'adresse d'une annonce (`listing:<URL>`). Le relecteur l'a vu ; une fonction
  `publicSheet()` et un test qui cherche « https » dans la charge l'empêchent désormais.
- 07/11 · M142 · Un écran client a plusieurs états : le lien d'un acquéreur montre le déroulé, le
  merci après sa réponse, ou « Ce que nous avons vu ensemble ». « Vivre ici » n'était branché que
  sur le premier, alors que les visites naissent surtout des deux autres. Et l'e2e ne jouait que ce
  premier cas : un e2e doit jouer le chemin le plus fréquent, pas le plus simple à semer.
- 07/11 · M142 · zod 4 refuse une clé ABSENTE même quand le schéma accepte `undefined`
  (« expected nonoptional ») : un champ caché ajouté à un formulaire relu par une liste de champs
  doit entrer dans cette liste. OpenStreetMap (Overpass) répond en 30 s environ pour une fiche, et
  refuse une requête sans `User-Agent` (406) : d'où la tâche de fond. Une semence de démo qui donne
  une sélection aux Wilson a cassé la spec qui partait d'une sélection vide : relire les specs des
  acquéreurs semés quand on sème. Suite e2e : 18 sur 18, un aléa (deux specs qui remettaient la même
  démo à zéro en même temps), une spec ajustée.
- 07/11 · M143 · Un bouton qui reprend le nom d'une fiche ou d'un dossier (« Prévenir la famille
  Keller », « Faire le Live avec Exemple — M. et Mme Démo ») casse les locators `getByRole({ name })`
  sans `exact: true` : la correspondance est partielle et insensible à la casse. Chercher un nom de
  fiche ou de dossier toujours avec `exact: true`.
- 07/11 · M143 · Un champ dont la valeur envoyée vit dans un champ caché (le prix groupé du Live) :
  `input[name=…]` désigne alors le champ caché, que Playwright ne remplit pas ; l'e2e passe par
  `data-price-for`. Masquer un bloc d'une fiche (la vente des Keller) casse les specs qui y
  naviguaient par clic : passer par l'adresse de la page.
- 07/11 · M143 · Changer la couleur d'un bouton (`bg-brand` → `bg-brand-deep`) le fondait dans la
  barre du Live sombre, déjà de cette couleur : relu par le relecteur, pas par le test de contraste.
  Toute couleur de bouton changée se vérifie aussi sous `stage:`. E2e au premier plan : 18 sur 18,
  démo 4,7 min, présentation directe 5,7 min, parcours 2,8 min, les six autres 2,7 min ; trois
  échecs du premier passage étaient des specs à mettre à jour, aucun défaut du code.
- 07/11 · M144 · Mesurer avant de corriger : l'écran vide de 3 à 4 s de l'audit ne s'est reproduit
  ni en Chrome bridé (4G rapide et lente, processeur ×4), ni en WebKit (iPad émulé), essai comme
  production ; il venait d'un navigateur qui simulait une tablette. La mesure qui a servi : un relevé
  de chaque image (`requestAnimationFrame` : écran, opacité, texte, première photo) et des requêtes
  datées, dans un script hors du dépôt, puis un e2e chronométré (`live-sans-trou.spec.ts`, 2,5 min
  pour les deux réseaux).
- 07/11 · M144 · Les fichiers de `public/` sont servis par Vercel en « max-age=0, must-revalidate » :
  un préchargement ne sert à rien sans en-tête de cache, chaque affichage refait un aller-retour
  (186 ms de cadre vide en 4G rapide, 581 ms en 4G lente). C'est l'e2e chronométré qui l'a montré,
  pas la lecture du code ; l'en-tête se pose dans `next.config.ts`.
- 07/11 · M144 · Rendre un bouton cliquable pendant une attente (pour le montrer pressé) fait perdre
  en silence les touchers des AUTRES attentes (le plus proche choisi en directe) : trouvé par l'e2e,
  l'état « pressé » est réservé à ce que le bouton attend lui-même. Un paramètre ajouté mais pas
  transmis (le mode de présentation de la borne de reprise) n'a été vu que par l'avertissement de
  lint « assigned but never used » : lire les avertissements nouveaux, pas seulement les erreurs.
- 07/11 · M144 · Changer ce qu'ouvre une adresse sans numéro d'écran a cassé le « Live rejoué en
  tablette » de la démo et du parcours, qui comptaient sur l'introduction : les specs demandent
  désormais `?fiche=0`. Le nettoyage de fin de l'agence de test a échoué une fois (l'outil, pas la
  base : le recomptage disait 0 ligne). Suite : démo 4,5 min, parcours 2,9 min, présentation
  directe 6,0 min, Live sans trou 2,5 min ; un aléa (la langue du vendeur, vert au second passage).

- 07/11 · M145 A · Une remise à zéro de la démo par un script n'est finie ni au premier « 6 dossiers »
  ni au clic : les anciens restent affichés quelques secondes. Le script a rendu la main sur les six
  anciens ; l'e2e a vu 0 dossier en pleine remise à zéro, a cliqué « Préparer ma démo » : 12
  dossiers. Attendre que les liens changent ET que la liste reste stable 20 s ; une nouvelle remise
  à zéro rattrape tout (elle retire tous les dossiers marqués du closer).
- 07/11 · M145 A · Les vérifications « si préparée » de l'e2e démo sont sautées quand la démo existe
  déjà (remise à zéro faite avant le passage) : une règle nouvelle de la boucle se prouve dans une
  spec qui remet elle-même la démo à zéro (`presentation-directe`, `freshDemo`).
- 07/11 · M145 A · Un fichier `'use server'` n'exporte que des fonctions async : une constante de
  message y casse le build ; elle va dans un service. Et, rappel de la M127 B, le faux client
  répond par la dernière table : les deux lectures du contrôle de sélection sont écrites en série.
- 07/11 · M145 A · Un test « écrit d'abord » se prouve rouge après coup : remettre un instant les
  fichiers de `main` (`git show main:…`), jouer les nouveaux tests (6 rouges), restaurer.
- 07/11 · M145 A · Une règle produit qui change (« seul un mandat signé se propose ») rend fausses
  des attentes e2e qui la décrivaient : la spec M134 (un concurrent retenu faisait naître la
  tâche), la fiche du parcours (« Trouver ses biens idéaux »), le nombre de dossiers de démo en
  six endroits. Chercher l'ancien comportement dans `tests/e2e` avant de pousser. Durées : relecteur
  3,5 min, démo 4,6 min, présentation directe 6,0 min, parcours 2,6 min, les autres 2,9 + 5,2 min,
  CI 3,5 à 4,3 min.
- 08/11 · M145 B · Remplacer des numéros de ligne dans une spec par un script (« le `reload` de la
  ligne 540 devient `openToday` ») a frappé un `reload` qui n'était pas celui d'une tâche : la fiche
  des Keller rechargée était devenue « Aujourd'hui », rouge deux fois, une erreur de la spec et
  non du code. Remplacer par le texte qui entoure, jamais par le numéro de ligne.
- 08/11 · M145 B · Une page qui regroupe des tâches en séries repliées cache leurs boutons : l'e2e
  ouvre la page par un `openToday` qui déplie chaque série, et la relit (plutôt qu'un `reload`)
  après un geste. Une règle qui dépend du jour (le point de la semaine, lundi à mercredi soir) se
  joue conditionnellement dans l'e2e et à dates fixes en test unitaire.
- 08/11 · M145 B · Un acquéreur de démo qui devient prêt change des comptes ailleurs : six prêts au
  lieu de cinq, et le mandat signé que le passage de l'e2e conclut lui est proposé tant que ce
  dossier existe (il part en fin de passage). Relire en base, en lecture seule
  (`db query --remote --read-only`), ce qu'un écran propose avant de corriger la spec ou le code.
- 08/11 · M145 B · L'aléa du 08/11 : juste après la remise à zéro, l'e2e démo a lu 5 dossiers sur 6,
  vert au second passage ; « Votre démo est prête » devrait attendre les six (noté pour la 147).
  Durées : relecteur 5,5 min, démo 4,5 min, parcours 2,6 à 3,0 min, présentation directe 6,6 à
  6,9 min, Live sans trou 3,2 min, CI 4 min.

- 08/11 · M146 A · L'émulation de la souris de Playwright lance un glisser-déposer HTML5 mais ne
  dépose jamais (mesuré sur l'essai : `dragover` accepté, aucun `drop`, `dragend` en « none »), et
  `dragTo` sur une poignée de 8 px ne lance même pas le glisser. L'e2e envoie donc les événements
  eux-mêmes, avec un même `DataTransfer` (`dragCompetitor`) ; un glisser à la vraie souris n'est
  prouvé par aucun test. Une spec jetable sur un dossier de la démo le modifie : remettre l'état.
- 08/11 · M146 A · Le contrôle « au plus un bouton plein » (`expectOneFilled`, la classe repère
  `btn-filled` posée sur `btnPrimary`) trouve ce qu'aucune maquette ne montre : « Construire le
  dossier d'adresse » plein à côté d'« Enregistrer ». Un bouton plein écrit à la main (la scène du
  Live) doit porter le repère, sinon le contrôle ne le voit pas.
- 08/11 · M146 A · Un état d'affichage calculé sur une donnée serveur (`property != null`) change
  sous les yeux du conseiller quand une action la crée et rafraîchit la page : le pli des imports se
  fermait pendant la récupération des photos et effaçait son message. Le figer au premier rendu
  (`useState`). Un test unitaire lancé seul tombe sur `NEXT_PUBLIC_SUPABASE_URL` : `npm test` se
  joue avec `.env.local` chargé. Durées : relecteur 4,7 min, suite e2e 13,7 à 19,4 min (un aléa
  réseau, `ECONNRESET` sur l'export), parcours 3,0 min.

- 08/11 · M148 · Mesurer un écran du Live à plusieurs tailles ne demande pas un Live par taille :
  un seul Live de démo, et à chaque écran `setViewportSize` aux trois tailles puis retour (l'état
  du Live ne bouge pas) — 41 écrans mesurés en un passage. Le script vit le temps de la mesure dans
  `tests/e2e/` (`./support` importable), jamais commité, la démo remise à zéro dans son `finally`.
- 08/11 · M148 A · Une largeur de texte s'estime sur une mesure, pas au jugé : les sept polices de
  charte embarquées, mesurées dans Chromium (une page `file://`, pas `setContent`, sinon les
  polices ne se chargent pas), font au plus 6,0 px par caractère à 0,68 rem ; l'estimation au jugé
  (6,9) faisait passer à tort le dossier 868af175 en repères numérotés.
- 08/11 · M148 A · Une mise en page rendue au serveur pour plusieurs largeurs se choisit sur la
  largeur du conteneur (`@container`, `@min-[620px]:block`), jamais sur celle de l'écran : marges
  et barre de défilement la rétrécissent sous la largeur de calcul (trouvé par le relecteur). Et
  un e2e qui lit `getByText(…).first()` tombe alors sur une variante masquée : il filtre sur
  `{ visible: true }`.
- 08/11 · M148 A · `npm test` dans un shell neuf : onze fichiers ne se chargent pas sans
  `NEXT_PUBLIC_SUPABASE_URL` et `NEXT_PUBLIC_SUPABASE_ANON_KEY` ; poser les valeurs factices de la
  CI (`https://example.supabase.co`, `ci-fake-anon-key`). `npm run format:check` lit aussi
  `.impeccable/hook.cache.json`, exclu de git mais pas de Prettier : rouge en local seulement ;
  `npx prettier --check src tests` dit l'essentiel. Aléas : `langue-du-vendeur` (« Réglages » du
  Live) et un nettoyage de fin de passage (CLI Supabase), verts au second passage. Durées :
  relecteur 4,4 min, démo 4,8 min, parcours 2,9 min, suite complète ≈ 22 min en trois lots, CI
  6 min.
- 08/11 · M148 B · Mesurer une mise en page sur l'aperçu Vercel de la branche
  (`acm-studio-git-<branche>-jean-guy-s-projects.vercel.app`, même jeton de contournement que
  l'essai) laisse l'essai à l'étape interne ; chaque itération coûte un déploiement (≈ 3 min). Une
  variante de la spec hors du dépôt (config Playwright du scratchpad qui importe celle du dépôt,
  `node_modules` en lien) relève tous les écrans d'un passage au lieu de s'arrêter au premier.
- 08/11 · M148 B · Le réseau du poste a lâché plusieurs fois en cours de mesure
  (`ERR_NETWORK_CHANGED`, « Failed to fetch » sur « Remettre ma démo à zéro », la page
  « Un incident est survenu » sans erreur serveur au journal, mais les 6 dossiers bien recréés en
  base) : lire `app_errors` et les `projects` de démo en lecture seule
  (`supabase db query --remote --read-only`) avant de soupçonner le code.
- 08/11 · M148 B · Une présentation directe commencée sans aucune réponse se rouvre sur
  l'introduction (la borne de M144 est la dernière réponse) : un script qui reprend un Live passe
  d'abord l'introduction. Et une boucle qui lit l'étape (`[data-live-step]`) attend que `main`
  ait quitté `intro`, où l'étape ne s'affiche pas.
- 08/11 · M148 B · Retirer les `truncate` (« rien ne disparaît ») allonge les écrans : chaque retrait
  a fait réapparaître un dépassement de 4 à 29 px, en anglais surtout (raisons de la durée,
  analyse des prix). Seul l'e2e aux trois tailles ET dans les deux langues l'a vu ; la bascule de
  langue par « Réglages » sur chaque écran coûte ≈ 2 s et fait passer la spec à 2,6 min.
- 08/11 · M148 B · Une classe de couleur ajoutée après un jeton qui porte déjà `stage:text-white`
  ne l'emporte pas (l'ordre de la feuille décide, pas celui de la chaîne) : « Votre réponse » est
  resté blanc sur la révélation, vu sur une capture. Une couleur conditionnelle se compose sur une
  base SANS couleur ; un jeton à variantes (`screenBody`) se décline en constantes complètes plutôt
  que surchargé.
- 08/11 · M148 B · Durées : relecteur 10 min (première passe), 0,7 à 1,7 min sur les deltas ; spec
  `live-d-un-coup-d-oeil` 2,6 min ; démo 4,6 à 4,9 min ; parcours 2,9 à 3,1 min (un aléa côté
  présentation acquéreur, vert au second passage) ; suite complète ≈ 25 min en quatre lots.
- 09/11 · M146 B · `expectOneFilled` comptait un bouton plein caché dans un `<details>` fermé
  (« Enregistrer » de la fiche acquéreur) : Chromium garde une taille au contenu d'un `<details>`
  fermé. Le contrôle lit `element.checkVisibility({ contentVisibilityAuto: true,
visibilityProperty: true })`, jamais la seule boîte englobante.
- 09/11 · M146 B · Ranger un geste dans « … » peut en perdre un : la carte « à vérifier » prête
  avait perdu « Marquer remis » et le choix de la version du dossier (M84). Seul le parcours e2e
  l'a vu ; avant de déplacer une action, relire chaque état de la carte qui la portait. Un lien de
  menu se lit par son `href` (rôle `menuitem`), pas par un clic qui navigue.
- 09/11 · M146 B · Un mot banni par le test de vocabulaire peut se glisser dans un libellé neuf
  (« revenir d'un cran ») : `npm test` avant le push, pas seulement le typecheck. Une commande
  Playwright `--last-failed` mal placée a vidé `test-results` : la démo a dû être rejouée.
- 09/11 · M146 B · La CI de GitHub a refusé de démarrer toute la matinée (« recent account payments
  have failed or your spending limit needs to be increased »), même après le passage du compte en
  Pro ; relancée l'après-midi, elle est partie aussitôt et verte (checks 3 min 28, sql 2 min 14).
  Un refus de facturation se lit dans l'annotation de la course, pas dans un job rouge. Durées :
  relecteur ≈ 6 min, démo 6,0 min, suite e2e 21 sur 21 ; une remise à zéro de la démo a ramené
  « Première connexion » avec les six dossiers bien en base (aléa, noté pour la 147).
- 09/11 · CI allégée · Deux workflows (`ci.yml`, `sql.yml`) ; un filtre de chemins GitHub se lit
  dans l'ordre, le dernier motif qui correspond l'emporte : `'**'`, puis `'!docs/**'`, `'!**/*.md'`,
  puis `docs/DEMO.md` et `docs/extension-store.md` réinclus, que lisent deux tests. Le pathspec de
  git ne réinclut pas après un `':!docs'` : `valide.md` fait deux `git log` et garde le plus récent.
  Un test unitaire lisait la liste des tests SQL dans `ci.yml` : il lit `sql.yml`.

- 09/11 · M147 A · `npm test` en local sans les variables de `.env.local` : sept fichiers échouent
  au chargement (« Missing required environment variable: NEXT_PUBLIC_SUPABASE_URL »), Vitest ne
  lisant pas `.env.local`. Lancer `set -a; . ./.env.local; set +a` d'abord ; la CI les a.
- 09/11 · M147 A · Un sélecteur e2e par le seul type (`input[type="url"]`) casse dès qu'un champ
  du même type s'ajoute à la page (le lien « Vivre ici » d'Academia sur Bien vendeur) : viser le
  champ par son nom ou son libellé.
- 09/11 · M147 A · Le client factice (`fake-supabase.ts`) répond selon la DERNIÈRE table appelée :
  deux lectures lancées ensemble (`Promise.all`) reçoivent la même réponse. Une requête qui en fait
  deux se teste en les faisant l'une après l'autre.
- 09/11 · M147 A · Un fichier `'use server'` n'exporte que des fonctions asynchrones : un texte
  partagé avec l'écran (le message « lien illisible ») vit dans un module à part (`services/`).
- 10/11 · M147 B · La spec `demo` a 8 minutes de budget et en prend 5,9 : y ajouter une remise à
  zéro au début et une tournée des photos l'a fait déborder (tuée au Live en tablette). Une garde
  nouvelle va dans sa propre spec (`demo-photos`, 55 s) plutôt que dans la spec de la démo.
- 10/11 · M147 B · Un passage e2e dont le nettoyage échoue (`supabase db query --remote`) laisse
  son dossier « TEST AUTOMATIQUE » dans l'agence de démo, et le passage suivant ne retient plus les
  mêmes concurrents : « Aucune baisse simulée ». Après un nettoyage en échec, le rouge suivant est
  à lire comme une suite, pas comme un défaut.
- 10/11 · M147 B · Six specs avaient chacune leur copie de la remise à zéro de la démo, qui
  attendait que la PREMIÈRE adresse de la liste change ; avec la barre des étapes, la liste
  disparaît (liste vide = condition remplie) puis l'ancienne revient avant le rafraîchissement :
  le test lisait un dossier déjà joué. Une seule aide partagée (`resetDemoByScreen`) attend
  « Votre démo est prête » puis cinq adresses de dossier neuves (« À relancer » mène au Suivi,
  la même adresse d'une démo à l'autre).
- 10/11 · M147 B · Le client factice partagé ne sait pas répondre à un `Promise.all` (chaque
  requête reçoit la réponse de la dernière table). Le test des dates relatives a son propre client,
  une chaîne par requête et une petite base en mémoire : la démo s'y sème en entier (175 dates).
- 10/11 · M147 B · Un logo SVG « sans police » : `fontTools` (dans un environnement Python jetable
  du bloc-notes) trace le texte en chemins depuis la Montserrat embarquée, à la graisse voulue
  (`instantiateVariableFont`) ; l'aperçu se fait par Chromium (`playwright`).
- 10/11 · M147 B · Une page qui lit un fichier de `public/` au serveur (les photos et le logo de la
  démo) l'embarque par `outputFileTracingIncludes` : « Ma démo » et « Bienvenue » portent les
  actions de la démo et s'ajoutent à la fiche du bien vendeur ; le `.nft.json` du build le prouve.
- 10/11 · M149 · L'agence de démo est partagée par des personnes, pas seulement par l'e2e : une
  fiche acquéreur saisie à la main avec le compte de démo (« Natacha ») a fait compter 10 fiches à
  la spec `demo` au lieu de 9, et la remise à zéro ne la retire pas (elle n'a pas la marque de la
  démo). Avant de chercher un défaut sur un compte qui ne tombe pas juste, lire en base (lecture
  seule) ce qui a été créé hors de la démo semée.
- 10/11 · M149 · `supabase db query` refuse d'écrire sans `--yes` dans un passage d'agent, et une
  lecture passe par `--read-only` (sans demande) ; `--linked` est déprécié, `--remote` le remplace.
- 10/11 · M150 · Mesurer un portail « dans le vrai Chrome » : la page ne peut rien envoyer au
  poste — un `fetch` vers 127.0.0.1 et `navigator.clipboard.writeText` restent bloqués sur une
  permission que Chrome demande (accès au réseau local, presse-papiers) et l'onglet ne répond plus
  45 s. Ce qui marche : passer par l'application elle-même (un dossier « TEST » sur une agence
  réelle, l'adresse collée, « Ouvrir / Lire mes recherches »), et lire les pages des portails dans
  un onglet à part, par de petites évaluations (titre, compte, chemins sans paramètres).
- 10/11 · M150 · L'outil du navigateur masque les paramètres d'une adresse (« [BLOCKED: … query
  string] ») : lire `pathname`, les seuls NOMS des paramètres, une valeur épelée lettre à lettre,
  ou l'adresse que la liste des onglets affiche en clair.
- 10/11 · M150 · L'agence de démonstration simule toute lecture de portail (M114) : une mesure de
  portail se fait sur une agence réelle, jamais sur la démo. Le conseiller se connecte lui-même ;
  aucun mot de passe n'est saisi à sa place.
- 10/11 · M150 · Les portails changent leurs adresses sans prévenir : SeLoger met désormais
  l'identifiant de commune dans le chemin (`/recherche/…/vence-06140/ad08fr2109`), Maisons &
  Appartements redirige sa page de commune vers l'accueil, Figaro ne donne plus prix ni surface au
  lecteur. Les pages de test (`__fixtures__`) restent vertes : seul un passage dans le vrai
  navigateur le voit.
- 11/11 · M152 · 0 · La spec `demo` reprend la démo déjà préparée si elle existe : lancée sur une
  démo préparée la veille, elle échoue sur les dates (« relance prévue le 10/11, en retard d'un
  jour »), puis, au second passage, sur ce que le premier a laissé (la sélection des Keller). Ce
  n'est pas un défaut : la remise à zéro par l'écran (`resetDemoByScreen`) se fait AVANT la suite,
  comme le dit `/mission`. Le chef l'avait sautée.
- 11/11 · M152 · 0 · En local, 8 fichiers de test échouent au chargement faute de
  `NEXT_PUBLIC_SUPABASE_URL` (aussi sur `main`) : la CI pose des valeurs factices
  (`ci.yml`). `npm test` se juge avec ces valeurs (`https://example.supabase.co`,
  `ci-fake-anon-key`), jamais avec les vraies.
- 11/11 · M152 · 0 · Les lignes de `.env.e2e.local` commencent par des espaces : `grep '^E2E_…='`
  ne trouve rien et l'en-tête de contournement de l'essai part vide (302, « Protected by Vercel
  Authentication »). Lire avec `sed -n 's/^[[:space:]]*E2E_VERCEL_BYPASS=//p'`.
- 11/11 · M152 · 0 · Une commande de plus de 10 minutes passe en arrière-plan : la suite e2e se
  joue par groupes de moins de 8 minutes (démo 5,9 min ; parcours 3,1 ; bienvenue, Live tablette,
  présentation directe, confirmer la visite et photos de la démo ensemble 10,4, trop long ; langues
  2,4 ; Live d'un coup d'œil et Live sans trou 6,4). Relecteur : 2,5 min.
- 11/11 · M152 A · Un bouton ajouté sur un écran du Live se mesure en 1280 × 720 aussi : le test
  `demo` l'a trouvé (« + Ajouter un commentaire » passé sous la barre du bas), pas le test de la
  mission, joué en 1280 × 800 ; une place sur une ligne existante plutôt qu'une ligne de plus. Le
  panneau du prix s'anime avec `transform` (`both`) : un élément `fixed` qu'il contient reste
  enfermé dedans, la couche passe par un portail vers la racine `[data-stage]`. Un test qui ne
  remet la démo à zéro que si elle est vide rejoue sur l'état laissé par son échec : remettre à
  zéro par l'écran avant le second passage, sinon l'aléa et le défaut se confondent. Les relevés
  d'annonce sont communs à l'agence : une date de constat peut venir d'un autre dossier (« constaté
  il y a 5 jours ») ; un test n'attend pas « aujourd'hui ». Durées : e2e complet ≈ 25 min par
  groupes, relecteur 4 min puis 0,5 min sur le delta.
- 11/11 · M152 B · Un fichier `'use server'` n'exporte que des fonctions asynchrones : une
  constante exportée passe le typage et Vitest, et ne casse qu'au `npm run build` (Turbopack) ; les
  messages vont dans un module à part. Un texte validé par la juriste prime sur le test de
  vocabulaire : l'exception s'écrit dans le test, pour cette seule phrase et cette seule page. La
  suite e2e complète (23 specs) a pris 29,8 min, la spec `demo` 6 min ; un échec de la remise à zéro
  de la démo (« la connexion a été perdue ») était un aléa, vert au second passage. Relecteur
  4 min.

- 12/11 · M151 · Dans un shell sans `.env.local` chargé, 8 fichiers de tests échouent à l'import
  (« Missing required environment variable ») et l'on croit à une régression : `set -a; .
./.env.local; set +a` avant `npm test` (la CI fournit ces variables). `format:check` en local
  signale `.impeccable/hook.cache.json`, un cache d'outil exclu de git : sans effet sur la CI.
- 12/11 · M151 · L'e2e `depuis-mes-notes` laisse dans l'agence de démo une fiche « M. et Mme Arnaud »
  archivée et marquée démo, jusqu'à la remise à zéro suivante : une fiche de plus au comptage des
  acquéreurs, attendue, pas une fuite.
- 12/11 · M151 · Bedrock, sorties structurées : 16 paramètres `anyOf` au plus par schéma ; au-delà,
  refus avant tout appel. Les mesures sur le vrai modèle (Sonnet 4.6, profil UE, température 0) se
  jouent hors des tests, par `missions/M151-essais/mesure.mjs`, et ne se renotent qu'avec
  `M151_MODELES` posé, sinon le bilan est écrasé.

- 12/11 · M153 · La démo fraîche n'a qu'une visite sur une annonce du marché, celle de Mr and Mrs
  Wilson à Antibes ; les visites des Keller sur les annonces naissent pendant la spec `demo`. Une
  spec qui finit sur une page sans menu (l'offre signée, `(print)`) ne peut pas remettre la démo à
  zéro par l'écran : revenir d'abord sur une page de l'application. Relecteur 4 min : trois bloquants
  que ni les tests ni l'e2e n'avaient vus (une opposition non lue sans courrier, la couverture de
  l'offre, la copropriété perdue). Suite e2e complète 32 min.

- 12/11 · M154 · La production et l'essai partagent la base et le compte de démo : une remise à
  zéro faite par un autre code (la production, ou un onglet de l'essai chargé avant le déploiement)
  efface ce que l'essai vient de semer, et une page non rechargée garde l'ancien formulaire. Avant
  de donner un parcours à Jean-Guy : relire l'état en base après la dernière remise à zéro, et lui
  demander un onglet neuf rechargé (⌘⇧R), sans la production ouverte. La suite e2e et Jean-Guy sur
  le même compte de démo se gênent : une agence de démo réservée aux e2e est proposée.
- 12/11 · M154 · Plusieurs blocs de boutons radio dans un formulaire doivent avoir chacun leur
  groupe (`useId`) : sous un même `name`, choisir un titre sur un bien décochait l'autre ; trouvé
  par la seule spec e2e. Relecteur 5 min : un bloquant (la clé d'un titre de collaboration sans le
  n° du mandat imprimait un n° faux). Suite e2e complète 35 min, quatre specs touchées 16 min.

- 12/11 · M154 · Un interrupteur qui ouvre une fonction ailleurs qu'en production se teste avec sa
  valeur en paramètre (`tourVoucherOpen(env, lit)`) : l'allumer ne casse pas les tests qui prouvent
  qu'éteint, la production reste fermée.
- 14/11 · M155 (lot 1) · Douze dossiers de démo créés un par un faisaient passer la remise à zéro de 21 à 43 s : le serveur les crée désormais en deux groupes de six, en même temps. Mesurer la remise à zéro dès qu'un scénario s'ajoute.
- 14/11 · M155 (lot 1) · La spec `demo` réutilisait l'état laissé par un passage précédent (une sélection des Keller déjà présentée : « Revoir la présentation » au lieu de « Présenter ») : elle part désormais toujours d'une démo remise à zéro, et finit par une remise à zéro qui compte douze dossiers.
- 14/11 · M155 (lot 1) · Avec huit mandats, leurs concurrents prenaient presque toutes les annonces du jeu, et les biens idéaux du marché n'avaient plus rien à montrer : des annonces marquées « marché seulement » ne sont jamais semées comme concurrents. Vérifier ce qui reste au marché quand le jeu grossit.
- 14/11 · M155 (lot 1) · Une base qui pose l'heure d'un fait à l'insertion (`buyer_proposals.sent_at`) démentait la démo semée « il y a 3 jours » (« proposé aujourd'hui ») : chercher, avant de semer des dates, les colonnes que la base date elle-même.
- 14/11 · Correctif · Un correctif urgent se fait dans un worktree depuis `main` pendant qu'une mission occupe le dépôt : Turbopack y refuse `node_modules` en lien symbolique (panique), le build se prouve donc par la CI ; `git diff` n'emporte pas les fichiers neufs, à copier à la main ; les tests unitaires locaux demandent les variables factices de la CI (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`), sans elles 8 fichiers tombent à l'import.
- 14/11 · M155 (photos) · `npm run demo:fiches` ne tourne plus depuis le lot 1 : Node lit `scenarios.ts` sans compilation et ne résout pas les imports `@/…` (le JSON des jeux de photos). Contourné en lançant le script par `jiti` avec l'alias `@` → `src` ; à réparer dans le script avant le prochain jeu. Seule la fiche du scénario dont les photos changent se recommite (les autres ne diffèrent que par leur date de fabrication).
- 14/11 · M155 (photos) · Les photos du bien vendeur d'un dossier de démo sont COPIÉES dans le stockage à la remise à zéro : un jeu remplacé ne se voit sur un dossier qu'après une nouvelle remise à zéro, alors que les fichiers de `public/demo/photos` sont servis tout de suite. Pour prouver un jeu sur l'essai : remise à zéro avec le compte e2e, puis la page Bien vendeur, `expectPhotosLoaded` à 6.
- 14/11 · M155 (photos) · Des images générées par IA se regardent en grand ET par zones agrandies : les défauts trouvés ne se voyaient pas en vignette (une prise australienne, des volets à l'intérieur des pièces, une terrasse quatre fois trop grande pour l'annonce, un faux texte sur les livres et les fours).
- 14/11 · M155 (photos, second lot) · Des jeux de photos livrés en deux envois : sans garde, la démo branchait un dossier dès sa première photo. La règle « un jeu ne s'affiche que complet » (les vues de sa fiche) laisse ranger un envoi partiel sans rien montrer ; quatre noms envoyés différaient de la fiche (`05-salle-de-bains`, `04-suite-parentale`) : la fiche gagne, et un test refuse désormais tout fichier qui n'est pas une vue de sa fiche. Suite e2e complète : 28 sur 28 au premier passage, 37 min.

- 17/11 · M157 · Le premier vrai appel à une API d'un partenaire : garder au journal, dès le
  premier jour, ce qu'elle a rendu (statut HTTP, code et message d'erreur, noms des champs d'une
  réponse inattendue, jamais une valeur ni la clé). Sans ce détail, « unavailable » ne disait rien ;
  avec lui, trois appels ont suffi à trouver deux écarts au contrat (un champ refusé, `statut` au
  lieu de `etat` et des noms en camelCase). L'appel se fait depuis le serveur de l'essai, par un
  petit script Playwright avec le compte de démo e2e (la clé n'est que dans Vercel).

- 17/11 · M158 · Une API d'un partenaire dont la réponse n'est pas documentée se lit d'abord par
  une sonde temporaire, sur l'essai seulement et réservée à l'agence de démonstration (la clé n'est
  que dans Vercel) : trois passages ont suffi pour trouver les vraies routes
  (`/dossiers/{id}/bien?type&pieces&surface`, `?vue=` ignoré) ; la sonde a été retirée de l'essai
  aussitôt, jamais dans `main`. La vraie réponse, fictive, sert ensuite de jeu d'essai des tests.
- 17/11 · M158 · Un appel lent à un service extérieur ne se fait jamais dans le corps d'une page :
  « Avant le rendez-vous » attendait Academia (jusqu'à 2 × 8 s) avant de s'afficher, ce qu'aucun
  test ne voyait ; le bloc se lit dans sa propre limite (`Suspense`), prouvé par un rendu en flux
  (`react-dom/server.edge`) avec un service qui ne répond jamais.
- 17/11 · M158 · Un remplacement de texte par script échoue sans rien écrire quand Prettier a déjà
  reformaté le passage (une signature passée sur plusieurs lignes) : relire le fichier avant.
- 17/11 · M158 · Durées : suite e2e complète 39 min (28 sur 28), les sept specs qui passent par
  « Avant le rendez-vous » 24 min ; relecteur une passe, 3 min.
- 19/11 · M161 · Un composant serveur ne doit rien écrire pendant son rendu, même « en passant »
  (l'état d'une demande relu chez Academia, un lien renouvelé) : le relecteur l'a vu, la règle de
  CLAUDE.md le refuse ; l'écriture passe par une action, déclenchée une fois à l'ouverture par un
  petit composant client (`RenewLinkOnOpen`).
- 19/11 · M161 · Une relecture en échec ne se lit jamais comme une attente : un 429 ou un 503 pendant
  qu'Academia prépare le dossier disait « 20 à 60 secondes » et écrivait au journal toutes les 5 s.
- 19/11 · M161 · Sans DOM dans les tests, une cadence (toutes les 5 s, 24 fois au plus) se prouve en
  sortant sa logique du composant (`startAcademiaRefresh`) et en avançant des minuteries simulées
  (`vi.useFakeTimers`).
- 19/11 · M161 · Un fichier « use server » n'exporte que des actions : une fonction pure qui y était
  (le message du plafond) doit vivre dans un service à part.
- 19/11 · M161 · Prettier écrit les espaces insécables en clair (« \u00a0 » devient le caractère) :
  un remplacement par script qui cherche l'échappement ne trouve plus rien.
- 19/11 · M161 · Durées : suite e2e complète 37 min (27 sur 29, deux échecs de connexion du compte de
  test verts au rejeu en 3,8 min) ; relecteur 3 min ; l'essai de Jean-Guy dans Start Academy, dossier
  neuf prêt en 17 s chez Academia.
- 19/11 · Correctifs 161 · Des exemples d'API qui ne montrent pas tout ne prouvent pas un lecteur :
  ceux de Laurent n'avaient ni « chantier_ouvert » ni la rue inventée dans un permis, et nos tests
  passaient ; le relecteur a lu les `enum` des schémas eux-mêmes. Lire les valeurs permises du
  schéma, pas seulement l'exemple, et écrire un test par valeur que le code traduit.
- 19/11 · Correctifs 161 · Un contrôle de schéma maison (`json-schema-check.ts`, sans dépendance)
  suffit aux tests s'il refuse tout mot-clé qu'il ne lit pas : sinon une réponse passerait sans être
  vérifiée.
- 19/11 · Correctifs 161 · `supabase db query --linked` est refusé en mode agent (« Confirmation
  required ») ; une lecture passe par `--remote --read-only`.
- 19/11 · Correctifs 161 · Le contournement de la protection de l'essai se lit dans
  `E2E_VERCEL_BYPASS` (`.env.e2e.local`), à côté de `E2E_BASE_URL` ; sous un autre nom, la boucle
  d'attente du déploiement tourne dix minutes sur « Protected by Vercel Authentication ».
- 19/11 · Correctifs 161 · Avant de changer ce qu'un instantané déjà enregistré montre au Live,
  compter en base ceux qu'il touche (ici 0 sur 2) : un écran retiré en plein Live décalerait
  « Reprendre ». Durées : les trois specs Academia 3,6 à 4,4 min ; relecteur 2,7 min.
- 19/11 · Ouverture d'Academia · Ouvrir un interrupteur à « toutes » ouvre aussi l'agence des
  tests automatiques, qui est une vraie agence : l'e2e aurait pu appeler l'API réelle. Avant
  d'élargir un accès, chercher quelles specs tournent sur une vraie agence et la fermer à part.
- 19/11 · Ouverture d'Academia · Un texte validé par la juriste se relit contre le code avant d'être
  publié : « une référence sans signification » datait du contrat du 14/11, et le champ avait été
  retiré le 17/11 ; le relecteur compare le texte publié au texte validé, mot pour mot, par programme.
- 19/11 · M162 · Un PDF se juge sur le vrai PDF, page par page : Chrome (`page.pdf`, média « print »)
  puis pdf.js dans Chromium pour les images (aucun outil sur le poste) ; une planche de toutes les
  pages (`planche.mjs`) montre d'un coup les pages à moitié vides. Garder le dossier mené
  (`M162_KEEP`) et réimprimer le même (`M162_ID`) en 15 s donne un avant et un après comparables.
- 19/11 · M162 · Le serveur local (`.env.local`) parle à une base locale, pas à celle de l'essai :
  pour imprimer un vrai dossier, déployer sur l'essai et réimprimer ; une passe complète prend
  environ 5 min (déploiement compris).
- 19/11 · M162 · `break-after: avoid` ne retient pas un titre dans une colonne flexible de Chrome :
  le titre et le premier bloc dans un même groupe `break-inside-avoid` le font. Un grand bloc
  insécable laisse une demi-page vide : ne garder insécable que sa tête (titre et frise), le tableau
  qui suit répète son en-tête de lui-même.
- 19/11 · M162 · Une correction « pour l'impression » se pose en `print:` : le relecteur a vu que
  l'élargissement des anneaux et le tableau changeaient aussi l'écran et le lien public. Le test
  des positions du dessin sans `paper` garde le Live tel qu'il était.
- 19/11 · M162 · Une branche rebasée ne se repousse pas sous son nom (refus « fast-forward ») : nouvelle
  branche `-v2` (M98). Durées : suite e2e complète 42 min (30 sur 30) ; relecteur 2 min.
- 18/11 · M159 · Le faux client Supabase (`fake-supabase`) répond selon la DERNIÈRE table de la
  chaîne : trois lectures lancées ensemble (`Promise.all`) reçoivent toutes la réponse de la dernière
  et un garde passe par accident ; dans une action testée ainsi, les lectures gardées se font l'une
  après l'autre (ou le test prend un faux client qui répond par table).
- 18/11 · M159 · Une colonne `updated_at` n'est pas forcément tenue : celle de `subject_properties`
  n'avait ni déclencheur ni écriture par le code (seules les tables des diagnostics et de la
  copropriété la posaient) ; le relecteur l'a vu en lisant l'upsert. Avant de bâtir une règle sur
  une date, vérifier QUI l'écrit (déclencheur dans la base, ou le code).
- 18/11 · M159 · Une spec e2e qui lance le Live attend la fin du préchargement des photos
  (`[data-photos-preloaded="true"]`) avant « Démarrer la présentation », sinon le clic ne fait rien ;
  et une remise à zéro dans un `finally` part d'une page qui a le menu (`/builder`), jamais de la
  scène du Live, sinon son échec masque l'erreur d'origine.
- 18/11 · M159 · Une capture de l'écran fautif, prise dans la copie figée de la spec juste avant
  la mesure (`page.screenshot`), a montré en une passe le débordement (la cinquième case des risques
  sous la barre à 1024 × 700) que la capture d'échec, prise après la remise à zéro, ne montrait pas.
- 18/11 · M159 · Durées : suite e2e complète 48 min (26 sur 29, trois aléas verts au rejeu en
  9,9 min) ; la spec du quartier 1,7 min ; relecteur 5 min puis 1,3 min sur le delta ; gardien-sql
  2 min puis 0,5 min.
- 18/11 · M160 · Un lien posé sur un texte déjà cherché par les specs change ce qu'elles trouvent :
  `getByRole('link', { name: 'Ouvrir le dossier' })` attrapait aussi le nom du vendeur, dont le
  libellé accessible commence pareil (« Ouvrir le dossier de … ») ; viser un repère (`data-testid`)
  plutôt qu'un nom qui peut se répéter. Un rendu statique (`renderToStaticMarkup`) ne garde pas
  l'ordre des attributs qu'on croit : chercher l'attribut dans la balise (`[^>]*`), pas à une place.
- 18/11 · M160 · Durées : suite e2e complète 46 min (28 sur 29, un aléa vert au rejeu en 1,4 min) ;
  relecteur une passe, 1,6 min.

## La base

- 29/10 · `npx supabase db push --linked` est refusé par la garde de permissions de Claude Code (lu comme
  un déploiement). C'est Jean-Guy qui l'applique, dans un terminal, après le rapport du gardien-sql et
  l'accord donné ici.
- 01/10 · Une migration verte en local sur base vide n'est pas vérifiée : compter sur la vraie base avant,
  prédire après, et la transaction doit pouvoir annuler.
- 08/11 · M145 B · `migration up --local` refuse quand l'historique local est désaligné : la seule
  migration de la mission se joue en local par `docker exec -i supabase_db_acm-studio psql … <
fichier`, puis son test SQL. `npm run gen:types` sur une base locale incomplète produit un diff
  faux : générer par `gen types typescript --schema public --linked`, puis retirer l'en-tête
  `__InternalSupabase`. Appliquée par le chef sur l'ordre de Jean-Guy (`db push --linked --yes`),
  après `migration list`, la sauvegarde et le comptage prédit, conforme.
- 08/11 · M145 B · Le bloquant du relecteur venait d'une règle juste sur le papier (« une relance
  fait revenir la ligne ») et fausse à l'usage : la ligne revenait le jour même de la relance.
  Écrire, pour chaque règle « fait revenir », le scénario du lendemain du geste.
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
- 05/11 · M131 · La CLI Supabase s'est mise à jour seule sur le poste (2.101.0 → 3.0.0, par `npx
supabase` sans version) : `db push` refusait `[inbucket]` (devenu `[local_smtp]`, que la 2.101.0
  refuse à son tour) et `npm run sauvegarde` cassait au comptage (« Unexpected end of JSON input ») :
  hors mode agent, la 3.0.0 rend un tableau dessiné, pas du JSON. Une seule CLI désormais, épinglée
  partout : `npx --yes supabase@3.0.0` (sauvegarde, nettoyage de l'agence de test, e2e, `gen:types`,
  procédure d'effacement) et `version: 3.0.0` dans la CI, avec `--remote`, `--output-format json
--agent no` pour lire, `--read-only` pour compter, `--yes` pour écrire. Le stockage exige encore
  `--experimental`, `db dump` encore Docker lancé, `gen types` n'a plus `--local` (local par
  défaut). Une montée de version se décide, puis se prouve par `npm run sauvegarde` et la CI.
- 30/10 · M120 B · Le gardien-sql a fait trois passages sur la migration (six « à corriger ») :
  une copie cible doit être une copie RETENUE de la même annonce, un bien démarché déjà présent se
  complète sans écraser, et le complément ne pose jamais un mandat à côté d'une collaboration
  obtenue (CHECK de M115). Un miroir de fonction se relit cas par cas contre l'original.
- 30/10 · M120 B · L'état d'hier en base ne se retrouve plus après une remise à zéro de la démo :
  pour vérifier un défaut constaté la veille, demander l'heure du constat et lire le journal
  d'erreurs, avant toute remise à zéro.

- 07/11 · Retrait du dossier « Martin » (avant la M145) : `storage rm -r` sur le dossier d'un projet
  répond « Object not found » ; on supprime fichier par fichier, les chemins lus par
  `storage ls -r`, puis on relit le dossier vide. Le comptage suit les clés étrangères depuis
  `projects` (lues dans `pg_constraint`), plus ce qui se rattache par une clé texte (« Vivre ici »,
  biens écartés, sélections).

- 09/11 · M147 A · Lire les droits du navigateur sur une table : `has_table_privilege('authenticated',
'public.x', 'UPDATE')`. `information_schema.role_table_grants` revient VIDE pour le rôle de la CLI
  en lecture seule (`supabase_read_only_user`) : il ne montre que les droits dont ce rôle est
  bénéficiaire ou accordant. Une lecture vide n'est pas « aucun droit » ; un témoin (une table aux
  droits connus) le dit.
- 09/11 · M147 A · Jean-Guy a resserré la contrainte d'un lien avant l'application : `[^\s]+`
  laissait passer « ? », « # » et un « / » de plus ; le jeton seul (`[A-Za-z0-9._~-]+`). Une règle
  sur une adresse web se juge sur ce qu'elle laisse passer, pas seulement sur ce qu'elle refuse.
- 11/11 · M152 · 0 · Supprimer une table que le code de production écrit encore se fait en deux
  mises en production : d'abord le code sans elle, puis la migration. Avant, lire en base ce qui
  la relie au reste (`pg_constraint` pour les clés et leur `confdeltype`, `pg_trigger`, et les
  fonctions qui la citent par `pg_get_functiondef`, filtrées sur `prokind = 'f'` : la fonction
  échoue sur un agrégat). Les 4 fiches « Vivre ici » restantes étaient des clés `listing:` : aucun
  concurrent ne les touchait.
- 11/11 · M152 · 0 · La migration de suppression : `db push --remote --yes` est passé sans refus de
  la garde de permissions, cette fois. La base locale était en retard (37 tables contre 50) : la
  migration n'y a pas été jouée et les types ont été corrigés à la main ; la CI SQL, qui rejoue tout
  sur une base neuve, a fait la preuve. Le comptage du gardien-sql (une requête valable avant et
  après) s'est vérifié point par point. Une sauvegarde garde aussi le journal d'erreurs : le nom
  d'une table supprimée y reste dans les messages (16 lignes du 07/11), sans son contenu, jusqu'à la
  purge des 90 jours. Durées : architecte 1,7 min, gardien-sql 3,6 min, relecteur 1,6 min, e2e
  complet 27 min par groupes.
- 11/11 · M152 A · Le fake Supabase des tests (`fakeSupabase`) ne distingue pas deux requêtes
  lancées ensemble (`Promise.all`) : la réponse suit le dernier `from` ; deux lectures qui se
  suivent dans une action testée se font l'une après l'autre. Une date posée par le navigateur et
  lue pour un rappel (`listings_checked_at`) se fait poser par la base (déclencheur), sinon une date
  dans l'avenir cache le rappel (gardien-sql). Un `cron.job` se lit en `reset role` dans un test SQL
  joué sous `service_role`. Un retrait sans date propre (`listing_withdrawn`) n'a pas de date :
  `updated_at` n'est jamais une date de retrait (bloquant du relecteur). Gardien-sql 3 min puis
  0,7 min sur la correction ; sauvegarde 2,5 min.

- 11/11 · M152 B · En SQL, `-` se lie avant `#-` : `snapshot #- '{a,b}' - 'title'` se lit
  `snapshot #- ('{a,b}' - 'title')` (« operator is not unique: unknown - unknown ») ; parenthéser et
  typer (`::text[]`, `::text`). La base locale était en retard de vingt migrations : la compter, puis
  `db reset --local` avant de jouer un test SQL neuf. Une lecture sur la vraie base passe par
  `db query --remote --read-only` (sans lui, la CLI refuse en mode agent) ; `db push --remote` exige
  `--yes`, à ne passer qu'après l'accord de Jean-Guy. `npm run gen:types` a rendu un fichier de 1 590
  lignes au lieu de 3 825 : remis tel quel, cause à trouver avant la prochaine migration. Gardien-sql
  2,6 min puis 1,3 min sur le delta ; architecte 3,5 min ; sauvegarde 2 min.

- 12/11 · M151 · Une empreinte de fonction se dit avec sa méthode : `md5(prosrc)` (le corps) et
  `md5(pg_get_functiondef(…))` (la définition entière) n'ont rien de commun ; la prédiction portait
  sur le corps, le premier relevé « après » sur la définition, d'où un faux écart, levé en mesurant
  les deux sur la base locale. Sauvegarde 1 min, vérification par restauration 2 min.

- 17/11 · M157 · La CLI Supabase passe un fichier de migration en transaction IMPLICITE : un
  `lock table` au premier niveau y est refusé (« can only be used in transaction blocks ») ; il se
  pose dans un bloc `do $$ … $$`, où il tient jusqu'à la fin du fichier. Le verrou avant un
  comptage-garde suivi d'un `drop` est nécessaire : un `count(*)` seul n'empêche pas une insertion
  entre les deux (gardien-sql).
- 18/11 · M159 · Une table figée (« jamais modifiée ») qui porte une clé étrangère `on delete set
null` doit laisser passer la seule mise à nul de cette clé, sinon la suppression d'un compte casse
  (gardien-sql, le défaut de la M135 refait) ; et le refus de clés interdites dans un `jsonb` se fait
  à tous les niveaux (`jsonb_path_exists(blocks, '$.**.cle', '{}', true)`, silencieux), pas
  seulement au premier.

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
