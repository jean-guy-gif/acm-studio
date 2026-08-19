# MISSION 32 — Import assisté : « Envoyer vers ACM Studio »

Date : 18/08/2026 · Demande de Laurent : « quand le conseiller met un lien
d'annonce, les caractéristiques, le prix, le prix au m², le quartier, la ville
et les photos doivent être aspirés — de la même façon quand c'est l'outil qui
va chercher les biens concurrents ».

## 1. État des lieux honnête

**Le pipeline extrait déjà TOUS ces champs** : titre, prix, prix au m² (celui du
portail ET celui recalculé par ACM), surface, terrain, pièces, chambres, salles
de bains, DPE, GES, année, chauffage, énergie, adresse, code postal, ville,
quartier, description, caractéristiques, photos, plus les valeurs structurées
déduites (état général, exposition, extérieurs, stationnements). Ce n'est pas
l'extraction qui manque.

**Ce qui bloque, c'est l'ACCÈS à la page.** Depuis le Mac de Laurent (adresse
résidentielle) l'import direct passe souvent. Depuis Vercel (adresse de
datacenter) SeLoger et Bien'ici renvoient une page de blocage : il n'y a rien à
lire. Aucun réglage de code ne change cela, et le contournement d'anti-bot reste
interdit (PRD, et bon sens juridique).

Cette mission attaque donc l'accès, sans rien contourner.

## 2. Le raccourci « Envoyer vers ACM Studio »

Un favori à glisser UNE FOIS dans la barre de favoris du navigateur. Ensuite,
sur n'importe quelle annonce : un clic, et la page part dans ACM Studio qui
l'analyse et pré-remplit la fiche.

**Pourquoi c'est légitime.** Le conseiller consulte l'annonce dans SON
navigateur, avec SA session, sur une page qu'il a le droit de voir. Le raccourci
reprend cette page telle qu'elle s'affiche à lui. Nos serveurs n'interrogent pas
le portail, aucune protection n'est contournée, aucune session n'est usurpée.
C'est exactement le collage de code manuel déjà livré (Mission 26), ramené à un
clic.

**Enchaînement.**

1. Le conseiller clique sur le favori depuis l'annonce.
2. Le favori ouvre `/import-assistant` et attend son signal `acm-ready`.
3. Il lui envoie l'adresse et le code de la page — ciblé sur l'origine ACM
   Studio exacte, jamais sur `*`.
4. L'assistant affiche l'annonce reçue et demande dans quel dossier vendeur
   l'ajouter.
5. Au choix du dossier, la page part dans le formulaire d'ajout qui lance
   l'analyse tout seul : le conseiller arrive sur une fiche déjà remplie, qu'il
   vérifie avant d'enregistrer.

**Fichiers.**

- `services/build-bookmarklet.ts` — code du favori, isolé et **testé**
  (4 tests, dont l'exécution simulée sur une page de portail).
- `components/import-bookmarklet.tsx` — bouton à glisser + mode d'emploi.
  Affiché sur « Ajouter un bien concurrent » (dans le repli collage de code),
  sur « Trouver des concurrents », et sur l'assistant lui-même.
- `components/import-assistant-panel.tsx` — réception et choix du dossier.
- `components/import-transfer.ts` — passage de la page au formulaire par le
  stockage de session (même onglet), avec refus propre si le quota est dépassé.
- `app/(protected)/import-assistant/page.tsx` — page d'atterrissage, dans le
  shell protégé (session exigée, dossiers cloisonnés par agence).
- Formulaire d'ajout : analyse automatique à l'arrivée (`?assistant=1`).

## 3. Garde-fous

- **Le contenu reçu est une DONNÉE, jamais une instruction.** Il n'est ni
  exécuté, ni réinjecté comme HTML : il part dans l'analyse serveur existante,
  qui en sort des champs typés que le conseiller relit avant d'enregistrer.
- **Origine vérifiée** : l'assistant n'accepte que ce qui vient de la fenêtre
  qui l'a ouvert (`event.source === window.opener`), et le favori n'envoie qu'à
  l'origine ACM Studio.
- **Taille bornée** à 4 Mo, comme l'action serveur ; au-delà, message explicite
  et repli sur le collage manuel.
- **Rejeu impossible** : la page transférée est consommée (retirée du stockage)
  dès sa lecture, donc un rechargement ne relance pas d'import.
- **Aucune requête sortante** ajoutée : `importComparableHtml` n'appelle aucun
  portail, il analyse ce qu'on lui donne.

## 4. Vérifications faites

- **Essai réel de bout en bout** (build de production, navigateur) : une fausse
  page de portail servie sur une AUTRE origine exécute le favori → l'assistant
  s'ouvre, reçoit l'annonce (`portail-test.example` identifié), propose les
  3 dossiers ; au choix du dossier, l'adresse et le code de la page sont bien
  transmis au formulaire par le stockage de session.
- **En-têtes vérifiés** : aucune politique `Cross-Origin-Opener-Policy` sur
  l'application — le lien entre l'onglet du portail et la fenêtre ACM Studio
  n'est pas coupé.
- `vitest` **455/455** ✔ (451 + 4) · `tsc` ✔ · `eslint` ✔ (dont les règles React
  Compiler) · `prettier` ✔ · `next build` ✔ (route `/import-assistant`).
- Aperçu design : `/design-preview/app?screen=assistant`.

## 5. Reste à faire (humain)

1. Après déploiement, glisser le bouton dans la barre de favoris depuis
   « Ajouter un bien concurrent », puis l'essayer sur une **vraie annonce
   SeLoger et Bien'ici** — les deux portails qui bloquent l'import direct
   depuis Vercel. Vérifier que prix, prix au m², surface, pièces, quartier,
   ville, caractéristiques et photos remontent.
2. **Être connecté à ACM Studio avant de cliquer sur le favori.** Si la session
   a expiré, l'assistant renvoie vers la connexion et l'envoi doit être refait
   (limitation connue, non bloquante).
3. Autoriser les fenêtres surgissantes pour le domaine ACM Studio (le favori
   ouvre une fenêtre ; un message l'indique si elle est bloquée).

## 6. Suite prévue — fiabilisation des extracteurs

Le second volet demandé (vérifier champ par champ sur de vraies annonces des
4 portails et corriger les écarts) demande d'ouvrir de vraies pages dans le
navigateur de Laurent, comme l'audit terrain du 17/08. À faire dans une passe
dédiée, une fois le raccourci en place : c'est justement lui qui rendra les
pages SeLoger et Bien'ici lisibles pour mesurer ce qui manque encore.
