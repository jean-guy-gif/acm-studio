MISSION 24 — LIVE VENDEUR : PARCOURS COMPARATIF CENTRAL

Statut

Réalisée.

Classification

MVP bloquant

Objectif

Reconstruire Live pour correspondre au cœur d’ACM Studio : faire comprendre au vendeur comment son bien se positionne face aux biens actuellement en concurrence, conduire une réflexion progressive, laisser le vendeur formuler ses conclusions et renforcer l’analyse comparative de marché du conseiller sans jamais la remplacer.

Promesse produit

ACM Studio n’est ni un CRM, ni un moteur d’estimation automatique, ni un outil DVF, ni un diaporama de statistiques.

Le logiciel prépare. Le conseiller anime. Le vendeur comprend. Le conseiller décide.

Parcours narratif par comparable

Pour chaque comparable retenu, Live suit exactement :

Est-il un sérieux concurrent ?

À quel prix est-il sur le marché ?

Pourquoi est-il toujours sur le marché ?

Puis le même processus recommence pour le comparable suivant.

PAGE 1 — EST-IL UN SÉRIEUX CONCURRENT ?

Question affichée

Est-il un sérieux concurrent pour votre bien ?

Informations visibles

photo principale ;

galerie éventuelle ;

type de bien ;

localisation ;

surface ;

pièces ;

chambres ;

étage ;

ascenseur si disponible ;

extérieur ;

stationnement ;

état général ;

exposition ;

DPE ;

GES ;

caractéristiques importantes.

Informations interdites

Ne pas afficher :

prix ;

prix au m² ;

durée de commercialisation ;

historique ou baisse de prix ;

positionnement marché.

Le vendeur doit juger le produit avant de connaître son prix.

Convention visuelle

Noir gras : caractéristique similaire ou équivalente.

Vert : avantage du concurrent.

Orange : faiblesse du concurrent.

La couleur représente toujours le concurrent par rapport au bien vendeur.

Moteur déterministe

Créer un service pur build-comparable-feature-comparison.ts.

Entrées :

bien vendeur ;

comparable ;

règles de tolérance.

Sortie par critère :

criterion ;

subjectValue ;

comparableValue ;

comparisonStatus ;

displayLabel.

Statuts :

same ;

competitor_advantage ;

competitor_weakness ;

unknown.

Tolérances MVP :

surface similaire si écart <= 5 % ;

pièces et chambres : égalité stricte ;

état : ordre déterministe via constante ;

DPE/GES : ordre A > B > C > D > E > F > G ;

extérieur : présence/absence et type via mapping ;

stationnement : présence/absence et quantité si connue ;

exposition : mapping métier explicite ;

donnée absente : unknown.

Aucune IA. Aucune conclusion inventée.

Réponse vendeur

Persistée par comparable :

seller_serious_competitor : yes / no / unsure ;

seller_serious_competitor_comment : facultatif.

Sauvegarde explicite, persistance après rechargement, aucune modification automatique.

PAGE 2 — À QUEL PRIX EST-IL SUR LE MARCHÉ ?

Question avant révélation

À quel prix pensez-vous que ce bien est proposé ?

Saisie

Le conseiller saisit :

seller_estimated_listing_price.

Contraintes :

valeur positive ;

format monétaire ;

sauvegarde explicite ;

aucune révélation du prix réel avant validation.

Après validation

Révéler sur la même fiche :

prix affiché actuel ;

prix au m² ;

écart en euros ;

écart en pourcentage ;

position relative parmi les comparables retenus.

Exemple :

Prix imaginé par le vendeur : 430 000 €

Prix affiché : 465 000 €

Écart : +35 000 € / +8,1 %

Historique de prix

Afficher uniquement s’il existe :

prix initial ;

prix actuel ;

nombre de baisses ;

montant total de baisse ;

dates ;

source.

Données :

initial_price ;

current_price ;

price_history ;

first_seen_at ;

last_seen_at.

Chaque entrée :

price ;

observed_at ;

source.

Prévoir une abstraction future price-history-provider, sans intégrer Castorus dans cette mission.

Si absent : Historique de prix non disponible.

PAGE 3 — POURQUOI EST-IL TOUJOURS SUR LE MARCHÉ ?

Question

Pourquoi est-il toujours sur le marché ?

Informations visibles

Conserver la même fiche et afficher :

prix ;

prix au m² ;

durée de commercialisation si connue ;

date de première observation ;

historique de prix ;

caractéristiques comparées ;

réponse sur le sérieux du concurrent ;

estimation de prix donnée par le vendeur.

Réponse vendeur

seller_market_duration_reason ;

seller_market_duration_comment.

Raisons :

price_too_high ;

condition ;

location ;

presentation ;

work_required ;

strong_competition ;

not_enough_exposure ;

unknown ;

other.

Durée

Calcul déterministe :

market_days = generatedAt - first_seen_at.

Libellé :Observé sur le marché depuis X jours

Ne jamais afficher « En vente depuis X jours » si la source ne le garantit pas.

BOUCLE PAR COMPARABLE

Afficher :

Concurrent X sur N ;

Étape Y sur 3.

Navigation :

précédent ;

suivant ;

sommaire ;

clavier gauche/droite ;

plein écran ;

retour à une étape précédente ;

progression claire.

Aucune modification des données source du comparable.

SYNTHÈSE — CONCURRENT LE PLUS DANGEREUX

Après tous les comparables :

Quel concurrent vous paraît le plus dangereux ?

Le vendeur sélectionne un comparable.

Données :

seller_most_dangerous_comparable_id ;

seller_most_dangerous_reason ;

seller_most_dangerous_comment.

Raisons :

better_value ;

better_condition ;

better_location ;

better_surface ;

better_outdoor ;

better_features ;

more_attractive_price ;

other.

Afficher des cartes avec :

photo ;

titre ;

localisation ;

caractéristiques principales ;

réponse « sérieux concurrent » ;

prix révélé ;

durée observée si disponible.

Le logiciel enregistre le choix mais ne conclut jamais automatiquement que ce prix est le maximum.

TRANSITION

Afficher :

Nous avons identifié les biens auxquels les acheteurs compareront votre logement. Passons maintenant à son positionnement.

ANALYSE FINALE DES PRIX

Comparer trois repères.

1. Valeur perçue par le vendeur

Champ :

seller_perceived_property_price.

Question :À quel prix positionneriez-vous aujourd’hui votre bien ?

2. Positionnement observé sur le marché concurrentiel

Issu du moteur existant :

fourchette basse ;

valeur centrale ;

fourchette haute ;

confiance ;

comparables utilisés ;

atypiques exclus.

Libellé obligatoire :Positionnement observé sur le marché concurrentiel

Ne jamais utiliser « vraie valeur du marché ».

3. Analyse comparative de marché du conseiller

Champ :

advisor_comparative_market_price.

Cette valeur vient des biens vendus, DVF ou sources professionnelles, qualités et défauts intrinsèques, connaissance locale et expertise.

ACM Studio ne la calcule pas.

Écarts

Créer calculate-live-price-gaps.ts.

Afficher en euros et pourcentage :

vendeur vs marché concurrentiel ;

vendeur vs analyse conseiller ;

marché concurrentiel vs analyse conseiller.

Aucun jugement automatique.

CONCLUSION LIVE

Afficher :

valeur perçue vendeur ;

positionnement concurrentiel ;

analyse comparative conseiller ;

prix conseillé enregistré ;

prix vendeur enregistré ;

concurrent le plus dangereux ;

justification du conseiller.

Message :Le marché concurrentiel montre à quels biens votre logement sera comparé. L’analyse comparative du conseiller détermine le positionnement professionnel proposé.

PHOTOS

Chaque comparable doit afficher :

photo principale si disponible ;

galerie si plusieurs photos ;

fallback propre sinon.

Réutiliser photo_urls.

Auditer l’import existant :

JSON-LD ;

Open Graph ;

HTML ;

filtres d’images génériques ;

déduplication ;

ordre ;

image principale ;

persistance ;

rendu Live.

Corriger les défauts qui empêchent l’aspiration des photos accessibles.

Interdits :

headless anti-bot ;

contournement de protection ;

scraping agressif.

Si bloqué :Photos indisponibles pour cette annonce

Permettre au minimum l’ajout manuel d’une URL de photo principale et de plusieurs URLs si l’architecture le permet.

Pas d’upload fichier sauf primitive existante.

MODÈLE DE DONNÉES

Créer une table live_seller_responses :

id uuid PK ;

project_id uuid not null ;

comparable_id uuid null ;

agency_id uuid not null ;

seller_serious_competitor text null ;

seller_serious_competitor_comment text null ;

seller_estimated_listing_price numeric null ;

seller_market_duration_reason text null ;

seller_market_duration_comment text null ;

created_at ;

updated_at.

Contrainte :

UNIQUE(project_id, comparable_id).

Créer une table live_seller_summary :

id uuid PK ;

project_id uuid not null unique ;

agency_id uuid not null ;

seller_most_dangerous_comparable_id uuid null ;

seller_most_dangerous_reason text null ;

seller_most_dangerous_comment text null ;

seller_perceived_property_price numeric null ;

advisor_comparative_market_price numeric null ;

created_at ;

updated_at.

Ne pas mélanger ces réponses avec la décision conseiller existante.

SÉCURITÉ

Activer RLS.

Vérifier l’agence réelle via :

response/summary → project → agency.

Ne pas faire confiance uniquement à agency_id.

Pour les réponses liées à un comparable :

vérifier qu’il appartient au projet ;

vérifier que le projet appartient à l’agence ;

refuser tout identifiant falsifié.

Aucun service role côté navigateur.

ACTIONS SERVEUR

Créer :

save-live-comparable-response.ts ;

save-live-seller-summary.ts.

Règles :

utilisateur authentifié ;

agence dérivée serveur ;

projet vérifié ;

comparable vérifié ;

validation et normalisation ;

résultat structuré ;

erreurs de champ ;

conservation des valeurs ;

aucune redirection sur erreur ;

revalidation ciblée ;

aucune modification des comparables source ;

aucune modification automatique de la décision conseiller.

SERVICES PURS

Créer au minimum :

build-comparable-feature-comparison.ts ;

calculate-live-price-gaps.ts ;

validate-live-comparable-response.ts ;

normalize-live-comparable-response.ts ;

validate-live-seller-summary.ts ;

normalize-live-seller-summary.ts.

Ajouter les tests unitaires associés.

SELLER PRESENTATION

Adapter pour exposer :

comparables retenus ;

photos ;

comparaison par critère ;

historique de prix ;

durée observée ;

réponses vendeur ;

concurrent dangereux ;

valeur perçue ;

analyse comparative conseiller ;

écarts de prix.

Aucune donnée inventée.

LIVE UI

Types de pages :

intro ;

comparable_competition ;

comparable_price ;

comparable_duration ;

dangerous_competitor ;

seller_perceived_price ;

price_analysis ;

conclusion.

Règles :

grande place aux photos ;

une question centrale par page ;

faible densité ;

révélation progressive ;

responsive tablette ;

aucun scroll horizontal ;

plein écran ;

réponses persistées ;

aucune édition des données métier source.

MIGRATION

Créer une seule migration Mission 24 contenant :

tables ;

contraintes ;

index ;

FK ;

RLS ;

policies ;

defaults ;

updated_at selon convention.

Pas de migration corrective séparée avant commit.

TESTS OBLIGATOIRES

Comparaison

surface same/advantage/weakness ;

pièces ;

état ;

DPE/GES ;

extérieur ;

stationnement ;

unknown ;

aucune invention.

Réponses

yes/no/unsure ;

commentaires ;

estimation prix ;

raison durée ;

données partielles ;

validation ;

persistance ;

mise à jour ;

absence de duplication.

Synthèse

concurrent dangereux ;

raison/commentaire ;

valeur vendeur ;

analyse conseiller ;

écarts €/% ;

division par zéro ;

données manquantes.

Sécurité

non authentifié ;

autre agence ;

comparable hors projet ;

projet inexistant ;

identifiant falsifié ;

CRUD inter-agence refusé.

Photos

JSON-LD ;

Open Graph ;

HTML ;

déduplication ;

ordre ;

fallback ;

plusieurs photos ;

aucune photo ;

portail inaccessible.

Live

3 pages par comparable ;

aucun prix/délai page 1 ;

prix révélé page 2 seulement après réponse ;

durée page 3 ;

comparable suivant ;

concurrent dangereux ;

analyse finale ;

données source en lecture seule ;

réponses Live modifiables ;

plein écran ;

clavier ;

tablette.

CRITÈRES D’ACCEPTATION

La mission est validée lorsque :

la boucle 3 étapes fonctionne ;

page 1 sans prix ni délai ;

comparaison noir/vert/orange déterministe ;

réponses vendeur persistées ;

prix révélé après estimation vendeur ;

historique affiché s’il existe ;

durée uniquement page 3 ;

concurrent dangereux sélectionnable ;

valeur perçue et analyse conseiller saisissables ;

écarts calculés ;

photos accessibles aspirées et affichées ;

fallback propre si portail bloqué ;

tablette lisible ;

aucune estimation automatique ;

sécurité multi-agence garantie ;

tests, lint, typecheck, build et db reset verts.

HORS PÉRIMÈTRE

V2

connexion Castorus réelle ;

historique multi-source enrichi ;

upload photos ;

annotations ;

personnalisation avancée ;

partage externe ;

export PDF ;

historique complet des sessions Live.

V3

IA de comparaison ;

reconnaissance automatique de défauts ;

narration automatique ;

prédiction ;

estimation automatique ;

CRM.

DEFINITION OF DONE

modèle de données créé ;

migration et RLS terminées ;

moteur de comparaison testé ;

réponses vendeur persistées ;

boucle 3 étapes implémentée ;

synthèse concurrent dangereux ;

analyse finale ;

photos auditées et corrigées ;

SellerPresentation adapté ;

Live reconstruit ;

desktop/tablette testés ;

mission laissée à « À réaliser. » avant revue CTO ;

aucun commit ;

aucun push.

Contrôles

npm run test
npm run lint
npm run typecheck
npm run build
npm run format:check
supabase db reset

Exécuter les tests SQL Mission 24.

Livrables attendus

résumé produit ;

architecture ;

migration ;

schéma ;

RLS ;

moteur de comparaison ;

règles couleurs ;

actions ;

services ;

structure Live ;

SellerPresentation ;

stratégie photos ;

corrections import ;

tests ;

résultats desktop/tablette ;

résultats test/lint/typecheck/build/db reset ;

SQL ;

git diff ;

git status ;

points de vigilance.

Aucun commit.Aucun push.

Une revue CTO sera effectuée avant validation.