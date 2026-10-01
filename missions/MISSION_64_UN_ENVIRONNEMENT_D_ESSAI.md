# MISSION 64 — Un environnement d'essai, et des invitations qui arrivent

**Date** : 1er octobre 2026 · **Origine** : plan de déblocage §2-D et §2-G. Aujourd'hui, essayer une
mission veut dire la fusionner dans l'unique environnement (`acm-studio-henna`), parce que
l'extension n'accepte que cette URL et localhost. D'où les fusions à répétition (M50 : 12 commits ;
M54 : 3 fusions en 1 h 30). Et un conseiller pilote ne recevrait probablement pas son invitation.

## Préalable : 15 minutes dans Vercel et Supabase, à faire par toi (Claude Code ne peut pas)

1. **Vercel → acm-studio → Settings → Domains → Add** : un domaine d'essai, par exemple
   `acm-studio-essai.vercel.app` (s'il est libre), rattaché à la branche Git `essai`. Claude Code
   crée la branche à l'étape 1 ; tu peux la créer avant depuis GitHub.
2. **Vercel → Settings → Environment Variables** :
   - `NEXT_PUBLIC_SITE_URL` = `https://acm-studio-henna.vercel.app` pour Production ;
   - `NEXT_PUBLIC_SITE_URL` = l'URL d'essai pour Preview, branche `essai` ;
   - vérifie que les trois variables Supabase existent aussi pour Preview.
3. **Supabase → Authentication → URL Configuration → Redirect URLs** : ajoute
   `<URL d'essai>/auth/confirm` et `<URL d'essai>/accept-invitation`, et vérifie que les deux de
   l'URL de travail y sont.
4. **Supabase → Authentication → Emails → SMTP** : branche un SMTP (Brevo, Resend… : les offres
   gratuites suffisent pour un pilote). Sans SMTP, un conseiller extérieur ne reçoit pas son
   invitation.

Donne l'URL d'essai à Claude Code au début de la session.

## À faire (Claude Code)

1. Crée la branche `essai` à partir de `main` et pousse-la.
2. `extension/manifest.json` : ajoute l'URL d'essai à `externally_connectable.matches` et
   `content_scripts.matches`, puis passe la version à 0.2.0. N'ajoute **pas** `*.vercel.app` : Chrome
   refuse les jokers sur un domaine public. Si une autre liste d'origines existe (`extension/*.js`,
   `src/features/browser-extension/`), mets-la à jour aussi.
3. Ajoute `NEXT_PUBLIC_SITE_URL` à `.env.example`, avec un commentaire d'une ligne. Cherche toute
   autre URL écrite en dur qui devrait suivre l'environnement ; les tests peuvent garder la leur.
4. `.claude/commands/mission.md` passe déjà par `essai` dès que la branche existe : vérifie-le.
5. CLAUDE.md, section flux de travail, ajoute : « On essaie sur l'URL d'essai (branche `essai`). La
   base Supabase est partagée avec l'environnement de travail : une migration doit rester compatible
   avec le code de `main`, et elle s'applique, après comptage, avant l'essai. »

## Hors périmètre

Pas de second projet Supabase pour l'instant : les données d'essai doivent être nommées « TEST ».
Ce sujet reviendra avant d'ouvrir à d'autres agences que celles du pilote.

## Essai

1. `chrome://extensions` → recharger l'extension.
2. Sur l'URL d'essai : connexion, « Extension détectée » dans le panneau d'import, une recherche de
   concurrents qui ramène des cartes.
3. Une invitation envoyée à une adresse personnelle extérieure arrive, et son lien ouvre l'URL
   d'essai (puis la même chose sur l'URL de travail).
4. L'URL de travail n'a pas bougé.
