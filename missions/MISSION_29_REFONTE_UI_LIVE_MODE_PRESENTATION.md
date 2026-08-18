# MISSION 29 — REFONTE UI DU LIVE : MODE PRÉSENTATION

## Statut

Réalisée.

## Classification

MVP (expérience du rendez-vous vendeur)

## Objectif

Transformer le Live vendeur en véritable outil de présentation : questions posées au vendeur en très grand format, photos en héros, réponses en grands boutons tactiles, révélations (prix, durée) spectaculaires, dans la charte Start Academy. Décision produit (2026-08-18) : **scène sombre par défaut** (l'ambiance de la page d'introduction), avec **bascule Clair/Sombre** par un petit bouton dans la barre du Live.

Aucune logique métier modifiée : actions serveur, verrous de révélation (`canAdvanceLivePage`, M27), enregistrement par champ, persistance et protocole ACM (jamais de prix avant la devinette, un seul concurrent par fiche, couleurs vert/orange réservées à la comparaison) sont inchangés et re-vérifiés.

## 1. Système de thème « scène »

- `@custom-variant stage` (globals.css) piloté par `data-stage="dark"` sur la racine du Live — indépendant du dark mode système, n'affecte aucune autre page.
- `live-stage.ts` : jetons de style partagés (question géante Rajdhani, kicker, panneaux verre, grands choix `has-checked`, grands champs numériques, valeurs de révélation, boutons navigation/CTA, convention de comparaison) — chaque jeton porte sa version claire ET sa variante `stage:`.
- Animations sobres CSS (`live-fade-up`, `live-reveal-pop`) avec respect de `prefers-reduced-motion`.

## 2. Refonte des fiches

- **Coquille** (`live-comparative-shell`) : chrome discret (logo Start Academy, bascule Clair/Sombre, plein écran, Quitter), kicker « CONCURRENT X SUR N · ÉTAPE Y SUR 3 », barre de progression fine, navigation avec « Suivant » en CTA verrouillé tant que la réponse attendue n'est pas enregistrée. Props `initialIndex`/`initialStage` réservées à l'aperçu design.
- **Fiche 1** : question ~52-60 px, galerie héros + OUI / NON / INCERTAIN en grands boutons, comparaison par critère en cartes colorées (vert avantage / orange faiblesse / gras équivalent) avec légende.
- **Fiche 2** : grand champ € centré → révélation « Prix affiché sur le marché » en très grands chiffres (`live-reveal-pop`), écart €/% neutre (aucun jugement), prix/m², position, historique. Montants insécables.
- **Fiche 3** : devinette de durée en grand champ « jours » → révélation de la durée observée + « Soit X jours de plus/moins que l'estimation du vendeur » + baisses, puis raisons en grands boutons (visibles seulement après révélation ; l'enregistrement par champ M27 rend cela sûr).
- **Synthèse** : cartes photo sélectionnables (ring lumineux), chacune avec prix révélé, durée observée, **prix imaginé + écart** (demande produit), réponse « sérieux concurrent » ; raisons en grands boutons.
- **Valeur perçue / Analyse / Conclusion** : grands champs, trois repères en cartes, écarts lisibles, carte du concurrent le plus dangereux en conclusion.
- Galerie : mosaïque arrondie + visionneuse plein écran inchangée ; photos `no-referrer`.

## 3. Aperçu design (outil de développement)

- `/design-preview?page=N&state=fresh|answered&theme=dark|light` : rend le Live avec un dossier fictif « Démo » (3 concurrents, photos abstraites locales `public/design-preview/`). `notFound()` en production sauf `ACM_DESIGN_PREVIEW=1` ; route ajoutée aux chemins publics du middleware (la page se garde elle-même, aucune donnée réelle).
- A servi à une boucle de critique visuelle sur build de production : 28 captures Playwright (1440×900 et 768×1024, deux thèmes, états avant/après révélation), deux itérations de correctifs (montants insécables, tailles, logo, écarts).

## 4. Contrôles

- `npm run test` : 444 verts · `tsc` : vert · `eslint` : vert (dont `react-hooks/preserve-manual-memoization` sur la coquille) · `prettier` : vert (`src` + `supabase`) · `next build` : vert (nouvelle route `/design-preview`).
- Invariants re-vérifiés en lecture + captures : fiche 1 sans prix ni durée ; prix révélé uniquement après enregistrement de l'estimation ; durée et baisses uniquement après enregistrement de la devinette de durée ; « Suivant » verrouillé sinon.

## 5. Reste à faire (humain)

- Checklist navigateur des Missions 26/27 (inchangée), plus : bascule Clair/Sombre en cours de présentation, rendu vidéoprojecteur/tablette réelle, plein écran.
- Les captures de validation utilisent des polices de substitution (sandbox sans accès à Google Fonts) : sur le poste réel, Rajdhani/Montserrat s'appliquent — vérifier d'un coup d'œil les titres.

Aucun commit. Aucun push. Revue avant validation.
