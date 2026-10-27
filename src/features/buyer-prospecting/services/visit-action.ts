import type { SelectionSource } from '@/features/ideal-properties/types';
import type { VisitAction } from '@/features/buyer-prospecting/types';

// Mission 120 — l'action qu'une visite demandée propose, selon l'origine du bien et son
// exclusivité. Pur. Un bien de l'agence suit M86 : un mandat signé se fait visiter (« Proposer une
// visite »), un vendeur à relancer se rappelle (« Rappeler : j'ai un acquéreur ») ; tout autre
// dossier n'est pas un bien à faire visiter ici. Un concurrent ou une annonce du marché : le
// courrier au propriétaire sans exclusivité, le dossier au confrère en exclusivité, et le choix
// du conseiller quand l'exclusivité n'est pas connue — rien n'est supposé (CLAUDE.md).
export function visitAction(input: {
  source: SelectionSource;
  // Pour un bien de l'agence : le dossier vendeur et l'issue de sa conclusion.
  projectId?: string | null;
  outcome?: string | null;
  // Pour un concurrent ou une annonce : l'exclusivité lue à l'import (M83), ou null.
  exclusivity?: string | null;
}): VisitAction {
  if (input.source === 'project') {
    if (!input.projectId) {
      return { kind: 'none' };
    }
    if (input.outcome === 'signed') {
      return { kind: 'propose_visit', projectId: input.projectId };
    }
    if (input.outcome === 'follow_up') {
      return { kind: 'call_seller', projectId: input.projectId };
    }
    return { kind: 'none' };
  }
  if (input.exclusivity === 'yes') {
    return { kind: 'colleague_letter' };
  }
  if (input.exclusivity === 'no') {
    return { kind: 'owner_letter' };
  }
  return { kind: 'choose' };
}
