# MISSION 20 — LIVE : LECTEUR DE PRÉSENTATION VENDEUR

## Statut

Réalisée.

---

# Classification

MVP

---

# Objectif produit

Construire la première interface Live utilisée pendant le rendez-vous vendeur.

Le module Live doit consommer le contrat `SellerPresentation` produit par la Mission 19.

Le conseiller prépare dans Builder.

Le conseiller présente dans Live.

Le vendeur comprend.

Le conseiller décide.

L’IA n’intervient pas.

---

# Principe fondamental

Live est un lecteur de présentation.

Live ne doit jamais devenir un second Builder.

Dans cette mission, le conseiller peut uniquement :

- ouvrir une présentation ;
- naviguer entre les sections ;
- afficher les informations en plein écran ;
- consulter les éléments préparés dans Builder.

Il ne peut pas :

- modifier le bien vendeur ;
- ajouter ou supprimer un comparable ;
- modifier la sélection des comparables ;
- changer le positionnement ;
- modifier la décision enregistrée ;
- persister une donnée ;
- déclencher une action IA.

---

# Objectif métier

Permettre au conseiller d’animer un rendez-vous vendeur avec une interface :

- claire ;
- lisible ;
- rassurante ;
- séquentielle ;
- utilisable sur ordinateur et tablette ;
- conçue pour être regardée à deux ou plusieurs personnes.

L’interface doit valoriser la compréhension, pas la densité d’information.

---

# Source de données

Réutiliser obligatoirement :

```ts
buildSellerPresentation()
```

Le module Live ne doit pas reconstruire la présentation.

La page Live doit charger les données du projet, puis appeler le même point d’entrée métier que le Builder.

Ne jamais dupliquer :

- les règles de sections ;
- les règles d’alertes ;
- les calculs de synthèse ;
- les calculs d’analyse ;
- le calcul du positionnement ;
- la détection de divergence ;
- la construction des comparables présentés.

---

# Route

Créer une route protégée :

```text
/live/[projectId]
```

Cette route constitue le lecteur de présentation vendeur.

---

# Accès

La page doit :

1. authentifier l’utilisateur ;
2. récupérer son agence ;
3. vérifier que le projet appartient à cette agence ;
4. charger les données nécessaires ;
5. appeler `buildSellerPresentation()` ;
6. afficher le lecteur.

Un utilisateur ne doit jamais accéder à un projet d’une autre agence.

Un projet inexistant ou inaccessible doit utiliser le comportement 404 ou interdit déjà validé dans le dépôt.

---

# Conditions d’ouverture

La présentation Live peut être ouverte même si son statut est `incomplete`.

Dans ce cas :

- les sections disponibles restent accessibles ;
- les sections indisponibles sont signalées ;
- une bannière de préparation incomplète est affichée ;
- aucune donnée n’est inventée.

Le système ne bloque pas le rendez-vous pour une donnée manquante.

Il informe le conseiller.

---

# Mode d’affichage

Créer deux modes :

```text
overview
presentation
```

## Mode overview

Le conseiller voit :

- le statut de préparation ;
- la liste des sections ;
- les sections disponibles ;
- les sections indisponibles ;
- les alertes principales ;
- un bouton `Démarrer la présentation`.

## Mode presentation

Le conseiller voit une section à la fois.

L’interface doit afficher :

- le titre de la section ;
- le contenu principal ;
- la progression ;
- les contrôles précédent / suivant ;
- un accès au sommaire ;
- une action plein écran.

---

# Ordre des sections

Respecter strictement l’ordre produit par `SellerPresentation.sections`.

Ordre MVP attendu :

1. Bien vendeur
2. Comparables retenus
3. Analyse du marché
4. Positionnement prix
5. Décision du conseiller
6. Prix souhaité vendeur
7. Points de vigilance

Ne pas réordonner les sections dans Live.

---

# Sections indisponibles

Une section avec :

```text
status = unavailable
```

doit rester visible dans le sommaire.

Elle doit afficher :

- son titre ;
- son statut indisponible ;
- la raison fournie par le contrat.

En mode présentation, la navigation peut :

- soit afficher une page indisponible explicite ;
- soit ignorer la section dans précédent / suivant.

Décision MVP recommandée :

- afficher la section indisponible si elle est ouverte depuis le sommaire ;
- ignorer les sections indisponibles dans la navigation séquentielle.

---

# Écran 1 — Bien vendeur

Afficher uniquement les données disponibles :

- photo principale ;
- galerie simple si plusieurs photos ;
- type de bien ;
- ville ;
- quartier ;
- surface ;
- nombre de pièces ;
- nombre de chambres ;
- DPE ;
- GES ;
- caractéristiques principales.

Ne pas afficher de champs vides sous forme de tirets répétés.

Ne jamais inventer une information absente.

---

# Écran 2 — Comparables retenus

Afficher uniquement les comparables fournis par `SellerPresentation`.

Respecter `display_order`.

Pour chaque comparable :

- photo principale ;
- titre ;
- ville ;
- quartier ;
- prix ;
- surface ;
- prix au m² ;
- pièces ;
- chambres ;
- DPE ;
- GES ;
- source ;
- indicateur atypique si applicable ;
- indicateur d’influence si applicable.

Prévoir :

- une vue grille ;
- une lecture confortable sur tablette ;
- aucune action de modification.

Le lien source ne doit pas être mis en avant pendant la présentation.

Il peut rester accessible discrètement si déjà présent dans le contrat.

---

# Écran 3 — Analyse du marché

Afficher les éléments essentiels uniquement :

- nombre de comparables ;
- prix médian ;
- prix moyen ;
- prix médian au m² ;
- prix moyen au m² ;
- plage de prix ;
- dispersion ;
- positionnement de la surface vendeur ;
- caractéristiques fréquentes ;
- répartition DPE ;
- répartition géographique ;
- comparables atypiques.

Ne pas reproduire toute la page Builder.

Le Live doit synthétiser.

---

# Écran 4 — Positionnement prix

Afficher clairement :

- borne basse ;
- valeur centrale ;
- borne haute ;
- niveau de dispersion ;
- score de confiance ;
- niveau de confiance ;
- comparables influents ;
- raisons factuelles.

La valeur centrale ne doit pas être présentée comme un prix imposé.

Le vocabulaire doit rester :

```text
Positionnement de marché observé
```

et non :

```text
Prix automatique
```

---

# Écran 5 — Décision du conseiller

Afficher la décision enregistrée :

- prix conseillé validé ;
- fourchette enregistrée ;
- niveau de confiance enregistré ;
- justification ;
- date de validation ;
- auteur si disponible.

Si la décision est `outdated` :

- conserver la décision visible ;
- afficher un avertissement discret ;
- ne jamais la remplacer par le calcul courant ;
- ne pas afficher une alerte dramatique devant le vendeur.

Formulation recommandée :

```text
Les données ont évolué depuis la validation de ce positionnement.
```

---

# Écran 6 — Prix souhaité vendeur

Afficher uniquement si un prix vendeur valide existe.

Présenter :

- prix souhaité vendeur ;
- écart avec le prix conseillé ;
- écart avec la valeur centrale ;
- position par rapport à la fourchette.

Ne pas utiliser de formulation culpabilisante.

Éviter :

```text
Prix irréaliste
```

Préférer :

```text
Au-dessus du marché observé
```

---

# Écran 7 — Points de vigilance

Afficher uniquement les alertes utiles au rendez-vous.

Ne pas montrer au vendeur des alertes purement techniques.

Créer une fonction de filtrage Live :

```ts
filterLiveWarnings()
```

Elle doit exclure les alertes internes ou de préparation qui n’apportent rien à la discussion vendeur.

Afficher uniquement les alertes métier pertinentes, par exemple :

- faible nombre de comparables ;
- forte dispersion ;
- confiance faible ;
- décision obsolète ;
- comparables atypiques réintégrés ;
- prix vendeur absent si la section est montrée au conseiller.

Le filtrage doit être déterministe.

---

# Navigation

Créer une navigation simple :

- précédent ;
- suivant ;
- sommaire ;
- numéro de section ;
- progression ;
- quitter Live.

Raccourcis clavier MVP :

- `ArrowLeft` : section précédente ;
- `ArrowRight` : section suivante ;
- `Escape` : quitter le plein écran ;
- `f` : activer ou quitter le plein écran lorsque le navigateur l’autorise.

Ne pas bloquer le fonctionnement si l’API Fullscreen n’est pas disponible.

---

# Plein écran

Créer une action `Plein écran`.

Utiliser l’API navigateur uniquement côté client.

Gérer proprement :

- API indisponible ;
- refus utilisateur ;
- sortie plein écran ;
- état synchronisé.

Aucune erreur ne doit casser la présentation.

---

# État de navigation

L’état de navigation reste local au composant Live.

Ne pas persister :

- la section courante ;
- le mode overview/presentation ;
- l’état plein écran.

Ne pas utiliser :

- base de données ;
- cookie ;
- localStorage ;
- sessionStorage.

Un rechargement peut revenir au sommaire.

C’est acceptable pour le MVP.

---

# Architecture

Créer :

```text
src/features/live-presentation/

  components/
    live-presentation-shell.tsx
    live-overview.tsx
    live-section-navigation.tsx
    live-section-progress.tsx
    live-unavailable-section.tsx
    live-property-section.tsx
    live-comparables-section.tsx
    live-market-analysis-section.tsx
    live-price-positioning-section.tsx
    live-advisor-decision-section.tsx
    live-seller-price-section.tsx
    live-warnings-section.tsx
    fullscreen-button.tsx

  services/
    filter-live-warnings.ts
    get-live-sections.ts

  types/
    live-presentation.ts
```

Créer la page :

```text
src/app/(protected)/live/[projectId]/page.tsx
```

Les composants métier restent présentationnels.

Le shell client gère uniquement :

- mode overview/presentation ;
- section active ;
- navigation ;
- plein écran ;
- raccourcis clavier.

---

# Réutilisation obligatoire

Réutiliser :

```ts
buildSellerPresentation()
```

Réutiliser également les composants ou utilitaires existants lorsque leur usage ne crée pas de dépendance Builder inadaptée.

Ne pas importer directement des composants Builder interactifs.

Les composants Live doivent être dédiés à la lecture.

---

# Design MVP

L’interface doit être sobre.

Priorités :

- lisibilité à distance ;
- tailles de texte confortables ;
- hiérarchie claire ;
- peu de boutons ;
- contrastes suffisants ;
- espaces généreux ;
- aucune information éditable.

Éviter :

- tableaux denses ;
- formulaires ;
- menus secondaires ;
- panneaux techniques ;
- cartes excessivement petites ;
- animations décoratives.

Le rendez-vous vendeur n’est pas une démonstration de framework frontend. Le vendeur veut comprendre son marché, pas admirer la vélocité d’un composant React.

---

# Responsive

Le lecteur doit fonctionner au minimum sur :

- ordinateur portable ;
- écran de bureau ;
- tablette en paysage ;
- tablette en portrait.

Le mobile reste utilisable, mais n’est pas la cible principale du MVP.

Aucun débordement horizontal ne doit empêcher la navigation.

---

# États particuliers

Gérer explicitement :

- présentation incomplète ;
- aucun bien vendeur ;
- aucun comparable ;
- analyse indisponible ;
- positionnement indisponible ;
- décision non enregistrée ;
- prix vendeur absent ;
- aucune photo ;
- section indisponible ;
- projet inaccessible.

Aucun état ne doit provoquer une page vide ou une exception.

---

# Base de données

Aucune migration.

Aucune nouvelle table.

Aucune nouvelle colonne.

Aucune RPC.

Aucune persistance.

---

# Tests obligatoires

## Services

Tester `filterLiveWarnings()` :

- alertes utiles conservées ;
- alertes internes exclues ;
- ordre stable ;
- absence de doublons ;
- entrée vide.

Tester `getLiveSections()` :

- ordre respecté ;
- sections indisponibles conservées dans le sommaire ;
- sections indisponibles exclues de la navigation séquentielle ;
- première section disponible ;
- dernière section disponible ;
- aucune section disponible.

## Shell Live

Tester ou vérifier :

- mode overview initial ;
- démarrage de la présentation ;
- section active correcte ;
- précédent ;
- suivant ;
- limites première/dernière section ;
- retour sommaire ;
- navigation directe depuis le sommaire ;
- sections indisponibles ;
- raccourcis ArrowLeft / ArrowRight ;
- plein écran indisponible sans erreur ;
- sortie plein écran ;
- aucune persistance de navigation.

## Contenu

Tester ou vérifier :

- uniquement les comparables retenus ;
- ordre des comparables ;
- bien vendeur incomplet ;
- photos absentes ;
- analyse indisponible ;
- décision enregistrée affichée ;
- décision obsolète affichée sans remplacement ;
- prix vendeur absent ;
- alertes filtrées ;
- aucune action de modification ;
- aucun composant Builder interactif ;
- aucun composant IA.

## Accès

Vérifier :

- projet de l’agence accessible ;
- projet d’une autre agence inaccessible ;
- projet inexistant ;
- utilisateur non authentifié redirigé selon la convention existante.

---

# Critères d’acceptation

La mission est validée lorsque :

- la route `/live/[projectId]` existe ;
- elle consomme `buildSellerPresentation()` ;
- aucune règle métier du Builder n’est dupliquée ;
- Live est strictement en lecture seule ;
- la navigation section par section fonctionne ;
- les sections indisponibles sont gérées ;
- le mode plein écran fonctionne sans bloquer l’application ;
- les raccourcis clavier essentiels fonctionnent ;
- la décision enregistrée reste distincte du calcul courant ;
- une décision obsolète reste visible ;
- aucune donnée n’est persistée ;
- aucune migration n’est créée ;
- aucune IA n’est utilisée ;
- aucun PDF n’est généré ;
- aucun partage externe n’est créé ;
- tous les tests sont verts ;
- lint est vert ;
- typecheck est vert ;
- build est vert.

---

# Hors périmètre

## V2

- personnalisation de l’ordre des sections ;
- masquage manuel de sections ;
- thème graphique par agence ;
- mode vendeur simplifié ;
- notes privées du conseiller ;
- reprise à la dernière section ;
- minuterie de rendez-vous ;
- mode hors ligne ;
- export PDF ;
- impression ;
- partage par lien sécurisé.

## V3

- narration IA ;
- adaptation au profil vendeur ;
- recommandations d’argumentaire ;
- scénarios interactifs de négociation ;
- co-navigation vendeur/conseiller ;
- présentation à distance ;
- tracking d’engagement.

---

# Points de vigilance

Live doit rester dépendant du contrat `SellerPresentation`, pas des structures internes du Builder.

Cette séparation garantit que Builder peut évoluer sans casser l’expérience de rendez-vous.

Aucune modification métier ne doit être ajoutée dans Live sous prétexte qu’un bouton serait pratique.

Un bouton pratique est souvent le début d’un second produit caché dans le premier.

---

# Definition of Done

- route Live créée ;
- accès sécurisé ;
- shell Live créé ;
- mode overview créé ;
- mode présentation créé ;
- navigation créée ;
- plein écran créé ;
- raccourcis clavier créés ;
- sept sections gérées ;
- alertes Live filtrées ;
- tests terminés ;
- aucune migration ;
- aucune persistance ;
- aucun fichier temporaire ;
- aucune dette bloquante connue ;
- mission laissée au statut `À réaliser.` avant revue CTO ;
- aucun commit ;
- aucun push.

---

# Contrôles obligatoires avant revue CTO

Exécuter :

```bash
npm run test
npm run lint
npm run typecheck
npm run build
npm run format:check
```

---

# Livrables attendus

À la fin de la mission, Claude Code doit fournir :

- résumé des développements ;
- décisions techniques prises ;
- architecture du lecteur Live ;
- règles de navigation ;
- règles de filtrage des alertes ;
- fichiers créés ;
- fichiers modifiés ;
- confirmation de l’absence de migration et de persistance ;
- résultats détaillés des tests ;
- nombre total de tests ;
- résultat du lint ;
- résultat du typecheck ;
- résultat du build ;
- résultat du format check ;
- git diff ;
- git status ;
- points de vigilance éventuels.

Aucun commit.

Aucun push.

Une revue CTO sera effectuée avant validation.