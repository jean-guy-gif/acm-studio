# MISSION 12 — Subject Property (Bien vendeur)

## Contexte

Les missions précédentes ont permis de construire :

```text
Authentification
↓
Onboarding
↓
Bootstrap agence
↓
Shell applicatif
↓
Dossiers vendeurs
```

Chaque dossier vendeur (`projects`) existe désormais.

La prochaine étape consiste à rattacher le bien immobilier au dossier.

Le schéma de base contient déjà :

```text
subject_properties
```

Cette table représente exclusivement le bien du vendeur.

Il existe une relation :

```text
project
    │
    └── subject_property
```

Un dossier possède un seul bien.

Aucun prix ne doit être enregistré.

---

# Objectif

Permettre au conseiller de :

* créer la fiche du bien ;
* modifier la fiche ;
* consulter la fiche.

Aucune estimation.

Aucune IA.

Aucun comparable.

---

# Périmètre

Table concernée uniquement :

```text
subject_properties
```

Ne jamais utiliser :

```text
comparables
meeting_scripts
meeting_sessions
seller_answers
perception_results
reports
exports
audit_logs
```

---

# Champs concernés

Utiliser uniquement les colonnes déjà présentes.

Créer/modifier :

```text
property_type
surface_area
land_area
rooms_count
bedrooms_count
bathrooms_count
energy_rating
address
postal_code
city
description
strengths
weaknesses
```

Ne jamais afficher :

```text
photo_urls
```

Les photos seront traitées plus tard.

---

# Données JSON

Les colonnes :

```text
strengths
weaknesses
```

restent du JSON.

Pour le MVP :

les éditer sous forme :

```text
textarea
```

Une ligne = un élément.

Conversion :

```text
textarea
↓

[
 "élément 1",
 "élément 2"
]
```

Et inversement.

Ne pas créer d'éditeur complexe.

---

# À réaliser

## 1. Feature

Créer :

```text
src/features/subject-property/
```

Structure recommandée :

```text
types.ts

queries/
get-subject-property.ts

actions/
save-subject-property.ts

utils/
textarea-array.ts
```

---

## 2. Lecture

Créer :

```text
getSubjectProperty(projectId)
```

Filtrer obligatoirement :

```text
project_id
agency_id
```

Retour :

```text
SubjectProperty | null
```

---

## 3. Sauvegarde

Créer une Server Action.

Si aucun bien :

```text
INSERT
```

Sinon :

```text
UPDATE
```

Le client ne fournit jamais :

```text
agency_id
project_id
```

Ils proviennent :

```text
profil
+
URL
```

---

## 4. Nouvelle page

Créer :

```text
/builder/[projectId]/property
```

Titre :

```text
Bien vendeur
```

Formulaire :

```text
Type de bien

Surface

Terrain

Pièces

Chambres

Salles de bains

Classe DPE

Adresse

Code postal

Ville

Description

Points forts

Points faibles
```

Bouton :

```text
Enregistrer
```

---

## 5. Page dossier

Modifier :

```text
/builder/[projectId]
```

Ajouter :

```text
Bien vendeur
```

avec un lien :

```text
Compléter la fiche
```

vers :

```text
/ builder / [projectId] / property
```

---

## 6. Validation

Surface :

```text
>= 0
```

Terrain :

```text
>= 0
```

Pièces :

```text
>= 0
```

Chambres :

```text
>= 0
```

SDB :

```text
>= 0
```

Adresse vide autorisée.

Description vide autorisée.

---

## 7. Multi-tenant

Toutes les requêtes doivent filtrer :

```text
agency_id = profile.agency_id
```

Même si RLS existe.

---

# Comportement attendu

Cas 1

Projet valide.

Pas encore de bien.

↓

Le formulaire est vide.

Enregistrer.

↓

INSERT.

---

Cas 2

Projet déjà renseigné.

↓

Le formulaire est pré-rempli.

Modifier.

↓

UPDATE.

---

Cas 3

Projet inexistant.

↓

404.

---

Cas 4

Projet autre agence.

↓

404.

---

# Tests

Tester :

* création ;
* modification ;
* relecture ;
* projet autre agence ;
* projet inexistant ;
* textarea ↔ JSON ;
* lint ;
* typecheck ;
* build ;
* format.

Supprimer ensuite toutes les données de test.

---

# Contraintes

Ne créer :

* aucune migration ;
* aucune dépendance ;
* aucun composant UI générique ;
* aucune IA ;
* aucun upload photo ;
* aucun prix.

---

# Rapport final

Le rapport devra contenir :

1. fichiers créés ;
2. fichiers modifiés ;
3. fonctionnement lecture ;
4. fonctionnement sauvegarde ;
5. conversion textarea ↔ JSON ;
6. tests création ;
7. tests modification ;
8. tests multi-tenant ;
9. tests 404 ;
10. lint ;
11. typecheck ;
12. build ;
13. format ;
14. nettoyage ;
15. git diff ;
16. git status.

Ne pas effectuer le commit.

---

# Commit prévu

```text
feat(property): add seller property management
```

---

# Definition of Done

La mission est validée si :

* un bien peut être créé ;
* un bien peut être modifié ;
* la page est pré-remplie ;
* aucun prix n'est enregistré ;
* aucun comparable n'est utilisé ;
* le multi-tenant est respecté ;
* les JSON strengths / weaknesses fonctionnent ;
* lint est vert ;
* typecheck est vert ;
* build est vert ;
* aucun commit n'est effectué.
