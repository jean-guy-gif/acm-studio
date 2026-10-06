# EPIC 01 — Création d'un dossier vendeur

Version : 1.0

Statut : Draft

Priorité : P0 (Bloquant)

Sprint : 01

---

# 1. Vision

La création d'un dossier vendeur est le point d'entrée de tout ACM Studio.

Aucun autre module ne peut fonctionner sans un dossier.

Ce dossier représente un projet immobilier unique.

Toutes les données, analyses, concurrents, présentations et comptes rendus y seront rattachés.

Le dossier constitue la source unique de vérité.

---

# 2. Objectif métier

Permettre à un conseiller immobilier de créer un nouveau dossier vendeur en moins de 2 minutes.

Le logiciel doit ensuite être capable d'utiliser ce dossier pendant toute la vie du mandat.

---

# 3. Objectifs UX

Le conseiller ne doit jamais avoir l'impression de remplir un logiciel administratif.

Il doit avoir le sentiment de préparer un rendez-vous.

Le formulaire doit être extrêmement rapide.

Progressif.

Sans surcharge.

---

# 4. Objectifs psychologiques

Le logiciel doit donner immédiatement confiance.

Le conseiller doit ressentir :

"Je vais gagner du temps."

et non

"Je vais perdre 20 minutes à remplir un CRM."

---

# 5. User Story

En tant que conseiller immobilier,

je souhaite créer un dossier vendeur,

afin de préparer une Analyse Comparative de Marché complète entre le premier rendez-vous et le second rendez-vous.

---

# 6. Workflow

Accueil

↓

Bouton

"Nouveau dossier"

↓

Ouverture du formulaire

↓

Saisie des informations

↓

Validation

↓

Création du dossier

↓

Redirection automatique

vers

Le tableau de bord du dossier

---

# 7. Informations demandées

## Obligatoires

Nom du dossier

Nom du vendeur

Ville

Type de bien

Surface

Nombre de pièces

---

## Facultatives

Adresse

Quartier

Description

Commentaires

Téléphone

Email

Photos

Logo agence

Documents

---

IMPORTANT

Aucun prix demandé.

Jamais.

Le logiciel ne doit jamais demander :

"Quel prix souhaitez-vous ?"

---

# 8. Structure du dossier

Chaque dossier possède un identifiant unique.

Il contient ensuite :

Bien vendeur

Concurrents

Présentation

Réponses vendeur

Lecture du marché

Conclusion

Note conseiller

Historique

Documents

---

# 9. Base de données

Table

properties

Colonnes

id

agency_id

advisor_id

seller_name

title

city

district

address

property_type

surface

rooms

bedrooms

description

notes

status

created_at

updated_at

---

# 10. États possibles

Draft

Analyse en cours

Prêt

Présentation générée

R2 effectué

Mandat signé

Archivé

---

# 11. Actions possibles

Créer

Modifier

Dupliquer

Archiver

Supprimer

Exporter

---

# 12. Validation

Le bouton "Créer le dossier"

reste désactivé tant que :

Ville

Type

Surface

Pièces

ne sont pas renseignés.

---

# 13. Erreurs

Ville vide

Surface invalide

Connexion perdue

Erreur Supabase

Toutes les erreurs doivent être compréhensibles.

Jamais de message technique.

---

# 14. Sécurité

Chaque dossier appartient à une agence.

Chaque conseiller ne voit que ses dossiers.

Un responsable voit tous les dossiers de son agence.

---

# 15. Permissions

Conseiller

Créer

Modifier

Supprimer ses dossiers

Responsable

Voir tous les dossiers

Administrateur

Accès complet

---

# 16. Critères d'acceptation

✓ Création en moins de deux minutes

✓ Sauvegarde automatique

✓ Retour instantané

✓ Compatible mobile

✓ Compatible tablette

✓ Compatible ordinateur

✓ Aucun prix demandé

✓ Création d'un identifiant unique

---

# 17. MVP

Créer un dossier

Modifier

Supprimer

Archiver

---

# 18. Hors MVP

Gestion multi-vendeurs

Signature électronique

Synchronisation CRM

Agenda

---

# 19. Dépendances

Aucune

C'est le premier module du logiciel.

---

# 20. Tâches Claude Code

Créer la table Supabase

Créer les politiques RLS

Créer le formulaire React

Créer la validation Zod

Créer les Server Actions

Créer les tests

Créer la page Dashboard

Créer la navigation

Créer les composants UI

Créer les messages d'erreur

Créer les tests Playwright

Le module est considéré terminé uniquement lorsque tous les critères d'acceptation sont validés.
