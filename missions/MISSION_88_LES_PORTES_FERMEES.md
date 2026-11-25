# MISSION 88 — Les portes fermées avant la bêta

**Date** : 11/10/2026 · **Origine** : audit stratégique du 11/10/2026 (doc « Audit ACM Studio avant
bêta », décision 1 et correction 11), validé par Laurent : « ok ».

## Objectif

Avant d'inviter de vrais conseillers :
- personne ne peut s'attribuer des droits qu'il n'a pas ;
- un invité ne peut pas se perdre dans une agence fantôme ;
- un conseiller qui a oublié son mot de passe n'est pas bloqué ;
- aucune page d'erreur n'apparaît en anglais.

## Constats de l'audit (vérifiés dans le code de `main` au 10/10)

1. La politique `profiles_agency_isolation` (`initial_schema.sql:263`) est `FOR ALL` et ne vérifie
   que l'agence. Avec la clé publique et son jeton, un conseiller peut modifier `role`, `removed_at`,
   `email` ou `phone` de son profil **ou de celui d'un collègue**. `requireManagerProfile` fait
   ensuite confiance à ce rôle. Aucune migration ultérieure ne le protège.
2. La table `agencies` est modifiable par tout membre de l'agence (nom, seuils « ce qui dort »).
3. `saveBranding` (`save-branding.ts:58-63`) ne vérifie ni le rôle ni le retrait, puis écrit avec la
   clé service. Même un membre retiré peut changer le logo et les couleurs vus par les vendeurs.
4. Un invité qui a une session mais pas encore de profil est envoyé vers `/onboarding`
   (`(protected)/layout.tsx:20-22`). Il peut y créer sa propre agence : `bootstrap_agency_owner`
   ne regarde aucune invitation. Son invitation devient ensuite inutilisable (« Profile already
   exists »).
5. Le mot de passe de l'invité est enregistré avant la création de son profil
   (`accept-invitation/actions.ts:96-106`). Si l'acceptation échoue, il retombe dans le piège 4.
6. Il n'existe aucun « mot de passe oublié ». Les erreurs de connexion sont les messages bruts de
   Supabase, en anglais (`login/actions.ts:17`). Il n'y a ni `error.tsx`, ni `not-found.tsx`, ni
   `global-error.tsx`.

## Critères d'acceptation

### A. Profils

1. Depuis le navigateur (clé publique et jeton d'un membre), un membre ne peut modifier **que son
   propre profil**, et seulement les colonnes de « Mon profil » : prénom, nom, téléphone, photo.
   Tout le reste est refusé par la base, y compris pour un manager : `role`, `agency_id`,
   `removed_at`, `email`, et les profils des collègues. Pas d'insertion ni de suppression de profil
   depuis le navigateur.
2. Les actions serveur de gestion d'équipe (rôle, retrait, invitation), qui passent par la clé
   service après `requireManagerProfile`, continuent de fonctionner. `save-advisor-profile.ts`
   aussi.
3. La lecture reste la même : chacun lit les profils de son agence. Un membre retiré lit encore son
   propre profil (`profiles_self_read`).

### B. Agence et habillage

4. `agencies` : seul un manager non retiré peut modifier sa ligne. La lecture est inchangée.
5. `saveBranding`, et toute autre action qui écrit l'habillage ou l'identité de l'agence, exige un
   manager non retiré. Sinon : « Seul un manager de l'agence peut modifier son identité. »
6. Pour un conseiller, l'écran Administration → Identité s'affiche en lecture seule, avec cette
   phrase.

### C. Invitations

7. `bootstrap_agency_owner` refuse de créer une agence si une invitation non expirée et non
   annulée attend l'e-mail de l'utilisateur.
8. `/onboarding` détecte ce cas et renvoie vers `/accept-invitation`, avec le message « Vous avez
   été invité par une agence : finalisez votre inscription. ».
9. Accepter une invitation ne laisse jamais un compte avec mot de passe mais sans profil. Si la
   création du profil échoue, l'invité peut relancer l'acceptation depuis son lien ou depuis
   `/accept-invitation`.

### D. Inscription libre

10. Claude Code rédige dans le compte rendu la marche à suivre exacte, écran par écran, pour
    désactiver l'inscription libre dans la console Supabase de production. C'est Laurent qui le
    fait : on ne touche pas aux réglages en ligne.
11. Il vérifie ensuite, après le geste de Laurent, qu'une tentative d'inscription directe avec la
    clé publique est refusée, et que les invitations partent toujours.
12. Le compte rendu explique aussi comment ouvrir l'accès à une nouvelle agence pendant la bêta
    (compte créé ou invité depuis la console, puis `/onboarding`).

### E. Mot de passe oublié et erreurs en français

13. Sur `/login`, un lien « Mot de passe oublié ? » envoie l'e-mail de réinitialisation.
    - La réponse est toujours la même, que l'adresse existe ou non : « Si un compte existe pour
      cette adresse, un e-mail vient de partir. »
    - Le lien reçu ouvre une page « Choisir un nouveau mot de passe ». Après validation, on arrive
      sur `/builder`, connecté.
    - Le SMTP utilisé est celui des invitations, et le modèle d'e-mail est en français.
14. Les erreurs de connexion sont traduites : identifiants incorrects, e-mail non confirmé, trop de
    tentatives, lien expiré (y compris « lien-invalide » de `/auth/confirm`).
15. `error.tsx`, `not-found.tsx` et `global-error.tsx` existent, en français et aux couleurs de
    l'app, avec un bouton « Revenir à mes dossiers ».
    - Aucun détail technique n'est montré.
    - Côté Live, la page d'erreur ne montre ni prix ni donnée du dossier.

### F. Preuves

16. Des tests SQL (`supabase/tests`) couvrent :
    - un conseiller qui tente de se nommer manager ;
    - un conseiller qui tente de retirer un collègue ;
    - un conseiller qui tente de modifier le téléphone d'un collègue ;
    - un conseiller qui modifie son propre téléphone (doit passer) ;
    - un conseiller qui modifie l'agence ;
    - un manager qui modifie l'agence (doit passer) ;
    - un invité qui tente de créer une agence.

    S'ils peuvent tourner dans la CI sans base partagée, les ajouter à `ci.yml` ; sinon le dire.
17. Migration soumise avant d'être appliquée : compter avant et après les profils, les agences et
    les politiques. Puis `npm run e2e` vert, tablette comprise.

## Décisions à respecter

- M55 (rôles manager et conseiller), M70 et suivantes (invitations), M84 (téléphone et photo dans
  Mon profil).
- On ne touche pas à l'isolation entre agences, qui est saine. On restreint seulement ce qui se fait
  **à l'intérieur** d'une agence.
- Jamais de clé ni de secret dans le compte rendu.

## Hors périmètre

- Base Supabase séparée pour la bêta et passage du dépôt GitHub en privé : gestes de Laurent,
  guidés à part.
- Toutes les autres corrections de l'audit : missions 89 et suivantes.

## Essai sur l'URL d'essai

1. Avec le compte de test (conseiller) : Administration → Identité est en lecture seule. Mon profil →
   changer le téléphone : enregistré.
2. Les tests SQL du point 16 passent. Claude Code montre le refus de la base quand un conseiller
   tente de se nommer manager, sans afficher de jeton.
3. `/login` → « Mot de passe oublié ? » avec l'adresse de test : l'e-mail arrive, le lien ouvre
   « Choisir un nouveau mot de passe », la connexion fonctionne avec le nouveau.
4. Une adresse inconnue donne le même message.
5. `/n-existe-pas` affiche la page « introuvable » en français, avec « Revenir à mes dossiers ».
6. Invitation de test : l'invité ouvre `/onboarding` au lieu de finir son inscription. Il est
   renvoyé vers `/accept-invitation` et ne peut pas créer d'agence.
