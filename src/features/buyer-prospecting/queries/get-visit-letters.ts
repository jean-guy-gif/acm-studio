import 'server-only';

import { getBuyerProspecting } from '@/features/buyer-prospecting/queries/get-buyer-prospecting';
import { buyerLetterHref } from '@/features/buyer-prospecting/services/buyer-letter-href';
import { visitAction } from '@/features/buyer-prospecting/services/visit-action';
import { visitLetterState } from '@/features/buyer-prospecting/services/visit-letter-state';
import type { VisitAction, VisitLetterState } from '@/features/buyer-prospecting/types';
import type { VisitLine } from '@/features/buyer-presentation/queries/get-visit-requests';
import { listingIdentityKey } from '@/features/comparable-import/utils/extract-listing-key';
import { getProspectingCards } from '@/features/prospecting/queries/prospecting-card-store';
import { getOppositions } from '@/features/prospecting/queries/get-oppositions';
import { opposedOn, type Oppositions } from '@/features/prospecting/services/opposition';
import { getProfile } from '@/lib/auth/get-profile';
import { createClient } from '@/lib/supabase/server';

export type VisitLetter = {
  action: VisitAction;
  // Le courrier déjà préparé pour ce bien retenu, et où il en est sur sa carte.
  letterHref: string | null;
  state: VisitLetterState;
  // Mission 120 B — à qui s'adresse le courrier préparé : le confrère (« Ouvrir le dossier ») ou
  // le propriétaire.
  colleague: boolean;
};

const NONE: VisitLetter = {
  action: { kind: 'none' },
  letterHref: null,
  state: { kind: 'none' },
  colleague: false,
};

// Mission 120 — pour chaque visite demandée, l'action qui convient à l'origine du bien, le courrier
// déjà préparé et son état relu sur la carte de Prospection (bien démarché ou concurrent). Cadré
// sur l'agence de l'appelant ; côté conseiller seulement.
export async function getVisitLetters(lines: VisitLine[]): Promise<Map<string, VisitLetter>> {
  const profile = await getProfile();
  if (!profile || profile.removed_at || lines.length === 0) {
    return new Map();
  }
  const supabase = await createClient();
  const projectIds = [
    ...new Set(lines.filter((line) => line.itemSource === 'project').map((l) => l.itemReference)),
  ];
  const competitorIds = [
    ...new Set(
      lines.filter((line) => line.itemSource === 'competitor').map((l) => l.itemReference),
    ),
  ];
  const [prospecting, cards, { data: conclusions }, { data: competitors }] = await Promise.all([
    getBuyerProspecting(supabase, profile.agency_id),
    getProspectingCards(),
    projectIds.length > 0
      ? supabase
          .from('project_meeting_conclusions')
          .select('project_id, outcome')
          .eq('agency_id', profile.agency_id)
          .in('project_id', projectIds)
      : Promise.resolve({ data: [] as { project_id: string; outcome: string | null }[] }),
    competitorIds.length > 0
      ? supabase
          .from('comparables')
          .select('id, exclusivity')
          .eq('agency_id', profile.agency_id)
          .in('id', competitorIds)
      : Promise.resolve({ data: [] as { id: string; exclusivity: string | null }[] }),
  ]);
  const outcomes = new Map((conclusions ?? []).map((row) => [row.project_id, row.outcome]));
  const exclusivities = new Map((competitors ?? []).map((row) => [row.id, row.exclusivity]));
  // Mission 120 B (relecteur) — pour une annonce du marché, l'exclusivité que sait déjà la carte du
  // bien (un concurrent ou un bien démarché de la même annonce) l'emporte sur la sélection.
  const known = (value: string | null | undefined): string | null =>
    value === 'yes' || value === 'no' ? value : null;
  const cardExclusivity = (listingUrl: string): string | null => {
    const key = listingIdentityKey(listingUrl);
    if (!key) return null;
    for (const card of cards) {
      for (const copy of card.copies) {
        if (copy.row.listingKey === key && known(copy.row.mandate.exclusivity)) {
          return copy.row.mandate.exclusivity;
        }
      }
    }
    const prospect = prospecting.cards.find((card) => card.row.listingKey === key);
    return known(prospect?.row.mandate.exclusivity);
  };
  // Un concurrent retenu : la première copie de sa carte qui sait l'exclusivité, comme à la
  // préparation (relecteur).
  const competitorCardExclusivity = (competitorId: string): string | null => {
    const card = cards.find((candidate) =>
      candidate.copies.some((copy) => copy.row.id === competitorId),
    );
    return (
      card?.copies
        .map((copy) => known(copy.row.mandate.exclusivity))
        .find((value) => value != null) ?? null
    );
  };

  // Mission 153 (relecteur) — sans courrier préparé, l'opposition se lit quand même : un bien hors
  // mandat « Ne plus solliciter » n'a ni bon ni offre. Une liste illisible n'est jamais lue comme
  // vide (M98) : le bien est fermé, l'écran le dit.
  let oppositions: Oppositions | null = null;
  if (lines.some((line) => line.itemSource !== 'project')) {
    oppositions = await getOppositions(supabase, profile.agency_id).catch(() => null);
  }
  const closedWithoutLetter = (line: VisitLine): VisitLetterState | null => {
    if (line.itemSource === 'project') return null;
    if (oppositions == null) {
      return {
        kind: 'closed',
        label: 'Liste «\u00a0Ne plus solliciter\u00a0» illisible, rechargez la page',
      };
    }
    if (line.itemSource === 'competitor') {
      const card = cards.find((candidate) =>
        candidate.copies.some((copy) => copy.row.id === line.itemReference),
      );
      if (card?.row.opposedOn) return { kind: 'closed', label: 'Ne plus solliciter' };
      return null;
    }
    const date = opposedOn(
      { address: null, listingKey: listingIdentityKey(line.itemReference) },
      oppositions,
    );
    return date ? { kind: 'closed', label: 'Ne plus solliciter' } : null;
  };

  return new Map(
    lines.map((line) => {
      const action = visitAction({
        source: line.itemSource,
        projectId: line.itemSource === 'project' ? line.itemReference : null,
        outcome: outcomes.get(line.itemReference) ?? null,
        exclusivity:
          line.itemSource === 'competitor'
            ? (competitorCardExclusivity(line.itemReference) ??
              exclusivities.get(line.itemReference) ??
              null)
            : (cardExclusivity(line.itemReference) ?? line.itemExclusivity),
      });
      const origin = prospecting.bySelectionItem.get(line.itemId);
      if (!origin) {
        const closed = closedWithoutLetter(line);
        return [line.id, closed ? { ...NONE, action, state: closed } : { ...NONE, action }];
      }
      const row = origin.prospectId
        ? (prospecting.cards.find((card) => card.prospectId === origin.prospectId)?.row ?? null)
        : (cards.find((card) => card.copies.some((copy) => copy.row.id === origin.comparableId))
            ?.row ?? null);
      const state = visitLetterState(row);
      return [
        line.id,
        {
          action,
          letterHref: buyerLetterHref(origin.originId),
          state,
          colleague: row?.step === 'colleague',
        },
      ];
    }),
  );
}
