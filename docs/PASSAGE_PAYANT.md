# Passer aux offres payantes

Pour Laurent. À faire **juste avant d'inviter les premiers conseillers**, pas avant. Rien de ce qui
suit n'est activé aujourd'hui (décision du 12/10/2026 : « gratuite d'abord »).

## Pourquoi payer

| Aujourd'hui (gratuit)                                                                             | Ce que le payant règle                                   |
| ------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| Une seule base, partagée entre la production et l'essai : un test raté touche les vrais dossiers. | Deux bases : une pour les conseillers, une pour l'essai. |
| Sauvegarde à la main (`npm run sauvegarde`), quand on y pense.                                    | Sauvegarde automatique chaque jour, gardée 7 jours.      |
| Une base gratuite est mise en pause après une semaine sans activité.                              | Jamais de mise en pause.                                 |
| L'offre gratuite de Vercel est réservée à un usage non commercial.                                | Usage commercial autorisé.                               |

## Ce que ça coûte

| Offre                           | Prix                                  | Remarque                                                           |
| ------------------------------- | ------------------------------------- | ------------------------------------------------------------------ |
| Supabase Pro                    | 25 $ par mois, pour l'organisation    | Comprend la première base.                                         |
| Seconde base Supabase (l'essai) | environ 10 $ par mois                 | La plus petite taille suffit.                                      |
| Vercel Pro                      | 20 $ par mois et par personne         | Une seule personne : vous.                                         |
| **Total**                       | **environ 55 $ par mois (≈ 50 € HT)** | Hors Stream Estate, plafonné à part (30 € par agence et par mois). |

Ces prix sont ceux que je connais à la rédaction : **vérifiez-les sur les pages de tarifs le jour où
vous payez** (supabase.com/pricing, vercel.com/pricing). Les deux offres se résilient à tout moment.

## Le choix qui simplifie tout

**La base actuelle devient la base de production. On crée une base neuve pour l'essai.**

C'est l'inverse de ce qu'on imagine d'abord, et c'est le chemin le plus sûr :

- les vrais dossiers, les comptes des conseillers, leurs mots de passe et leurs photos **ne bougent
  pas** : il n'y a aucune copie de données réelles à réussir ;
- la base d'essai, elle, part vide : sa structure se reconstruit depuis le dépôt, et l'on y recrée
  seulement l'agence « TEST AUTOMATIQUE » et votre compte ;
- si quelque chose se passe mal, c'est sur la base d'essai, qui ne contient rien.

L'autre chemin (une base de production neuve, où l'on recopie tout) oblige à transférer les comptes,
les mots de passe et les fichiers : plus long, plus risqué, sans avantage.

## Les étapes, dans l'ordre

Comptez une heure, à faire d'une traite, à un moment où personne n'est en rendez-vous.

### 1. Sauvegarder (Claude Code, 5 minutes)

Demandez : « lance la sauvegarde et vérifie-la ». Claude Code lance `npm run sauvegarde` puis
`npm run sauvegarde:verifier`, qui doit finir par « Vérification réussie ». On ne va pas plus loin
sans cela.

### 2. Supabase Pro (vous, 5 minutes)

1. supabase.com → votre organisation → **Billing** → **Upgrade to Pro**.
2. Saisissez la carte. Laissez le plafond de dépense (**Spend cap**) activé : la facture ne peut
   alors pas dépasser l'offre.
3. Dans le projet actuel : **Database** → **Backups**. Vous devez voir « Daily backups ». La
   première apparaît le lendemain.

À partir d'ici, la base actuelle est sauvegardée chaque jour.

### 3. Créer la base d'essai (vous, 5 minutes)

1. **New project**, dans la même organisation. Nom : `acm-studio-essai`. Région : la même que le
   projet actuel. Taille : la plus petite.
2. Notez le mot de passe de la base dans votre gestionnaire de mots de passe.
3. **Authentication** → **Sign In / Providers** : désactivez l'inscription libre (« Allow new users
   to sign up »), comme sur le projet actuel.
4. Dans **Project Settings** → **API**, gardez la page ouverte : Claude Code vous demandera de
   coller trois valeurs dans Vercel (étape 5), jamais dans la conversation.

### 4. Préparer la base d'essai (Claude Code, 15 minutes)

Demandez : « prépare la base d'essai ». Claude Code :

- reconstruit la structure (toutes les migrations du dépôt) dans la base neuve ;
- vous fait créer votre compte et celui du test automatique, puis recrée l'agence
  « TEST AUTOMATIQUE » ;
- vous donne les modèles d'e-mail à coller (invitation, mot de passe oublié) et le réglage du SMTP,
  comme sur le projet actuel ;
- adapte les scripts qui visent « la base liée » (`sauvegarde`, `nettoyer:test`, le vieillissement
  de l'e2e) pour qu'ils nomment leur base : la sauvegarde vise la production, le nettoyage vise
  l'essai. **C'est le seul changement de code de tout le passage.**

### 5. Les variables sur Vercel (vous, 10 minutes)

Vercel → projet → **Settings** → **Environment Variables**. Trois variables changent, **pour
l'environnement « Preview » seulement** (c'est celui de l'essai) :

| Variable                        | Nouvelle valeur (base d'essai) |
| ------------------------------- | ------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`      | « Project URL »                |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé « anon / public »          |
| `SUPABASE_SERVICE_ROLE_KEY`     | clé « service_role » (secrète) |

**Ne touchez pas aux valeurs de l'environnement « Production »** : elles désignent la base
actuelle, qui reste celle des conseillers. `STREAM_ESTATE_API_KEY`, `ACM_OPERATOR_EMAILS` et les
autres ne changent pas.

Puis redéployez l'essai (Vercel → **Deployments** → le dernier déploiement de `essai` →
**Redeploy**).

### 6. Vercel Pro (vous, 5 minutes)

Vercel → **Settings** → **Billing** → **Upgrade to Pro**. Une seule place suffit. Rien d'autre à
régler : les adresses (`acm-studio-henna.vercel.app`, `acm-studio-essai.vercel.app`) ne changent
pas.

### 7. Vérifier (Claude Code, 15 minutes)

Demandez : « vérifie le passage payant ». Claude Code :

- lance `npm run e2e` sur l'essai : le parcours complet doit passer sur la base neuve ;
- compte les dossiers de la base de production, avant et après : le nombre ne doit pas avoir bougé ;
- lance `npm run verifier:production` : « production à jour » ;
- met à jour `CLAUDE.md` et `docs/DECISIONS.md` : la base n'est plus partagée, une migration
  s'applique d'abord sur l'essai, puis sur la production après votre essai.

## Ce qui change ensuite dans la façon de travailler

- Une migration s'essaie pour de bon sur l'essai avant de toucher les conseillers. La règle
  « compatible avec le code de `main` » ne vaut plus que pour la production.
- La sauvegarde à la main reste utile avant une migration de production ; la sauvegarde
  hebdomadaire, elle, n'est plus nécessaire.
- Le nettoyage de l'agence de test ne peut plus rien toucher de réel : il vit sur l'autre base.

## Ce que ce passage ne fait pas

- Revenir à un instant précis de la journée (« point-in-time recovery ») : c'est une option
  Supabase à part, autour de 100 $ par mois. La sauvegarde quotidienne suffit pour commencer.
- Un outil de suivi d'erreurs externe : la page « Erreurs » en tient lieu.
