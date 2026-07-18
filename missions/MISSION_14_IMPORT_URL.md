# MISSION 14 — COMPARABLES IMPORT

## Statut

Réalisée.

## Objectif

Permettre à un conseiller immobilier de créer un bien concurrent à partir d’une annonce immobilière publique accessible par URL.

Le système doit :

1. permettre au conseiller de coller une URL publique ;
2. analyser les informations accessibles dans la page ;
3. extraire les données disponibles ;
4. préremplir le formulaire existant de création d’un bien concurrent ;
5. laisser le conseiller vérifier, corriger et compléter toutes les informations ;
6. enregistrer le comparable uniquement après validation humaine.

L’import constitue une aide à la saisie.

Le système ne doit jamais créer automatiquement un comparable sans validation du conseiller.

---

## Contexte

Les missions précédentes ont permis de construire le socle du Builder :

- Mission 11 : gestion des dossiers vendeurs ;
- Mission 12 : gestion du bien vendeur ;
- Mission 13 : gestion manuelle des biens concurrents.

La Mission 13 permet désormais :

- de créer un bien concurrent manuellement ;
- de le modifier ;
- de le supprimer ;
- de le retenir ou l’exclure ;
- de modifier son ordre d’affichage ;
- de garantir l’isolation multi-tenant ;
- de garantir l’unicité de `display_order` dans un projet.

Cette mission doit réutiliser le fonctionnement manuel existant.

Elle ne doit pas créer un second système de création de comparable.

---

## Décisions produit validées

Le moteur s’appelle :

```text
Comparables Import
```

Pour le MVP, une seule source est supportée :

```text
URL publique d’une annonce immobilière
```

Les futures sources pourront être traitées dans des missions ultérieures :

- PDF d’annonce ;
- dossier d’analyse comparative ;
- document issu de Cadastre.com ;
- document issu de Taktik Immo ;
- document issu de La Loupe Immo ;
- document issu d’ImmoData ;
- document issu de Gestimmo ;
- copier-coller de texte ;
- capture d’écran ;
- autres sources métier.

Les DVF et les biens vendus ne font pas partie de cette fonctionnalité.

ACM Studio travaille ici sur les biens actuellement en concurrence avec le bien vendeur.

---

## Principes obligatoires

Le logiciel prépare.

Le conseiller valide.

L’IA ou le moteur d’import assiste.

Le moteur ne décide jamais.

Le système ne doit jamais :

- inventer une donnée ;
- estimer une information absente ;
- produire une estimation automatique ;
- remplacer une donnée fiable par une donnée moins fiable ;
- créer le comparable avant validation ;
- masquer les champs non trouvés ;
- empêcher la saisie manuelle.

Si une information n’est pas détectée :

```text
le champ reste vide
```

Le conseiller doit pouvoir compléter ou modifier chaque champ.

---

## Parcours utilisateur attendu

Depuis :

```text
/builder/[projectId]/comparables/new
```

Le conseiller doit pouvoir choisir entre :

```text
Importer depuis une annonce
```

et :

```text
Saisir manuellement
```

Parcours import :

```text
Ajouter un bien concurrent
↓
Choisir “Importer depuis une annonce”
↓
Coller l’URL
↓
Cliquer sur “Importer”
↓
Analyse de la page
↓
Affichage des informations trouvées et manquantes
↓
Préremplissage du formulaire existant
↓
Correction ou complément manuel
↓
Enregistrement final
```

Le comparable ne doit pas être créé pendant l’analyse de l’URL.

L’action existante de création reste le point final d’enregistrement.

---

## Périmètre MVP

Inclure :

- URL publique HTTP ;
- URL publique HTTPS ;
- normalisation de l’URL ;
- détection de la source ;
- récupération contrôlée du document HTML ;
- extraction JSON-LD ;
- extraction Open Graph ;
- fallback depuis le HTML accessible ;
- normalisation des données ;
- récupération des URLs publiques des photos ;
- déduplication des photos ;
- préremplissage du formulaire ;
- correction manuelle ;
- enregistrement final via la feature `comparables` existante ;
- gestion maîtrisée des erreurs ;
- sécurité SSRF ;
- tests unitaires et fonctionnels ;
- parcours navigateur réel ;
- isolation multi-tenant.

---

## Hors périmètre

Ne pas développer :

- import DVF ;
- import de biens vendus ;
- import PDF ;
- import de dossiers d’estimation ;
- import multiple ;
- OCR ;
- navigateur headless en production ;
- Playwright en production ;
- Puppeteer ;
- Selenium ;
- exécution de JavaScript distant ;
- authentification sur un portail ;
- récupération d’une session utilisateur ;
- contournement d’un anti-bot ;
- contournement d’une restriction d’accès ;
- scraping derrière un compte ;
- analyse IA des photos ;
- analyse IA de l’annonce ;
- génération automatique des forces et faiblesses ;
- estimation automatique ;
- actualisation automatique périodique ;
- synchronisation avec les portails ;
- téléchargement des images dans Supabase Storage ;
- moteur de plugins générique ;
- connecteur spécifique complexe par portail ;
- nouvelle table de photos ;
- modification du protocole Live ;
- Meeting Script.

---

## Inspection préalable obligatoire

Avant toute modification, inspecter :

```text
CLAUDE.md
DEVELOPMENT_RULES.md
ARCHITECTURE.md
DATABASE.md
TASKS.md
UI_MAP.md
```

Inspecter également :

```text
src/lib/supabase/client.ts
src/lib/supabase/server.ts
src/lib/supabase/database.types.ts
```

Inspecter la feature existante :

```text
src/features/comparables/
```

En particulier :

```text
src/features/comparables/types.ts
src/features/comparables/comparable-form-fields.tsx
src/features/comparables/utils/parse-number.ts
src/features/comparables/utils/comparable-input.ts
src/features/comparables/actions/create-comparable.ts
src/features/comparables/actions/update-comparable.ts
src/features/comparables/actions/delete-comparable.ts
src/features/comparables/actions/toggle-comparable-selection.ts
src/features/comparables/actions/move-comparable.ts
src/features/comparables/queries/get-comparables.ts
src/features/comparables/queries/get-comparable.ts
```

Inspecter les pages :

```text
src/app/(protected)/builder/[projectId]/comparables/page.tsx
src/app/(protected)/builder/[projectId]/comparables/new/page.tsx
src/app/(protected)/builder/[projectId]/comparables/[comparableId]/edit/page.tsx
```

Inspecter toutes les migrations Supabase existantes.

Ne rien inventer.

Vérifier le schéma réel de la table `comparables` avant toute migration.

---

## Schéma actuel à respecter

Les colonnes utilisées par la Mission 13 sont :

```text
id
agency_id
project_id
title
listing_url
source
address
postal_code
city
surface_area
land_area
rooms_count
bedrooms_count
bathrooms_count
energy_rating
price
days_on_market
price_drop_amount
price_drop_percentage
display_order
is_selected
advisor_notes
created_at
updated_at
```

Le champ `property_type` n’existe pas dans `comparables`.

Ne pas l’inventer.

Le champ `photo_urls` doit être ajouté dans cette mission s’il n’existe pas déjà.

---

## Migration Supabase

Créer une migration dédiée.

Nom attendu selon le timestamp réel :

```text
supabase/migrations/<timestamp>_comparables_photo_urls.sql
```

Ajouter :

```sql
alter table public.comparables
add column photo_urls jsonb not null default '[]'::jsonb;
```

Ajouter une contrainte garantissant que la valeur reste un tableau JSON :

```sql
alter table public.comparables
add constraint comparables_photo_urls_array_check
check (jsonb_typeof(photo_urls) = 'array');
```

Ne pas créer de table `comparable_photos`.

Ne pas ajouter de colonne inutile.

Ne pas ajouter `scraped_at` dans cette mission.

Ne pas ajouter de système de version des annonces.

Après application de la migration :

```bash
supabase gen types typescript --local --schema public > src/lib/supabase/database.types.ts
```

Le fichier :

```text
src/lib/supabase/database.types.ts
```

doit être régénéré uniquement via la CLI.

Il ne doit jamais être modifié manuellement.

---

## Données à extraire

Le moteur doit tenter d’extraire :

```text
title
listing_url
source
address
postal_code
city
surface_area
land_area
rooms_count
bedrooms_count
bathrooms_count
energy_rating
price
description
photo_urls
```

Correspondance avec le modèle existant :

```text
description
→ advisor_notes uniquement si la décision est explicitement validée pendant l’implémentation
```

Par défaut, ne pas copier automatiquement toute la description commerciale dans `advisor_notes`.

La description importée peut être conservée temporairement dans le résultat d’import pour présentation au conseiller.

Ne pas créer une nouvelle colonne `description` dans `comparables` sans justification et validation.

---

## Données à ne jamais importer automatiquement

Ne jamais accepter depuis le client ou depuis la page distante :

```text
agency_id
project_id
display_order
is_selected
```

Ces valeurs restent gérées côté serveur.

Ne pas importer automatiquement :

```text
days_on_market
price_drop_amount
price_drop_percentage
```

Ces informations restent saisies ou validées par le conseiller.

Une source distante ne doit pas être considérée comme suffisamment fiable pour modifier ces champs dans le MVP.

---

## Priorité des sources

Ordre obligatoire :

```text
JSON-LD
↓
Open Graph
↓
HTML accessible
```

Règle :

Une source moins fiable complète uniquement les champs encore vides.

Elle ne remplace jamais une valeur déjà obtenue depuis une source plus fiable.

Exemple :

```text
prix trouvé dans JSON-LD
→ le prix Open Graph ne le remplace pas
```

Les extracteurs doivent retourner des données partielles.

Le service de fusion doit produire un objet normalisé final.

---

## Architecture attendue

Créer une feature dédiée :

```text
src/features/comparable-import/
├── types.ts
├── actions/
│   └── import-comparable-url.ts
├── services/
│   ├── fetch-listing-page.ts
│   ├── extract-listing-data.ts
│   └── normalize-listing-data.ts
├── extractors/
│   ├── json-ld-extractor.ts
│   ├── open-graph-extractor.ts
│   └── html-extractor.ts
└── utils/
    ├── normalize-url.ts
    ├── detect-source.ts
    ├── normalize-price.ts
    ├── normalize-area.ts
    └── deduplicate-photo-urls.ts
```

Cette structure peut être légèrement adaptée si le code réel justifie une organisation plus simple.

Ne pas créer :

- repository générique ;
- service générique d’import ;
- moteur de plugins ;
- factory complexe ;
- classe abstraite ;
- couche inutile ;
- dépendance supplémentaire sans justification réelle.

---

## Types attendus

Créer un type métier dédié, sans recopier manuellement les types Supabase.

Exemple attendu :

```ts
export type ImportedComparableData = {
  title: string | null;
  listingUrl: string;
  source: string | null;
  address: string | null;
  postalCode: string | null;
  city: string | null;
  surfaceArea: number | null;
  landArea: number | null;
  roomsCount: number | null;
  bedroomsCount: number | null;
  bathroomsCount: number | null;
  energyRating: string | null;
  price: number | null;
  description: string | null;
  photoUrls: string[];
};
```

Prévoir un résultat d’action contrôlé :

```ts
export type ComparableImportResult =
  | {
      ok: true;
      data: ImportedComparableData;
      foundFields: string[];
      missingFields: string[];
    }
  | {
      ok: false;
      error: string;
    };
```

Aucun `any`.

Les contenus JSON-LD doivent être traités comme `unknown` puis validés progressivement.

---

## Action serveur

Créer :

```text
src/features/comparable-import/actions/import-comparable-url.ts
```

Cette action doit :

1. vérifier que l’utilisateur est authentifié ;
2. récupérer son profil ;
3. vérifier que le projet appartient à son agence ;
4. lire l’URL transmise ;
5. normaliser l’URL ;
6. appliquer les contrôles SSRF ;
7. récupérer la page ;
8. exécuter les extracteurs ;
9. normaliser les données ;
10. retourner un résultat de préremplissage ;
11. ne rien enregistrer dans `comparables`.

Le moteur d’import doit rester côté serveur.

Aucune récupération distante depuis le navigateur.

Ne jamais exposer les détails techniques internes dans les messages utilisateur.

---

## Sécurité SSRF obligatoire

Le traitement d’une URL distante crée un risque SSRF.

La protection SSRF est obligatoire.

Refuser :

```text
localhost
```

Refuser les protocoles autres que :

```text
http:
https:
```

Refuser notamment :

```text
file:
ftp:
data:
javascript:
mailto:
```

Refuser les adresses :

```text
127.0.0.0/8
0.0.0.0/8
10.0.0.0/8
100.64.0.0/10
169.254.0.0/16
172.16.0.0/12
192.168.0.0/16
224.0.0.0/4
240.0.0.0/4
::1
fc00::/7
fe80::/10
```

Refuser également :

- adresses loopback ;
- adresses privées ;
- adresses link-local ;
- adresses multicast ;
- adresses réservées ;
- noms internes ;
- destinations Supabase internes ;
- services de métadonnées cloud ;
- redirections vers une destination interdite.

Chaque redirection doit être validée avant d’être suivie.

Ne pas utiliser le suivi automatique illimité des redirections.

---

## Résolution DNS

Avant la requête :

1. résoudre le nom d’hôte ;
2. inspecter toutes les adresses retournées ;
3. refuser si une adresse résolue appartient à une plage interdite.

Avant chaque redirection :

1. normaliser la nouvelle URL ;
2. résoudre son nom d’hôte ;
3. refaire tous les contrôles.

Ne pas faire confiance uniquement au texte du hostname.

Prévoir une protection raisonnable contre le DNS rebinding dans les limites du MVP.

Documenter clairement les limites résiduelles.

---

## Récupération de page

Le service :

```text
fetch-listing-page.ts
```

doit appliquer :

- timeout ;
- limite de redirections ;
- limite de taille ;
- validation du Content-Type ;
- absence de cookies utilisateur ;
- absence de header d’authentification ;
- User-Agent applicatif explicite et neutre ;
- aucune exécution JavaScript.

Valeurs MVP recommandées :

```text
timeout : 8 secondes maximum
redirections : 3 maximum
taille HTML : 2 Mo maximum
```

Ces valeurs peuvent être ajustées si le code ou les tests démontrent une nécessité.

Content-Type acceptés :

```text
text/html
application/xhtml+xml
```

Refuser les PDF, images, archives et contenus binaires.

Interrompre la lecture dès que la taille maximale est dépassée.

---

## Dépendances

Ne pas ajouter de dépendance sans nécessité.

Utiliser les API natives de Node.js lorsque raisonnable.

Une petite dépendance HTML peut être ajoutée uniquement si :

- elle réduit réellement les risques ;
- elle est maintenue ;
- elle est compatible avec Next.js 16 ;
- elle est justifiée dans le rapport ;
- aucune alternative déjà présente ne convient.

Ne pas ajouter Playwright, Puppeteer ou navigateur headless.

---

## Extraction JSON-LD

Le moteur doit rechercher les blocs :

```html
<script type="application/ld+json">
```

Il doit accepter :

- objet JSON unique ;
- tableau JSON ;
- graphe `@graph` ;
- types `Product` ;
- types `Offer` ;
- types `Residence` ;
- types `House` ;
- types `Apartment` ;
- autres structures immobilières exploitables.

Les structures doivent être traitées comme `unknown`.

Ne jamais supposer qu’un JSON-LD est valide.

Un bloc invalide ne doit pas faire échouer toute l’importation.

Les valeurs exploitables doivent être extraites sans inventer de correspondance.

---

## Extraction Open Graph

Chercher notamment :

```text
og:title
og:url
og:image
og:image:url
og:description
product:price:amount
product:price:currency
```

Open Graph complète uniquement les champs absents.

Les images doivent être normalisées en URLs absolues.

---

## Fallback HTML

Le fallback HTML doit rester simple.

Il peut rechercher des informations dans :

- titres ;
- meta description ;
- attributs `data-*` manifestement structurés ;
- libellés visibles proches d’une valeur ;
- motifs explicites de prix ;
- motifs explicites de surface ;
- motifs explicites de pièces ;
- motifs explicites de chambres ;
- motifs explicites de DPE.

Ne pas construire un scraper spécifique complexe pour chaque portail.

Ne pas dépendre de sélecteurs CSS fragiles liés à un portail précis.

Si une donnée est incertaine :

```text
ne pas la remplir
```

---

## Détection de la source

Créer :

```text
detect-source.ts
```

La source peut être déduite du domaine.

Exemples possibles :

```text
seloger.com → SeLoger
bienici.com → Bien’ici
leboncoin.fr → Leboncoin
green-acres.fr → Green Acres
bellesdemeures.com → Belles Demeures
proprietes.lefigaro.fr → Propriétés Le Figaro
```

Cette liste doit rester légère.

Pour un domaine inconnu :

```text
source = nom de domaine normalisé
```

Ne pas bloquer une URL uniquement parce que son portail n’est pas connu.

---

## Normalisation des données

Normaliser :

- espaces ;
- séparateurs de milliers ;
- symbole euro ;
- virgule décimale ;
- unités m² ;
- nombres de pièces ;
- nombres de chambres ;
- DPE ;
- URLs ;
- photos.

Prix :

```text
450 000 €
450.000 €
450000
450 000 EUR
```

doivent pouvoir être normalisés en :

```text
450000
```

Surface :

```text
82 m²
82,5 m2
82.5
```

doit pouvoir être normalisée.

Les valeurs négatives ou incohérentes doivent être rejetées.

Ne pas arrondir silencieusement une donnée décimale sauf si le type métier impose un entier.

---

## Photos

Ajouter `photo_urls` au comparable.

Pour le MVP :

```text
photo_urls = tableau d’URLs publiques
```

Ne pas télécharger les images dans Supabase Storage.

Les photos doivent être :

- absolues ;
- HTTP ou HTTPS ;
- dédupliquées ;
- limitées en nombre ;
- nettoyées des valeurs vides.

Limite MVP recommandée :

```text
20 photos maximum
```

Ne pas vérifier le contenu binaire de chaque image pendant l’import initial sauf nécessité démontrée.

Le risque d’URL expirée doit être documenté.

---

## Formulaire

Le formulaire existant doit rester la source unique de vérité pour la création finale.

Étendre :

```text
ComparableFormFields
```

uniquement si nécessaire.

Le formulaire doit accepter des valeurs initiales issues de l’import.

Le mode manuel doit continuer à fonctionner exactement comme avant.

Le conseiller doit pouvoir modifier tous les champs préremplis.

Les photos détectées doivent être visibles sous une forme simple :

```text
12 photos détectées
```

Un aperçu limité peut être ajouté si cela reste simple et fiable.

Ne pas construire une galerie complexe dans cette mission.

---

## Intégration UI

Sur la page :

```text
/builder/[projectId]/comparables/new
```

Ajouter une interface claire :

```text
Importer depuis une annonce
Saisir manuellement
```

Le mode manuel peut rester affiché par défaut si cela simplifie l’implémentation.

L’interface d’import doit contenir :

- champ URL ;
- bouton `Importer l’annonce` ;
- état de chargement ;
- message d’erreur contrôlé ;
- résumé des champs trouvés ;
- résumé des champs manquants ;
- bouton ou transition vers le formulaire prérempli ;
- possibilité de revenir à la saisie manuelle.

Ne jamais bloquer le conseiller si l’import échoue.

---

## État de chargement

Pendant l’import :

- désactiver le bouton ;
- afficher un libellé explicite ;
- empêcher les doubles soumissions ;
- ne pas supprimer la valeur saisie.

Exemple :

```text
Analyse de l’annonce…
```

---

## Résumé d’import

Après succès, afficher au minimum :

```text
Informations détectées
```

et :

```text
Informations à compléter
```

Exemple :

```text
Détecté :
- prix
- surface
- ville
- 8 photos

À compléter :
- DPE
- chambres
- délai de commercialisation
```

Ce résumé est informatif.

Il ne remplace pas le formulaire.

---

## Gestion des erreurs

Messages utilisateur attendus :

```text
URL invalide.
Cette adresse ne peut pas être analysée.
Cette adresse est interdite.
Le site a refusé l’accès à l’annonce.
L’analyse de l’annonce a expiré.
La réponse reçue est trop volumineuse.
Le contenu reçu n’est pas une page HTML.
Aucune information exploitable n’a été détectée.
L’annonce semble indisponible ou supprimée.
L’import a échoué. Vous pouvez saisir le bien manuellement.
```

Ne jamais afficher :

- stack trace ;
- adresse IP résolue ;
- détail interne DNS ;
- message PostgreSQL ;
- chemin serveur ;
- secret ;
- configuration interne.

Les détails techniques peuvent être journalisés côté serveur sans données sensibles inutiles.

---

## Modification de la création existante

Adapter :

```text
src/features/comparables/utils/comparable-input.ts
```

et :

```text
src/features/comparables/actions/create-comparable.ts
```

pour accepter `photo_urls`.

Règles :

- `photo_urls` doit être validé côté serveur ;
- seules les URLs HTTP et HTTPS valides sont acceptées ;
- limite de 20 URLs ;
- déduplication ;
- aucune donnée système fournie par le client ;
- `agency_id`, `project_id`, `display_order`, `is_selected` restent imposés côté serveur ;
- le retry de création sur conflit `23505` doit rester intact ;
- la garantie d’ordre de la Mission 13 ne doit pas être cassée.

---

## Multi-tenant

Toutes les opérations doivent rester isolées par agence.

Avant import :

- vérifier le profil ;
- vérifier le projet ;
- vérifier `agency_id`.

Un utilisateur ne doit pas pouvoir lancer un import pour un projet d’une autre agence.

Le comportement attendu reste :

```text
ressource inexistante ou accès refusé sans fuite d’existence
```

---

## Tests unitaires obligatoires

Tester les utilitaires et extracteurs avec des fixtures locales.

Ne pas dépendre uniquement de portails réels pour les tests.

Créer des contenus HTML de test couvrant :

### JSON-LD

- objet simple ;
- tableau ;
- `@graph` ;
- prix ;
- surface ;
- adresse ;
- ville ;
- code postal ;
- pièces ;
- chambres ;
- DPE ;
- images ;
- JSON invalide ;
- données partielles.

### Open Graph

- titre ;
- description ;
- URL ;
- prix ;
- image unique ;
- plusieurs images ;
- données partielles.

### HTML fallback

- prix visible ;
- surface visible ;
- pièces ;
- chambres ;
- DPE ;
- aucun champ exploitable ;
- données ambiguës.

### Priorité

Vérifier :

```text
JSON-LD > Open Graph > HTML
```

Une valeur JSON-LD ne doit pas être remplacée par Open Graph.

Une valeur Open Graph ne doit pas être remplacée par HTML.

---

## Tests de normalisation obligatoires

Tester :

```text
300 000 €
300.000 €
300000
300 000 EUR
```

Tester :

```text
60 m²
60 m2
60,5 m²
60.5
```

Tester :

- chaînes vides ;
- valeurs négatives ;
- valeurs non numériques ;
- valeurs extrêmement grandes ;
- pièces décimales invalides ;
- espaces insécables ;
- virgule française ;
- symbole euro.

---

## Tests SSRF obligatoires

Tester le refus de :

```text
http://localhost
http://127.0.0.1
http://0.0.0.0
http://10.0.0.1
http://172.16.0.1
http://192.168.1.1
http://169.254.169.254
http://[::1]
http://[fc00::1]
http://[fe80::1]
file:///etc/passwd
ftp://example.com/file
data:text/html,test
```

Tester :

- domaine public résolu vers une IP privée ;
- redirection publique vers localhost ;
- redirection publique vers une IP privée ;
- chaîne de redirections dépassant la limite ;
- URL avec identifiants intégrés ;
- URL malformée ;
- hostname trompeur ;
- adresse IPv4 encodée sous une autre représentation si supportée par Node.

Aucune requête ne doit être envoyée vers une destination interdite.

---

## Tests réseau obligatoires

Tester :

- timeout ;
- réponse supérieure à la limite ;
- Content-Type PDF ;
- Content-Type image ;
- Content-Type absent ;
- code 404 ;
- code 403 ;
- code 429 ;
- code 500 ;
- redirection valide ;
- HTML vide ;
- HTML sans donnée ;
- page valide avec JSON-LD.

Les tests doivent utiliser un serveur local contrôlé uniquement si les protections SSRF permettent une injection de transport de test.

Ne jamais désactiver les protections SSRF dans le code de production pour faciliter les tests.

Préférer l’injection d’une fonction de fetch contrôlée dans les services si nécessaire, sans créer une abstraction disproportionnée.

---

## Tests fonctionnels obligatoires

Tester le parcours :

1. connexion ;
2. ouverture d’un dossier de l’agence ;
3. ouverture des biens concurrents ;
4. clic sur `Ajouter un bien concurrent` ;
5. collage d’une URL de test ;
6. import ;
7. affichage des champs détectés ;
8. affichage des champs manquants ;
9. préremplissage ;
10. modification manuelle ;
11. enregistrement ;
12. vérification en base ;
13. vérification de `photo_urls` ;
14. vérification de `display_order` ;
15. vérification de `is_selected = true`.

---

## Tests du mode manuel

Vérifier que la Mission 14 ne casse pas la Mission 13.

Tester :

- ouverture directe du mode manuel ;
- création sans URL ;
- création avec tous les champs ;
- création avec champs optionnels vides ;
- modification ;
- sélection ;
- ordre ;
- suppression.

---

## Tests multi-tenant obligatoires

Créer :

- agence A ;
- utilisateur A ;
- projet A ;
- agence B ;
- utilisateur B ;
- projet B.

Vérifier que A ne peut pas :

- importer pour le projet B ;
- préremplir un comparable rattaché au projet B ;
- créer un comparable dans le projet B ;
- lire les informations internes du projet B.

Vérifier que les données de B restent intactes.

---

## Test des photos

Tester :

- zéro photo ;
- une photo ;
- plusieurs photos ;
- doublons ;
- URL relative ;
- URL absolue ;
- URL invalide ;
- protocole interdit ;
- plus de 20 photos.

Résultat attendu :

- URLs absolues ;
- URLs valides ;
- déduplication ;
- maximum 20 ;
- enregistrement JSONB correct.

---

## Portails réels

Un test ponctuel peut être réalisé sur quelques annonces publiques réelles.

Mais la mission ne doit pas dépendre du succès d’un portail particulier.

Documenter pour chaque test réel :

- URL testée ;
- source ;
- statut HTTP ;
- données récupérées ;
- données absentes ;
- blocage éventuel ;
- limite rencontrée.

Ne jamais contourner une protection.

Si un portail refuse l’accès :

```text
échec contrôlé
```

Le mode manuel doit rester disponible.

---

## Critères d’acceptation

La mission est acceptée si :

1. une URL publique valide peut être analysée ;
2. une URL interdite est refusée avant toute requête ;
3. chaque redirection est revalidée ;
4. JSON-LD est prioritaire ;
5. Open Graph complète les champs manquants ;
6. HTML complète uniquement les champs encore absents ;
7. les données sont normalisées ;
8. les photos sont dédupliquées ;
9. le formulaire existant est prérempli ;
10. le conseiller peut modifier toutes les données ;
11. aucun comparable n’est créé avant validation ;
12. l’enregistrement final réutilise la feature existante ;
13. `photo_urls` est enregistré en JSONB ;
14. la saisie manuelle fonctionne toujours ;
15. aucune information système n’est acceptée depuis le client ;
16. le multi-tenant reste intact ;
17. le retry de création de la Mission 13 reste fonctionnel ;
18. le déplacement des concurrents reste fonctionnel ;
19. aucun `any` n’est introduit ;
20. lint, typecheck, build et format check passent.

---

## Contrôles qualité obligatoires

Exécuter :

```bash
npm run lint
npm run typecheck
npm run build
npm run format:check
```

Appliquer la migration localement.

Exécuter :

```bash
supabase db reset
```

Vérifier que toutes les migrations se rejouent sur une base vide.

Régénérer les types Supabase.

Ne pas modifier manuellement les types.

---

## Nettoyage obligatoire

Après les tests :

- supprimer les comparables temporaires ;
- supprimer les projets temporaires ;
- supprimer les profils temporaires ;
- supprimer les agences temporaires ;
- supprimer les utilisateurs Auth temporaires ;
- supprimer les scripts ponctuels ;
- supprimer les fixtures temporaires non destinées aux tests ;
- supprimer les cookies ;
- supprimer les traces Playwright éventuelles ;
- arrêter le serveur de développement si lancé ;
- conserver uniquement les tests utiles au projet.

Vérifier les compteurs finaux.

---

## Fichiers attendus

Liste indicative :

```text
missions/MISSION_14_COMPARABLES_IMPORT.md
supabase/migrations/<timestamp>_comparables_photo_urls.sql
src/lib/supabase/database.types.ts
src/features/comparable-import/types.ts
src/features/comparable-import/actions/import-comparable-url.ts
src/features/comparable-import/services/fetch-listing-page.ts
src/features/comparable-import/services/extract-listing-data.ts
src/features/comparable-import/services/normalize-listing-data.ts
src/features/comparable-import/extractors/json-ld-extractor.ts
src/features/comparable-import/extractors/open-graph-extractor.ts
src/features/comparable-import/extractors/html-extractor.ts
src/features/comparable-import/utils/normalize-url.ts
src/features/comparable-import/utils/detect-source.ts
src/features/comparable-import/utils/normalize-price.ts
src/features/comparable-import/utils/normalize-area.ts
src/features/comparable-import/utils/deduplicate-photo-urls.ts
```

Fichiers susceptibles d’être modifiés :

```text
src/features/comparables/types.ts
src/features/comparables/utils/comparable-input.ts
src/features/comparables/actions/create-comparable.ts
src/features/comparables/comparable-form-fields.tsx
src/app/(protected)/builder/[projectId]/comparables/new/page.tsx
```

Adapter cette liste au code réel.

Ne pas créer de fichier inutile pour respecter artificiellement la structure indicative.

---

## Rapport final obligatoire

Claude Code doit fournir un rapport complet comprenant :

1. fichiers créés ;
2. fichiers modifiés ;
3. migration ;
4. schéma final ;
5. architecture retenue ;
6. dépendances ajoutées et justification ;
7. fonctionnement de l’action serveur ;
8. protections SSRF ;
9. limites réseau ;
10. extracteurs ;
11. priorité des sources ;
12. normalisation ;
13. gestion des photos ;
14. intégration formulaire ;
15. maintien du mode manuel ;
16. résultats exacts des tests unitaires ;
17. résultats exacts des tests SSRF ;
18. résultats exacts des tests réseau ;
19. résultats exacts du parcours navigateur ;
20. résultats multi-tenant ;
21. nettoyage ;
22. lint ;
23. typecheck ;
24. build ;
25. format check ;
26. `git diff` ;
27. `git status`.

Le rapport doit signaler explicitement :

- les portails réellement testés ;
- les portails bloquant l’accès ;
- les données non récupérables ;
- les limites du moteur générique ;
- tout risque résiduel SSRF ;
- toute dette technique créée.

---

## Interdictions finales

Ne pas :

- committer ;
- pousser ;
- désactiver RLS ;
- utiliser `service_role` dans l’application ;
- exposer un secret ;
- accepter un `agency_id` du client ;
- accepter un `project_id` non vérifié ;
- utiliser `any` ;
- modifier manuellement `database.types.ts` ;
- ajouter une estimation automatique ;
- utiliser les DVF ;
- créer un import PDF ;
- ajouter un navigateur headless ;
- contourner un anti-bot ;
- télécharger les photos dans Supabase Storage ;
- créer automatiquement un comparable avant validation ;
- casser le mode manuel ;
- casser l’ordre transactionnel de la Mission 13.

---

## Definition of Done

La Mission 14 est terminée lorsque :

- la migration est appliquée ;
- `photo_urls` est présent et validé ;
- les types Supabase sont régénérés ;
- l’import URL fonctionne côté serveur ;
- les contrôles SSRF sont actifs ;
- JSON-LD fonctionne ;
- Open Graph fonctionne ;
- le fallback HTML fonctionne ;
- les données sont normalisées ;
- les photos sont dédupliquées ;
- le formulaire est prérempli ;
- le conseiller peut tout corriger ;
- aucune création n’a lieu avant validation ;
- le mode manuel reste fonctionnel ;
- le multi-tenant est validé ;
- les tests passent ;
- le nettoyage est complet ;
- le working tree contient uniquement les changements de la mission ;
- aucun commit n’a été effectué ;
- aucun push n’a été effectué.

---

## Message de commit prévu

Après revue CTO et validation uniquement :

```text
feat(comparables): add comparable import from listing url
```