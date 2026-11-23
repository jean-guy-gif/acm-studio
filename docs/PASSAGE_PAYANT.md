# Passer aux offres payantes

Pour Laurent. À faire **juste avant d'inviter les premiers conseillers**, pas avant. Rien de ce qui
suit n'est activé aujourd'hui (décision du 12/10/2026 : « gratuite d'abord »).

> **État au 23/11/2026** : **Supabase Pro est activé** (l'organisation y est passée le 23/11 à
> 9 h 45, après la coupure ci-dessous). Les étapes 3 à 7 (la base d'essai séparée, Vercel Pro)
> restent à faire. L'étape 2 est faite ; vérifiez le plafond de dépense (« Spend cap ») et les
> sauvegardes quotidiennes.

## La coupure du 23/11/2026 : ce qui s'est passé

**Les faits.** Du dimanche 22/11 au soir (au plus tôt après 3 h 37 UTC, aucun trafic entre-temps)
au lundi 23/11 à 9 h 45 (heure de Paris), Supabase a répondu **402 (Payment Required)** à toute
requête venue de l'extérieur : connexions, lectures, écritures. Le projet restait « sain », mais
l'offre gratuite avait dépassé son quota : l'application était coupée pour toutes les agences,
production et essai (la base est commune).

**Ce qui a été touché** (journaux de Supabase, relus le 23/11) :

- les deux tâches de nuit de Vercel du lundi : la veille des acquéreurs (2 h 17 UTC) et la
  revérification des oppositions (3 h 37 UTC), refusées à leur première lecture. Rien n'est à
  rejouer : aucune opposition n'attendait de revérification, et aucun acquéreur n'était dû pour la
  veille (derniers passages les 19 et 21/11, prochains les 26 et 28/11, la veille repart d'elle-même
  à son jour) ;
- les tâches de nuit de la base elle-même (`pg_cron` : purges du journal, des adresses, des copies
  et des textes d'annonces) ont tourné normalement : la coupure ne touchait que les appels venus de
  l'extérieur ;
- deux renouvellements de session (9 h 15) et quatre connexions de l'e2e (9 h 27 à 9 h 29), refusés ;
- **rien n'a été perdu** : aucune écriture d'un conseiller ni d'un client (lien public, réponse
  d'un acquéreur, Live) n'a été refusée pendant la coupure ; seules les deux erreurs des tâches de
  nuit n'ont pas pu entrer au journal d'erreurs, lui-même refusé.

**La cause : le trafic sortant, pas la taille.** La base fait 27 Mo et les fichiers 145 Mo. Ce qui
a dépassé, c'est le trafic sortant (« egress ») du stockage : les photos des dossiers, servies par
des liens signés. Mesuré dans les journaux de Supabase, du 10 au 20/11 :

| Qui télécharge                                      | Volume en 11 jours | Part   |
| --------------------------------------------------- | ------------------ | ------ |
| Les navigateurs de l'e2e (Playwright)               | ≈ 3,0 Go           | ≈ 68 % |
| Les autres (essais à la main, conseillers, serveur) | ≈ 1,4 Go           | ≈ 32 % |
| **Total des photos du stockage**                    | **≈ 4,4 Go**       |        |

Les jours de suite e2e complète montent à 0,3 à 1,2 Go (le 17/11 : 1,2 Go). Les lectures de la
base, elles, pèsent peu. Une photo de démo fait 193 Ko en moyenne, et chaque passage la
retélécharge :

- chaque spec remet la démo à zéro, ce qui redépose ses photos (sans coût de trafic sortant) ;
- le Live précharge toutes ses photos (M144), et la synthèse, l'Étude et le Point marché les
  affichent ;
- un lien signé change à chaque page (nouveau jeton) : ni le navigateur ni le cache de Supabase ne
  le reconnaissent, la photo repart du stockage à chaque ouverture.

Le quota de l'offre gratuite se lit sur la page **Usage** de l'organisation (5 Go de trafic
sortant par mois à la rédaction, à vérifier là).

**Comment réduire** (propositions, rien n'est fait) :

1. **L'e2e ne télécharge plus les photos du stockage** sauf là où il les vérifie (`demo-photos`,
   `live-sans-trou`) : une image minuscule à leur place, servie par le navigateur de test. Gain
   attendu : les deux tiers du trafic.
2. **Des liens signés stables** : le même lien pour une photo pendant sa durée de validité (signé
   une fois, gardé côté serveur jusqu'à peu avant son expiration). Le navigateur et le cache de
   Supabase la servent alors sans retourner au stockage.
3. **Des vignettes** pour les petites images (cartes, vignettes du Live) au lieu de la photo
   entière.
4. **Surveiller** : un coup d'œil chaque semaine à la page **Usage**, et le plafond de dépense
   (« Spend cap ») gardé activé, pour qu'un dépassement coûte une alerte, pas une facture.

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
