# État du produit

Relevé dans le code de `main` le 6 octobre 2026 (routes `src/app`, features `src/features`, tables
`supabase/migrations`, Live `build-live-pages.ts`). À refaire quand l'écart avec le code se voit.

## Écrans

**Préparation**

- `/` — redirige vers `/builder`.
- `/builder` — Préparation : dossiers « En cours » et « Prêts » ; carte = bien, fourchette, avancement.
- `/builder/new` — nouveau dossier vendeur (aucun prix demandé).
- `/builder/[id]` — le dossier : cinq étapes, puis accès au Live et à la conclusion ; mandat signé : section « Concurrents à prospecter ».
- `/builder/[id]/property` — bien vendeur : import d'annonce ou de fiche PDF, photos, diagnostics, copropriété.
- `/builder/[id]/comparables` — concurrents retenus et écartés, actions de lot (écarter, supprimer) ; adresse de chaque concurrent retenu, demandée au Localisateur Academia (`NEXT_PUBLIC_LOCALISATEUR_ID`). Chaque carte dit « Vendu par » (agence, particulier, inconnu) et « Exclusivité » (oui, non, inconnu), lus sur l'annonce à l'import avec leur provenance, corrigés d'un clic par le conseiller ; une agence dont l'annonce ne mentionne nulle part l'exclusivité est en mandat simple (« Non », « aucune mention dans l'annonce ») ; jamais côté vendeur.
- `/builder/[id]/comparables/new` — ajouter un concurrent : adresse (extension), page collée, saisie.
- `/builder/[id]/comparables/find` — trouver des concurrents : « Chercher les concurrents » (Stream Estate, si clé), puis « Ouvrir / Lire mes recherches » sur les portails, validation en lot. Sans extension : un seul message d'installation (`NEXT_PUBLIC_EXTENSION_INSTALL_URL`).
- `/builder/[id]/comparables/[comparableId]/edit` — modifier un concurrent.
- `/builder/[id]/avant-rendez-vous` — avant le rendez-vous, sur un seul écran : pastilles d'avancement, le marché en un coup d'œil (analyse détaillée dépliable), la décision du conseiller, le déroulé du Live et sa durée estimée. Les anciennes adresses `comparables/analysis`, `comparables/positioning` et `presentation` y redirigent.
- `/builder/[id]/conclusion` — écran conseiller : issue du rendez-vous et motif (dossier prêt ou conclu).
- `/builder/[id]/prospection` — redirige vers `/prospection/tournee?bien=[id]`, la seule liste de tournée imprimable (A4).

**Live** — `/live` : dossiers prêts seulement · `/live/[id]` : la scène face au vendeur.
`/live/[id]/merci` et `/live/[id]/pause` : écrans neutres de fin et de pause (logo, une phrase,
« Accès conseiller »), sans rien du dossier.

**Suivi** — `/suivi` : dossiers conclus, filtre par issue, issue modifiable, recherche acheteur.

**Prospection** — `/prospection` : les concurrents retenus des mandats signés, **une carte par
bien** (même annonce ou même adresse confirmée : une seule carte, « Pour : … ; … », un seul
statut), « Ne plus solliciter » (liste d'opposition de l'agence, par adresse), « Marquer
contacté » pour un confrère sans adresse · `/prospection/courriers?bien=[id]` : tous les courriers
prêts d'un bien vendeur en un document, puis « Marquer tous remis » · `/prospection/tournee` : les
propriétaires à adresse confirmée, par commune, rue et numéro, les confrères à appeler en bas,
« Mes dossiers / Toute l'agence ».

**Administration** — `/admin` · `/admin/identite` : logo, couleur, police, aperçu du Live ·
`/admin/equipe` : vue manager, ce qui dort, invitations, rôles (404 pour un conseiller).

**Accès** — `/login` · `/onboarding` (première agence) · `/accept-invitation` · `/auth/confirm`
(route).

**Hors écran** — `npm run sauvegarde` et `npm run sauvegarde:verifier` (`docs/SAUVEGARDE.md`) ;
effacement sur demande : `docs/PROCEDURE_EFFACEMENT.md`. « Supprimer » un dossier l'archive
(`archived`) : il n'apparaît plus nulle part et ne s'ouvre plus par son adresse.

## Features (`src/features`)

- `projects` — création, suppression, readiness et bascule en prêt, carte de Préparation.
- `subject-property` — fiche du bien vendeur (validation, enregistrement).
- `subject-property-import` — import d'annonce et de fiche PDF (lue dans le navigateur), photos récupérées.
- `subject-property-photos` — téléversement, ordre et suppression des photos (bucket privé).
- `subject-property-diagnostics` — DPE, GES et diagnostics du bien vendeur.
- `subject-property-condominium` — copropriété du bien vendeur.
- `comparable-import` — lecture d'une annonce (extracteurs par portail), `robots.txt`, observations, ancienneté et baisse.
- `comparables` — CRUD des concurrents, sélection, ordre, actions de lot.
- `competitor-search` — adresses de recherche, lecture des cartes, filtres et desserrage, ordre de proximité, Stream Estate, apprentissage.
- `browser-extension` — client de l'extension (détection, lecture de page et d'onglets).
- `comparable-analysis` — analyse comparative : caractéristiques, localisation, valeurs aberrantes.
- `price-positioning` — positionnement : marché calculé, fourchette, prix des concurrents, analyse du conseiller.
- `seller-presentation` — matière préparée pour le vendeur et ses avertissements.
- `before-meeting` — l'écran « Avant le rendez-vous » : marché en un coup d'œil, pastilles, déroulé du Live.
- `live-seller` — le Live : pages, verrous d'avancement, révélations, réponses du vendeur.
- `meeting-conclusion` — prix de commercialisation, conclusion, issues, Suivi, recherche acheteur.
- `branding` — identité de l'agence : palette, logos, police embarquée.
- `team` — vue manager, seuils de dormance, invitations, retrait, rôles.

Hors `src` : `extension/` (extension Chrome, Manifest V3, version 0.3.0) ; CI dans
`.github/workflows/ci.yml`.

## Tables (`supabase/migrations`, 33 migrations)

- `agencies`, `profiles` (rôle manager/advisor, `removed_at`), `agency_invitations`, `agency_branding`.
- `projects` ; `subject_properties`, `subject_property_diagnostics`, `subject_property_condominiums`.
- `comparables` (les concurrents) ; `competitor_decisions` (apprentissage) ; `listing_observations`.
- `portal_place_ids` (identifiant de commune par portail, commun à toutes les agences).
- `project_price_positionings` (fourchette, prix des concurrents, analyse du conseiller).
- `live_seller_responses` (réponses par concurrent) ; `live_seller_summary` (réponses de fin de Live).
- `project_meeting_conclusions` (issue, motif, neuf faits figés).
- Buckets : `project-photos` (privé) et `agency-branding` (public, logos seulement).
- Fonctions : `conclude_meeting`, `save_commercialization_price`, `change_meeting_outcome`,
  `accept_invitation`, `bootstrap_agency_owner`, `get_current_agency_id` (RLS par agence).

## Le Live, écran par écran (`build-live-pages.ts`)

1. **Introduction** — l'agence, le vendeur, le nombre de concurrents.
2. **Votre bien** — « Reconnaissez-vous votre bien dans cette présentation ? » (absent sans bien vendeur).
3. **Votre valeur perçue** — le vendeur donne son prix avant de voir un concurrent ; rien n'est révélé.
4. Pour chaque concurrent retenu, quatre écrans :
   1. **Un sérieux concurrent ?** — fiche, photos, grille ; ni prix ni délai. « Non » saute les trois suivants.
   2. **À quel prix ?** — le vendeur devine ; le prix reste masqué.
   3. **Ce prix vous paraît-il cohérent ?** — révélation du prix réel et des écarts.
   4. **Pourquoi toujours en vente ?** — durée devinée puis révélée, baisses, motif.
5. **Le concurrent le plus dangereux** — lequel, et pourquoi (absent sans concurrent).
   Puis **Votre prix après le marché** (mission 94) : « Après avoir vu ces biens, à quel prix
   mettriez-vous votre bien en vente ? » — facultatif (« Passer »), figé une fois donné.
6. **Analyse des prix** — le chemin du vendeur (au début → après avoir vu le marché), prix des concurrents et ce sur quoi il porte, analyse du conseiller, lecture du marché sur les concurrents révélés (prix affichés, médiane, baisses, ancienneté, bande des prix), écarts.
7. **Conclusion** — les repères, puis « Sur quel prix partons-nous ? » (champ vide).

Puis, hors Live : l'écran conseiller de conclusion (`/builder/[id]/conclusion`).

## Cycle `projects.status`

`draft` (Préparation) → `ready_for_meeting` (Live) → `meeting_completed` (Suivi).

- `ready_for_meeting` s'écrit quand la readiness est réunie (bien vendeur, 3 concurrents
  exploitables, fourchette) ou quand le conseiller déclare prêt ; « Remettre en préparation »
  réécrit `draft` à la main, jamais automatiquement.
- `meeting_completed` s'écrit avec l'issue, dans `conclude_meeting`.
- `preparation` et `archived` existent dans la contrainte ; le runtime ne les écrit pas.
