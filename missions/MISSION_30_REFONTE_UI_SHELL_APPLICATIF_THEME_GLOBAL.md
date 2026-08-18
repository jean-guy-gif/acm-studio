# MISSION 30 — Refonte UI du shell applicatif + thème Clair/Sombre global

Date : 18/08/2026 · Portée : tout le parcours conseiller HORS présentation Live
(refaite en MISSION 29). Aucune logique métier modifiée.

## 1. Demande

Étendre la refonte esthétique du Live au reste de la plateforme. Décisions
produit (Laurent) :

- **Bascule Clair/Sombre partout** — au choix de l'utilisateur, comme le Live.
- **Périmètre : tout le parcours conseiller** — connexion, tableau de bord,
  dossier, bien, concurrents (liste/ajout/recherche/édition), analyse,
  positionnement, présentation, Live index, administration.
- **Aérer sans ralentir la saisie** — sections mieux hiérarchisées, saisie
  toujours compacte.

## 2. Architecture du thème

- **Un seul vocabulaire** : la variante Tailwind `stage:` existante
  (`data-stage="dark"`), désormais utilisée par DEUX racines indépendantes qui
  ne s'imbriquent jamais :
  - le **shell applicatif** — thème choisi par l'utilisateur, persisté dans le
    cookie `acm-theme` (1 an), relu côté serveur → aucun flash au chargement ;
  - la **présentation Live** — sa propre bascule locale, sombre par défaut
    (MISSION 29), inchangée.
- **`src/components/theme/theme.ts`** : constante `APP_THEME_COOKIE` + type
  `AppTheme`, dans un module SANS `'use client'`. ⚠️ Piège réel corrigé pendant
  la mission : un export non-React d'un module client devient une *référence
  client* côté serveur — la constante importée depuis `app-stage.tsx` valait un
  objet opaque dans les layouts, le cookie n'était jamais relu (thème remis à
  clair à chaque rechargement). Attrapé par la boucle de captures, corrigé,
  revérifié en build de production.
- **`src/components/theme/app-stage.tsx`** : `AppStage` (provider client,
  `display: contents`, pose `data-stage` + synchronise le fond du `<body>`),
  `useAppStage()`, `AppThemeToggle` (libellé = thème CIBLE, comme le Live).
- **`src/components/theme/app-logo.tsx`** : wordmark officiel bleu/blanc selon
  le thème (aucun redessin — règle charte inchangée).
- **`globals.css`** : le bloc `prefers-color-scheme` est SUPPRIMÉ (le dark mode
  système ne pilote plus rien — c'est l'utilisateur qui choisit) ;
  `[data-stage='dark'] { color-scheme: dark; }` accorde les contrôles natifs.
  Plus AUCUN `dark:` dans le code actif (146 occurrences converties en
  `stage:`).

## 3. Shell applicatif

- **`src/components/app-shell/app-shell.tsx`** : shell présentational partagé
  (barre latérale, halo d'ambiance sombre, bloc profil, bascule, Déconnexion,
  zone principale max-w-6xl). Utilisé par le layout protégé ET par l'aperçu
  design — zéro duplication de markup.
- **`src/components/app-shell/sidebar-nav.tsx`** : navigation avec état actif
  (usePathname), sous-libellés, style brand-soft / brand-15.
- **`src/app/(protected)/layout.tsx`** : garde profil inchangée + lecture du
  cookie + AppShell.
- **Groupe de routes `(stage)`** : `/live/[projectId]` déplacé de `(protected)`
  vers `src/app/(stage)/live/[projectId]/` avec un layout à garde d'accès sans
  chrome. Double effet : la scène Live est désormais PLEIN CADRE même hors
  plein écran (avant : barre latérale + padding autour), et le thème du shell
  ne peut jamais entrer en conflit avec la bascule propre du Live. URL
  inchangée. ⚠️ L'ancien fichier doit disparaître (conflit de routes sinon) —
  déplacé dans `_to_delete/`.

## 4. Design system (`src/components/ui/styles.ts`)

Jetons réécrits (mêmes noms conservés + nouveaux), tous en clair + `stage:` :
boutons (`btnPrimary` arrondi xl ombré brand, `btnSecondary`, `btnDanger`,
`btnDangerGhost` pour les suppressions en liste, `btnGhost`), surfaces (`card`
rounded-2xl, `softPanel`, `emptyState` pointillé), typo de page (`pageTitle`
Rajdhani 3xl/4xl, `pageSubtitle`, `kickerLabel`, `sectionTitle`, `metaLabel`,
`metaValue`, `hintText`), formulaires (`inputBase`, `fieldLabel`,
`formSection`, `formSectionTitle`, `checkChip` — cases à cocher en puces),
liens (`link`, `backLink`), alertes (`alertError`, `alertOk`), badges
(+`badgeBrand`). Couleurs fonctionnelles emerald/amber/red/zinc préservées —
jamais remplacées par le bleu de marque.

## 5. Écrans refaits (aucune logique touchée)

Connexion + Onboarding (carte brand, bascule en haut à droite, thème du
cookie) · Tableau de bord Préparation (en-tête + cartes dossiers + badges de
statut) · Nouveau dossier (formulaire carté) · **Dossier vendeur : vrai hub à
étapes numérotées + carte « Lancer le Live » en dégradé scène** · Bien vendeur
(sections cartées : générales, localisation, énergie, caractéristiques,
financier, argumentaire ; puces cochables) · Diagnostics · Copropriété · Biens
concurrents (synthèse en tuiles, cartes biens photo + actions, suppression
discrète) · Ajout d'un bien (panneau d'import URL + collage, fiche en grille
2 colonnes) · Édition (grille 2 colonnes) · Trouver des concurrents (cartes
candidates photo) · Analyse des comparables (7 sections cartées, tuiles stats)
· Positionnement (fourchette avec valeur centrale mise en avant, confiance,
influents, décision cartée, décision enregistrée) · Présentation vendeur
(sections + badges Disponible) · **Live index : rampe de lancement listant les
dossiers avec « Lancer le Live »** (remplace la page vide) · Administration
(état « Bientôt disponible » honnête). La page d'accueil `/` redirige vers
`/builder` (inchangé).

## 6. Aperçu design du shell — `/design-preview/app`

- `?screen=dashboard|hub|property|comparables|new|find|edit|analysis|positioning|presentation|live-index|admin&theme=light|dark`.
- Fixtures partagées extraites dans `src/app/design-preview/demo-data.ts`
  (l'aperçu Live les réutilise). Les blocs riches rendent les VRAIS composants
  alimentés par les VRAIS services (`calculateComparableAnalysis`,
  `calculatePricePositioning`, `buildSellerPresentation`) sur les fixtures ;
  les actions serveur sont des factices explicites qui n'écrivent rien
  (`preview-actions.ts`). Même garde que l'aperçu Live : `notFound()` en
  production sauf `ACM_DESIGN_PREVIEW=1` ; le middleware laisse passer
  `/design-preview/*` (la page se garde elle-même).

## 7. Boucle de critique visuelle

Captures Playwright en build de production (`next start`), 12 écrans × 2
thèmes × desktop 1440×900 (pleine page) + tablette 768×1024, plus `/login`
réel. **Itération 1 → constats** : suppression trop criarde dans les listes,
logo un cran trop petit, fiche concurrent en colonne unique interminable,
queue du formulaire de décision hors carte, et le bug du cookie de thème
(§2). **Itération 2 → corrections appliquées et revérifiées** : boutons
`btnDangerGhost`, logo h-9, fiche en grille 2 colonnes (champs longs sur toute
la largeur), justification+boutons cartés, cookie corrigé. Les captures du bac
à sable utilisent des polices de substitution — Montserrat/Rajdhani s'activent
sur machine réelle (aucun changement à `layout.tsx`, livré intact).

## 8. Contrôles qualité (état final)

- `vitest run` : **444/444** ✔ (aucun test modifié — aucune logique touchée)
- `tsc --noEmit` ✔ · `eslint .` ✔ (dont react-hooks/preserve-manual-memoization)
- `prettier --check src supabase` ✔
- `next build` ✔ (bac à sable : fontes Google stubbées le temps du build,
  `layout.tsx` réel restauré ensuite ; sur Mac le build passe tel quel)
- Grep de contrôle : plus aucun `dark:` hors `src/features/live-presentation/`
  (code MORT, voir §10).

## 9. Reste à faire (humain)

1. `npm run dev` puis parcourir : `/login` (bascule en haut à droite),
   `/builder` (bascule dans la barre latérale, persistance après rechargement
   ET après reconnexion), un dossier complet jusqu'à la présentation, les deux
   thèmes sur 2-3 écrans, `/live/<id>` (désormais plein cadre sans plein
   écran), et l'aperçu `/design-preview/app?screen=hub&theme=dark`.
2. Vérifier le rendu Rajdhani/Montserrat réel (le bac à sable ne les charge
   pas).
3. Commits après revue. Suggestion de découpage :
   - `feat(theme): bascule Clair/Sombre globale (cookie acm-theme) + tokens stage`
   - `feat(shell): AppShell partagé, navigation active, groupe (stage) pour le Live`
   - `feat(ui): refonte des écrans du parcours conseiller (deux thèmes)`
   - `feat(design-preview): aperçu du shell applicatif avec fixtures Démo`
   - `docs: MISSION 30`
4. Vider `_to_delete/` (contient notamment l'ANCIEN
   `src/app/(protected)/live/[projectId]/page.tsx` — indispensable de ne PAS le
   restaurer : conflit de routes avec `(stage)`) et le dossier temporaire
   `.cowork-tmp/`.

## 10. Suggestions non réalisées (à arbitrer)

- **`src/features/live-presentation/` est du code mort** (13 composants, plus
  importés nulle part depuis la refonte MISSION 24+) : candidat à la
  suppression dans un commit dédié.
- Le champ « Type de bien » du bien vendeur affiche la valeur brute
  (`apartment`) : un select avec libellés français serait plus propre mais
  touche à la normalisation — hors périmètre esthétique, à traiter à part.
- Onboarding : non couvert par les captures (nécessite Supabase) mais partage
  exactement le gabarit de `/login` refait.
