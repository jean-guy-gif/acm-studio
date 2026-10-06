# AUDIT MVP — BUILDER → LIVE

Mission 23 — Audit transversal du parcours ACM Studio, de la création du dossier vendeur à la présentation Live.
Dernière mise à jour : 2026-07-24. Aucun nouveau module métier ajouté ; audit du parcours existant.

> **Nature des vérifications** — ce rapport distingue explicitement (voir §9) :
> vérifications par lecture de code · tests automatisés (Vitest) · tests SQL (RLS) ·
> **tests réellement exécutés dans un navigateur** · tests restant à faire manuellement.

---

## 1. Scénario testé

Dossier vendeur réaliste (données non sensibles), créé pour l'essentiel **dans un vrai navigateur** :

- **Bien vendeur** : appartement, Lyon 6e, 70 m², 3 pièces.
- **Diagnostics / copropriété** : formulaires présents (rendu vérifié).
- **8 comparables** créés (4 conservés en base après nettoyage de session) : prix 320 000 → 900 000 €, surfaces 65–82 m², 1 **atypique** (penthouse 900 000 € / 70 m² → 12 857 €/m², réintégré comme outlier), ≥ 1 incomplet, photos absentes ; 1 **écarté** (sélection testée).
- **Positionnement** calculé et **prêt** (fourchette 315 000 / 350 000 / 385 000 €, confiance Faible 15/100).
- **Projet complet** et **états incomplets** (décision absente → présentation « incomplète », Live « préparation incomplète ») observés.
- **Scénario inter-agence** : couvert par SQL (RLS), voir §9.

## 2. Environnement

- Next.js 16 (App Router) / React 19 / Supabase local (Docker), lancé en `next dev` sur `http://127.0.0.1:3000`.
- Navigateur réel piloté via Playwright, aux **deux viewports** : **1440 × 900** (ordinateur) et **768 × 1024** (tablette).
- Utilisateur de test créé via l'API admin GoTrue (`audit@acm.local`), parcours d'onboarding réel (agence + profil).
- **Limite d'environnement importante** : dans ce sandbox de développement, un proxy (`proxy.ts`) dans le pipeline de requêtes empêche l'**hydratation / délégation d'événements client** (échecs WebSocket HMR, police `__nextjs_font` 403). Conséquence vérifiée : les gestionnaires `onChange`/`onClick` React ne se déclenchent pas (une vraie frappe clavier ne met pas à jour l'état d'un champ contrôlé ; le bouton « Importer » reste désactivé). **Seuls les formulaires server-action non contrôlés fonctionnent** (amélioration progressive, POST natif sans JS). Les interactions purement client (formulaires contrôlés, navigation Live, plein écran) **n'ont donc pas pu être exécutées** ici — voir §7 et la décision §10.

## 3. Parcours exécuté (navigateur réel)

| #   | Étape                     |  Rendu 1440  |        Rendu 768        | Fonctionnel (navigateur)                                |
| --- | ------------------------- | :----------: | :---------------------: | ------------------------------------------------------- |
| 1   | Connexion + onboarding    | ✅ (restylé) |      ✅ (restylé)       | ✅ login + création agence (persistés)                  |
| 2   | Liste Builder             |      ✅      |           ✅            | ✅                                                      |
| 3   | Création projet           |      ✅      |           ✅            | ✅ projet créé (persisté en base)                       |
| 4   | Fiche bien vendeur        |      ✅      | ✅ (après correctif N8) | ⚠️ formulaire contrôlé non soumissible ici              |
| 5   | Diagnostics / copropriété |      ✅      | ✅ (après correctif N8) | ⚠️ formulaires contrôlés non soumissibles ici           |
| 6   | Ajout manuel comparable   |      ✅      |           ✅            | ✅ création + **conservation en erreur (N1) prouvée**   |
| 7   | Import URL                |      ✅      |           ✅            | ⚠️ flux client non exécutable ici                       |
| 8   | Sélection / ordre         |      ✅      |           ✅            | ✅ « Écarter » persiste (1 écarté / 3 retenus)          |
| 9   | Synthèse                  |      ✅      |           ✅            | ✅ (rendu)                                              |
| 10  | Analyse du marché         |      ✅      |           ✅            | ✅ (rendu, sans NaN)                                    |
| 11  | Positionnement            |      ✅      |           ✅            | ✅ prêt ; ⚠️ enregistrement décision non exécutable ici |
| 12  | Présentation Builder      |      ✅      |           ✅            | ✅ (rendu, lien « Ouvrir dans Live »)                   |
| 13  | Live lecture seule        |      ✅      |           ✅            | ✅ (rendu ; aucun form/submit hors déconnexion layout)  |

Aucun débordement horizontal aux deux viewports après le correctif N8. Aucun `NaN`/`Infinity`. Titres clairs. Vocabulaire conforme (« marché observé », « prix conseillé », « Grille métier indicative — jamais une garantie »). Erreurs console = **bruit dev uniquement** (WebSocket HMR, police 403), aucune erreur applicative.

## 4. Anomalies détectées

- **N1** — Création manuelle de comparable : l'action redirigeait vers `…/new?error=` et la saisie était **perdue** (échec silencieux). **Majeur MVP.**
- **N2** — Badge de fraîcheur « À jour » (vert) codé en dur dans la branche « données insuffisantes » du positionnement, trompeur. **Majeur MVP.**
- **N3** — Erreur de suppression de dossier (`/builder?error=`) non affichée. **Mineur MVP.**
- **N4** — Pas de garde anti double-soumission sur les formulaires non contrôlés (création dossier, création manuelle, suppression). **Mineur MVP.**
- **N8** — **Débordement horizontal sur tablette (768)** sur la fiche bien vendeur : les champs numériques à unité des diagnostics/copropriété (ex. « kgCO₂/m²/an ») débordaient (scrollWidth 866 > 768). **Détecté dans le navigateur réel. Mineur MVP.**
- **N9** — **Pages Login et Onboarding sans aucun style** (balises brutes, aucune classe : `<div>` / `<h1>` / `<label>` / `<input>` / `<button>` nus). Premier écran du produit non conforme au design system. **Détecté dans le navigateur réel. Majeur MVP.**
- **N5** — Numérotation « 5. Argumentaire » : jugée finalement **cohérente** (sections 1→5) ; non modifiée.
- **N6 / N7** — Suppression de décision inaccessible en état dégradé ; « Voir le positionnement » sur analyse vide. **Mineur → V2.**
- **V** — Vérifié non-anomalie : `points de vigilance` du bien affichés en Live = contenu vendeur légitime ; les `notes` internes diagnostics/copro **ne sont pas** affichées.

## 5. Classification

| ID  | Anomalie                                        | Classement      | Traitement                    |
| --- | ----------------------------------------------- | --------------- | ----------------------------- |
| N1  | Saisie manuelle perdue en erreur                | **Majeur MVP**  | Corrigé (+ prouvé navigateur) |
| N2  | Badge « À jour » trompeur                       | **Majeur MVP**  | Corrigé                       |
| N9  | Login / Onboarding sans style                   | **Majeur MVP**  | Corrigé (+ prouvé navigateur) |
| N8  | Débordement tablette fiche bien                 | **Mineur MVP**  | Corrigé (+ prouvé navigateur) |
| N3  | Erreur suppression non affichée                 | **Mineur MVP**  | Corrigé                       |
| N4  | Pas de garde double-soumission                  | **Mineur MVP**  | Corrigé                       |
| N6  | Suppression décision en état dégradé            | **Mineur → V2** | Reporté                       |
| N7  | Navigation vers positionnement sur analyse vide | **Mineur → V2** | Reporté                       |

## 6. Corrections réalisées

- **N1 (Majeur) — refonte complète.** `createComparable` devient une action `useActionState` : sur erreur elle **retourne** un état structuré `{ error, fieldErrors, values, importGen }` (aucune redirection, aucun paramètre d'URL) ; succès = redirection uniquement. `ComparableFormFields` accepte `values` (valeurs brutes ré-affichées, y compris invalides) et `errors` (message sous le champ). La validation reste unique (`parseComparableForm`, enrichie de `fieldErrors` par champ). Garde anti double-soumission via `SubmitButton` (`useFormStatus`). Un jeton de génération d'import empêche une valeur périmée d'écraser un nouvel import. **Vérifié dans le navigateur** : après soumission invalide, `title`/`city`/`surface` conservés (valeur ET `defaultValue`), « Le prix est requis. » en bannière **et** sous le champ, URL inchangée sans query.
- **N2 (Majeur)** — branche données insuffisantes : `freshness="up_to_date"` → `"outdated"` (badge honnête « À actualiser »).
- **N8 (Mineur)** — `NumberField` : ajout de `w-full min-w-0` sur l'input pour qu'un champ à unité puisse rétrécir dans sa colonne de grille. **Vérifié** : fiche bien à 768 passe de scrollWidth 866 → 768 (plus aucun débordement).
- **N3 (Mineur)** — liste Builder lit `searchParams.error` et affiche une bannière.
- **N4 (Mineur)** — composant UI partagé `SubmitButton` (`useFormStatus`) sur création dossier, suppression dossier, création manuelle.
- **N9 (Majeur)** — Login et Onboarding restylés avec les **tokens existants** (aucune nouvelle charte, aucune modification de la logique d'auth ni de l'onboarding : actions, noms de champs, `required` inchangés) : conteneur centré (`flex flex-1 items-center justify-center`), carte `max-w-sm` bordée, titre `text-2xl font-semibold` + sous-titre, labels lisibles, champs `rounded border px-2 py-1`, bannière d'erreur `role="alert"` rouge, **bouton via le composant `SubmitButton` réutilisé** (état pending « … » + désactivation pendant l'envoi). **Vérifié dans le navigateur (1440 et 768)** : carte parfaitement centrée (centre carte = centre viewport), largeur 384 px, aucun débordement horizontal.

**Statut exact du plein écran Live (point 2 — revue de code)** : `toggleFullscreen` (`live-presentation-shell.tsx`) est **correct et défensif** — `element?.requestFullscreen()` (garde d'existence) enveloppé d'un `try/catch` + `.catch(() => {})` sur la promesse ; sortie via `document.exitFullscreen?.()` ; décision entrée/sortie via `document.fullscreenElement` ; listener `fullscreenchange` → bascule d'état ; libellé du bouton cohérent (« Plein écran » / « Quitter le plein écran ») ; la navigation (mode/section) n'est jamais réinitialisée par le toggle ; comportement gracieux si l'API est absente/refusée (aucune exception propagée). **Aucun helper pur introduit → aucun test unitaire ajouté** (conformément à la consigne). **L'API Fullscreen n'a PAS pu être réellement déclenchée ici** : elle exige un geste utilisateur réel et, dans ce sandbox, l'hydratation client est désactivée par le proxy (les `onClick` ne se déclenchent pas). Checklist manuelle en §10.

**Reporté V2** : N6, N7.

## 7. Anomalies / vérifications restantes

- **N6, N7 (V2)** — cas de bord récupérables, sans risque de sécurité.
- **Interactif non exécuté dans ce sandbox** (limite d'environnement, §2) — à valider par un humain dans un navigateur normal :
  enregistrement fiche bien vendeur · enregistrement diagnostics · enregistrement copropriété · **enregistrement de la décision conseiller** · import URL · navigation Live (sommaire / précédent / suivant, plein écran, raccourcis clavier). Le code de ces flux est couvert par les tests unitaires, le typecheck, le build et les tests SQL, mais **n'a pas été exercé en navigateur ici**.

## 8. Décisions V2 / V3

- **V2** : N6, N7, thème agence, historique, personnalisation Live.
- **Hors périmètre (rappel produit, à ne pas implémenter en MVP)** : export **PDF**, partage externe, **IA** / estimation automatique / prédiction, CRM, outil DVF.

## 9. Résultat par type de vérification

- **Lecture de code** : parcours 1→12 audité ; RLS agency-scoped sur toutes les tables ; `project_price_positionings` en lecture seule pour `authenticated`, écritures via service-role **server-only** (`server-only`, clé non publique) ; middleware + layout protégés ; Live sans élément mutant ; `notes` internes exclues de Live ; aucun terme d'estimation automatique prohibé.
- **Tests automatisés (Vitest)** : 38 fichiers / 321 tests verts, dont **5 nouveaux** sur `parseComparableForm` (erreurs par champ, prix requis, valeurs négatives, cumul d'erreurs).
- **Tests SQL (RLS)** : diagnostics/copropriété, positionnement, champs structurés, déplacement — tous « ALL SCENARIOS PASSED ». **Isolation inter-agence** vérifiée (agence A ne lit/modifie/supprime pas les données de B ; écriture directe du positionnement refusée).
- **Navigateur réel (1440 + 768)** : rendu des écrans sans débordement horizontal (après N8) ni NaN ; **N1 conservation prouvée** ; **Login + Onboarding restylés vérifiés aux deux viewports** (centrés, sans débordement) ; création projet / création comparable / sélection **persistées en base** ; vocabulaire conforme in-app ; Live en lecture seule.
- **Restant en manuel** : soumission des formulaires **contrôlés**, **API Fullscreen** et interactions **client** de Live (§7), non exécutables dans ce sandbox (hydratation désactivée par le proxy).

## 10. Recommandation

# ⚠️ GO PILOTE AVEC RÉSERVE — validation interactive manuelle à confirmer

**Réserve unique et bien délimitée** : dans ce sandbox de développement, l'**hydratation client** est désactivée par le proxy de requêtes ; les interactions **purement client** — soumission des formulaires **contrôlés** (bien vendeur, diagnostics, copropriété, **décision conseiller**), **API Fullscreen** de Live, et navigation Live — **n'ont pas pu être déclenchées** en navigateur ici. Ces flux **n'ont aucun défaut de code connu** (revue de code OK, patterns déjà validés en Mission 22, `SubmitButton` réutilisé) mais doivent être confirmés par un humain dans un navigateur normal (checklist ci-dessous).

Tout le reste est **vérifié et vert** : contrôles code (test, lint, typecheck, build), tests SQL (RLS + isolation inter-agence), conservation N1 prouvée en navigateur, **Login/Onboarding restylés et vérifiés aux deux viewports**, un débordement tablette (N8) trouvé et corrigé, rendu des écrans sans débordement ni NaN, Live en lecture seule, vocabulaire conforme. **Aucun défaut fonctionnel connu ne subsiste** → ce n'est pas un NO-GO ; le passage en **GO PILOTE** ferme se fait dès que la checklist manuelle (dont le plein écran) est confirmée.

### Checklist manuelle exacte (propriétaire produit, Chrome normal, `npm run dev`)

Se connecter, puis pour **chaque viewport (1440 × 900 puis 768 × 1024)** :

1. **Fiche bien vendeur** — saisir type + surface + ville, « Enregistrer » → « Bien vendeur enregistré. » ; recharger → valeurs présentes ; blocs Diagnostics + Copropriété apparaissent.
2. **Diagnostics** — remplir DPE + un statut, enregistrer → confirmation ; recharger → conservé.
3. **Copropriété** — cocher « copropriété », remplir lots/charges, enregistrer ; décocher → champs neutralisés.
4. **Comparable manuel** — soumettre sans prix → saisie conservée **et** « Le prix est requis. » sous le champ (déjà prouvé) ; corriger → création.
5. **Import URL** — coller une URL, « Importer » → champs pré-remplis ; enregistrer.
6. **Sélection** — Écarter / Réintégrer / Monter / Descendre.
7. **Positionnement** — « Enregistrer la décision » → « Décision enregistrée. » ; recharger → « Positionnement enregistré » badge « À jour ».
8. **Présentation** — statut cohérent ; « Ouvrir dans Live ».
9. **Plein écran Live (bloquant pour le GO ferme)** :
   1. ouvrir Live dans Chrome normal ;
   2. cliquer « Plein écran » ;
   3. vérifier `document.fullscreenElement` non nul (console) ;
   4. naviguer section suivante / précédente ;
   5. sortir avec `Échap` ;
   6. vérifier que Live reste fonctionnel et que le libellé redevient « Plein écran ».
10. Sur chaque écran : pas de scroll horizontal, boutons accessibles, erreurs visibles, boutons de soumission désactivés pendant l'envoi.

Si l'ensemble passe aux deux viewports (plein écran inclus) → **GO PILOTE**. Sinon, consigner les écrans en échec (→ NO-GO ciblé).

---

### Points de vigilance restants

- Interactif client (formulaires contrôlés, plein écran, navigation Live) non exécuté ici (§7) — **doit** être confirmé manuellement pour lever la réserve.
- N6 / N7 en V2.
- Dette de format pré-existante sur des `.md`/config (hors périmètre).
- Rappel produit : ni PDF, ni IA, ni partage externe, ni estimation automatique.
