# MISSION 26 — BOUCLAGE ASPIRATION, RECHERCHE DE CONCURRENTS, DURÉE DEVINÉE

## Statut

Réalisée.

## Classification

MVP bloquant

## Objectif

Boucler l'aspiration (photos, texte, caractéristiques) pour qu'elle fonctionne en conditions réelles sur les portails cibles (SeLoger, Bien'ici, Figaro, Green Acres), ajouter la recherche de concurrents multi-portails, et aligner la fiche 3 du Live sur le protocole ACM (durée devinée par le vendeur avant révélation).

Décisions produit validées par le propriétaire produit le 2026-08-17 :

1. fallback « coller le code de la page » quand un portail refuse la lecture serveur ;
2. ajout de la durée de commercialisation devinée par le vendeur (fiche 3 Live) ;
3. recherche de concurrents tentée sur les 4 portails — automatique quand le portail l'autorise, assistée (recherche pré-remplie + collage des résultats) sinon. Aucun contournement anti-bot (interdit produit, inchangé).

---

## 1. Correctifs d'extraction (vérifiés sur annonces réelles)

- **json-ld-extractor** : les nœuds « chrome de page » (Organization, WebSite, BreadcrumbList, ListItem, Person, RealEstateAgent, LocalBusiness, Review, FAQ…) ne fournissent plus ni champs ni images. Régression réelle corrigée : sur Propriétés Le Figaro, l'adresse du SIÈGE de l'agence (Paris) devenait la ville du bien, et le logo Google (lh3.googleusercontent.com) devenait la photo principale. Le même piège existait sur SeLoger (Organization avec adresse parisienne).
- **is-generic** : `googleusercontent` ajouté aux images génériques (logos/avis Google, jamais des photos d'annonces).
- **html-extractor** : « surface habitable » prioritaire sur un libellé « surface » générique (régression réelle : « surface totale 110,7 m² » gagnait sur « surface habitable 98 m² »).
- **figaro-extractor** (nouveau) : extracteur portail pour proprietes.lefigaro.fr ET immobilier.lefigaro.fr — prix/surface/ville depuis le titre, photos restreintes au CDN cdn.immobilier.lefigaro.fr.
- **detect-source** : ajout de immobilier.lefigaro.fr → « Figaro Immobilier ».
- **Photos Live** : `referrerPolicy="no-referrer"` sur toutes les images (certains CDN bloquent sur Referer inconnu mais servent sans Referer). Hotlink vérifié en réel : CDN Green Acres et SeLoger servent les photos depuis un site tiers, avec et sans Referer.

## 2. Import « coller le code de la page » (plan B anti-blocage)

- Nouvelle action serveur `import-comparable-html.ts` : mêmes gardes (authentification, agence, projet), AUCUNE requête distante ; le conseiller ouvre l'annonce dans SON navigateur, copie le code de la page (Cmd/Ctrl+U) et le colle. Même moteur d'extraction que l'import URL (URL d'origine requise : ancre des photos relatives + source).
- UI : zone de collage sur la page d'ajout, ouverte automatiquement quand le fetch échoue (« Le site a refusé… »). Limite 4 Mo. L'union des photos existantes est préservée.
- Rien n'est contourné : on analyse un contenu que le conseiller voit déjà ; la création finale reste la validation humaine existante.

## 3. Durée devinée par le vendeur (fiche 3 Live) — implémentée par la session locale

Ce volet a été développé EN PARALLÈLE, pendant cette mission, par la session de travail locale sur le poste de développement (migration `20260817150000_live_seller_estimated_days_on_market.sql`, colonne `seller_estimated_days_on_market integer` 0→36500, types régénérés par la CLI, page 3 avec durée observée masquée avant la devinette, verrou de navigation `can-advance-live-page.ts`, enregistrement par champ qui empêche un formulaire périmé d'écraser les autres réponses).

La version locale, déjà appliquée à la base locale et plus aboutie sur l'enregistrement par champ, **fait foi**. Le doublon développé dans cette mission (nom `seller_estimated_market_days`) a été abandonné avant toute écriture — aucune migration en double, aucun conflit livré. L'intégration croisée (volet Live local + volets import/recherche de cette mission) a été vérifiée : voir §5.

## 4. Recherche de concurrents (nouvelle feature `competitor-search`)

- `build-portal-search-urls.ts` : URLs de recherche pré-remplies des 4 portails à partir du bien vendeur (ville/CP/type, dérivés CÔTÉ SERVEUR).
- `search-competitors.ts` : tentative de lecture directe par portail via `fetchListingPage` (SSRF/timeout/taille inchangés). Portail qui refuse → statut « blocked » + bouton « Ouvrir la recherche » + collage de la page de résultats (`import-search-results-html.ts`).
- `extract-search-results.ts` : détection des fiches annonces par motifs d'URL réels (relevés en navigateur le 2026-08-17), lecture best-effort du prix/surface/pièces/photo par carte. Champ incertain → null.
- UI `/builder/[projectId]/comparables/find` : suggestions en cartes photo + « Retenir et importer » (ouvre la création avec l'URL pré-remplie → pipeline d'import existant) / « Voir l'annonce » / « Écarter ». Rien n'est persisté sans validation ; aucune donnée inventée.
- Lien « Trouver des concurrents » sur la page des biens concurrents.

## 5. Résultats des vérifications

- **Tests (base fusionnée : volet Live local + volets de cette mission)** : 444 verts (55 fichiers).
- **Typecheck / Prettier (périmètre livré) / Build** : verts. Build : nouvelle route `/builder/[projectId]/comparables/find` présente. ESLint : 2 erreurs restantes dans `live-comparative-shell.tsx` (`react-hooks/preserve-manual-memoization`), fichier en cours de travail de la session locale au moment de la vérification — hors périmètre de cette mission, à re-vérifier une fois la session locale terminée.
- **Terrain (navigateur réel, 2026-08-17)** — extraction exécutée avec le code du dépôt compilé tel quel :
  - Green Acres (annonce Nice Cimiez) : 13/13 champs + 20 photos ;
  - SeLoger (annonce Nice Cimiez) : 10/13 champs + 6 photos (manquent SdB/DPE/GES, rendus en composants graphiques) ;
  - Figaro (annonce Lège-Cap-Ferret) : ville, surface, prix, 11 photos corrects APRÈS correctifs (faux avant) ;
  - Bien'ici : SPA sans contenu serveur ni rendu fiable → échec contrôlé + collage/saisie manuelle (conforme) ;
  - Hotlink photos : vérifié OK (Green Acres, SeLoger), avec et sans Referer.

## 6. À faire sur le poste de développement (non exécutable dans l'environnement d'audit)

1. Une fois la session locale terminée : relancer `npm run test`, `npm run lint` (2 erreurs `live-comparative-shell.tsx` à confirmer résolues), `npm run typecheck`, `npm run build`.
2. `supabase db reset` puis tests SQL (la migration `20260817150000` est celle de la session locale).
3. Checklist navigateur : import URL réel, collage de code (annonce + page de résultats), boucle Live fiche 3 (devinette durée → révélation), recherche de concurrents, plein écran (checklist Mission 23 §10).

## Hors périmètre (inchangé)

Pas de navigateur headless, pas de contournement anti-bot, pas de téléchargement des photos dans Supabase Storage, pas d'estimation automatique, pas de DVF. Castorus / historique multi-source : V2.

Aucun commit. Aucun push. Revue CTO avant validation.
