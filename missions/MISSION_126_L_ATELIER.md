# MISSION 126 — L'atelier : l'équipe complète et sa page en direct

**Date** : 29/10/2026 · **Origine** : Jean-Guy, 29/10, devant l'atelier de montage d'Hugo (une page locale qui
montre le chef, ses agents, les machines et le fil d'activité) : « je veux quelque chose comme ça, avec tous
les agents qu'il faut, la structure parfaite pour gagner du temps, de la performance et de la qualité ».

Mission d'outillage, **hors du produit** : rien dans `src/`, aucune migration, aucun e2e produit touché. Une
branche, un `/valide`. Elle peut se faire en parallèle d'une mission produit (worktree, M98).

## L'équipe, et qui fait quoi

| Agent | Quand | Rend | Ne fait jamais |
|---|---|---|---|
| **architecte** (`.claude/agents/architecte.md`, écrit par Jean-Guy) | avant de coder | plan en 15 lignes, réutilisations, questions numérotées à Jean-Guy | coder, élargir, trancher |
| **designer** (`.claude/agents/designer.md`, écrit par Jean-Guy) | après l'architecte, puis sur les rendus | maquettes SVG, états, textes exacts, un bouton plein par écran ; puis la critique des rendus contre la maquette | coder, trancher une règle produit |
| **chef** (la session `/mission`) | tout du long | code, barrières, push, rapport | se relire seul, valider |
| **gardien-sql** | avant l'accord sur une migration | bloquants, prédiction de comptage | appliquer |
| **relecteur** | avant chaque push | bloquants / à corriger / remarques, contre la fiche et CLAUDE.md | corriger |
| **testeur** | essai déployé | barrières, e2e, aléa ou défaut, durées, PDF et captures | toucher au code ou aux tests |
| **parcoureur** (`.claude/agents/parcoureur.md`, écrit par Jean-Guy) | essai déployé, après le testeur | le scénario joué comme un humain, en mots et en captures, sur bureau et téléphone | lire le code |
| **Jean-Guy et son relecteur produit** | sur les rendus et le rapport | décisions, essai humain, `/valide` | |

1. `/mission` enchaîne dans cet ordre : architecte → designer (si un écran ou un document change) →
   (questions à Jean-Guy, s'il y en a) → code, qui suit la maquette et les textes du designer → gardien-sql
   si migration → accord et application par Jean-Guy → relecteur → push et `essai` → testeur → parcoureur →
   designer sur les rendus → rapport. Les rapports des agents y sont joints tels quels. Le chef corrige les bloquants et relance l'agent
   concerné sur le delta ; il ne discute jamais un constat dans le rapport.
2. `/valide` ajoute une étape : avant la fusion, le chef relit `docs/APPRENTISSAGES.md` et y écrit ce que la
   mission a appris (aléas, pièges, durées), une ligne datée chacun. Le fichier existe (Jean-Guy, 29/10).
3. **Deux missions en parallèle** : `/mission NN --parallele` crée un worktree (`git worktree add
   ../acm-studio-NN mission-NN-…`), y lance l'équipe, et l'essai reste à une mission à la fois (M98) : la
   seconde s'essaie sur son aperçu de branche Vercel, sauf migration. Le chef refuse deux missions qui
   touchent les mêmes dossiers de `src/features`.

## La page en direct

4. `atelier/` à la racine : un serveur Node sans dépendance nouvelle (`node atelier/serveur.mjs`, port 4871),
   un journal `atelier/journal.jsonl` ignoré par git, une page `atelier/index.html` servie sur
   `http://127.0.0.1:4871`. `npm run atelier` la lance et l'ouvre.
5. **Les hooks** de `.claude/settings.json` (`SubagentStart`, `SubagentStop`, `PostToolUse` sur Bash pour
   `git push`, `npm run e2e`, `supabase db push`, `gh run`) écrivent une ligne dans le journal : heure,
   mission, agent, état (en cours · terminé · bloqué · attend Jean-Guy), une phrase. Le chef écrit aussi une
   ligne à chaque étape de `/mission` (plan rendu, migration soumise, poussé, essai déployé, rapport).
6. **La page montre**, rafraîchie toutes les 2 s :
   - en haut : la mission en cours, sa branche, ses étapes dans l'ordre du point 1, l'étape active en couleur
     de l'agence, les étapes faites cochées ;
   - la constellation : le chef au centre, les sept agents autour, chacun avec son état et sa dernière phrase ;
     en orange ce qui **attend Jean-Guy** (question de l'architecte, migration à appliquer, essai à faire) ;
   - trois cartes : **Base** (dernière migration appliquée, migration en attente, lu par
     `npx supabase migration list --linked` toutes les 5 min), **Essai** (commit servi par `/api/version`,
     CI du dernier commit par `gh run`, durées des e2e et leur budget), **Production** (commit servi) ;
   - le fil d'activité, les 50 dernières lignes ;
   - les missions en parallèle, une colonne chacune.
7. Aucun secret sur la page ni dans le journal (ni jeton, ni mot de passe, ni clé) ; un test le vérifie sur
   un journal d'exemple. La page est en français, sans jargon : « attend Jean-Guy », pas « blocked ».

## Preuves

8. Tests : le journal s'écrit par les hooks sur une session factice ; la page lit un journal d'exemple et
   affiche les états ; aucun secret ; `npm run atelier` démarre et répond.
9. Rendus : trois captures de la page (mission en cours, migration en attente, deux missions en parallèle)
   sur un journal d'exemple, pour relecture par Jean-Guy.

## Décisions à respecter

- M98 (parallèle et worktrees), CLAUDE.md « Flux de travail », les trois agents existants et leurs fichiers.
- Rien dans `src/`, rien dans `extension/`, aucune migration.

## Hors périmètre

- Un compte e2e séparé de `demo@` (mission courte à part, à lancer juste après) ; un tableau de bord en
  ligne (la page est locale, sur le Mac de Jean-Guy).

## Essai

`npm run atelier` → la page s'ouvre → lancer `/mission 120B` dans VS Code → voir l'architecte apparaître, le
plan, puis chaque agent passer en cours et terminé, les cartes Base et Essai se remplir, et l'orange quand
une migration attend. Fermer et rouvrir la page : l'historique est là.
