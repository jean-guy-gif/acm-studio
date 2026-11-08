// Système de styles du Live vendeur — mode présentation.
// Chaque jeton décrit l'élément en thème CLAIR (fond blanc charte) et sa
// variante `stage:` (scène sombre bleu nuit Start Academy, comme la page 1).
// La bascule se fait via data-stage="dark" sur la racine du Live : aucun lien
// avec le dark mode système, aucune logique métier ici.

// Racine de la présentation (le conteneur passé en plein écran).
// MISSION 51 §3.4 — plus d'`overflow-hidden` inconditionnel ici : en plein écran,
// il bloquait la molette (le contenu plus haut que l'écran devenait inatteignable).
// Le shell applique désormais l'overflow selon le mode (défilant en plein écran,
// clippé sinon pour la lueur décorative).
export const stageRoot =
  'relative flex min-h-[100dvh] flex-col bg-white text-zinc-900 transition-colors duration-300 stage:bg-gradient-to-br stage:from-brand-deep stage:via-brand-darker stage:to-brand-darkest stage:text-white';

// MISSION 72 — couche du halo : il déborde volontairement à droite (right-[-20%]), donc il
// vit dans sa propre couche rognée, jamais dans la largeur de la scène. `overflow-clip`
// (et non `hidden`) : une couche rognée ne défile pas, même par programme.
export const stageGlowLayer = 'pointer-events-none absolute inset-0 overflow-clip';

// Surligneur discret d'ambiance derrière le contenu (halo bleu en scène).
export const stageGlow =
  'pointer-events-none absolute -top-40 right-[-20%] hidden h-[32rem] w-[32rem] rounded-full bg-brand/20 blur-3xl stage:block';

// Sur-titre (kicker) : « CONCURRENT 2 SUR 4 · ÉTAPE 1 SUR 3 ».
export const kicker =
  'text-xs font-semibold tracking-[0.25em] uppercase text-brand-deep/70 stage:text-brand';

// La question posée au vendeur — l'élément le plus important de chaque fiche.
// Mission 148 — compactée pour que l'écran tienne sur la tablette sans défiler.
export const question =
  'font-title max-w-4xl text-3xl leading-[1.05] font-bold tracking-tight text-brand-deep sm:text-4xl xl:text-5xl stage:text-white';

// Sous-texte d'accompagnement sous la question.
export const questionHint = 'max-w-3xl text-sm text-zinc-500 sm:text-base stage:text-white/70';

// Mission 148 — la fiche d'un écran : sur tablette, elle occupe toute la hauteur que lui laisse le
// cadre (en-tête, barre du bas), et la photo prend ce qui reste.
export const screen = 'flex flex-col gap-3 md:min-h-0 md:flex-1 md:gap-4';

// L'en-tête d'une fiche : la question et son sous-texte.
export const screenHead = 'flex shrink-0 flex-col gap-1.5';

// Deux colonnes dès la tablette en paysage (photo à gauche, réponses à droite) ; en portrait, une
// seule colonne. La rangée prend la hauteur qui reste ; la colonne de la photo la remplit.
const screenBodyBase =
  'grid grid-cols-1 gap-4 md:min-h-0 md:flex-1 md:grid-rows-[minmax(0,1fr)] md:landscape:gap-5';
export const screenBody = `${screenBodyBase} md:landscape:grid-cols-[1.1fr_1fr]`;
// La colonne des réponses plus large (« Votre bien » : ses caractéristiques).
export const screenBodyWideAnswers = `${screenBodyBase} md:landscape:grid-cols-[1fr_1.15fr]`;

// La colonne de la photo : la photo s'étire, le libellé reste dessous.
export const photoColumn = 'flex min-w-0 flex-col gap-2 md:min-h-0';

// La colonne des réponses : son contenu, jamais étiré.
export const answerColumn = 'flex min-w-0 flex-col gap-3 md:min-h-0';

// Panneau de contenu (remplace les petites cartes bordées).
export const panel =
  'rounded-2xl border border-zinc-200 bg-white p-4 shadow-card sm:p-5 stage:border-white/10 stage:bg-white/5 stage:shadow-none stage:backdrop-blur-sm';

// Mission 148 — un panneau plus serré, pour un écran chargé (le plus dangereux).
export const panelTight =
  'rounded-2xl border border-zinc-200 bg-white px-4 py-3 shadow-card stage:border-white/10 stage:bg-white/5 stage:shadow-none stage:backdrop-blur-sm';

// Panneau discret (informations secondaires).
export const panelSoft =
  'rounded-2xl border border-zinc-100 bg-zinc-50 p-3 sm:p-4 stage:border-white/10 stage:bg-white/5';

// Mission 148 — une petite case de chiffre (analyse des prix, conclusion) : compacte.
export const figureCard =
  'flex flex-col gap-0.5 rounded-xl border border-zinc-100 bg-zinc-50 px-3 py-2 stage:border-white/10 stage:bg-white/5';

// Étiquette au-dessus d'une valeur.
export const statLabel =
  'text-[0.7rem] font-semibold tracking-[0.14em] uppercase text-zinc-500 stage:text-white/50';

// Valeur moyenne (caractéristiques, lignes de synthèse).
export const statValue = 'font-title text-xl font-semibold text-zinc-900 stage:text-white';

// Très grande valeur révélée (prix, durée) — le moment fort de la fiche.
export const revealValue =
  'font-title text-4xl leading-none font-bold tracking-tight whitespace-nowrap text-brand-deep sm:text-5xl stage:text-white';

// Valeur intermédiaire (devinette du vendeur, prix au m²…).
export const bigValue =
  'font-title text-2xl leading-none font-bold whitespace-nowrap text-zinc-900 sm:text-3xl stage:text-white';

// Grand choix tactile (radio stylisée) : OUI / NON / INCERTAIN, raisons…
export const choice =
  'flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-zinc-200 bg-white px-5 py-2 text-center font-title text-lg font-semibold text-zinc-700 transition-all select-none hover:border-brand hover:text-brand-deep has-checked:border-brand has-checked:bg-brand-deep has-checked:text-white has-checked:shadow-lg has-checked:shadow-brand/30 stage:border-white/20 stage:bg-white/5 stage:text-white/80 stage:hover:border-brand stage:hover:text-white stage:has-checked:border-white stage:has-checked:bg-white stage:has-checked:text-brand-deep';

// Mission 148 — un choix compact (raisons, cohérence) : 40 px, une ligne, au doigt.
export const choiceCompact =
  'flex min-h-10 cursor-pointer items-center justify-center rounded-xl border-2 border-zinc-200 bg-white px-3 py-1.5 text-center font-title text-sm leading-tight font-semibold text-zinc-700 transition-all select-none hover:border-brand hover:text-brand-deep has-checked:border-brand has-checked:bg-brand-deep has-checked:text-white has-checked:shadow-lg has-checked:shadow-brand/30 sm:text-base stage:border-white/20 stage:bg-white/5 stage:text-white/80 stage:hover:border-brand stage:hover:text-white stage:has-checked:border-white stage:has-checked:bg-white stage:has-checked:text-brand-deep';

// Grand champ numérique (devinette de prix, durée, valeur perçue).
export const bigInput =
  'live-number-input w-full rounded-xl border-2 border-zinc-200 bg-white px-5 py-3 text-center font-title text-4xl font-bold text-brand-deep outline-none transition-colors placeholder:text-zinc-300 focus:border-brand focus:ring-4 focus:ring-brand/20 sm:text-5xl stage:border-white/20 stage:bg-white/10 stage:text-white stage:placeholder:text-white/30 stage:focus:border-brand';

// Mission 148 — le grand champ, plus bas, quand l'écran porte aussi d'autres repères (Conclusion).
export const bigInputCompact =
  'live-number-input w-full rounded-xl border-2 border-zinc-200 bg-white px-4 py-2 text-center font-title text-3xl font-bold text-brand-deep outline-none transition-colors placeholder:text-zinc-300 focus:border-brand focus:ring-4 focus:ring-brand/20 sm:text-4xl stage:border-white/20 stage:bg-white/10 stage:text-white stage:placeholder:text-white/30 stage:focus:border-brand';

// Suffixe d'unité accolé au grand champ (€, jours).
export const bigInputUnit = 'font-title text-3xl font-semibold text-zinc-500 stage:text-white/60';

// Champ texte / liste secondaire (commentaires, raisons en select).
export const fieldInput =
  'rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30 stage:border-white/20 stage:bg-white/10 stage:text-white';

export const fieldLabel = 'text-sm font-medium text-zinc-600 stage:text-white/70';

// Bouton principal (valider / révéler) — large et évident. Mission 143 (B3) — la variante foncée
// de la marque sur fond clair ; sur la scène sombre, dont la barre du bas est déjà de cette couleur,
// le bouton est blanc, écrit dans la variante foncée (contraste > 8 : 1). Mission 144 — pendant une
// révélation, il reste plein et se voit enfoncé (`aria-busy`), jamais grisé comme indisponible.
export const ctaPrimary =
  'inline-flex min-h-12 items-center justify-center rounded-xl bg-brand-deep px-7 py-2.5 font-title text-lg font-semibold text-white shadow-lg shadow-brand/30 transition-all hover:bg-brand-darker focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50 aria-busy:scale-[0.97] aria-busy:cursor-wait aria-busy:bg-brand-darker aria-busy:shadow-none stage:bg-white stage:text-brand-deep stage:shadow-black/20 stage:hover:bg-brand-soft stage:aria-busy:bg-brand-soft';

// Bouton de navigation (Précédent / Suivant / chrome).
export const navBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 stage:border-white/20 stage:bg-white/5 stage:text-white/90 stage:hover:bg-white/15';

// Bouton discret du chrome (sommaire, bascule de thème).
export const chromeBtn =
  'inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium whitespace-nowrap text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 stage:text-white/60 stage:hover:bg-white/10 stage:hover:text-white';

// Messages d'état des formulaires.
export const errorText = 'text-sm font-medium text-red-600 stage:text-red-300';
export const okText = 'text-sm font-medium text-emerald-600 stage:text-emerald-300';

// Convention de comparaison, lue du côté du vendeur (Jean-Guy, 05/11, comme le Point marché) :
// avantage pour vous (faiblesse du concurrent) = vert, équivalent = GRIS neutre, avantage pour
// le concurrent = orange (« attention »). Jamais remplacés par le bleu de marque. Le gris
// « équivalent » reste lisible en scène sombre (blanc à 80 %), à ne pas
// confondre avec le gris très effacé de `unknown` (que l'écran masque désormais).
export const comparisonValueClass: Record<string, string> = {
  same: 'font-semibold text-zinc-600 stage:text-white/80',
  competitor_advantage: 'font-semibold text-amber-600 stage:text-amber-300',
  competitor_weakness: 'font-semibold text-emerald-600 stage:text-emerald-300',
  unknown: 'text-zinc-500 stage:text-white/40',
};

export const comparisonBadgeClass: Record<string, string> = {
  same: 'border-zinc-300 bg-zinc-100 text-zinc-700 stage:border-white/20 stage:bg-white/10 stage:text-white/80',
  competitor_advantage:
    'border-amber-200 bg-amber-50 text-amber-700 stage:border-amber-300/30 stage:bg-amber-400/10 stage:text-amber-300',
  competitor_weakness:
    'border-emerald-200 bg-emerald-50 text-emerald-700 stage:border-emerald-300/30 stage:bg-emerald-400/10 stage:text-emerald-300',
  unknown:
    'border-zinc-200 bg-zinc-50 text-zinc-500 stage:border-white/10 stage:bg-white/5 stage:text-white/40',
};
