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
- `/builder/[id]/comparables/analysis` — analyse comparative, critère par critère.
- `/builder/[id]/comparables/positioning` — positionnement : fourchette, prix conseillé, analyse du conseiller.
- `/builder/[id]/presentation` — présentation vendeur : relecture de la matière avant le rendez-vous.
- `/builder/[id]/conclusion` — écran conseiller : issue du rendez-vous et motif (dossier prêt ou conclu).
- `/builder/[id]/prospection` — liste de tournée imprimable (A4) des concurrents à prospecter : dossier conclu « mandat signé » seulement. Chaque ligne dit « Exclusivité · appeler le confrère », « Mandat simple / particulier · aller voir le propriétaire » ou « À vérifier ».

**Live** — `/live` : dossiers prêts seulement · `/live/[id]` : la scène face au vendeur.

**Suivi** — `/suivi` : dossiers conclus, filtre par issue, issue modifiable, recherche acheteur.

**Administration** — `/admin` · `/admin/identite` : logo, couleur, police, aperçu du Live ·
`/admin/equipe` : vue manager, ce qui dort, invitations, rôles (404 pour un conseiller).

**Accès** — `/login` · `/onboarding` (première agence) · `/accept-invitation` · `/auth/confirm`
(route) · `/design-preview` (outil de développement, 404 en production sauf `ACM_DESIGN_PREVIEW=1`).

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
- `price-positioning` — positionnement : marché calculé, fourchette, prix conseillé, analyse du conseiller.
- `seller-presentation` — matière préparée pour le vendeur et ses avertissements.
- `live-presentation` — sections et avertissements de la présentation.
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
- `project_price_positionings` (fourchette, prix conseillé, analyse du conseiller).
- `live_seller_responses` (réponses par concurrent) ; `live_seller_summary` (réponses de fin de Live).
- `project_meeting_conclusions` (issue, motif, neuf faits figés).
- Créées au schéma initial et lues nulle part : `meeting_scripts`, `meeting_sessions`,
  `seller_answers`, `perception_results`, `reports`, `exports`, `audit_logs`.
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
6. **Analyse des prix** — rappel du prix du vendeur en début de rendez-vous, marché calculé révélé, analyse du conseiller, écarts.
7. **Conclusion** — les repères, puis « Sur quel prix partons-nous ? » (champ vide).

Puis, hors Live : l'écran conseiller de conclusion (`/builder/[id]/conclusion`).

## Cycle `projects.status`

`draft` (Préparation) → `ready_for_meeting` (Live) → `meeting_completed` (Suivi).

- `ready_for_meeting` s'écrit quand la readiness est réunie (bien vendeur, 3 concurrents
  exploitables, fourchette) ou quand le conseiller déclare prêt ; « Remettre en préparation »
  réécrit `draft` à la main, jamais automatiquement.
- `meeting_completed` s'écrit avec l'issue, dans `conclude_meeting`.
- `preparation` et `archived` existent dans la contrainte ; le runtime ne les écrit pas.
