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

## La démo et les tests

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

## La base

- 29/10 · `npx supabase db push --linked` est refusé par la garde de permissions de Claude Code (lu comme
  un déploiement). C'est Jean-Guy qui l'applique, dans un terminal, après le rapport du gardien-sql et
  l'accord donné ici.
- 01/10 · Une migration verte en local sur base vide n'est pas vérifiée : compter sur la vraie base avant,
  prédire après, et la transaction doit pouvoir annuler.

## Les rendus

- 25/10 · Un test vert ne dit pas qu'un document donne envie : le testeur produit le PDF et les captures,
  le parcoureur joue le scénario, Jean-Guy et son relecteur produit regardent AVANT l'essai humain.
- 26/10 · Une réponse touchée sur un téléphone peut tomber sur une barre fixée en bas : jamais de bouton
  sous une barre fixe, et le bouton choisi devient plein, les autres en contour.
- 29/10 · Une capture pleine page cache ce qui est sous le pli : les boutons « Enregistrer » et
  « Télécharger le PDF » du courrier étaient invisibles en 1280 × 800 dans un panneau collant, et les
  18 captures étaient « sans défaut ». Le testeur vérifie désormais chaque action principale dans la
  fenêtre sans défiler, et chaque image chargée (M120 B, R1 et R3).

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
