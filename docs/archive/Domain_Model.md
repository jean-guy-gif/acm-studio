# ACM Studio

# Domain Model

Version : 1.0

Statut : Fondation

---

# Pourquoi ce document existe

Le Domain Model décrit tous les objets métiers d'ACM Studio.

Il constitue la référence absolue.

Toutes les Features.

Toutes les tables.

Toutes les APIs.

Toutes les interfaces.

Toutes les IA.

doivent utiliser ces objets.

Aucun autre objet métier ne peut être créé sans modification de ce document.

---

# Vue d'ensemble

ACM Studio repose sur une hiérarchie simple.

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

Market Analysis

↓

Presentation

↓

Meeting

↓

Report

---

# 1. Agency

Une agence possède :

Des conseillers.

Une identité graphique.

Des paramètres.

Des dossiers.

---

Responsabilités

Authentification

Branding

Utilisateurs

Facturation

---

# 2. Advisor

Le conseiller est l'utilisateur principal.

Il crée les dossiers.

Anime les rendez-vous.

Valide les analyses.

Décide du positionnement.

---

# 3. Project ⭐

Objet central.

TOUT est rattaché au Project.

Le Project représente :

Une mission vendeur.

Jamais un bien.

---

Un Project contient :

1 Subject Property

0..N Competitors

1 Analysis

1 Presentation

1 Meeting

1 Report

0..N Documents

0..N Photos

---

# 4. Subject Property

Le bien vendeur.

Jamais de prix.

Jamais d'estimation.

Le Subject Property est uniquement descriptif.

---

Contient

Adresse

Ville

Quartier

Surface

Pièces

Prestations

Photos

Description

Historique

---

# 5. Competitor

Un concurrent représente

Une annonce.

Jamais une estimation.

---

Il possède

Source

URL

Photos

Prix

Prix/m²

Prestations

Date

Historique

Score

---

# 6. Analysis

Produit automatiquement.

Contient

Prix moyen

Prix médian

Prix/m²

Durée

Prestations

Lecture du marché

Conclusions proposées

---

# 7. Presentation

La présentation vendeur.

Contient

Slides

Ordre

Animations

Graphiques

Branding

---

# 8. Meeting

Le rendez-vous.

Contient

Réponses vendeur

Chronologie

Temps

Notes

IPC

---

# 9. Report

Produit après le rendez-vous.

Contient

Résumé

IPC

Arguments

Objections

Positionnement

Compte rendu

---

# Relations

Agency

1

↓

N

Advisor

Advisor

1

↓

N

Project

Project

1

↓

1

Subject Property

Project

1

↓

N

Competitors

Project

1

↓

1

Analysis

Project

1

↓

1

Presentation

Project

1

↓

1

Meeting

Project

1

↓

1

Report

---

# Règles fondamentales

Un Project possède toujours un Subject Property.

Un Subject Property appartient toujours à un seul Project.

Un Competitor appartient toujours à un Project.

Une Analysis appartient toujours à un Project.

Une Presentation appartient toujours à un Project.

Un Meeting appartient toujours à un Project.

Un Report appartient toujours à un Project.

---

# Ce qui n'existe pas

Une estimation.

Une valeur vénale.

Un prix conseillé.

Ces notions n'existent pas dans le modèle métier.

Elles relèvent exclusivement du conseiller.

---

# Principes

Le logiciel prépare.

Le conseiller décide.

Le vendeur comprend.

---

Fin du document.
