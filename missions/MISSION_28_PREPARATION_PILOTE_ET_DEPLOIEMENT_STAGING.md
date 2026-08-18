MISSION 28 — PRÉPARATION PILOTE ET DÉPLOIEMENT STAGING

Statut

Réalisée — validée CTO.

Classification

MVP

Objectif produit

Passer d’un ACM Studio fonctionnel en local à une version réellement testable par un conseiller immobilier dans un environnement distant stable.

Cette mission ne crée pas de nouvelle fonctionnalité métier.

Elle doit rendre le produit :

déployable ;

accessible hors du Mac de développement ;

testable avec un vrai compte pilote ;

reproductible depuis GitHub ;

vérifiable de bout en bout.

Objectif final : obtenir une URL de staging ACM Studio utilisable pour un rendez-vous vendeur test.

Principes

Ne pas modifier les fondations déjà validées.

Conserver :

Next.js ;

Supabase ;

Builder / Préparation ;

Live ;

Auth ;

RLS ;

architecture actuelle ;

import manuel comme fallback ;

IA assistante mais jamais décisionnaire.

Ne pas créer :

nouvelle architecture ;

nouveau moteur métier ;

nouveau CRM ;

nouvelle logique d’estimation ;

nouvelle fonctionnalité produit non nécessaire au pilote.

1. Audit de déploiement

Avant toute modification, inspecter :

package.json ;

next.config.* ;

.env* ;

configuration Supabase ;

migrations ;

fonctions éventuelles ;

scripts npm ;

configuration de build ;

variables utilisées côté serveur/client ;

middleware ;

authentification ;

callback / redirect URLs ;

stockage images éventuel ;

dépendances externes ;

configuration GitHub existante ;

éventuelle configuration Vercel / Netlify / autre.

Produire un diagnostic court :

ce qui est déjà prêt ;

ce qui manque ;

ce qui bloque un staging ;

ce qui peut attendre V2.

Ne pas créer de documentation longue.

2. Choix de la cible de staging

Privilégier la solution la plus simple compatible avec le dépôt existant.

Recommandation par défaut si aucune fondation contradictoire n’existe :

Frontend : Vercel ;

Backend / DB / Auth : Supabase hébergé ;

Repository : GitHub main.

Ne pas imposer Vercel si le dépôt contient déjà une cible de déploiement valide.

Aucune nouvelle couche d’infrastructure inutile.

3. Variables d’environnement

Identifier toutes les variables nécessaires au fonctionnement réel.

Créer ou mettre à jour uniquement si nécessaire :

.env.example

Ne jamais committer :

clés privées ;

service role ;

mots de passe ;

secrets de production ;

tokens personnels.

Le fichier .env.example doit contenir uniquement :

noms des variables ;

exemples neutres ;

commentaires très courts si nécessaires.

Vérifier la séparation :

variables publiques navigateur ;

variables serveur ;

secrets.

4. Supabase hébergé

Vérifier la stratégie pour créer/rejoindre un projet Supabase distant.

Le schéma distant doit être reproductible uniquement à partir :

des migrations versionnées ;

des commandes documentées dans le dépôt.

Tester que toutes les migrations M1 → M27 rejouent proprement sur une base vide.

Ne pas copier manuellement un schéma local incomplet.

Vérifier :

tables ;

indexes ;

contraintes ;

RLS ;

policies ;

triggers ;

fonctions SQL ;

buckets éventuels ;

Auth ;

migrations Mission 26 ;

seller_estimated_days_on_market.

5. Données pilote

Ne jamais pousser les données QA locales vers le pilote.

Prévoir un jeu minimal de données pilote.

Créer uniquement ce qui est nécessaire :

agence pilote ;

utilisateur pilote ;

profil ;

rôle ;

premier dossier vendeur vide ou exemple clairement marqué comme démonstration.

Ne pas utiliser :

données personnelles réelles sans validation ;

photos clientes réelles sans autorisation ;

données QA Marie Lefevre ;

comptes qa25@acm.local.

Si un seed de démonstration est nécessaire, il doit être séparé du seed de production.

6. Authentification distante

Tester :

création de compte ;

confirmation si activée ;

connexion ;

déconnexion ;

cookies ;

session ;

redirection ;

accès RLS ;

accès refusé hors agence ;

comportement après refresh.

Vérifier les URLs de redirection pour le domaine de staging.

Aucune désactivation de sécurité pour “faire marcher le staging”.

7. Préparation complète

Tester dans l’environnement distant :

création dossier vendeur ;

bien vendeur ;

diagnostics ;

copropriété ;

comparables ;

ajout manuel ;

import URL si accessible ;

collage HTML ;

recherche de concurrents ;

sélection ;

analyse concurrentielle ;

positionnement ;

décision conseiller ;

préparation présentation.

Le mode manuel doit toujours fonctionner même si un portail bloque l’aspiration.

8. Live complet

Tester un parcours vendeur réel sur staging :

intro ;

concurrent sérieux ;

galerie ;

comparaison caractéristiques ;

estimation du prix concurrent ;

révélation du prix ;

estimation de durée ;

révélation durée réelle ;

révélation historique/baisse seulement après saisie ;

concurrent le plus dangereux ;

valeur perçue vendeur ;

analyse comparative conseiller ;

conclusion ;

persistance ;

rechargement ;

plein écran si navigateur compatible.

Vérifier particulièrement les invariants M24/M26/M27.

9. Import réel

Tester au moins un portail accessible réellement depuis l’environnement distant.

Vérifier :

URL ;

extraction ;

source ;

prix ;

photos ;

caractéristiques ;

fallback manuel.

Ne jamais contourner :

anti-bot ;

authentification portail ;

CAPTCHA ;

restrictions contractuelles.

Un échec contrôlé avec fallback manuel est acceptable pour le MVP.

10. Images

Vérifier :

domaines distants autorisés par Next Image ;

images importées ;

erreurs d’hôte ;

fallback ;

galerie ;

lightbox.

Ne pas ajouter une infrastructure image complexe.

Si un domaine externe doit être autorisé, limiter strictement la configuration aux domaines nécessaires.

11. Sécurité minimale pilote

Contrôler :

aucune service-role key côté navigateur ;

aucun secret dans Git ;

aucun .env.local committé ;

RLS active ;

séparation agence ;

accès direct URL interdit aux utilisateurs non autorisés ;

erreurs serveur sans fuite de secret ;

routes protégées ;

dataset pilote non public.

Ne pas transformer M28 en audit sécurité complet.

12. Observabilité minimale

Pour le pilote, vérifier qu’une erreur de production peut être diagnostiquée.

Minimum acceptable :

logs plateforme ;

logs Supabase ;

erreurs Next.js visibles côté hébergeur.

Ne pas ajouter Sentry ou autre dépendance si les logs natifs suffisent pour le pilote.

Monitoring avancé → V2.

13. Responsive pilote

Vérifier sur staging :

desktop 1440×900 ;

tablette 768×1024.

Contrôle rapide mobile :

390×844.

Le rendez-vous vendeur cible principalement desktop/tablette.

14. Checklist pilote humaine

Effectuer manuellement sur l’URL distante :

connexion ;

création d’un dossier ;

saisie vendeur ;

ajout d’un comparable manuel ;

import d’un comparable si disponible ;

sélection ;

préparation ;

Live complet ;

refresh ;

reconnexion ;

persistance ;

plein écran ;

galerie ;

lightbox.

Le test doit être fait sans dépendre du localhost.

15. Contrôles techniques

Avant validation :

npm run test
npm run lint
npm run typecheck
npm run format:check
npm run build

Base locale :

supabase db reset

Exécuter tous les fichiers de :

supabase/tests/

Puis vérifier :

build distant ;

migrations distantes ;

logs sans erreur bloquante.

16. Hors périmètre

V2

monitoring avancé ;

analytics produit ;

Sentry ;

CI/CD sophistiquée ;

environnement preview par PR ;

domaine personnalisé final ;

gestion multi-environnements complexe ;

backup automatisé avancé ;

invitations équipe élaborées ;

personnalisation agence.

V3

multi-région ;

haute disponibilité avancée ;

infrastructure dédiée ;

observabilité complète ;

autoscaling spécifique.

17. Critères d’acceptation

Mission validée uniquement si :

une URL staging distante existe ;

un utilisateur pilote peut se connecter ;

RLS fonctionne ;

le Builder fonctionne ;

le Live fonctionne ;

les données persistent ;

le mode manuel fonctionne ;

au moins un test d’import réel a été effectué ou un refus contrôlé documenté ;

aucune clé secrète n’est exposée ;

toutes les migrations rejouent ;

tous les tests SQL passent ;

test/lint/typecheck/format/build verts ;

parcours humain distant validé.

18. Definition of Done

audit de déploiement terminé ;

environnement staging opérationnel ;

Supabase distant opérationnel ;

variables configurées ;

Auth validée ;

migrations validées ;

Builder validé à distance ;

Live validé à distance ;

persistance validée ;

sécurité minimale vérifiée ;

checklist humaine exécutée ;

rapport final fourni ;

Mission 28 laissée à « À réaliser. » avant revue CTO ;

aucun commit sans validation CTO ;

aucun push supplémentaire sans validation CTO.

Rapport attendu

État global

GO / NO-GO pilote.

Infrastructure

hébergeur frontend ;

Supabase distant ;

URL staging ;

variables requises ;

éventuels blocages.

Base

migrations ;

tests SQL ;

RLS ;

types.

Auth

login/logout ;

session ;

redirections ;

isolation agence.

Préparation

parcours testé ;

résultats.

Live

parcours testé ;

résultats ;

persistance.

Import

portails testés ;

résultat ;

fallback.

Sécurité

secrets ;

RLS ;

routes.

Contrôles

test ;

lint ;

typecheck ;

format ;

build ;

db reset ;

SQL.

Validation humaine

desktop ;

tablette ;

remarques.

Git

git diff --stat ;

git status --short.

Aucun commit.Aucun push sans validation CTO.

---

## Rapport de smoke test staging — 18/08/2026

Environnement : https://acm-studio-henna.vercel.app
Frontend : Vercel (dépôt GitHub, branche main) · Backend/DB/Auth : Supabase hébergé · Schéma issu uniquement des migrations versionnées (M1 → M27).

Verdict : **GO PILOTE.**

Le produit est réellement accessible et utilisable à distance, hors du poste de développement. Le parcours Builder → Live fonctionne de bout en bout sur l'URL de staging, avec persistance des données.

### Sécurité — vérifiée manuellement par le CTO

- déconnexion effective ;
- accès direct à `/builder` sans session → redirection vers la page de connexion (route protégée) ;
- reconnexion opérationnelle après redirection.

### Thème Clair/Sombre

Persistance du thème Clair/Sombre vérifiée en production (le choix est conservé après navigation et rechargement).

## Backlog V2 — bugs mineurs relevés (non bloquants pour le pilote)

1. Photos parasites lors d'un import bloqué (des images non pertinentes peuvent apparaître quand le portail refuse la lecture).
2. Prix non lu dans le second schéma JSON-LD (le prix n'est pas extrait lorsqu'il est porté par un deuxième nœud JSON-LD).
3. Photo cassée en carte / dans le Live alors qu'elle s'affiche correctement dans le formulaire (incohérence d'affichage selon le contexte).
4. Le Live repart à l'intro après un rechargement (l'étape courante n'est pas restaurée au refresh).

Ces quatre points sont mineurs, n'empêchent pas le pilote, et sont reportés en V2.