# DEVELOPMENT_RULES.md

# ACM Studio — Development Rules

Version : 1.0

Statut : Référence de développement

Priorité : Critique

---

# Objectif

Ce document définit les règles officielles de développement d'ACM Studio.

Il complète la documentation produit.

Il ne décrit pas le métier.

Il décrit la manière de construire le logiciel.

Toutes les contributions (humaines ou IA) doivent respecter ces règles.

---

# Documents de référence

Avant toute implémentation, lire dans cet ordre :

1. CLAUDE.md
2. DEVELOPMENT_RULES.md
3. TASKS.md
4. ARCHITECTURE.md
5. DATABASE.md
6. UI_MAP.md
7. La documentation de la Feature concernée dans /docs

Aucune implémentation ne doit être réalisée sans respecter ces documents.

---

# Objectif du MVP

Le MVP doit uniquement permettre :

- créer un dossier vendeur
- ajouter le bien vendeur
- ajouter les concurrents
- générer un Meeting Script
- conduire le rendez-vous vendeur (Live)
- enregistrer les réponses vendeur
- générer un rapport conseiller
- exporter un PowerPoint

Toute autre fonctionnalité appartient à la V2.

---

# Règle 1 — Une mission = un objectif

Chaque mission Claude Code possède un seul objectif.

Interdit :

- développer plusieurs fonctionnalités
- corriger des bugs non liés
- améliorer le design sans demande
- ajouter une idée personnelle
- anticiper une fonctionnalité V2

---

# Règle 2 — Une PR = une intention

Chaque Pull Request ou commit doit être compréhensible immédiatement.

Exemples :

```text
chore: initialize project

feat(project): create seller project

feat(property): add subject property form

feat(competitors): create competitors CRUD

feat(builder): generate meeting script
```

Interdit :

```text
update

fix

divers

test

wip

misc
```

---

# Règle 3 — Développer du bas vers le haut

Toujours construire dans cet ordre :

1. Type
2. Validation (Zod)
3. Service
4. Action serveur
5. UI
6. Tests

Ne jamais commencer par l'interface.

---

# Règle 4 — Pas de logique métier dans React

Les composants React affichent.

Ils ne prennent aucune décision métier.

Toute logique métier appartient aux services.

Interdit :

- calculs métier dans un composant
- accès direct à Supabase depuis un composant
- logique de validation complexe dans React

---

# Règle 5 — Organisation des Features

Chaque Feature possède sa propre structure.

Exemple :

```text
features/projects/

components/

services/

actions/

schemas/

types/

hooks/
```

Une Feature ne dépend jamais directement d'une autre.

---

# Règle 6 — Typage

Tout objet métier possède un type TypeScript.

Interdit :

- any
- unknown utilisé par facilité
- objets anonymes

---

# Règle 7 — Validation

Toute donnée utilisateur est validée avec Zod.

Sans exception.

---

# Règle 8 — Base de données

Supabase est la source de vérité.

Chaque table possède :

- id
- created_at
- updated_at (si nécessaire)
- RLS activé
- isolation par agence

Aucune table sans politique RLS.

---

# Règle 9 — Sécurité

Ne jamais exposer :

- OPENAI_API_KEY
- SUPABASE_SERVICE_ROLE_KEY
- données d'une autre agence

Toutes les routes sensibles doivent être protégées.

---

# Règle 10 — Meeting Script

Le Meeting Script est le contrat entre Builder et Live.

Builder produit le Meeting Script.

Live lit le Meeting Script.

Live ne recalcule jamais son contenu.

---

# Règle 11 — Live

Le Live est un moteur interactif.

Il ne doit jamais être considéré comme un PowerPoint.

Pour chaque concurrent :

1. Présentation sans prix
2. Question : est-il comparable ?
3. Question : quel est son prix ?
4. Révélation du prix
5. Question : prix cohérent ?
6. Révélation délai / baisse
7. Question : pourquoi est-il encore disponible ?

Toutes les réponses sont enregistrées.

---

# Règle 12 — IA

L'IA prépare.

Le conseiller décide.

Le vendeur comprend.

L'IA peut :

- résumer
- reformuler
- extraire
- assister

L'IA ne peut jamais :

- estimer automatiquement le bien vendeur
- inventer un concurrent
- inventer des données
- contourner une validation humaine

---

# Règle 13 — Structure des fichiers

Objectifs :

Composant React :

- maximum 300 lignes

Service :

- maximum 500 lignes

Action :

- maximum 250 lignes

Si un fichier devient trop gros, il est découpé.

---

# Règle 14 — Design

Desktop prioritaire.

Tablet compatible.

Mobile non prioritaire pour le MVP.

Le design doit être :

- sobre
- rapide
- lisible
- professionnel

Les animations doivent rester discrètes.

---

# Règle 15 — Qualité

Avant chaque commit :

```bash
npm run lint

npm run build
```

Lorsque les tests seront disponibles :

```bash
npm run test
```

Aucun commit si le build échoue.

---

# Règle 16 — Données

Interdit :

- faux concurrents
- faux vendeurs
- fausses estimations
- faux rapports
- fausses statistiques
- faux historiques

Les données de démonstration devront être clairement identifiées.

---

# Règle 17 — Documentation

Ne créer de documentation que si elle sert immédiatement au développement.

Toute documentation inutile est supprimée.

---

# Règle 18 — Refactoring

Le refactoring est autorisé uniquement si :

- il simplifie le code
- il n'introduit aucun changement fonctionnel
- tous les tests restent verts
- il respecte les règles métier

---

# Règle 19 — Dépendances

Avant d'ajouter une nouvelle bibliothèque :

Vérifier :

- qu'elle répond à un besoin réel
- qu'elle est compatible avec la stack
- qu'elle n'est pas déjà couverte par une dépendance existante

Éviter toute dépendance inutile.

---

# Règle 20 — Definition of Done

Une tâche est considérée comme terminée uniquement si :

- le code compile
- le lint passe
- les tests passent (si présents)
- les types sont créés
- les validations sont présentes
- les erreurs sont gérées
- la logique métier respecte CLAUDE.md
- aucune donnée fictive n'a été introduite
- aucun élément V2 n'a été développé
- la documentation concernée reste cohérente

Sinon, la tâche n'est pas terminée.
