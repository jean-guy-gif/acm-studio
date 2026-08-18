// Système de styles du Live vendeur — mode présentation.
// Chaque jeton décrit l'élément en thème CLAIR (fond blanc charte) et sa
// variante `stage:` (scène sombre bleu nuit Start Academy, comme la page 1).
// La bascule se fait via data-stage="dark" sur la racine du Live : aucun lien
// avec le dark mode système, aucune logique métier ici.

// Racine de la présentation (le conteneur passé en plein écran).
export const stageRoot =
  'relative flex min-h-[100dvh] flex-col overflow-hidden bg-white text-zinc-900 transition-colors duration-300 stage:bg-gradient-to-br stage:from-brand-deep stage:via-[#013a58] stage:to-[#01283b] stage:text-white';

// Surligneur discret d'ambiance derrière le contenu (halo bleu en scène).
export const stageGlow =
  'pointer-events-none absolute -top-40 right-[-20%] hidden h-[32rem] w-[32rem] rounded-full bg-brand/20 blur-3xl stage:block';

// Sur-titre (kicker) : « CONCURRENT 2 SUR 4 · ÉTAPE 1 SUR 3 ».
export const kicker =
  'text-xs font-semibold tracking-[0.25em] uppercase text-brand-deep/70 stage:text-brand';

// La question posée au vendeur — l'élément le plus important de chaque fiche.
export const question =
  'font-title max-w-4xl text-4xl leading-[1.05] font-bold tracking-tight text-brand-deep sm:text-5xl xl:text-6xl stage:text-white';

// Sous-texte d'accompagnement sous la question.
export const questionHint = 'max-w-2xl text-base text-zinc-500 sm:text-lg stage:text-white/70';

// Panneau de contenu (remplace les petites cartes bordées).
export const panel =
  'rounded-2xl border border-zinc-200 bg-white p-5 shadow-card sm:p-6 stage:border-white/10 stage:bg-white/5 stage:shadow-none stage:backdrop-blur-sm';

// Panneau discret (informations secondaires).
export const panelSoft =
  'rounded-2xl border border-zinc-100 bg-zinc-50 p-4 sm:p-5 stage:border-white/10 stage:bg-white/5';

// Étiquette au-dessus d'une valeur.
export const statLabel =
  'text-[0.7rem] font-semibold tracking-[0.14em] uppercase text-zinc-400 stage:text-white/50';

// Valeur moyenne (caractéristiques, lignes de synthèse).
export const statValue = 'font-title text-xl font-semibold text-zinc-900 stage:text-white';

// Très grande valeur révélée (prix, durée) — le moment fort de la fiche.
export const revealValue =
  'font-title text-5xl leading-none font-bold tracking-tight whitespace-nowrap text-brand-deep sm:text-6xl stage:text-white';

// Valeur intermédiaire (devinette du vendeur, prix au m²…).
export const bigValue =
  'font-title text-2xl leading-none font-bold whitespace-nowrap text-zinc-900 sm:text-3xl stage:text-white';

// Grand choix tactile (radio stylisée) : OUI / NON / INCERTAIN, raisons…
export const choice =
  'flex min-h-14 cursor-pointer items-center justify-center gap-2 rounded-xl border-2 border-zinc-200 bg-white px-6 py-3 text-center font-title text-xl font-semibold text-zinc-700 transition-all select-none hover:border-brand hover:text-brand-deep has-checked:border-brand has-checked:bg-brand has-checked:text-white has-checked:shadow-lg has-checked:shadow-brand/30 stage:border-white/20 stage:bg-white/5 stage:text-white/80 stage:hover:border-brand stage:hover:text-white stage:has-checked:border-brand stage:has-checked:bg-brand stage:has-checked:text-white';

// Grand champ numérique (devinette de prix, durée, valeur perçue).
export const bigInput =
  'live-number-input w-full rounded-xl border-2 border-zinc-200 bg-white px-5 py-4 text-center font-title text-4xl font-bold text-brand-deep outline-none transition-colors placeholder:text-zinc-300 focus:border-brand focus:ring-4 focus:ring-brand/20 sm:text-5xl stage:border-white/20 stage:bg-white/10 stage:text-white stage:placeholder:text-white/30 stage:focus:border-brand';

// Suffixe d'unité accolé au grand champ (€, jours).
export const bigInputUnit = 'font-title text-3xl font-semibold text-zinc-400 stage:text-white/60';

// Champ texte / liste secondaire (commentaires, raisons en select).
export const fieldInput =
  'rounded-lg border border-zinc-300 bg-white px-3 py-2.5 text-base outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30 stage:border-white/20 stage:bg-white/10 stage:text-white';

export const fieldLabel = 'text-sm font-medium text-zinc-600 stage:text-white/70';

// Bouton principal (valider / révéler) — large et évident.
export const ctaPrimary =
  'inline-flex min-h-13 items-center justify-center rounded-xl bg-brand px-8 py-3 font-title text-lg font-semibold text-white shadow-lg shadow-brand/30 transition-all hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50 stage:hover:bg-white stage:hover:text-brand-deep';

// Bouton de navigation (Précédent / Suivant / chrome).
export const navBtn =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-5 py-2.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40 stage:border-white/20 stage:bg-white/5 stage:text-white/90 stage:hover:bg-white/15';

// Bouton discret du chrome (sommaire, bascule de thème).
export const chromeBtn =
  'inline-flex items-center justify-center rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 stage:text-white/60 stage:hover:bg-white/10 stage:hover:text-white';

// Messages d'état des formulaires.
export const errorText = 'text-sm font-medium text-red-600 stage:text-red-300';
export const okText = 'text-sm font-medium text-emerald-600 stage:text-emerald-300';

// Convention de comparaison (toujours le concurrent vs le bien vendeur) :
// équivalent = noir gras (blanc gras en scène), avantage = vert, faiblesse =
// orange, inconnu = gris. Jamais remplacés par le bleu de marque.
export const comparisonValueClass: Record<string, string> = {
  same: 'font-bold text-zinc-900 stage:text-white',
  competitor_advantage: 'font-semibold text-emerald-600 stage:text-emerald-300',
  competitor_weakness: 'font-semibold text-amber-600 stage:text-amber-300',
  unknown: 'text-zinc-400 stage:text-white/40',
};

export const comparisonBadgeClass: Record<string, string> = {
  same: 'border-zinc-300 bg-zinc-100 text-zinc-700 stage:border-white/20 stage:bg-white/10 stage:text-white/80',
  competitor_advantage:
    'border-emerald-200 bg-emerald-50 text-emerald-700 stage:border-emerald-300/30 stage:bg-emerald-400/10 stage:text-emerald-300',
  competitor_weakness:
    'border-amber-200 bg-amber-50 text-amber-700 stage:border-amber-300/30 stage:bg-amber-400/10 stage:text-amber-300',
  unknown:
    'border-zinc-200 bg-zinc-50 text-zinc-400 stage:border-white/10 stage:bg-white/5 stage:text-white/40',
};
