// Tokens de classes réutilisables (mini design system). Aucune bibliothèque UI :
// de simples chaînes de classes Tailwind, centralisées pour l'harmonisation des
// boutons, champs, cartes, badges et liens. Les couleurs fonctionnelles
// (emerald/amber/zinc/red) ne sont jamais remplacées par le bleu de marque.

export const btnPrimary =
  'inline-flex items-center justify-center rounded-md bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm transition-colors hover:bg-brand-deep focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:cursor-not-allowed disabled:opacity-50';

export const btnSecondary =
  'inline-flex items-center justify-center rounded-md border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800';

export const btnDanger =
  'inline-flex items-center justify-center rounded-md border border-red-300 px-3 py-1.5 text-sm font-medium text-red-700 transition-colors hover:bg-red-50 disabled:opacity-50 dark:border-red-900 dark:text-red-300 dark:hover:bg-red-950';

export const btnGhost =
  'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm text-zinc-600 transition-colors hover:bg-zinc-100 disabled:opacity-50 dark:text-zinc-300 dark:hover:bg-zinc-800';

export const card =
  'rounded-card border border-zinc-200 bg-white shadow-card dark:border-zinc-800 dark:bg-zinc-900';

export const inputBase =
  'rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none transition-colors focus:border-brand focus:ring-2 focus:ring-brand/30 dark:border-zinc-700 dark:bg-zinc-900';

export const link = 'text-brand underline-offset-2 transition-colors hover:text-brand-deep';

export const badgeNeutral =
  'inline-flex items-center rounded-full border border-zinc-200 bg-zinc-50 px-2 py-0.5 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-300';

export const badgeSelected =
  'inline-flex items-center rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300';

export const badgeRejected =
  'inline-flex items-center rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-300';
