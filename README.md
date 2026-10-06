# ACM Studio

Préparer et conduire un rendez-vous vendeur interactif. Règles et contexte : `CLAUDE.md`.

- **Installer** : `npm install`, puis copier `.env.example` en `.env.local` et le remplir.
  Facultatif : `STREAM_ESTATE_API_KEY` (recherche Stream Estate, en essai).
- **Lancer** : `npm run dev`, puis `http://localhost:3000`.
- **Extension Chrome** : `chrome://extensions` → mode développeur → « Charger l'extension non
  empaquetée » → dossier `extension/`.
- **Tester** : `npm run typecheck`, `npm run lint`, `npm test`, `npm run format:check`,
  `npm run build` (la CI GitHub les rejoue à chaque push).
- **Déployer** : Vercel déploie `main` ; une migration s'applique à la main (`npx supabase db push`),
  après comptage sur la vraie base.
- **Missions** : `missions/MISSION_NN_*.md` ; `/mission NN` → essai → `/valide NN`. Décisions :
  `docs/DECISIONS.md` ; état du code : `docs/ETAT_DU_PRODUIT.md`.
