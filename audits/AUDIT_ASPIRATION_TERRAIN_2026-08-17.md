# AUDIT TERRAIN — ASPIRATION & CONFORMITÉ PRD (2026-08-17)

Audit complet du dossier ACM Studio demandé par le propriétaire produit : « être sûr à 95 % qu'on a un outil qui fonctionne tel que tous les PRD le mentionnent et qui soit utilisable de suite », avec un focus sur l'aspiration des photos, du texte et des caractéristiques.

> Méthode — trois niveaux de preuve : contrôles code (tests, typecheck, lint, build) · lecture de code vs PRD · **exécution du moteur d'extraction du dépôt (compilé tel quel) sur des annonces réelles ouvertes dans un navigateur réel**, portail par portail.

---

## 1. État général du dossier (avant intervention)

- 25 missions documentées, 405 tests verts, typecheck/lint/build verts.
- Parcours Builder → Live complet et conforme au protocole ACM (audit Mission 23 : GO PILOTE avec réserve d'interactif manuel).
- Le cœur Live (Mission 24) implémente fidèlement : fiche 1 sans prix ni délai, comparaison noir/vert/orange déterministe, prix deviné → révélé avec écart € et %, position relative, durée observée, « pourquoi toujours en vente ? », concurrent le plus dangereux (mosaïque avec prix révélés et réponses), valeur perçue vendeur, analyse conseiller saisie manuellement, écarts des trois repères, conclusion. Galerie photos mosaïque + visionneuse plein écran (clavier ← → Échap).

## 2. Verdict terrain de l'aspiration (annonces réelles, navigateur réel)

| Portail                                  | Accès serveur direct                                                        | Extraction sur HTML réel                                           | Photos                                                          |
| ---------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------ | --------------------------------------------------------------- |
| Green Acres                              | Généralement accessible                                                     | **13/13 champs**                                                   | **20 photos**, hotlink vérifié                                  |
| SeLoger                                  | Refus fréquent (DataDome) → plan B collage                                  | **10/13 champs** (SdB/DPE/GES graphiques)                          | 6 photos (mms.seloger.com), hotlink vérifié, avec ou sans query |
| Propriétés Le Figaro / Figaro Immobilier | Variable                                                                    | **Corrigé** : ville, surface, prix, description                    | 11 photos CDN Figaro (avant correctif : logo Google en photo 1) |
| Bien'ici                                 | SPA : aucun contenu serveur ; rendu client lent/instable même en navigateur | Échec contrôlé → collage si la page a rendu, sinon saisie manuelle | —                                                               |

**Anomalies réelles détectées et corrigées** (invisibles depuis les tests unitaires seuls) :

- **A1 (majeure)** — Pollution JSON-LD multi-nœuds : sur Figaro, la ville extraite était « Paris » (adresse du siège de l'agence, nœud Organization) et la 1re photo un logo Google. Le même nœud Organization piégeux existe sur SeLoger. Correctif : les nœuds non-immobiliers ne fournissent plus ni champs ni images + `googleusercontent` filtré. Vérifié corrigé sur l'annonce réelle (ville « Lège-Cap-Ferret », photos cdn.immobilier.lefigaro.fr).
- **A2 (majeure)** — Surface fausse sur Figaro : « surface totale 110,7 m² » gagnait sur « surface habitable 98 m² ». Correctif : « surface habitable » prioritaire. Vérifié corrigé (98).
- **A3** — Aucun extracteur Figaro : créé (2 domaines), prix/surface/ville depuis le titre, photos CDN Figaro.
- **A4 (robustesse photos Live)** — `referrerPolicy="no-referrer"` sur toutes les images de comparables (des CDN bloquent sur Referer inconnu mais servent sans Referer).

## 3. Écarts PRD → traités sur décision produit (2026-08-17)

1. **Portails protégés « utilisables de suite »** → fallback « coller le code de la page » (annonce ET page de résultats). Aucun contournement : le conseiller colle ce qu'il voit déjà dans son navigateur ; même moteur d'extraction ; création finale toujours validée par lui.
2. **Fiche 3 Live** — le mémo produit demande que le vendeur devine la durée de commercialisation avant révélation (comme le prix) ; Mission 24 affichait la durée directement. → Implémenté EN PARALLÈLE par la session de travail locale sur le poste de développement pendant cet audit (colonne `seller_estimated_days_on_market`, migration `20260817150000`, révélation progressive, verrou de navigation, enregistrement par champ). La version locale fait foi ; le doublon développé côté audit a été abandonné avant toute écriture. Intégration croisée vérifiée ici : 444 tests verts, typecheck et build verts sur la base fusionnée (2 erreurs ESLint restantes dans `live-comparative-shell.tsx`, fichier alors en cours de travail côté local).
3. **Recherche de concurrents sans coller de lien** (dans le mémo produit, couverte par aucune mission) → feature `competitor-search` : critères dérivés du bien vendeur côté serveur, tentative directe sur les 4 portails, suggestions à retenir/écarter, fallback assisté par portail bloqué. Rien n'est persisté sans validation.

## 4. Résultat des contrôles (après intervention, base fusionnée avec le volet Live local)

- **Vitest : 444/444 verts** (55 fichiers).
- **Typecheck, Prettier (périmètre livré), next build : verts** (build : nouvelle route `find` présente ; police Google non téléchargeable dans l'environnement d'audit, sans rapport avec le code). ESLint : 2 erreurs dans `live-comparative-shell.tsx` (fichier en cours de travail de la session locale, hors périmètre livré).
- Terrain post-correctifs : Figaro corrigé sur l'annonce réelle ; filtre JSON-LD vérifié sans perte sur Green Acres (nœud Organization vide) et SeLoger (RealEstateListing conservé, Organization piégeuse écartée).

## 5. Niveau de confiance et limites honnêtes

- **Aspiration quand le HTML est accessible (URL ou collage) : très haute confiance** — vérifiée sur pages réelles avec le code du dépôt.
- **Accès serveur direct aux portails protégés : par nature non garanti** (DataDome & co, interdiction produit de contourner). Le collage couvre ce cas à ~100 % tant que le conseiller voit l'annonce ; c'est LE geste à montrer en formation (Cmd/Ctrl+U → tout copier → coller).
- **Bien'ici** : le pire cas (SPA). Import automatique impossible sans contournement ; collage utile seulement si la page a fini de rendre ; sinon saisie manuelle (2 min avec le formulaire existant).
- **Recherche automatique** : dépend des mêmes accès ; l'expérience reste utile même 100 % bloquée (recherches pré-remplies + collage des résultats + import en 1 clic).
- **Restent à exécuter sur le poste de dev** (impossible dans cet environnement d'audit) : attendre la fin de la session locale puis relancer test/lint/typecheck/build, `supabase db reset` + tests SQL, checklist navigateur de la Mission 26 §6 et celle de l'audit Mission 23 (plein écran).

## 6. Recommandation

**GO PILOTE** sur le périmètre aspiration/recherche/Live comparatif, après exécution de la courte checklist poste de dev (§5). Formulation honnête pour les conseillers : « l'outil aspire tout ce qui est accessible ; quand un portail bloque, copiez-collez la page — jamais plus de 30 secondes ».
