# ARCHITECTURE

## Vision

ACM Studio est composé de trois applications :

- Builder
- Live
- Admin

Le flux métier est strictement le suivant :

Builder
↓
Meeting Script
↓
Live
↓
Perception Engine
↓
Rapport Conseiller
↓
Export PowerPoint

---

# Stack

- Next.js (App Router)
- TypeScript
- Supabase
- TailwindCSS
- Shadcn/ui
- OpenAI
- PptxGenJS
- Vercel

---

# Architecture

/src

    app/
    components/
    features/
    lib/
    hooks/
    services/
    prompts/
    ppt/
    types/
    supabase/

---

# Features

## Authentication

Responsable :

- connexion
- gestion utilisateur
- agence

---

## Builder

Responsable :

- création projet
- bien vendeur
- collecte informations
- ajout concurrents
- préparation Meeting Script

Entrée

Projet

Sortie

Meeting Script

---

## Meeting Script

Document central du rendez-vous.

Il contient :

- ordre des slides
- questions
- réponses attendues
- données marché
- médias

Aucune logique métier.

Uniquement les données à présenter.

---

## Live

Responsable :

Animation du rendez-vous.

Fonctions :

- navigation
- affichage
- saisie réponses vendeur
- progression

Le Live ne calcule rien.

Il enregistre uniquement.

---

## Perception Engine

Responsable :

Analyse des réponses vendeur.

Produit :

- concurrent psychologique
- perception marché
- critères prioritaires
- synthèse conseiller

Le moteur ne génère jamais de contenu graphique.

---

## Report

Construit :

- synthèse
- résumé rendez-vous
- rapport conseiller

---

## Export PPT

Transforme uniquement le Meeting Script
et le Report
en présentation PowerPoint.

Aucune logique métier.

---

## Admin

Responsable :

- utilisateurs
- agences
- statistiques
- paramètres
