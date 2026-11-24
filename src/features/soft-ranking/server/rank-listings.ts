import 'server-only';

import { reserveAiBudget, settleAiBudget } from '@/features/ai-budget/services/ai-budget';
import type { BuyerSoftCriterionKey } from '@/features/buyers/types';
import { demoPhotoAnswer, demoRankingAnswer } from '@/features/demo/services/demo-soft-ranking';
import { photoCriteria } from '@/features/soft-ranking/photo-request';
import {
  RANKING_BATCH,
  RANKING_FIXED_INPUT_TOKENS,
  RANKING_MAX_OUTPUT_TOKENS,
  estimatedRankingTokens,
  rankingBatchText,
  rankingInstructions,
  rankingSchema,
} from '@/features/soft-ranking/ranking-request';
import {
  photoWorstCase,
  readListingPhotos,
  type PhotoPick,
} from '@/features/soft-ranking/server/read-photos';
import {
  guardJudgments,
  guardPhotoJudgments,
  softMentions,
  unread,
  withPhotoJudgments,
} from '@/features/soft-ranking/services/judgments';
import type {
  RankingListing,
  SimpleReason,
  SoftJudgment,
  SoftRanking,
} from '@/features/soft-ranking/types';
import { aiConfigured, aiModel, callStructured } from '@/lib/ai/bedrock';
import { costMillicents, modelPrice, worstCaseMillicents } from '@/lib/ai/models';

// Mission 151 (partie B) — classer des biens par ce qui compte pour eux (planches 4 et 4 b) :
// la porte de la lecture par l'IA (le plafond posé de l'agence, `reading-gate.ts`), puis le budget
// RÉSERVÉ avant l'appel et réglé après (M105) ; 8 annonces par appel, les lots en parallèle ; un
// délai (30 s au plus, Jean-Guy, 12/11) au-delà duquel les biens s'affichent en classement
// simplifié, sans rien bloquer ; une annonce absente de la réponse est relancée une fois, puis
// « non lue » (M98). La trace (`ai_usage`, « ranking ») ne garde que les NOMS des critères, le
// modèle, le coût et l'issue : jamais un texte, une citation ni une clé de bien. Les textes ne
// sortent d'ici que par les citations vérifiées.

export const RANKING_DEADLINE_MS = 30_000;
const MIN_CALL_MS = 4_000;

export type RankInput = {
  agencyId: string;
  // null : la veille de nuit, sans auteur.
  userId: string | null;
  criteria: BuyerSoftCriterionKey[];
  listings: RankingListing[];
  demo: boolean;
  // La porte de la lecture par l'IA, déjà décidée par l'appelant.
  open: boolean;
  deadlineMs?: number;
  now?: Date;
  // La veille de nuit ne prend que la moitié du budget d'IA (Jean-Guy, 12/11) : la place restante
  // est vérifiée avant de réserver (le pire cas en millièmes de centime).
  mayReserve?: (wantedMillicents: number) => Promise<boolean>;
  // Lancement, mission 9 — les photos des biens les mieux classés : `max` biens au plus, choisis
  // par l'appelant une fois le texte jugé (lui seul connaît les catégories). Absent : aucune photo
  // n'est lue (la veille de nuit, et tant que la lecture des photos est éteinte).
  photos?: {
    max: number;
    pick: (byKey: Readonly<Record<string, SoftJudgment[]>>) => PhotoPick[];
  };
};

const simple = (
  reason: SimpleReason,
  listings: readonly RankingListing[],
  criteria: readonly BuyerSoftCriterionKey[],
): SoftRanking => ({
  mode: 'simple',
  reason,
  byKey: Object.fromEntries(
    listings.map((listing) => [listing.key, softMentions(listing, criteria)]),
  ),
});

// La forme simplifiée seule, sans appel (avant la recherche, planche 4 b).
export function simpleRanking(
  reason: SimpleReason,
  listings: readonly RankingListing[],
  criteria: readonly BuyerSoftCriterionKey[],
): SoftRanking {
  return simple(reason, listings, criteria);
}

type Batch = { id: string; listing: RankingListing }[];

function batchesOf(listings: readonly RankingListing[], offset = 0): Batch[] {
  const batches: Batch[] = [];
  for (let i = 0; i < listings.length; i += RANKING_BATCH) {
    batches.push(
      listings
        .slice(i, i + RANKING_BATCH)
        .map((listing, index) => ({ id: `a${offset + i + index + 1}`, listing })),
    );
  }
  return batches;
}

const batchWorstCase = (model: string, criteria: readonly BuyerSoftCriterionKey[], batch: Batch) =>
  worstCaseMillicents(model, {
    estimatedInputTokens:
      RANKING_FIXED_INPUT_TOKENS +
      estimatedRankingTokens(rankingInstructions(criteria)) +
      estimatedRankingTokens(rankingBatchText(batch)),
    maxOutputTokens: RANKING_MAX_OUTPUT_TOKENS,
  }) ?? 0;

export async function rankListings(input: RankInput): Promise<SoftRanking | null> {
  const { criteria, listings } = input;
  if (criteria.length === 0 || listings.length === 0) return null;
  if (!input.open) return simple('closed', listings, criteria);

  const started = Date.now();
  const deadline = started + (input.deadlineMs ?? RANKING_DEADLINE_MS);
  const judged = new Map<string, SoftJudgment[]>();
  const all = batchesOf(listings);
  // Les critères de la fiche qu'une photo peut montrer : sans eux, aucune photo n'est lue.
  const seen = input.photos ? photoCriteria(criteria) : [];

  // L'agence de démonstration : la lecture simulée, sans appel ni budget (M114).
  if (input.demo) {
    for (const batch of all) {
      const ids = new Map(batch.map(({ id, listing }) => [id, listing]));
      for (const [key, judgments] of guardJudgments(
        demoRankingAnswer(batch, criteria),
        ids,
        criteria,
      ))
        judged.set(key, judgments);
    }
    const ranked = full(listings, criteria, judged);
    // Les photos simulées, sans rien charger : la même relecture que la vraie (M114).
    if (input.photos && seen.length > 0) {
      const byListing = new Map(listings.map((listing) => [listing.key, listing]));
      for (const pick of classed(input.photos.pick(ranked.byKey), ranked).slice(
        0,
        input.photos.max,
      )) {
        const listing = byListing.get(pick.key);
        const sent = new Set(pick.urls.map((_, index) => index + 1));
        if (!listing || sent.size === 0) continue;
        ranked.byKey[pick.key] = withPhotoJudgments(
          ranked.byKey[pick.key]!,
          guardPhotoJudgments(demoPhotoAnswer(listing, seen, sent.size), seen, sent),
        );
      }
    }
    return ranked;
  }

  const model = aiModel();
  if (!aiConfigured() || modelPrice(model) == null) return simple('failed', listings, criteria);
  // Plus le temps d'un appel : rien n'est réservé (la nuit comme le jour).
  if (deadline - Date.now() < MIN_CALL_MS) return simple('failed', listings, criteria);
  // Le pire cas : chaque lot, plus la relance d'un lot.
  const perBatch = all.map((batch) => batchWorstCase(model, criteria, batch));
  const wantedText = perBatch.reduce((sum, cost) => sum + cost, 0) + Math.max(...perBatch);
  const wantedPhotos =
    input.photos && seen.length > 0 ? input.photos.max * photoWorstCase(model) : 0;
  if (input.mayReserve && !(await input.mayReserve(wantedText + wantedPhotos)))
    return simple('budget', listings, criteria);
  const reserve = (wantedMillicents: number) =>
    reserveAiBudget({
      agencyId: input.agencyId,
      userId: input.userId,
      purpose: 'ranking',
      model,
      source: 'listings',
      wantedMillicents,
      now: input.now,
    });
  let wanted = wantedText + wantedPhotos;
  let reservation = await reserve(wanted);
  // Dans la limite du plafond de l'agence : s'il ne couvre plus les photos, le texte seul est lu.
  if (!reservation.ok && reservation.reason === 'reached' && wantedPhotos > 0) {
    wanted = wantedText;
    reservation = await reserve(wanted);
  }
  if (!reservation.ok)
    return simple(reservation.reason === 'reached' ? 'budget' : 'failed', listings, criteria);
  const photosCovered = wanted > wantedText;

  let spent = 0;
  const run = async (batch: Batch): Promise<void> => {
    const left = deadline - Date.now();
    if (left < MIN_CALL_MS) return;
    const answer = await callStructured({
      system: rankingInstructions(criteria),
      content: [{ type: 'text', text: rankingBatchText(batch) }],
      schema: rankingSchema(criteria),
      maxTokens: RANKING_MAX_OUTPUT_TOKENS,
      model,
      timeoutMs: left,
    });
    spent += answer.usage
      ? (costMillicents(model, answer.usage) ?? batchWorstCase(model, criteria, batch))
      : batchWorstCase(model, criteria, batch);
    if (!answer.ok) return;
    const ids = new Map(batch.map(({ id, listing }) => [id, listing]));
    for (const [key, judgments] of guardJudgments(answer.json, ids, criteria))
      judged.set(key, judgments);
  };

  await inPool(all, run);
  // Une annonce absente de la réponse est relancée une fois, s'il reste du temps — et seulement
  // dans ce que la réservation couvre encore (M105 : jamais plus que la réservation).
  const missing = listings.filter((listing) => !judged.has(listing.key));
  if (missing.length > 0 && missing.length < listings.length) {
    let room = wanted - spent;
    const retries = batchesOf(missing, listings.length).filter((batch) => {
      const worst = batchWorstCase(model, criteria, batch);
      if (worst > room) return false;
      room -= worst;
      return true;
    });
    await inPool(retries, run);
  }

  const answered = judged.size > 0;
  const ranked = full(listings, criteria, judged);
  // Les photos des biens les mieux classés, une fois le texte jugé, s'il reste du temps et dans ce
  // que la réservation couvre encore. Un échec ne retire rien : le texte reste jugé.
  let photosRead = false;
  if (answered && input.photos && photosCovered) {
    const read = await readListingPhotos({
      picks: classed(input.photos.pick(ranked.byKey), ranked).slice(0, input.photos.max),
      criteria: seen,
      model,
      deadline,
      room: wanted - spent,
    });
    spent += read.spent;
    photosRead = read.spent > 0;
    for (const [key, photos] of read.byKey) {
      const judgments = ranked.byKey[key];
      if (judgments) ranked.byKey[key] = withPhotoJudgments(judgments, photos);
    }
  }
  await settleAiBudget({
    usageId: reservation.usageId,
    costMillicents: spent,
    outcome: answered ? 'ranked' : 'failed',
    // La trace dit les noms des critères lus, et ceux regardés sur les photos : jamais un texte,
    // une photo ni une adresse de photo.
    fieldsProposed: [
      ...criteria.map((key) => `soft:${key}`),
      ...(photosRead ? seen.map((key) => `photo:${key}`) : []),
    ],
  });
  if (!answered) return simple('failed', listings, criteria);
  return ranked;
}

// Les biens dont les photos sont lues sont ceux que le texte a classés : un bien sans texte ni
// étiquette n'est pas dans le classement (« Aucun texte d'annonce à lire », M98) ; ses photos ne
// sont ni chargées ni payées, et il ne prend la place d'aucun autre.
const classed = (
  picks: readonly PhotoPick[],
  ranked: Extract<SoftRanking, { mode: 'full' }>,
): PhotoPick[] => picks.filter((pick) => ranked.byKey[pick.key] != null);

// Huit appels à la fois au plus : une recherche entière (60 annonces, 8 lots) part d'un coup, pour
// que le texte de TOUTES les annonces soit lu dans le délai. Mesuré le 24/11 sur vingt annonces
// réelles (`missions/L9-mesure.md`) : huit appels ensemble, dix critères, 15,9 s, aucun refus ;
// trois à la fois, la même recherche demandait trois vagues, donc plus que les 30 s du délai, et
// les dernières annonces restaient « non lues » (remplace « trois à la fois », M151 B).
export const RANKING_POOL = 8;
const POOL = RANKING_POOL;
async function inPool<T>(items: readonly T[], work: (item: T) => Promise<void>): Promise<void> {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(POOL, items.length) }, async () => {
      while (next < items.length) await work(items[next++]!);
    }),
  );
}

function full(
  listings: readonly RankingListing[],
  criteria: readonly BuyerSoftCriterionKey[],
  judged: ReadonlyMap<string, SoftJudgment[]>,
): Extract<SoftRanking, { mode: 'full' }> {
  return {
    mode: 'full',
    byKey: Object.fromEntries(
      listings.map((listing) => [
        listing.key,
        judged.get(listing.key) ?? criteria.map((key) => unread(key)),
      ]),
    ),
  };
}
