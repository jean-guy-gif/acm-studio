# MISSION 09 — Bootstrap agence et profil owner

## Contexte

L’authentification Supabase est opérationnelle.

La Mission 08 a mis en place le routage suivant :

```text
Utilisateur authentifié
↓
Profil existe ?
├── Oui → /protected
└── Non → /onboarding
```

Un utilisateur Auth sans profil arrive donc sur `/onboarding`.

Le schéma multi-tenant repose sur :

```text
profiles.agency_id
```

Les policies RLS utilisent :

```sql
public.get_current_agency_id()
```

Un utilisateur sans ligne dans `public.profiles` ne peut pas créer directement son agence et son profil avec les policies actuelles.

Cette mission doit résoudre uniquement ce bootstrap initial.

---

# Objectif

Permettre à un utilisateur Auth connecté sans profil de :

1. créer une agence ;
2. créer son profil ;
3. obtenir le rôle `owner` ;
4. être rattaché à l’agence créée ;
5. accéder ensuite à `/protected`.

La création de l’agence et du profil doit être :

* atomique ;
* sécurisée ;
* exécutée côté PostgreSQL ;
* compatible avec RLS ;
* impossible à rejouer pour un utilisateur possédant déjà un profil.

---

# Décision d’architecture

Créer une fonction PostgreSQL RPC :

```text
public.bootstrap_agency_owner
```

La fonction doit être :

```sql
security definer
```

Elle doit utiliser :

```sql
set search_path = public
```

Elle ne doit jamais accepter un `user_id` fourni par le client.

L’identité utilisateur doit provenir exclusivement de :

```sql
auth.uid()
```

La fonction doit créer l’agence et le profil dans une seule transaction PostgreSQL.

Une fonction PostgreSQL s’exécute déjà dans la transaction de l’appel RPC. Aucun système de transaction applicatif supplémentaire ne doit être créé.

---

# Données demandées à l’utilisateur

Le formulaire d’onboarding doit demander uniquement :

```text
Nom de l’agence
Prénom
Nom
```

L’email ne doit pas être demandé dans le formulaire.

Il doit provenir de l’utilisateur Supabase Auth connecté.

Ne pas ajouter dans cette mission :

* logo ;
* couleur principale ;
* adresse ;
* téléphone ;
* numéro de carte professionnelle ;
* informations juridiques ;
* abonnement ;
* invitation d’utilisateurs ;
* paramétrage complet de l’agence.

Ces éléments sont hors MVP immédiat.

---

# À réaliser

## 1. Migration Supabase

Créer une nouvelle migration.

Ne jamais modifier la migration initiale existante :

```text
supabase/migrations/20260709172259_initial_schema.sql
```

Nom indicatif :

```text
supabase/migrations/<timestamp>_bootstrap_agency_owner.sql
```

La migration doit créer :

```sql
public.bootstrap_agency_owner(
  agency_name text,
  first_name text,
  last_name text
)
```

La fonction doit retourner au minimum :

```text
profile_id
agency_id
```

Le type de retour peut être :

```sql
table (
  profile_id uuid,
  agency_id uuid
)
```

---

## 2. Validations SQL obligatoires

La fonction doit vérifier :

### Utilisateur authentifié

```sql
auth.uid() is not null
```

Sinon lever une erreur explicite.

### Nom de l’agence

Le nom doit être nettoyé avec :

```sql
btrim()
```

Il ne doit pas être vide.

### Prénom

Le prénom doit être nettoyé avec :

```sql
btrim()
```

Il ne doit pas être vide.

### Nom

Le nom doit être nettoyé avec :

```sql
btrim()
```

Il ne doit pas être vide.

### Email Auth

Récupérer l’email depuis :

```text
auth.users
```

pour l’utilisateur correspondant à :

```sql
auth.uid()
```

Ne jamais accepter l’email depuis les arguments RPC.

Si aucun email n’est disponible, lever une erreur explicite.

### Profil déjà existant

Vérifier si une ligne existe déjà dans :

```text
public.profiles
```

avec :

```sql
id = auth.uid()
```

Si oui, refuser le bootstrap.

La fonction ne doit pas retourner silencieusement le profil existant.

Elle doit lever une erreur explicite afin de détecter les appels incohérents ou répétés.

---

## 3. Création de l’agence

Créer une ligne dans :

```text
public.agencies
```

avec :

```text
name = nom d’agence nettoyé
```

Ne renseigner que les champs nécessaires.

Utiliser les valeurs par défaut définies en base pour les autres colonnes.

Récupérer l’identifiant de l’agence créée.

---

## 4. Création du profil

Créer une ligne dans :

```text
public.profiles
```

avec :

```text
id = auth.uid()
agency_id = agence créée
email = email Auth
first_name = prénom nettoyé
last_name = nom nettoyé
role = 'owner'
```

Le rôle ne doit jamais être fourni par le client.

Le client ne doit jamais pouvoir choisir :

```text
admin
advisor
owner
```

Dans ce bootstrap, le rôle est toujours :

```text
owner
```

---

## 5. Sécurité de la fonction

Révoquer l’exécution publique non maîtrisée si nécessaire.

Accorder explicitement l’exécution à :

```text
authenticated
```

Ne pas accorder l’exécution à :

```text
anon
```

Vérifier le propriétaire de la fonction et son comportement avec `security definer`.

Ne jamais utiliser :

```sql
with check (true)
```

Ne jamais désactiver RLS.

Ne jamais ajouter une policy permettant à tout utilisateur authentifié de créer librement des agences ou profils.

---

## 6. Types Supabase

Après application de la migration locale, régénérer :

```text
src/lib/supabase/database.types.ts
```

Commande :

```bash
supabase gen types typescript --local --schema public > src/lib/supabase/database.types.ts
```

Ne jamais modifier ce fichier manuellement.

Vérifier que la fonction apparaît dans :

```ts
Database['public']['Functions']
```

avec les arguments attendus.

---

## 7. Helper serveur

Créer :

```text
src/lib/onboarding/bootstrap-agency-owner.ts
```

Responsabilité unique :

* appeler la RPC `bootstrap_agency_owner` ;
* recevoir `agencyName`, `firstName`, `lastName` ;
* retourner le résultat ;
* transformer l’erreur Supabase en erreur exploitable.

Le helper doit utiliser :

```text
src/lib/supabase/server.ts
```

Ne pas créer de client Supabase spécifique.

Ne pas mettre de logique SQL ou métier dans React.

---

## 8. Server Action onboarding

Créer :

```text
src/app/onboarding/actions.ts
```

Créer une Server Action :

```text
bootstrapAgencyOwner
```

La Server Action doit :

1. récupérer les valeurs du `FormData` ;
2. effectuer une validation minimale côté serveur ;
3. appeler le helper ;
4. revalider le layout ;
5. rediriger vers `/protected` après réussite ;
6. rediriger vers `/onboarding?error=...` en cas d’erreur exploitable.

Champs attendus :

```text
agencyName
firstName
lastName
```

Ne pas accepter :

```text
userId
agencyId
role
email
```

---

## 9. Page onboarding

Modifier :

```text
src/app/onboarding/page.tsx
```

La page doit :

1. vérifier que l’utilisateur n’a pas déjà un profil ;
2. rediriger vers `/protected` si un profil existe déjà ;
3. afficher le formulaire minimal si aucun profil n’existe ;
4. afficher une erreur éventuelle provenant des `searchParams`.

Formulaire :

```text
Nom de l’agence
Prénom
Nom
Créer mon agence
```

Aucun design avancé.

Aucune bibliothèque UI.

Aucun composant générique prématuré.

---

# Comportement attendu

## Cas 1 — Utilisateur non authentifié

Accès :

```text
/onboarding
```

Résultat :

```text
/login
```

La protection existante doit continuer à fonctionner.

---

## Cas 2 — Utilisateur authentifié sans profil

Accès :

```text
/onboarding
```

Résultat :

```text
formulaire affiché
```

Après soumission valide :

```text
agence créée
profil owner créé
redirection /protected
```

---

## Cas 3 — Utilisateur authentifié avec profil

Accès :

```text
/onboarding
```

Résultat :

```text
/protected
```

Aucun second bootstrap possible.

---

## Cas 4 — Double soumission

Si l’utilisateur soumet deux fois ou si deux appels concurrents sont lancés :

* un seul profil doit exister ;
* aucune seconde agence orpheline ne doit subsister ;
* l’un des appels doit échouer proprement.

La transaction PostgreSQL doit empêcher un état partiel.

La clé primaire de `profiles.id` constitue une dernière protection, mais la fonction doit également vérifier explicitement l’existence préalable du profil.

---

## Cas 5 — Données invalides

Refuser :

```text
agencyName vide
firstName vide
lastName vide
```

Aucune agence ne doit être créée.

Aucun profil ne doit être créé.

---

# Tests obligatoires

Utiliser uniquement Supabase local.

## Test SQL / RPC

Vérifier :

1. utilisateur non authentifié → RPC refusée ;
2. utilisateur Auth sans profil → bootstrap réussi ;
3. agence créée ;
4. profil créé ;
5. `profile.id = auth.uid()` ;
6. rôle `owner` ;
7. email provenant de `auth.users` ;
8. agence et profil liés correctement ;
9. deuxième appel → refusé ;
10. aucune seconde agence créée ;
11. paramètres vides → refusés ;
12. aucune donnée partielle après erreur.

---

## Test applicatif complet

Tester le parcours réel :

```text
connexion utilisateur Auth sans profil
↓
/protected
↓
redirection /onboarding
↓
formulaire complété
↓
soumission
↓
création agence + profil
↓
redirection /protected
↓
HTTP 200
```

Vérifier ensuite :

```text
/onboarding → /protected
```

---

## Nettoyage des tests

Supprimer après les tests :

* utilisateur Auth éphémère ;
* profil temporaire ;
* agence temporaire ;
* scripts de test ;
* fichiers scratchpad ponctuels.

Vérifier explicitement l’absence d’agence orpheline.

---

# Fichiers prévus

À créer :

```text
supabase/migrations/<timestamp>_bootstrap_agency_owner.sql
src/lib/onboarding/bootstrap-agency-owner.ts
src/app/onboarding/actions.ts
missions/MISSION_09_PROFILE_BOOTSTRAP.md
```

À modifier :

```text
src/app/onboarding/page.tsx
src/lib/supabase/database.types.ts
```

À examiner :

```text
src/app/(protected)/layout.tsx
src/lib/auth/get-profile.ts
src/lib/auth/get-user.ts
src/lib/supabase/server.ts
supabase/migrations/20260709172259_initial_schema.sql
DATABASE.md
```

À ne pas modifier :

```text
supabase/migrations/20260709172259_initial_schema.sql
DATABASE.md
src/proxy.ts
src/lib/supabase/middleware.ts
src/app/login/actions.ts
```

Sauf bug réel démontré et documenté.

---

# Contraintes

Ne pas créer :

* système d’invitation ;
* utilisateurs supplémentaires ;
* gestion des rôles ;
* dashboard ;
* paramètres agence ;
* logo ;
* couleur ;
* abonnement ;
* Builder ;
* Live ;
* Admin ;
* nouvelle architecture d’authentification ;
* client `service_role` dans l’application ;
* API Route inutile ;
* Edge Function ;
* repository générique ;
* service générique.

Ne pas ajouter de dépendance.

Ne pas modifier le schéma existant hors ajout de la fonction RPC.

Ne pas créer de nouvelle table.

---

# Vérifications techniques

Exécuter :

```bash
supabase db reset
```

Puis :

```bash
npm run lint
npm run typecheck
npm run build
npm run format:check
```

Vérifier :

```bash
git diff
git status
```

---

# Rapport final attendu

Le rapport doit contenir :

1. fichiers créés ;
2. fichiers modifiés ;
3. signature exacte de la RPC ;
4. fonctionnement de `security definer` ;
5. validations effectuées dans la RPC ;
6. origine de l’identité utilisateur ;
7. origine de l’email ;
8. fonctionnement transactionnel ;
9. fonctionnement du helper serveur ;
10. fonctionnement de la Server Action ;
11. fonctionnement du formulaire ;
12. résultats détaillés des tests SQL ;
13. résultats détaillés du parcours applicatif ;
14. vérification du double appel ;
15. vérification de l’absence d’agence orpheline ;
16. résultats de lint ;
17. résultats de typecheck ;
18. résultats du build ;
19. résultats du format check ;
20. `git diff` ;
21. `git status`.

Ne pas effectuer le commit.

---

# Commit prévu

```text
feat(onboarding): bootstrap agency owner profile
```

---

# Definition of Done

La mission est validée si :

* la RPC utilise exclusivement `auth.uid()` pour identifier l’utilisateur ;
* aucun `user_id` n’est accepté en paramètre ;
* l’email provient de Supabase Auth ;
* agence et profil sont créés atomiquement ;
* le profil reçoit automatiquement le rôle `owner` ;
* un utilisateur possédant déjà un profil ne peut pas relancer le bootstrap ;
* une erreur ne laisse aucune agence orpheline ;
* le formulaire onboarding fonctionne ;
* le parcours complet aboutit à `/protected` ;
* l’accès à `/onboarding` avec un profil redirige vers `/protected` ;
* aucune policy permissive n’est ajoutée ;
* RLS reste activé ;
* aucune clé `service_role` n’est utilisée dans l’application ;
* les types Supabase sont régénérés ;
* aucun fichier généré n’est modifié manuellement ;
* lint est vert ;
* typecheck est vert ;
* build est vert ;
* aucun commit n’est effectué avant revue CTO.
