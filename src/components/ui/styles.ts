// Tokens de classes réutilisables (mini design system) — charte Start Academy.
// Chaque jeton décrit l'élément en thème CLAIR (fond zinc-50 / cartes blanches)
// et sa variante `stage:` (thème sombre bleu nuit, bascule au choix de
// l'utilisateur via le cookie `acm-theme` — jamais le dark mode système).
// Les couleurs fonctionnelles (emerald/amber/zinc/red) ne sont jamais
// remplacées par le bleu de marque.

/* ----------------------------------------------------------------------------
 * Boutons
 * ------------------------------------------------------------------------- */

// Mission 146 — `btn-filled`, une classe repère sans effet : le contrôle e2e « au plus un bouton
// plein par écran » (M143) la compte.
export const btnPrimary =
  'btn-filled inline-flex items-center justify-center gap-2 rounded-xl bg-brand-deep px-4 py-2 text-sm font-semibold text-white shadow-sm shadow-brand/30 transition-all hover:bg-brand-darker focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50 stage:hover:bg-white stage:hover:text-brand-deep';

export const btnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-zinc-300 bg-white px-3.5 py-2 text-sm font-medium text-zinc-700 transition-colors hover:border-brand hover:text-brand-deep disabled:cursor-not-allowed disabled:opacity-50 stage:border-white/15 stage:bg-white/5 stage:text-white/85 stage:hover:border-brand stage:hover:text-white';

export const btnDanger =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 bg-white px-3.5 py-2 text-sm font-medium text-red-600 transition-colors hover:border-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 stage:border-red-400/30 stage:bg-transparent stage:text-red-300 stage:hover:border-red-300 stage:hover:bg-red-500/10';

// Action destructrice discrète (listes) : visible sans crier.
export const btnDangerGhost =
  'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-red-500/80 transition-colors hover:bg-red-50 hover:text-red-600 disabled:cursor-not-allowed disabled:opacity-50 stage:text-red-300/70 stage:hover:bg-red-500/10 stage:hover:text-red-300';

export const btnGhost =
  'inline-flex items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-800 disabled:cursor-not-allowed disabled:opacity-50 stage:text-white/60 stage:hover:bg-white/10 stage:hover:text-white';

/* ----------------------------------------------------------------------------
 * Surfaces
 * ------------------------------------------------------------------------- */

export const card =
  'rounded-2xl border border-zinc-200/80 bg-white shadow-card stage:border-white/10 stage:bg-white/5 stage:shadow-none';

// Surface discrète (informations secondaires, encadrés d'aide).
export const softPanel =
  'rounded-xl border border-zinc-100 bg-zinc-50 stage:border-white/10 stage:bg-white/[0.04]';

// État vide (aucune donnée) : pointillés, jamais de fausses données.
export const emptyState =
  'flex flex-col gap-1 rounded-2xl border border-dashed border-zinc-300 bg-white/60 p-6 text-sm text-zinc-500 stage:border-white/15 stage:bg-white/[0.03] stage:text-white/60';

/* ----------------------------------------------------------------------------
 * Typographie de page
 * ------------------------------------------------------------------------- */

export const pageTitle =
  'font-title text-3xl leading-tight font-bold tracking-tight text-brand-deep sm:text-4xl stage:text-white';

export const pageSubtitle = 'text-sm text-zinc-500 stage:text-white/60';

// Sur-titre discret au-dessus du titre (« DOSSIER VENDEUR », « ÉTAPE 2 »…).
export const kickerLabel =
  'text-xs font-semibold tracking-[0.2em] uppercase text-zinc-500 stage:text-white/45';

export const sectionTitle =
  'font-title text-xl leading-snug font-semibold text-zinc-900 stage:text-white';

// Étiquette au-dessus d'une valeur (fiches, résumés).
export const metaLabel =
  'text-[0.7rem] font-semibold tracking-[0.14em] uppercase text-zinc-500 stage:text-white/50';

export const metaValue = 'font-title text-lg font-semibold text-zinc-900 stage:text-white';

export const hintText = 'text-sm text-zinc-500 stage:text-white/60';

/* ----------------------------------------------------------------------------
 * Formulaires
 * ------------------------------------------------------------------------- */

export const inputBase =
  'rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm text-zinc-900 outline-none transition-colors placeholder:text-zinc-500 focus:border-brand focus:ring-2 focus:ring-brand/30 stage:border-white/15 stage:bg-white/10 stage:text-white stage:placeholder:text-white/35';

export const fieldLabel = 'text-sm font-medium text-zinc-600 stage:text-white/70';

// Section de formulaire (carte) et son titre — hiérarchie lisible sans
// ralentir la saisie.
export const formSection = `${card} flex flex-col gap-4 p-5 sm:p-6`;

export const formSectionTitle =
  'font-title text-lg leading-snug font-semibold text-brand-deep stage:text-white';

// Option cochable en « puce » (extérieurs, stationnements, statuts…).
export const checkChip =
  'inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-sm font-medium text-zinc-600 transition-colors select-none hover:border-brand hover:text-brand-deep has-checked:border-brand has-checked:bg-brand-soft has-checked:text-brand-deep stage:border-white/15 stage:bg-white/5 stage:text-white/70 stage:hover:border-brand stage:hover:text-white stage:has-checked:border-brand stage:has-checked:bg-brand/15 stage:has-checked:text-white';

/* ----------------------------------------------------------------------------
 * Liens et navigation
 * ------------------------------------------------------------------------- */

export const link =
  'font-medium text-brand-deep underline-offset-2 transition-colors hover:text-brand stage:text-brand stage:hover:text-white';

export const backLink =
  'inline-flex items-center gap-1.5 text-sm font-medium text-zinc-500 transition-colors hover:text-brand-deep stage:text-white/55 stage:hover:text-white';

/* ----------------------------------------------------------------------------
 * Messages d'état
 * ------------------------------------------------------------------------- */

export const alertError =
  'rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-700 stage:border-red-400/30 stage:bg-red-500/10 stage:text-red-300';

export const alertOk =
  'rounded-xl border border-emerald-200 bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-700 stage:border-emerald-400/30 stage:bg-emerald-500/10 stage:text-emerald-300';

export const errorText = 'text-sm font-medium text-red-600 stage:text-red-300';
export const okText = 'text-sm font-medium text-emerald-600 stage:text-emerald-300';

/* ----------------------------------------------------------------------------
 * Badges
 * ------------------------------------------------------------------------- */

export const badgeNeutral =
  'inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2.5 py-0.5 text-xs font-medium text-zinc-600 stage:border-white/15 stage:bg-white/10 stage:text-white/70';

export const badgeSelected =
  'inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 stage:border-emerald-400/30 stage:bg-emerald-500/10 stage:text-emerald-300';

export const badgeRejected =
  'inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-700 stage:border-amber-400/30 stage:bg-amber-500/10 stage:text-amber-300';

export const badgeBrand =
  'inline-flex items-center rounded-full border border-brand/25 bg-brand-soft px-2.5 py-0.5 text-xs font-semibold text-brand-deep stage:border-brand/40 stage:bg-brand/15 stage:text-brand';

/* ----------------------------------------------------------------------------
 * Le socle de la refonte (lot A — maquettes REFONTE-1 à 8)
 *
 * Les blocs communs aux trois tailles. La couleur de l'agence reste celle de sa charte (M55) :
 * le bleu nuit des maquettes est `brand-deep`, son bleu pâle `brand-soft`. Les gris, les fonds et
 * les arrondis sont ceux des maquettes. Les jetons d'avant ne changent pas : le Live, les
 * documents et les liens publics ne lisent pas ceux-ci.
 * ------------------------------------------------------------------------- */

// Le bouton plein : 48 px, coins de 14 px. Un seul par écran (M143, M146) : `btn-filled` le compte.
export const socleBtnFilled =
  'btn-filled inline-flex h-12 items-center justify-center gap-2 rounded-[14px] bg-brand-deep px-5 text-base font-bold text-white transition-colors hover:bg-brand-darker focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50 stage:hover:bg-white stage:hover:text-brand-deep';

// Le bouton en contour : la même taille, un trait de 1,5 px dans la couleur de l'agence.
export const socleBtnOutline =
  'inline-flex h-12 items-center justify-center gap-2 rounded-[14px] border-[1.5px] border-brand-deep bg-white px-5 text-base font-bold text-brand-deep transition-colors hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50 stage:border-white/40 stage:bg-transparent stage:text-white stage:hover:bg-white/10';

// Le bouton d'une tâche, dans une carte « à faire » : plein pour la première, en contour pour les
// autres, sur toute la largeur. Les gestes d'« Aujourd'hui » le prennent quand ils s'y affichent.
export type TaskButtonLook = 'today' | 'socle';

export function taskButtonClass(primary: boolean, look: TaskButtonLook = 'today'): string {
  return look === 'socle'
    ? `${primary ? socleBtnFilled : socleBtnOutline} w-full`
    : `${primary ? btnPrimary : btnSecondary} self-start whitespace-nowrap sm:self-auto`;
}

// Le bouton discret d'un en-tête (« Nouveau ») : 44 px, un contour gris.
export const socleBtnQuiet =
  'inline-flex h-11 items-center justify-center gap-2 rounded-[14px] border border-[#D5DAEA] bg-white px-4 text-[15px] font-bold text-brand-deep transition-colors hover:border-brand-deep disabled:cursor-not-allowed disabled:opacity-50 stage:border-white/15 stage:bg-white/10 stage:text-white';

// Les grands boutons d'une décision (la prochaine étape, « Écarter » et « Proposer ») : coins de
// 16 px, texte de 17 px. Leur hauteur est celle de l'écran : `socleBigStep` pour le bouton d'une
// prochaine étape (54 px, 56 sur ordinateur), `socleBigPair` pour la paire d'un bien (58 px, 56
// sur ordinateur).
export const socleBtnFilledBig =
  'btn-filled inline-flex items-center justify-center gap-2 rounded-2xl bg-brand-deep px-6 text-[17px] font-bold text-white transition-colors hover:bg-brand-darker focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50 stage:hover:bg-white stage:hover:text-brand-deep';

export const socleBtnQuietBig =
  'inline-flex items-center justify-center gap-2 rounded-2xl border border-[#D5DAEA] bg-white px-6 text-[17px] font-bold text-brand-darker transition-colors hover:border-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50 stage:border-white/15 stage:bg-white/10 stage:text-white';

export const socleBigStep = 'h-[54px] xl:h-14';

export const socleBigPair = 'h-[58px] xl:h-14';

// La carte : blanche, coins de 20 px. Avec une ombre légère (téléphone) ou un filet (le détail).
export const socleCard =
  'rounded-[20px] bg-white shadow-[0_1px_2px_rgba(27,37,89,0.06)] stage:bg-white/5 stage:shadow-none';

export const socleCardBordered =
  'rounded-[20px] border border-[#E3E6F0] bg-white stage:border-white/10 stage:bg-white/5';

// Le titre d'une page du socle et sa ligne (« Acquéreurs », « 3 choses à faire aujourd'hui »).
export const socleTitle =
  'text-[30px] leading-tight font-extrabold tracking-[-0.5px] text-brand-darker stage:text-white';

export const socleSubtitle = 'text-[15px] text-[#5B6380] stage:text-white/60';

// Le sur-titre d'un bloc (« PROCHAINE ÉTAPE »).
export const socleKicker =
  'text-[13px] font-extrabold tracking-[0.6px] text-[#5B6380] uppercase stage:text-white/50';

// Les pastilles (34 px) : neutre, verte (ce qui correspond), orange (à regarder, indispensable).
// La couleur ne porte jamais le sens seule : le texte le dit.
const pillBase = 'inline-flex h-[34px] items-center gap-1.5 rounded-full px-3 text-sm font-bold';

export const pillNeutral = `${pillBase} bg-brand-soft text-brand-darker stage:bg-brand/15 stage:text-white`;

export const pillGreen = `${pillBase} bg-[#E3F4EC] text-[#0B6B4A] stage:bg-emerald-400/15 stage:text-emerald-300`;

export const pillOrange = `${pillBase} bg-[#FDEBDD] text-[#7A2E08] stage:bg-orange-400/15 stage:text-orange-300`;

// Les pastilles à toucher (44 px, « Ce que j'ai compris ») : un bouton chacune.
const chipBase =
  'inline-flex h-11 items-center rounded-full border px-3.5 text-[15px] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand';

export const chipNeutral = `${chipBase} border-[#D5DAEA] bg-white font-semibold text-brand-darker hover:border-brand-deep stage:border-white/15 stage:bg-white/10 stage:text-white`;

export const chipGreen = `${chipBase} border-[#B5DFCB] bg-[#E3F4EC] font-bold text-[#0B6B4A] stage:border-emerald-400/30 stage:bg-emerald-400/15 stage:text-emerald-300`;

export const chipOrange = `${chipBase} border-[#F3C9A6] bg-[#FDEBDD] font-bold text-[#7A2E08] stage:border-orange-400/30 stage:bg-orange-400/15 stage:text-orange-300`;
