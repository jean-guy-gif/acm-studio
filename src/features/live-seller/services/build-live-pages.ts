import { dpeMedian } from '@/features/dpe/services/dpe';
import type { LivePresentationMode } from '@/features/live-seller/services/presentation-mode';
import type { LiveComparableResponse, LiveSellerSummary } from '@/features/live-seller/types';

// MISSION 51 — la navigation ne lit d'un concurrent que son id et sa réponse persistée.
// On la type sur ce MINIMUM structurel, si bien que la donnée complète (côté serveur) ET
// la donnée PROJETÉE remise au vendeur (sans prix) satisfont toutes deux ces fonctions,
// sans conversion.
// MISSION 80 — et sa classe DPE : c'est elle qui décide si l'écran « Le DPE face au marché »
// existe. Ce n'est pas un montant ; elle voyage déjà dans la donnée projetée.
export type LiveNavComparable = {
  id: string;
  response: LiveComparableResponse | null;
  energyRating?: string | null;
  // MISSION 92 — a-t-on une durée ou un historique de prix à révéler ? Un simple oui/non (aucune
  // donnée avant la devinette). `false` saute l'étape « Durée » : on ne fait pas deviner au
  // vendeur ce qu'on ne saura pas lui dire. Absent = inconnu de l'appelant : l'étape reste.
  durationKnown?: boolean;
};
// Mission 131 — en présentation directe, les écrans qui demandent au vendeur n'existent que s'il y
// a déjà répondu (avant le passage en directe) : c'est le résumé qui le dit.
export type LiveNavSummary = Partial<
  Pick<
    LiveSellerSummary,
    | 'seller_perceived_property_price'
    | 'seller_most_dangerous_comparable_id'
    | 'seller_revised_property_price'
    | 'seller_launch_readiness_last'
  >
>;
export type LiveNavData = {
  comparables: LiveNavComparable[];
  sellerSummary?: LiveNavSummary | null;
};

// The ordered page model that drives the Live comparative UI. Pure/deterministic:
// intro → [Votre bien] → seller perceived price → [competition, price, price reveal,
// duration] per comparable → [le DPE face au marché] → dangerous competitor → price
// analysis → conclusion → closing question. Mission 41 aligns the per-comparable loop on the Storyboard's four
// screens (A/B/C/D): the guess and the reveal are two distinct screens so the
// seller's reaction to the revealed price has room to happen.
export type LivePageType =
  | 'intro'
  | 'subject_property'
  | 'comparable_competition'
  | 'comparable_price'
  | 'comparable_price_reveal'
  | 'comparable_duration'
  // Mission 95 — rythme accéléré, à partir du 4e concurrent : deux écrans au lieu de quatre.
  | 'comparable_quick_guess'
  | 'comparable_quick_reveal'
  // Mission 131 — présentation directe : un écran par concurrent, son prix affiché d'emblée.
  | 'comparable_direct'
  | 'dpe_market'
  // Mission 131 — présentation directe : le concurrent le plus proche, proposé par le conseiller.
  | 'advisor_closest'
  | 'dangerous_competitor'
  | 'seller_perceived_price'
  | 'seller_revised_price'
  | 'price_analysis'
  | 'conclusion'
  | 'closing_question';

export type LivePage = {
  key: string;
  type: LivePageType;
  title: string;
  // Per-comparable pages only:
  comparableId: string | null;
  comparableIndex: number | null; // 1-based position among retained
  step: 1 | 2 | 3 | 4 | null; // step within the 4-step loop
};

// MISSION 95 — le rythme du Live, choisi par le conseiller sur « Avant le rendez-vous ».
//   • « complete » : quatre écrans pour chaque concurrent ;
//   • « accelerated » : les TROIS premiers concurrents gardent leurs quatre écrans (le vendeur
//     y apprend le principe), puis deux écrans par concurrent — (1) la fiche, la question du
//     sérieux et la devinette du prix ; (2) la révélation, puis la durée devinée et révélée.
// L'ordre de passage ne change pas ; ce qui se devine se devine toujours AVANT d'être révélé.
export type LiveRhythm = 'accelerated' | 'complete';
export const DEFAULT_LIVE_RHYTHM: LiveRhythm = 'accelerated';
// Les concurrents qui gardent toujours le déroulé complet.
export const FULL_FLOW_COMPETITORS = 3;

export function liveRhythm(value: string | null | undefined): LiveRhythm {
  return value === 'complete' ? 'complete' : DEFAULT_LIVE_RHYTHM;
}

const QUICK_STEPS: { type: LivePageType; step: 1 | 2; title: string }[] = [
  { type: 'comparable_quick_guess', step: 1, title: 'Un sérieux concurrent, et à quel prix ?' },
  { type: 'comparable_quick_reveal', step: 2, title: 'Son prix, et depuis quand ?' },
];

const COMPARABLE_STEPS: { type: LivePageType; step: 1 | 2 | 3 | 4; title: string }[] = [
  { type: 'comparable_competition', step: 1, title: 'Un sérieux concurrent ?' },
  { type: 'comparable_price', step: 2, title: 'À quel prix ?' },
  { type: 'comparable_price_reveal', step: 3, title: 'Ce prix vous paraît-il cohérent ?' },
  { type: 'comparable_duration', step: 4, title: 'Pourquoi toujours en vente ?' },
];

// `hasSubjectProperty` decides whether the "Votre bien" recognition slide (Act 1)
// is inserted — absent when the dossier has no subject property, same logic as the
// dangerous-competitor page when there is no competitor.
//
// `rhythm` (mission 95) : « complete » par défaut pour qui ne le précise pas — c'est le déroulé
// d'avant la mission. Les écrans du Live passent toujours le rythme du dossier.
// Mission 131 — `mode` : « direct » retire tout écran qui demande quelque chose au vendeur — sa
// valeur perçue, les devinettes, la reformulation de son prix, la note de 1 à 10 — sauf ceux où il
// a DÉJÀ répondu (passage en directe en cours de route : ce qui a été répondu est gardé). Chaque
// concurrent pas encore joué a un seul écran, son prix affiché d'emblée ; un concurrent déjà
// montré en directe le garde, même revenu au Live interactif (on ne fait pas deviner un prix vu).
// « Le plus dangereux » devient « le plus proche de votre bien », proposé par le conseiller.
export function buildLivePages(
  live: LiveNavData | null,
  hasSubjectProperty: boolean,
  rhythm: LiveRhythm = 'complete',
  mode: LivePresentationMode = 'interactive',
): LivePage[] {
  const direct = mode === 'direct';
  const summary = live?.sellerSummary ?? null;
  const shownAny = (live?.comparables ?? []).some(
    (comparable) => comparable.response?.shown_directly_at != null,
  );
  const pages: LivePage[] = [
    {
      key: 'intro',
      type: 'intro',
      title: 'Introduction',
      comparableId: null,
      comparableIndex: null,
      step: null,
    },
  ];

  if (hasSubjectProperty) {
    pages.push({
      key: 'subject_property',
      type: 'subject_property',
      title: 'Votre bien',
      comparableId: null,
      comparableIndex: null,
      step: null,
    });
  }

  // Mission 82 — le vendeur dit son prix AVANT de voir le moindre concurrent : la page ne
  // révèle rien, le marché n'arrive que sur « Analyse des prix ». Mission 131 — en directe, ou
  // dès qu'un prix a été montré en directe, on ne la lui demande plus (elle reste s'il l'a donnée).
  if (summary?.seller_perceived_property_price != null || (!direct && !shownAny)) {
    pages.push({
      key: 'seller_perceived_price',
      type: 'seller_perceived_price',
      title: 'Votre valeur perçue',
      comparableId: null,
      comparableIndex: null,
      step: null,
    });
  }

  const comparables = live?.comparables ?? [];
  comparables.forEach((comparable, index) => {
    const rejected = comparable.response?.seller_serious_competitor === 'no';
    const guessed = comparable.response?.seller_estimated_listing_price != null;
    if (comparable.response?.shown_directly_at != null || (direct && !rejected && !guessed)) {
      pages.push({
        key: `comparable_direct:${comparable.id}`,
        type: 'comparable_direct',
        title: 'Son prix et son temps de vente',
        comparableId: comparable.id,
        comparableIndex: index + 1,
        step: 1,
      });
      return;
    }
    const quick = rhythm === 'accelerated' && index >= FULL_FLOW_COMPETITORS;
    const steps = quick
      ? // « Non, pas un concurrent » : sa devinette n'est pas demandée, il n'y a rien à révéler.
        QUICK_STEPS.filter((step) => !rejected || step.step === 1)
      : rejected
        ? COMPARABLE_STEPS.filter((step) => step.step === 1)
        : comparable.durationKnown === false
          ? COMPARABLE_STEPS.filter((step) => step.type !== 'comparable_duration')
          : COMPARABLE_STEPS;
    for (const stepDef of steps) {
      pages.push({
        key: `${stepDef.type}:${comparable.id}`,
        type: stepDef.type,
        title: stepDef.title,
        comparableId: comparable.id,
        comparableIndex: index + 1,
        step: stepDef.step,
      });
    }
  });

  // Mission 80 — « Le DPE face au marché », après le dernier concurrent. Absent tant qu'aucun
  // concurrent n'affiche de classe DPE : sans repère, l'écran n'aurait rien à dire.
  if (dpeMedian(comparables.map((comparable) => comparable.energyRating)) != null) {
    pages.push({
      key: 'dpe_market',
      type: 'dpe_market',
      title: 'Le DPE face au marché',
      comparableId: null,
      comparableIndex: null,
      step: null,
    });
  }

  if (comparables.length > 0) {
    if (direct && summary?.seller_most_dangerous_comparable_id == null) {
      pages.push({
        key: 'advisor_closest',
        type: 'advisor_closest',
        title: 'Le concurrent le plus proche',
        comparableId: null,
        comparableIndex: null,
        step: null,
      });
    } else {
      pages.push({
        key: 'dangerous_competitor',
        type: 'dangerous_competitor',
        title: 'Le concurrent le plus dangereux',
        comparableId: null,
        comparableIndex: null,
        step: null,
      });
    }
    // Mission 94 — Acte 5 : après avoir vu les biens, le vendeur reformule lui-même son prix,
    // avant que l'analyse ne s'affiche. Facultatif (« Passer »). Sans concurrent, il n'y a rien
    // « vu » : l'écran n'existe pas.
    if (!direct || summary?.seller_revised_property_price != null) {
      pages.push({
        key: 'seller_revised_price',
        type: 'seller_revised_price',
        title: 'Votre prix après le marché',
        comparableId: null,
        comparableIndex: null,
        step: null,
      });
    }
  }

  pages.push(
    {
      key: 'price_analysis',
      type: 'price_analysis',
      title: 'Analyse des prix',
      comparableId: null,
      comparableIndex: null,
      step: null,
    },
    {
      key: 'conclusion',
      type: 'conclusion',
      title: 'Conclusion',
      comparableId: null,
      comparableIndex: null,
      step: null,
    },
  );
  // Mission 85 — après le prix de commercialisation, le vendeur se situe de 1 à 10.
  // Dernier écran : c'est lui qui porte « Terminer le rendez-vous ». Mission 131 — pas en
  // directe (sauf note déjà donnée) : la conclusion devient le dernier écran et le porte.
  if (!direct || summary?.seller_launch_readiness_last != null) {
    pages.push({
      key: 'closing_question',
      type: 'closing_question',
      title: 'Prêt à lancer ?',
      comparableId: null,
      comparableIndex: null,
      step: null,
    });
  }

  return pages;
}

// Mission 131 — passer en présentation directe (ou en revenir) au milieu du Live ne fait perdre
// sa place à personne : le même écran s'il existe encore, sinon le premier écran du même
// concurrent, sinon la même position (bornée). Pur.
export function indexAfterModeChange(
  current: Pick<LivePage, 'key' | 'comparableId'>,
  currentIndex: number,
  next: LivePage[],
): number {
  const sameKey = next.findIndex((page) => page.key === current.key);
  if (sameKey >= 0) {
    return sameKey;
  }
  if (current.comparableId != null) {
    const sameComparable = next.findIndex((page) => page.comparableId === current.comparableId);
    if (sameComparable >= 0) {
      return sameComparable;
    }
  }
  return Math.max(0, Math.min(currentIndex, next.length - 1));
}
