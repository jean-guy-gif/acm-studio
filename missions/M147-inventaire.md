# M147 — Inventaire : le dossier d'adresse et « Vivre ici » dans ACM (09/11, `main` ad4fdb6)

Relevé dans le code, sans rien modifier. Les deux sont nés le 07/11 (M141, M142).

## 1. Le dossier d'adresse (M141)

| Où | Qui le voit | Ce qu'il affiche |
|---|---|---|
| **Bien vendeur** (`/builder/[id]/property`), bloc sous la fiche | Le conseiller seul (« pour vous seul, rien n'en est montré au vendeur ») | « Construire le dossier d'adresse » / « Actualiser », daté. Six blocs, chacun avec sa source et sa date : ventes réelles (médiane €/m², « la moitié des ventes entre … », les 20 plus récentes), DPE de l'adresse (« Vous avez saisi C, l'ADEME indique D »), risques, zone du PLU et servitudes, parcelle, copropriété. Sous les ventes : l'analyse de valeur enregistrée, située (« au-dessus de la médiane »). |
| **Avant le rendez-vous** (`/builder/[id]/avant-rendez-vous`), sous « Votre analyse de valeur » | Le conseiller seul | La ligne qui suit la frappe : « Ventes réelles à 500 m : médiane 4 896 €/m² (12 ventes) · votre analyse de valeur : 5 444 €/m², au-dessus de la médiane », ou pourquoi elle manque (« construisez le dossier d'adresse sur l'onglet Bien vendeur »…). |
| Live, documents du vendeur, acquéreur | Personne | Rien : prouvé par `never-seller-side.test.ts`. |

**Sources** (lues au serveur, sans clé, sans IA) : Base Adresse Nationale (géocodage), DVF
(geo-dvf d'Etalab), ADEME (DPE), Géorisques, Géoportail de l'urbanisme, cadastre IGN, registre
ANAH. Démo : un jeu figé de Vence (`demo/data/address-dossier-vence.ts`), servi sans réseau.

**Base** : table `address_dossiers` (une ligne par dossier, migration `20261202090000_dossier_adresse`).

**Fichiers** : `src/features/address-dossier/` (15 fichiers : action, requête, bloc, services,
types, 4 tests) ; `builder/[projectId]/property/page.tsx` ; `builder/[projectId]/avant-rendez-vous/page.tsx` ;
`price-positioning/components/positioning-decision-form.tsx` (la ligne) ;
`demo/data/address-dossier-vence.ts`, `demo/services/demo-address-sources.ts` ;
`scripts/nettoyer-test.mjs` ; `docs/GESTES_SENSIBLES.md`, `docs/PROCEDURE_EFFACEMENT.md` ;
`supabase/tests/dossier_adresse.sql`.

**e2e** : `tests/e2e/dossier-d-adresse.spec.ts` (construit sur Bien vendeur, la ligne d'« Avant le
rendez-vous » qui suit la frappe). Aucun autre spec n'en dépend.

## 2. « Vivre ici » (M142)

| Où | Qui le voit | Ce qu'il affiche |
|---|---|---|
| **Visites** (`/visites`), sur chaque visite à faire, « Vivre ici » replié | Le conseiller, en français | « Construire / Actualiser Vivre ici » ; d'où partent les distances (adresse pour un mandat, quartier arrondi à ~500 m, sinon centre de la commune) ; ses ★ du secteur avec oui / en partie / non ; au quotidien à pied (boulangerie, supermarché, pharmacie, médecin) ; écoles (maternelle → lycée) ; se déplacer (arrêt ou gare, puis en voiture gare TGV, aéroport, centre-ville) ; espace vert ; « Carte de bruit non publiée ici » ; risques de la commune en une ligne ; le temps en voiture jusqu'à « son lieu ». |
| **Lien du dossier acquéreur** (`/dossier/<jeton>`, téléphone) : sous chaque bien qu'il va visiter, et après sa réponse (« Merci », « Ce que nous avons vu ensemble ») | **L'acquéreur**, dans sa langue (« Living here ») | La même fiche, par liste d'autorisation (`publicSheet`) ; jamais l'adresse. |
| **Message « Confirmer la visite »** (Visites) | L'acquéreur, par le message que le conseiller copie | « Je vous confirme la visite de … le … à …. Pour la préparer, voici ce qui l'entoure — commerces, écoles, transports : [lien] ». Le lien mène au lien du dossier, où il lit « Vivre ici ». |
| **Fiche acquéreur, formulaire complet** | Le conseiller | « Ce qui compte pour lui » (trois ★ du secteur : calme, écoles, commerces) et « Un lieu qui compte pour vous » (texte libre). Ne servent qu'à « Vivre ici ». |
| Live, documents du vendeur | Personne | Rien. |

**Sources** : OpenStreetMap (Overpass), annuaire de l'Éducation nationale, itinéraires IGN,
Base Adresse Nationale (le lieu de l'acquéreur), Géorisques, deux listes figées dans le code (gares
TGV, aéroports). Construite en tâche de fond (`after()`) dès qu'une visite est demandée —
présentation, lien, conseiller — d'où `maxDuration = 300` sur trois pages.

**Base** : table `living_here_sheets` ; colonnes `buyers.sector_priorities`, `buyers.living_place`,
`buyer_visit_requests.living_place_trip` (et `scheduled_at`, qui sert à « Confirmer la visite » et
**reste**). Migration `20261203090000_vivre_ici`.

**Fichiers** : `src/features/living-here/` (19 fichiers) ; l'action `confirmVisit` y vit aussi
(à déménager, elle reste) ; les déclencheurs dans `buyer-deck/actions/deck-actions.ts`,
`buyer-dossier/actions/submit-dossier-answers.ts`, `buyer-presentation/actions/visit-requests.ts` ;
l'affichage dans `buyer-dossier/` (6 fichiers), `buyer-presentation/components/visit-actions.tsx`,
`visit-row.tsx`, `app/(protected)/visites/page.tsx` ; le formulaire `buyers/components/buyer-form.tsx`,
`buyers/schemas/buyer-input.ts`, `buyers/services/buyer-row.ts`, `buyers/types.ts` ; la suppression
d'un concurrent (`comparables/actions/*`) ; la démo (`demo/data/living-here.ts`,
`demo/services/demo-living-here.ts`, `demo-seed.ts`, `demo-dossiers.ts`) ; les textes du client
(`lib/client-texts/fr.ts`, `en.ts`, `types.ts` : `livingHere`, `visitConfirm`) ;
`app/confidentialite/page.tsx` ; `scripts/nettoyer-test.mjs` ; `supabase/tests/vivre_ici.sql`,
`agency_isolation_all_tables.sql`.

**e2e** : `tests/e2e/vivre-ici.spec.ts` — il prouve aussi « Confirmer la visite » (message en
anglais, lien neuf, « Visite planifiée le »), à garder ailleurs. Aucun autre spec.

## 3. Ce qui disparaîtrait devant l'acquéreur

1. Sur son lien, sous chaque bien qu'il va visiter et après sa réponse : toute la fiche « Vivre ici »
   (commerces et écoles à pied, transports, ses ★, son trajet).
2. Dans le message de confirmation de visite : la phrase « voici ce qui l'entoure… : [lien] ».
3. Rien d'autre : la présentation plein cadre, le PDF du dossier, le bon de visite et l'offre n'ont
   jamais montré « Vivre ici ».

Côté conseiller disparaissent aussi : le bloc de Bien vendeur, la ligne des ventes réelles
d'« Avant le rendez-vous », « Vivre ici » sur Visites, et les deux champs du formulaire acquéreur.

## 4. La démo, en marge

- `getProfile` rend `null` quand la lecture du profil **échoue** : la mise en page envoie alors sur
  `/onboarding` (« Première connexion »). C'est le troisième raté (09/11 : six dossiers recréés, rien
  au journal). Une lecture en échec lue comme une absence (M98).
- `getDemoDossiers` et `ownDemoDossierIds` rendent `[]` quand la lecture échoue : la page affiche
  « Préparer ma démo » à un closer qui a déjà six dossiers, et « Préparer » en recrée six. C'est
  l'explication la plus simple des 12 dossiers.
- `deleteDemoDossiers` ne lit l’erreur d’aucune de ses suppressions, et rien ne recompte à la fin :
  un dossier manquant ou en trop passe sans rien dire.
- Les dates de la démo sont déjà relatives (`daysAgo(now, …)`, `publishedDaysAgo`), sauf les jeux
  figés du dossier d'adresse et de « Vivre ici » (relevés le 07/11), qui partent avec eux. Ce qui
  manque : la preuve qu'aucune date ne reste figée.
- Aucun logo : `agency_branding.logo_light_path` et `logo_dark_path` sont vides dans l'agence de démo.
