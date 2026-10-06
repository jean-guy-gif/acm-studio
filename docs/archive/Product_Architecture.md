# ACM Studio

# Product Architecture

Version : 1.0

Statut : Fondation

Priorité : Critique

---

# Vision

ACM Studio n'est pas un logiciel.

ACM Studio est une plateforme.

Chaque module possède une responsabilité unique.

Les modules communiquent entre eux.

Ils ne se remplacent jamais.

---

# Architecture générale

ACM Studio

│

├── Builder

├── Live

├── Admin

└── API

---

# Builder

Mission

Préparer le rendez-vous vendeur.

Le conseiller travaille ici entre le premier et le second rendez-vous.

Le vendeur n'y accède jamais.

---

Builder contient

Dashboard

Projets

Import

Concurrents

Analyse

Présentation

Branding

Exports

---

Objectif

Construire le meilleur dossier possible.

---

# Live

Mission

Animer le rendez-vous vendeur.

Live est utilisé uniquement pendant le rendez-vous.

Aucun menu complexe.

Aucune distraction.

Une seule mission :

Faire vivre la méthode ACM.

---

Live contient

Présentation plein écran

Questions interactives

Réponses vendeur

Navigation

Mode conseiller

Mode présentation

Chronomètre

Notes rapides

---

Objectif

Créer une expérience fluide.

Le conseiller ne manipule jamais un logiciel.

Il anime une discussion.

---

# Admin

Mission

Configurer ACM Studio.

---

Admin contient

Agence

Conseillers

Branding

Templates

Bibliothèque

Abonnement

Facturation

Utilisateurs

Permissions

Journal

---

# API

Mission

Faire communiquer tous les modules.

Aucune logique métier dans le Frontend.

Toute décision métier passe par l'API.

---

# Navigation

Connexion

↓

Dashboard

↓

Projet

↓

Builder

↓

Live

↓

Rapport

↓

Dashboard

---

# Cycle de vie

Projet créé

↓

Import

↓

Analyse

↓

Validation

↓

Présentation

↓

Live

↓

Compte rendu

↓

Archivage

---

# Communications

Builder

↓

Analysis Engine

↓

Presentation Engine

↓

Live

↓

IPC Engine

↓

Advisor Report

---

# Les moteurs

Extraction Engine

Lecture PDF

Lecture captures

Lecture annonces

---

Analysis Engine

Calculs

Scoring

Statistiques

Lecture marché

---

Presentation Engine

Slides

Graphiques

Branding

Exports

---

IPC Engine

Réponses vendeur

Perception

Profil

Conseils

---

Coach Engine

Préparation R2

Objections

Questions

Conseils

---

# Les données

Agency

↓

Advisor

↓

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

Responses

↓

Report

---

# Les composants

Builder UI

Live UI

Charts

Cards

Slides

Tables

Timeline

Questions

Forms

Navigation

---

# Les exports

PowerPoint

PDF

Compte rendu

Rapport conseiller

Synthèse marché

---

# Principes d'architecture

Un module

Une responsabilité.

Un écran

Une mission.

Une slide

Une idée.

Une IA

Une spécialité.

Aucune duplication.

---

# Ce qui est interdit

Le Builder ne doit jamais contenir le mode Live.

Le Live ne doit jamais afficher des écrans d'administration.

L'Admin ne doit jamais modifier une présentation en cours.

Les moteurs IA ne modifient jamais directement les données sans validation.

---

# Objectif long terme

Faire d'ACM Studio la plateforme de référence de préparation et de conduite des rendez-vous vendeurs immobiliers.

Le logiciel prépare.

Le conseiller anime.

Le vendeur comprend.

Le mandat devient la conséquence logique du rendez-vous.
