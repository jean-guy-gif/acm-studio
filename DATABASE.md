# DATABASE.md

# ACM Studio — Database Schema

Version : 1.0

Statut : Référence MVP

Priorité : Critique

---

# Objectif

Définir le modèle de données Supabase du MVP ACM Studio.

Ce document sert de référence pour créer les migrations SQL.

Aucune table ne doit être créée sans respecter ce document.

---

# Principes

- Supabase est la source de vérité.
- Toutes les tables utilisent des UUID.
- Toutes les tables métier sont rattachées à une agence.
- RLS obligatoire sur toutes les tables.
- Isolation stricte par agence.
- Aucun prix du bien vendeur n'est stocké au moment de la création du projet.
- Aucun calcul automatique d'estimation du bien vendeur.
- Le conseiller valide toujours les données.

---

# Tables MVP

## 1. agencies

Représente une agence immobilière.

### Colonnes

- id : uuid, primary key
- name : text, required
- logo_url : text, nullable
- primary_color : text, nullable
- created_at : timestamptz, required
- updated_at : timestamptz, required

### Relations

Une agence possède plusieurs profils.

---

## 2. profiles

Représente un utilisateur rattaché à une agence.

Utilise le même id que auth.users.

### Colonnes

- id : uuid, primary key, references auth.users(id)
- agency_id : uuid, references agencies(id)
- first_name : text, required
- last_name : text, required
- email : text, required
- role : text, required
- created_at : timestamptz, required
- updated_at : timestamptz, required

### Valeurs role

- owner
- admin
- advisor

### Relations

Un profile appartient à une agency.

---

## 3. projects

Représente un dossier vendeur.

### Colonnes

- id : uuid, primary key
- agency_id : uuid, references agencies(id)
- advisor_id : uuid, references profiles(id)
- seller_name : text, required
- seller_email : text, nullable
- seller_phone : text, nullable
- status : text, required
- created_at : timestamptz, required
- updated_at : timestamptz, required

### Valeurs status

- draft
- preparation
- ready_for_meeting
- meeting_completed
- archived

### Règle critique

Ne jamais stocker ici le prix estimé du bien vendeur.

---

## 4. subject_properties

Représente le bien du vendeur.

### Colonnes

- id : uuid, primary key
- agency_id : uuid, references agencies(id)
- project_id : uuid, references projects(id)
- address : text, nullable
- city : text, nullable
- postal_code : text, nullable
- property_type : text, nullable
- surface_area : numeric, nullable
- land_area : numeric, nullable
- rooms_count : integer, nullable
- bedrooms_count : integer, nullable
- bathrooms_count : integer, nullable
- energy_rating : text, nullable
- description : text, nullable
- strengths : jsonb, nullable
- weaknesses : jsonb, nullable
- photo_urls : jsonb, nullable
- created_at : timestamptz, required
- updated_at : timestamptz, required

### Règle critique

Aucun champ de prix vendeur dans cette table.

---

## 5. comparables

Représente un bien concurrent.

### Colonnes

- id : uuid, primary key
- agency_id : uuid, references agencies(id)
- project_id : uuid, references projects(id)
- title : text, nullable
- address : text, nullable
- city : text, nullable
- postal_code : text, nullable
- price : numeric, required
- surface_area : numeric, nullable
- land_area : numeric, nullable
- rooms_count : integer, nullable
- bedrooms_count : integer, nullable
- bathrooms_count : integer, nullable
- energy_rating : text, nullable
- days_on_market : integer, nullable
- price_drop_amount : numeric, nullable
- price_drop_percentage : numeric, nullable
- listing_url : text, nullable
- source : text, nullable
- photo_urls : jsonb, nullable
- advisor_notes : text, nullable
- display_order : integer, required
- is_selected : boolean, default true
- created_at : timestamptz, required
- updated_at : timestamptz, required

### Règles critiques

- Un comparable appartient toujours à un project.
- Un comparable est présenté seul pendant le Live.
- Le prix existe en base mais n'est révélé au vendeur qu'au bon moment.

---

## 6. meeting_scripts

Représente le scénario du rendez-vous généré par Builder.

### Colonnes

- id : uuid, primary key
- agency_id : uuid, references agencies(id)
- project_id : uuid, references projects(id)
- version : integer, required
- status : text, required
- script_json : jsonb, required
- created_by : uuid, references profiles(id)
- validated_at : timestamptz, nullable
- created_at : timestamptz, required
- updated_at : timestamptz, required

### Valeurs status

- draft
- validated
- used
- archived

### Règles critiques

- Builder produit le Meeting Script.
- Live lit le Meeting Script.
- Live ne recalcule pas le Meeting Script.
- Aucun Meeting Script ne peut être utilisé sans validation conseiller.

---

## 7. meeting_sessions

Représente un rendez-vous Live.

### Colonnes

- id : uuid, primary key
- agency_id : uuid, references agencies(id)
- project_id : uuid, references projects(id)
- meeting_script_id : uuid, references meeting_scripts(id)
- advisor_id : uuid, references profiles(id)
- status : text, required
- started_at : timestamptz, nullable
- completed_at : timestamptz, nullable
- created_at : timestamptz, required
- updated_at : timestamptz, required

### Valeurs status

- not_started
- in_progress
- completed
- cancelled

---

## 8. seller_answers

Représente une réponse du vendeur pendant le Live.

### Colonnes

- id : uuid, primary key
- agency_id : uuid, references agencies(id)
- project_id : uuid, references projects(id)
- meeting_session_id : uuid, references meeting_sessions(id)
- comparable_id : uuid, references comparables(id), nullable
- question_key : text, required
- answer_type : text, required
- answer_text : text, nullable
- answer_number : numeric, nullable
- answer_boolean : boolean, nullable
- answer_json : jsonb, nullable
- created_at : timestamptz, required

### Exemples question_key

- comparable_is_similar
- seller_guessed_price
- seller_price_reaction
- why_still_available
- most_dangerous_competitor
- best_value_competitor
- seller_suggested_listing_price

### Règle critique

Toutes les réponses vendeur doivent être enregistrées.

---

## 9. perception_results

Représente l'analyse de perception après rendez-vous.

### Colonnes

- id : uuid, primary key
- agency_id : uuid, references agencies(id)
- project_id : uuid, references projects(id)
- meeting_session_id : uuid, references meeting_sessions(id)
- psychological_competitor_id : uuid, references comparables(id), nullable
- best_value_competitor_id : uuid, references comparables(id), nullable
- most_dangerous_competitor_id : uuid, references comparables(id), nullable
- seller_suggested_price : numeric, nullable
- priority_criteria : jsonb, nullable
- perception_gaps : jsonb, nullable
- market_understanding_score : numeric, nullable
- summary_json : jsonb, nullable
- created_at : timestamptz, required

### Règle critique

Cette table analyse la perception du vendeur.

Elle ne produit jamais une estimation automatique du bien vendeur.

---

## 10. reports

Représente le rapport conseiller après le rendez-vous.

### Colonnes

- id : uuid, primary key
- agency_id : uuid, references agencies(id)
- project_id : uuid, references projects(id)
- meeting_session_id : uuid, references meeting_sessions(id)
- perception_result_id : uuid, references perception_results(id), nullable
- report_json : jsonb, required
- advisor_summary : text, nullable
- created_by : uuid, references profiles(id)
- created_at : timestamptz, required
- updated_at : timestamptz, required

### Règle critique

Le rapport est destiné au conseiller.

Il peut contenir des éléments internes non visibles par le vendeur.

---

## 11. exports

Représente les exports générés.

### Colonnes

- id : uuid, primary key
- agency_id : uuid, references agencies(id)
- project_id : uuid, references projects(id)
- report_id : uuid, references reports(id), nullable
- export_type : text, required
- file_url : text, nullable
- status : text, required
- created_by : uuid, references profiles(id)
- created_at : timestamptz, required

### Valeurs export_type

- pptx
- pdf

### Valeurs status

- pending
- completed
- failed

---

## 12. audit_logs

Représente les actions importantes.

### Colonnes

- id : uuid, primary key
- agency_id : uuid, references agencies(id)
- profile_id : uuid, references profiles(id), nullable
- project_id : uuid, references projects(id), nullable
- action : text, required
- entity_type : text, nullable
- entity_id : uuid, nullable
- metadata : jsonb, nullable
- created_at : timestamptz, required

### Exemples action

- project_created
- subject_property_updated
- comparable_created
- meeting_script_validated
- meeting_started
- meeting_completed
- report_generated
- export_created

---

# Index recommandés

Créer des index sur :

- profiles.agency_id
- projects.agency_id
- projects.advisor_id
- subject_properties.project_id
- comparables.project_id
- comparables.display_order
- meeting_scripts.project_id
- meeting_sessions.project_id
- seller_answers.project_id
- seller_answers.meeting_session_id
- perception_results.project_id
- reports.project_id
- exports.project_id
- audit_logs.agency_id
- audit_logs.project_id

---

# RLS

Règle générale :

Un utilisateur ne peut accéder qu'aux données de son agence.

Toutes les tables métier doivent filtrer par agency_id.

### Tables concernées

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

### Exception

agencies est visible uniquement si l'utilisateur appartient à cette agence.

---

# Fonctions utiles

Prévoir une fonction SQL :

## get_current_agency_id()

Retourne l'agency_id du profile connecté.

Utilisée dans les policies RLS.

---

# Conventions

- Noms de tables : snake_case pluriel.
- Colonnes : snake_case.
- IDs : uuid.
- Timestamps : timestamptz.
- JSON : jsonb.
- Pas de camelCase en base.
- Pas de logique métier dans les policies.
- Les policies protègent uniquement l'accès.

---

# Hors MVP

Ne pas créer maintenant :

- billing
- subscriptions
- teams avancées
- templates avancés
- historique détaillé des prix concurrents
- IA avancée
- scoring commercial complexe
- CRM complet
- notifications
- emails automatiques

---

# Décision

Ce schéma est la référence du MVP.

Toute modification devra être justifiée par une contrainte réelle de développement.