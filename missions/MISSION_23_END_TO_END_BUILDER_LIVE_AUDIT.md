# MISSION 23 — AUDIT TRANSVERSAL BUILDER → LIVE

## Statut
Réalisée.

## Classification
MVP

## Objectif produit
Auditer le parcours complet ACM Studio sur un dossier vendeur réel, depuis la création du projet jusqu’à la présentation Live.

Cette mission n’ajoute pas de nouveau module métier. Elle vérifie que les fonctionnalités déjà développées forment un produit cohérent, fluide et utilisable sans assistance technique.

## Rappel du périmètre
ACM Studio n’est pas un CRM, un moteur d’estimation automatique ni un outil DVF.

ACM Studio sert à :
- structurer les biens concurrents actuellement sur le marché ;
- analyser les tendances du marché concurrentiel ;
- rendre ces tendances compréhensibles pour le vendeur ;
- renforcer l’estimation réalisée par le conseiller à partir des biens vendus, de la connaissance locale et des qualités/défauts intrinsèques du bien.

Toute formulation laissant penser qu’ACM Studio remplace l’estimation du conseiller doit être corrigée.

## Parcours à auditer
```text
Création du projet
→ fiche bien vendeur
→ diagnostics et copropriété
→ ajout des comparables
→ import URL
→ sélection
→ synthèse
→ analyse du marché concurrentiel
→ positionnement
→ décision du conseiller
→ préparation de la présentation
→ ouverture dans Live
```

## Scénario de test
Créer un dossier réaliste avec :
- un appartement complet ;
- diagnostics partiels ;
- copropriété renseignée ;
- 6 comparables retenus ;
- 2 comparables écartés ;
- 1 comparable atypique ;
- plusieurs sources ;
- plusieurs niveaux de prix et surfaces ;
- au moins un comparable incomplet ;
- quelques photos manquantes.

Ne pas utiliser de données sensibles réelles non nécessaires.

## Audit fonctionnel
Vérifier :
1. création du projet ;
2. création et mise à jour du bien vendeur ;
3. diagnostics et copropriété ;
4. ajout manuel et import URL des comparables ;
5. sélection, désélection et ordre ;
6. synthèse ;
7. analyse du marché ;
8. positionnement ;
9. décision enregistrée ;
10. présentation Builder ;
11. Live en lecture seule.

Pour chaque étape, contrôler :
- résultat attendu ;
- résultat observé ;
- messages d’erreur ;
- état vide ;
- sauvegarde ;
- rechargement ;
- navigation ;
- cohérence des données ;
- absence de NaN, Infinity ou données inventées.

## Audit UX
Vérifier sur chaque écran :
- titre clair ;
- action principale identifiable ;
- navigation compréhensible ;
- absence de cul-de-sac ;
- erreurs près des champs ;
- confirmation après sauvegarde ;
- cohérence des boutons et libellés ;
- unités visibles ;
- responsive ;
- absence de débordement horizontal ;
- lisibilité sur tablette.

## Audit du vocabulaire
Éviter :
- estimation automatique ;
- prix calculé du bien ;
- valeur réelle ;
- prix juste ;
- recommandation automatique.

Privilégier :
- analyse du marché concurrentiel ;
- positionnement observé ;
- fourchette de concurrence ;
- tendances du marché ;
- élément complémentaire à l’estimation ;
- décision du conseiller ;
- prix conseillé par le professionnel.

## Audit technique
Vérifier :
- absence d’erreur console ;
- absence d’erreur réseau ;
- absence de double soumission ;
- routes protégées ;
- isolation multi-agence ;
- actions serveur cohérentes ;
- RLS intactes ;
- migrations propres ;
- types Supabase cohérents ;
- aucun secret exposé ;
- aucune duplication de règles métier ;
- Live strictement en lecture seule.

## Audit de sécurité
Tester :
- accès non authentifié ;
- projet d’une autre agence ;
- modification et suppression inter-agence ;
- lecture diagnostics/copropriété/positionnement d’une autre agence ;
- soumission avec identifiant falsifié ;
- absence de service-role dans le navigateur.

## États incomplets
Tester :
- projet sans bien ;
- bien sans surface ;
- aucun comparable ;
- moins de trois comparables ;
- comparable incomplet ;
- positionnement impossible ;
- décision absente ;
- décision obsolète ;
- diagnostics absents ;
- hors copropriété ;
- aucune photo ;
- section Live indisponible.

## Classification des anomalies
- Bloquant MVP : empêche le parcours ou crée un risque de sécurité/corruption.
- Majeur MVP : parcours possible mais trompeur ou très difficile.
- Mineur MVP : défaut visible non bloquant.
- V2 : utile mais non nécessaire au pilote.
- V3/Backlog : sophistication sans impact immédiat.

## Règle de correction
Corriger uniquement :
- les anomalies bloquantes MVP ;
- les anomalies majeures MVP ;
- les défauts mineurs très simples et sans risque.

Ne pas corriger :
- les idées V2 ;
- les optimisations prématurées ;
- les refontes graphiques globales ;
- les nouvelles fonctionnalités.

## Tests manuels obligatoires
Exécuter le parcours sur :
- ordinateur ;
- viewport tablette ;
- un projet complet ;
- un projet incomplet ;
- un scénario inter-agence.

Documenter chaque étape.

## Tests automatisés
Ajouter uniquement les tests nécessaires aux anomalies corrigées.

Ne pas créer une infrastructure lourde si elle n’existe pas déjà.

## Livrable d’audit
Créer :
```text
audits/AUDIT_MVP_BUILDER_LIVE.md
```

Contenu :
1. scénario testé ;
2. environnement ;
3. parcours exécuté ;
4. anomalies détectées ;
5. classification ;
6. corrections réalisées ;
7. anomalies restantes ;
8. décisions V2/V3 ;
9. résultat final ;
10. recommandation GO / NO-GO pilote.

## Critère GO pilote
GO PILOTE uniquement si :
- aucun blocage MVP ne reste ;
- aucun risque de sécurité connu ne reste ;
- le parcours complet fonctionne ;
- la décision conseiller est persistée ;
- la présentation Builder est cohérente ;
- Live fonctionne en lecture seule ;
- les données manquantes sont gérées ;
- le vocabulaire ne présente pas ACM Studio comme un outil d’estimation automatique ;
- tests, lint, typecheck et build sont verts.

Sinon : NO-GO PILOTE avec liste exacte des blocages.

## Hors périmètre
### V2
- refonte graphique complète ;
- thème agence ;
- export PDF ;
- partage externe ;
- historique complet ;
- mode hors ligne ;
- personnalisation Live ;
- analytics ;
- gestion documentaire.

### V3
- IA ;
- narration automatique ;
- estimation automatique ;
- prédiction ;
- CRM ;
- automatisation commerciale.

## Definition of Done
- scénario réaliste exécuté ;
- parcours complet audité ;
- ordinateur et tablette vérifiés ;
- sécurité inter-agence vérifiée ;
- anomalies classées ;
- blocages corrigés ;
- tests ajoutés si nécessaire ;
- vocabulaire vérifié ;
- rapport d’audit créé ;
- décision GO / NO-GO produite ;
- mission laissée au statut À réaliser. avant revue CTO ;
- aucun commit ;
- aucun push.

## Contrôles obligatoires
```bash
npm run test
npm run lint
npm run typecheck
npm run build
npm run format:check
supabase db reset
```

Exécuter également les tests SQL concernés par les corrections.

## Livrables attendus
Fournir :
- résumé du parcours exécuté ;
- scénario de test ;
- anomalies détectées ;
- classification ;
- corrections réalisées ;
- fichiers créés et modifiés ;
- tests ajoutés ;
- résultats des contrôles ;
- rapport audits/AUDIT_MVP_BUILDER_LIVE.md ;
- décision GO / NO-GO pilote ;
- git diff ;
- git status ;
- points de vigilance restants.

Aucun commit.
Aucun push.

Une revue CTO sera effectuée avant validation.