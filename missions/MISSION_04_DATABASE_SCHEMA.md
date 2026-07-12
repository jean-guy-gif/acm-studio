# MISSION 04 — Implémentation du schéma Supabase

## Contexte

Toute la phase de conception est terminée.

Le document `DATABASE.md` est désormais la source de vérité du modèle de données.

Il ne doit pas être interprété.

Il doit être appliqué.

Aucune modification fonctionnelle n'est autorisée.

---

# Objectif

Créer le schéma complet de la base Supabase conformément à `DATABASE.md`.

Cette mission ne développe aucune fonctionnalité métier.

Elle met uniquement en place l'infrastructure de données.

---

# À réaliser

Créer les migrations SQL nécessaires afin d'obtenir exactement le schéma décrit dans `DATABASE.md`.

Le résultat doit comprendre :

- toutes les tables
- toutes les colonnes
- tous les types
- toutes les clés primaires
- toutes les clés étrangères
- toutes les contraintes
- toutes les valeurs par défaut
- tous les index
- toutes les contraintes d'unicité
- toutes les conventions de nommage

Les tables concernées sont :

- agencies
- profiles
- projects
- subject_properties
- comparables
- meeting_scripts
- meeting_sessions
- seller_answers
- perception_results
- reports
- exports
- audit_logs

---

# Sécurité

Implémenter les règles RLS décrites dans `DATABASE.md`.

Créer :

- les politiques RLS
- l'activation du Row Level Security
- les accès correspondant exactement au document

Ne pas inventer de règles supplémentaires.

---

# Relations

Toutes les relations doivent être créées.

Les suppressions doivent respecter les règles définies dans `DATABASE.md`.

Aucune relation ne doit être oubliée.

---

# Index

Créer tous les index décrits dans `DATABASE.md`.

Ne pas ajouter d'index supplémentaires.

---

# Migration

Utiliser le système de migrations Supabase.

La migration doit pouvoir être rejouée sur une base vide.

Elle doit être déterministe.

---

# Interdictions

Ne pas créer :

- de données de démonstration
- de seed
- de scripts de tests
- de fonctions métier
- de triggers non présents dans DATABASE.md
- de vues non documentées
- de RPC non documentées
- de stockage Supabase
- d'API
- de composants React
- de logique applicative

Cette mission concerne uniquement le schéma.

---

# Vérifications

Avant de terminer :

- migration exécutable
- aucune erreur SQL
- aucune table manquante
- aucune colonne manquante
- aucune relation manquante
- RLS activé
- policies créées
- index créés
- formatage cohérent

---

# Livrables attendus

- migration SQL
- éventuels fichiers Supabase générés
- résumé des objets créés

---

# Commit

```
feat(database): implement initial supabase schema
```

---

# Definition of Done

La mission est validée si :

- le schéma est strictement conforme à `DATABASE.md`
- une base vide peut être migrée sans erreur
- toutes les tables existent
- toutes les relations existent
- toutes les contraintes existent
- toutes les policies existent
- tous les index existent
- aucune logique métier n'a été ajoutée