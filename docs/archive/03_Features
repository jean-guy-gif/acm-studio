---
id: FEATURE-01-01

name: Create Project

epic: EPIC-01

version: 1.0

priority: P0

status: Draft

owner: Product

complexity: Medium

estimated_time: 2 jours

dependencies: None
---

# Résumé

Permettre au conseiller immobilier de créer un nouveau dossier vendeur en moins de 90 secondes.

La création d'un dossier est le point d'entrée obligatoire de tous les workflows ACM Studio.

Aucune analyse, aucun concurrent, aucune présentation ou rendez-vous ne peut exister sans projet.

---

# Pourquoi cette fonctionnalité existe

Aujourd'hui, les conseillers perdent du temps entre leur CRM, leurs notes personnelles et leurs présentations.

Le projet ACM Studio devient le conteneur unique.

Toutes les informations du dossier y seront rattachées.

Le conseiller n'aura jamais besoin de recréer plusieurs fois les mêmes informations.

---

# Objectifs métier

Créer rapidement un dossier.

Centraliser toutes les informations.

Servir de base à tous les modules.

Préparer le R2.

---

# Objectifs UX

Temps de création inférieur à 90 secondes.

Maximum deux écrans.

Aucune information inutile.

Progression naturelle.

Sauvegarde automatique.

---

# Objectifs psychologiques

Le conseiller doit avoir l'impression de démarrer un nouveau projet.

Pas de remplir un formulaire administratif.

Le logiciel doit inspirer confiance dès la première minute.

---

# Déclencheur

Depuis le Dashboard

Bouton

"Nouveau dossier ACM"

---

# Workflow

Dashboard

↓

Créer un dossier

↓

Ouverture du formulaire

↓

Saisie des informations obligatoires

↓

Validation

↓

Création du projet

↓

Création automatique des modules vides

↓

Redirection vers Builder

---

# Informations obligatoires

Nom du vendeur

Ville

Type de bien

Surface

Nombre de pièces

---

# Informations facultatives

Adresse

Quartier

Description

Commentaires

Téléphone

Email

Photos

Documents

Logo agence

---

# Modules créés automatiquement

Sujet vendeur

Concurrents

Analyse

Présentation

Mode Live

Réponses vendeur

Rapport conseiller

Exports

Historique

---

# Structure interne

Project

↓

Subject Property

↓

Competitors

↓

Analysis

↓

Presentation

↓

Meeting

↓

Report

---

# Base de données

Table

projects

Colonnes

id

reference

agency_id

advisor_id

title

seller_name

status

created_at

updated_at

---

Table

subject_properties

Colonnes

project_id

city

address

district

surface

rooms

bedrooms

description

notes

---

# Storage

Chaque projet possède automatiquement

/projects/{project_id}/

Puis

photos/

documents/

exports/

branding/

presentation/

---

# Référence projet

Chaque dossier reçoit automatiquement

ACM-2026-000001

ACM-2026-000002

...

Cette référence est utilisée :

dans les exports

dans les emails

dans les présentations

dans les recherches

---

# États

Draft

Collecte

Analyse

Validation

Présentation prête

Rendez-vous

Mandat

Archivé

---

# Règles métier

Toujours créer un identifiant unique.

Jamais demander le prix vendeur.

Jamais créer un concurrent automatiquement.

Toujours créer les dossiers Storage.

Toujours créer les modules vides.

---

# Validation

Impossible de continuer si

Ville absente

Surface vide

Type absent

Pièces absentes

---

# Erreurs

Ville inconnue

Surface négative

Erreur Supabase

Erreur réseau

Erreur authentification

---

# Interface

Composants

ProjectWizard

ProgressStepper

PropertyForm

SaveIndicator

CancelButton

CreateButton

---

# Backend

Server Action

createProject()

Retour

project_id

reference

created_at

---

# API

POST

/api/projects

GET

/api/projects/{id}

PATCH

/api/projects/{id}

DELETE

/api/projects/{id}

---

# Sécurité

Le projet appartient uniquement à son agence.

Toutes les requêtes passent par les politiques RLS.

Suppression logique uniquement.

---

# Journal

Créer automatiquement

Projet créé

Utilisateur

Date

Heure

Adresse IP

---

# Analytics

Mesurer

Temps de création

Nombre de projets créés

Nombre d'abandons

Temps moyen avant première analyse

---

# Tests

Créer un projet

Créer sans ville

Créer sans surface

Créer avec photos

Créer avec documents

Supprimer

Archiver

Créer hors connexion

---

# Critères d'acceptation

✓ Création < 90 secondes

✓ Sauvegarde automatique

✓ Compatible mobile

✓ Compatible desktop

✓ Référence générée

✓ Modules créés

✓ Storage créé

✓ Aucun prix demandé

✓ Aucun concurrent créé

---

# MVP

Création

Modification

Archivage

Suppression logique

---

# Hors MVP

Multi-vendeurs

CRM

Signature électronique

Synchronisation agenda

---

# Livrables Claude Code

Créer migration Supabase

Créer RLS

Créer Storage

Créer formulaire React

Créer validation Zod

Créer Server Action

Créer tests unitaires

Créer tests Playwright

Créer Storybook

Créer documentation technique

La Feature est terminée uniquement lorsque tous les tests passent et que les critères d'acceptation sont validés.
