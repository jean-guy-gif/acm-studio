MISSION 25 — FINITION UX/UI, CHARTE START ACADEMY ET FRANCISATION

Statut

Réalisée.

Classification

MVP

Objectif

Transformer ACM Studio en un produit visuellement cohérent, professionnel et crédible en rendez-vous vendeur, sans modifier inutilement la logique métier validée.

Priorités :

Live

Builder

Authentification et onboarding

Cohérence globale

Principes produit

ACM Studio reste un outil de compréhension du marché concurrentiel et un support de rendez-vous vendeur. Il ne devient ni CRM, ni moteur d’estimation automatique, ni outil DVF.

Le logiciel prépare. Le conseiller anime. Le vendeur comprend. Le conseiller décide.

Direction artistique

Référence principale : Elephant Skin.Références secondaires : Era Residence, Smeulders, ABVTEK, template award-winning-website comme inspiration technique uniquement.

À retenir :

grandes questions éditoriales ;

narration progressive ;

grands visuels ;

compositions premium ;

respiration ;

progression claire ;

animations sobres ;

photos immobilières dominantes.

Ne pas copier les sites ou leurs assets.

Charte Start Academy

Couleurs :

Blanc : #FFFFFF

Bleu accent : #3EA9FF

Bleu profond : #00527A

Couleurs fonctionnelles :

avantage concurrent : vert ;

faiblesse concurrent : orange ;

information inconnue : gris ;

erreur : rouge.

Typographies :

Rajdhani pour les titres et éléments distinctifs ;

Montserrat pour le corps et l’interface.

Logo :

version horizontale ;

symbole seul ;

fond clair ;

fond sombre ;

favicon ou marque compacte si nécessaire.

Mini design system

Centraliser :

couleurs ;

typographies ;

rayons ;

espacements ;

ombres ;

bordures ;

tailles de titres ;

états interactifs ;

breakpoints.

Harmoniser :

boutons principal, secondaire, danger, discret ;

champs texte, numériques, select, textarea ;

checkbox, radio ;

badges ;

alertes ;

cartes ;

blocs métriques ;

sections ;

modales ;

lightbox ;

états vides ;

loaders ;

confirmations ;

erreurs de champ.

Réutiliser les composants existants lorsqu’ils sont cohérents. Ne pas ajouter de bibliothèque lourde.

Francisation complète

Règle bloquante : aucun mot anglais visible dans :

Login ;

Onboarding ;

Builder ;

Live ;

formulaires ;

boutons ;

badges ;

messages d’erreur ;

confirmations ;

états vides ;

modales ;

lightbox ;

titres ;

navigation ;

infobulles ;

chargements ;

textes système affichés.

Exemples :

Loading → Chargement

Save → Enregistrer

Cancel → Annuler

Next → Suivant

Previous → Précédent

Submit → Valider

Edit → Modifier

Delete → Supprimer

Unknown → Non renseigné

Outdated → À actualiser

Up to date → À jour

No data → Aucune donnée

Full screen → Plein écran

Close → Fermer

Price history → Historique des prix

Seller response → Réponse du vendeur

Serious competitor → Concurrent sérieux

Les valeurs techniques internes peuvent rester en anglais, mais les libellés affichés doivent être français.

Créer ou compléter des dictionnaires de libellés. Ne pas disperser les traductions.

Audit des textes

Rechercher dans tout src/ :

mots anglais visibles ;

libellés incohérents ;

fautes ;

accents manquants ;

ponctuation incohérente ;

messages trop longs ;

formulations ambiguës ;

vocabulaire assimilable à une estimation automatique.

Privilégier :

analyse du marché concurrentiel ;

positionnement observé ;

tendances du marché ;

valeur perçue par le vendeur ;

analyse comparative du conseiller ;

décision du conseiller ;

concurrent sérieux ;

concurrent le plus dangereux ;

observé sur le marché depuis X jours.

Éviter :

estimation automatique ;

vraie valeur ;

prix juste ;

valeur calculée du bien ;

recommandation automatique.

Priorité 1 — Live

Objectifs :

une question centrale par page ;

lecture immédiate ;

photos dominantes ;

hiérarchie forte ;

faible densité ;

progression claire ;

navigation discrète ;

responsive tablette ;

aucun chevauchement ;

aucune ambiguïté.

Intro

logo ;

nom du projet ;

adresse ;

nom vendeur si prévu ;

titre clair ;

bouton de démarrage ;

composition premium.

Étape 1

galerie dominante ;

question centrale ;

caractéristiques comparées ;

noir / vert / orange ;

réponse vendeur ;

aucun prix ni délai.

Étape 2

saisie vendeur ;

validation ;

révélation du prix ;

écarts euros / pourcentage ;

historique si disponible ;

animation sobre.

Étape 3

durée observée ;

historique ;

question ;

raison ;

commentaire.

Galerie

Harmoniser :

mosaïque ;

compteur ;

miniatures ;

lightbox ;

flèches ;

fermeture ;

responsive ;

aucune image déformée.

Progression

Afficher clairement :

Concurrent X sur N

Étape Y sur 3

Concurrent dangereux

Créer une page visuelle avec cartes, photos, prix, durée, sélection, raison et commentaire.

Analyse finale

Mettre en scène séparément :

valeur perçue vendeur ;

positionnement observé ;

analyse comparative conseiller.

Afficher les écarts clairement, sans laisser croire que le logiciel décide.

Conclusion

Afficher synthèse, décision, justification, concurrent dangereux et message final.

Priorité 2 — Builder

Le Builder reste sobre et efficace.

Harmoniser :

navigation ;

étapes ;

cartes ;

formulaires ;

erreurs ;

confirmations ;

responsive ;

comparables ;

photos ;

badges retenu / écarté ;

synthèse ;

analyse ;

positionnement.

Vérifier :

largeur ;

alignement ;

labels ;

unités ;

aides ;

pending ;

groupes checkbox ;

boutons principaux ;

aucun débordement.

Priorité 3 — Login et Onboarding

Finaliser :

logo ;

charte ;

typographies ;

fond ;

carte ;

erreurs ;

pending ;

responsive.

Ne modifier aucune logique d’authentification.

Responsive

Tester :

Desktop : 1440 × 900

Tablette : 768 × 1024

Petit écran : 390 × 844

Vérifier :

aucun scroll horizontal ;

aucun texte superposé ;

aucune image déformée ;

boutons accessibles ;

modales visibles ;

champs utilisables ;

navigation Live non débordante ;

titres non tronqués ;

unités non cassées.

Animations

Autoriser seulement :

apparition légère ;

transition entre étapes ;

révélation du prix ;

ouverture galerie ;

hover discret ;

feedback de sauvegarde.

Éviter les animations longues, parallaxes excessives, rotations et effets permanents.

Accessibilité

Vérifier :

contraste ;

focus visible ;

navigation clavier ;

labels ;

aria-label si nécessaire ;

modal/lightbox accessibles ;

Esc ;

ordre de tabulation ;

zones cliquables ;

textes alternatifs ;

messages d’erreur annoncés.

Audit des chevauchements

Corriger :

mots superposés ;

boutons qui se recouvrent ;

labels coupés ;

badges hors carte ;

titres + navigation Live ;

texte illisible sur image ;

unités cassées ;

lightbox sur tablette ;

modales hors viewport.

Tout chevauchement masquant une information ou une action est un bug MVP.

Données de test

Après supabase db reset, recréer un dataset fictif complet :

agence ;

projet ;

bien vendeur ;

diagnostics ;

copropriété ;

6 comparables retenus ;

2 écartés ;

caractéristiques structurées ;

plusieurs photos ;

réponses Live ;

concurrent dangereux ;

valeur vendeur ;

analyse conseiller ;

décision conseiller.

Ne pas committer le seed temporaire s’il n’est pas permanent.

Tests manuels

Exécuter :Login → Onboarding → Builder → Bien vendeur → Diagnostics → Copropriété → Comparables → Sélection → Analyse → Positionnement → Présentation → Live complet.

Vérifier :

aucun mot anglais ;

aucun chevauchement ;

aucun débordement ;

interactions fonctionnelles ;

clavier ;

plein écran ;

galerie/lightbox ;

réponses Live ;

persistance ;

logo ;

typographies ;

desktop/tablette/mobile.

Tests automatisés

Ajouter seulement les tests utiles :

dictionnaires de traduction ;

mappings de labels ;

absence de libellés anglais critiques ;

composants créés ;

navigation si modifiée ;

accessibilité simple si l’infrastructure existe.

Ne pas créer une usine de tests visuels.

Critères d’acceptation

Live cohérent et premium ;

Builder homogène ;

Login/Onboarding conformes ;

Rajdhani et Montserrat correctement appliquées ;

couleurs centralisées ;

aucun mot anglais visible ;

aucun texte superposé ;

aucun scroll horizontal inattendu ;

photos correctement présentées ;

lightbox fonctionnelle ;

interactions intactes ;

aucune logique métier cassée ;

desktop/tablette/petit écran testés ;

tests, lint, typecheck, build et db reset verts.

Hors périmètre

V2

personnalisation par agence ;

thèmes ;

export PDF ;

animations avancées ;

analytics UX ;

modèles ;

dark mode Builder ;

design mobile complet de Live.

V3

marque blanche ;

éditeur de thème ;

animation 3D ;

narration automatique ;

IA.

Definition of Done

mini design system consolidé ;

charte appliquée ;

Live refondu visuellement ;

Builder harmonisé ;

Login/Onboarding finalisés ;

francisation complète ;

chevauchements corrigés ;

responsive vérifié ;

accessibilité minimale vérifiée ;

dataset de test recréé ;

smoke test complet exécuté ;

mission laissée à « À réaliser. » avant revue CTO ;

aucun commit ;

aucun push.

Contrôles obligatoires

npm run test
npm run lint
npm run typecheck
npm run build
npm run format:check
supabase db reset

Exécuter les tests SQL concernés.

Livrables attendus

audit initial UX/UI ;

liste des mots anglais corrigés ;

tokens créés ;

composants harmonisés ;

pages Live modifiées ;

pages Builder modifiées ;

Login/Onboarding ;

résultats responsive ;

corrections de chevauchement ;

accessibilité ;

tests ajoutés ;

résultats des contrôles ;

anomalies restantes ;

décisions V2/V3 ;

git diff ;

git status ;

aucun commit ;

aucun push.

Une revue CTO sera effectuée avant validation.