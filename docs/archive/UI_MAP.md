# UI_MAP

## Objectif

Décrire les écrans MVP d'ACM Studio.

Ce document sert à guider le développement front-end avec Next.js, Shadcn et Supabase.

Il ne décrit pas la vision produit.
Il décrit les écrans à construire.

---

# Navigation MVP

Connexion
↓
Dashboard
↓
Nouveau projet
↓
Bien vendeur
↓
Concurrents
↓
Builder
↓
Live
↓
Rapport Conseiller
↓
Export PowerPoint

---

# 1. Connexion

## URL

/auth/login

## Objectif

Permettre à un utilisateur de se connecter.

## Données

users  
agencies

## Composants

LoginForm  
AuthLayout

## Actions

- saisir email
- saisir mot de passe
- se connecter
- rediriger vers dashboard

## Sortie

/dashboard

---

# 2. Dashboard

## URL

/dashboard

## Objectif

Afficher les projets de l'agence.

## Données

projects  
properties  
users

## Composants

DashboardHeader  
ProjectList  
ProjectCard  
CreateProjectButton

## Actions

- voir projets
- créer un projet
- ouvrir un projet existant

## Sortie

/projects/new  
/projects/[projectId]

---

# 3. Nouveau projet

## URL

/projects/new

## Objectif

Créer un dossier vendeur.

## Données

projects

## Composants

CreateProjectForm

## Champs

- nom vendeur
- conseiller
- statut
- date création

## Actions

- créer projet
- sauvegarder
- rediriger vers bien vendeur

## Sortie

/projects/[projectId]/property

---

# 4. Bien vendeur

## URL

/projects/[projectId]/property

## Objectif

Renseigner le bien du vendeur.

## Données

properties

## Composants

PropertyForm  
PhotoUploader  
PropertySummaryCard

## Champs

- adresse
- ville
- code postal
- surface
- terrain
- pièces
- chambres
- salles d'eau
- année
- DPE
- description
- photos

## Actions

- sauvegarder
- modifier
- ajouter photos
- passer aux concurrents

## Sortie

/projects/[projectId]/comparables

---

# 5. Concurrents

## URL

/projects/[projectId]/comparables

## Objectif

Ajouter les biens concurrents.

## Données

comparables

## Composants

ComparableList  
ComparableCard  
ComparableForm  
ComparableOrderControls

## Champs

- adresse
- prix
- surface
- pièces
- distance
- statut
- délai de vente
- baisse de prix
- photos
- commentaire
- ordre d'affichage

## Actions

- ajouter concurrent
- modifier concurrent
- supprimer concurrent
- réordonner concurrents
- générer Meeting Script

## Sortie

/projects/[projectId]/builder

---

# 6. Builder

## URL

/projects/[projectId]/builder

## Objectif

Préparer le déroulé du rendez-vous vendeur.

## Données

projects  
properties  
comparables  
meeting_scripts

## Composants

BuilderSidebar  
MeetingScriptPreview  
SellerPropertySection  
ComparableSequenceSection  
QuestionBlock  
GenerateScriptButton

## Actions

- vérifier ordre des slides
- vérifier questions
- générer le Meeting Script
- sauvegarder
- lancer le Live

## Sortie

/projects/[projectId]/live

---

# 7. Live

## URL

/projects/[projectId]/live

## Objectif

Animer le rendez-vous vendeur.

## Données

meeting_scripts  
seller_answers

## Composants

LiveLayout  
LiveSlide  
LiveNavigation  
SellerAnswerInput  
ProgressIndicator

## Séquence obligatoire

1. Présentation du bien vendeur sans prix
2. Présentation concurrent 1
3. Question : est-il comparable ?
4. Question : quel est son prix ?
5. Révélation du prix
6. Question : ce prix est-il cohérent ?
7. Révélation délai / baisse de prix
8. Question : pourquoi est-il encore disponible ?
9. Répéter pour chaque concurrent
10. Questions finales vendeur
11. Prix de mise en vente proposé par le vendeur
12. Expertise conseiller

## Actions

- avancer
- revenir
- saisir réponse vendeur
- sauvegarder automatiquement
- terminer rendez-vous

## Sortie

/projects/[projectId]/report

---

# 8. Rapport Conseiller

## URL

/projects/[projectId]/report

## Objectif

Afficher la synthèse du rendez-vous.

## Données

seller_answers  
perception_results  
reports

## Composants

ReportHeader  
PerceptionSummary  
PsychologicalCompetitorCard  
PriorityCriteriaList  
PricePerceptionBlock  
AdvisorRecommendationBlock  
ExportPptButton

## Contenu

- concurrent psychologique principal
- concurrent le plus dangereux
- meilleur rapport qualité/prix
- critères prioritaires vendeur
- perception du prix
- écarts de perception
- prix suggéré par le vendeur
- synthèse conseiller

## Actions

- générer rapport
- modifier synthèse conseiller
- exporter PowerPoint

## Sortie

/projects/[projectId]/export

---

# 9. Export PowerPoint

## URL

/projects/[projectId]/export

## Objectif

Générer un PowerPoint de restitution.

## Données

meeting_scripts  
reports

## Composants

ExportStatus  
DownloadPptButton

## Actions

- générer PowerPoint
- télécharger fichier
- revenir au rapport

## Sortie

Fichier .pptx
