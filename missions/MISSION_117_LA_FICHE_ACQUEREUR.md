# MISSION 117 — La fiche acquéreur

**Date** : 24/10/2026 · **Origine** : décision de Jean-Guy du 24/10, dossier stratégique du 22/10 :
« transformer une découverte acquéreur en visites, courriers propriétaire et collaborations confrère ».
Première des quatre missions du mode acquéreur (117 fiche → 118 biens idéaux → 119 dossier acquéreur →
120 actions dérivées). La lecture de notes manuscrites par IA (121) attend la fin des quatre.

Une branche, un `/valide`. Pas de push forcé. `npm run sauvegarde` avant la migration, soumise avant
d'être appliquée, comptage avant et après. Pas de `/valide` sans CI verte ni e2e vert.

## Objectif

Le conseiller enregistre une recherche acquéreur, la retrouve, la modifie, et le rapprochement
existant (M86, M99) s'en sert au lieu d'un formulaire jetable.

## Décisions prises pour cette mission (Jean-Guy, 24/10)

- **Un espace à part : « Acquéreurs »** (`/acquereurs`), au menu entre Prospection et Administration.
  Un acquéreur n'appartient à aucun dossier vendeur ; il vit par lui-même, dans son agence.
- **Saisie à la main** pour commencer ; ni photo ni import. Les champs sont ceux que le conseiller
  note en découverte, pas plus.
- **Le « Rapprochement acheteur » du Suivi (M86) reste**, jetable comme aujourd'hui ; il propose en
  plus « Enregistrer cette recherche », qui crée la fiche.

## Critères d'acceptation (testables à l'écran)

1. **La liste** `/acquereurs` : les fiches de l'agence, les miennes en tête, chaque ligne avec nom,
   type de bien, communes, budget, pièces, et la date de la dernière modification ; « Nouvel
   acquéreur » ; recherche par nom ; les fiches archivées n'apparaissent pas.
2. **La fiche**, en trois blocs, tout facultatif sauf le nom et au moins une commune :
   - *Qui* : nom, téléphone, e-mail, raison de l'achat (résidence principale, secondaire,
     investissement, autre), calendrier (dès maintenant, 3 mois, 6 mois, plus tard), notes libres ;
   - *Ce qu'il cherche* : type (appartement, maison), communes (plusieurs, avec les alias de M86 et
     les arrondissements de M99), budget idéal et budget plafond, pièces et chambres minimum, surface
     minimum, extérieur, parking, piscine, étage et ascenseur, DPE minimum, travaux acceptés ;
   - *Ses lignes rouges* : pour chaque critère de « ce qu'il cherche », le conseiller coche
     **indispensable** ou laisse **préférence** ; une liste libre de critères éliminatoires (texte).
3. **Le rapprochement existant lit la fiche** : « Rapprocher » sur une fiche ouvre le rapprochement de
   M86 pré-rempli (communes, pièces, surface, budget plafond + 5 %), avec ses trois groupes et ses
   actions, inchangés. Rien n'est enregistré par le rapprochement (M86).
4. **Statut** : en recherche (défaut), en visite, a acheté, abandonné ; un fait daté par changement ;
   « Archiver » = suppression douce, invisible partout (M93) ; un acquéreur archivé ne se rapproche pas.
5. **Cloisonnement** : une fiche se lit et se modifie dans son agence seulement ; un membre retiré ne
   lit rien (M105) ; le manager voit toutes les fiches de l'agence, le conseiller aussi (une agence
   partage ses acquéreurs, décision de Jean-Guy 24/10).
6. **Le dossier d'exemple** (M97) n'a pas d'acquéreur ; l'agence de démo (M114) en reçoit deux par
   « Préparer ma démo » (un appartement Antibes, une villa Mougins, cohérents avec les scénarios), à
   compter dans la remise à zéro.
7. Vocabulaire : « Acquéreur » partout (jamais « acheteur » dans le nouveau code ni à l'écran, sauf
   le « Rapprochement acheteur » existant, renommé « Rapprochement acquéreur ») ; jamais
   « estimation ». Tablette ok (M72).

## Base

8. Table `buyers` (id, agency_id, advisor_id, created_at, updated_at, archived_at, name, phone,
   email, purpose, timeline, notes, property_types[], cities[] (noms normalisés M71), budget_ideal,
   budget_max, rooms_min, bedrooms_min, surface_min, outdoor, parking, pool, floor_min, elevator,
   energy_rating_max, works_accepted, must_have[] (noms des critères indispensables),
   deal_breakers text, status, status_changed_at) ; RLS par agence, membre retiré exclu ; test SQL
   dans la CI ; `npm run nettoyer:test` la vide pour l'agence de test ; `gen:types`.

## Preuves

9. Tests : règles de validation (nom et commune obligatoires, budgets cohérents, pièces ≥ chambres),
   mapping fiche → `BuyerFacts` du rapprochement, statut un cran à la fois, archivage, vocabulaire.
10. `npm run e2e` vert : créer une fiche, la retrouver dans la liste, « Rapprocher » pré-rempli,
    changer le statut, archiver ; l'e2e `demo` ouvre les deux acquéreurs de la démo.

## Décisions à respecter

- M86, M99 (règles de rapprochement, communes et arrondissements), M93 (suppression douce), M97
  (exemple), M105 (membre retiré), M114 (démo : mêmes chemins de code), M72.
- Jamais « estimation ». On ne modifie ni `extension/` ni le Localisateur.

## Hors périmètre

- La recherche de biens hors du Suivi (118), le dossier remis à l'acquéreur (119), les courriers
  dérivés (120), la photo des notes (121). Les honoraires et le financement de l'acquéreur.

## Essai sur l'URL d'essai

Compte réel : « Acquéreurs » au menu → « Nouvel acquéreur » → nom, Antibes + Juan-les-Pins,
appartement, 3 pièces, 2 chambres, 65 m², budget 400 000 / 430 000, extérieur indispensable → enregistrer
→ la fiche est dans la liste → « Rapprocher » : le rapprochement s'ouvre pré-rempli et montre le
dossier vendeur signé d'Antibes s'il correspond → statut « En visite » → « Archiver » : disparue.
Compte démo : deux acquéreurs après « Préparer ma démo », zéro après remise à zéro puis deux à nouveau.
