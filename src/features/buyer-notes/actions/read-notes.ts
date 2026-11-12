'use server';

import { reserveAiBudget, settleAiBudget } from '@/features/ai-budget/services/ai-budget';
import { agencyOfficialCommunes } from '@/features/buyer-notes/services/agency-communes';
import {
  NOTE_FIXED_INPUT_TOKENS,
  NOTE_IMAGE_TOKENS,
  NOTE_MAX_OUTPUT_TOKENS,
  NOTE_OUTPUT_SCHEMA,
  NOTE_READING_INSTRUCTIONS,
  estimatedTextTokens,
} from '@/features/buyer-notes/model-request';
import { guardProposal, proposedFieldNames } from '@/features/buyer-notes/services/guard-proposal';
import { parseNoteInput } from '@/features/buyer-notes/services/note-input';
import { notesReadingOpen } from '@/features/buyer-notes/services/reading-gate';
import { proposedCities, verifyCommunes } from '@/features/buyer-notes/services/verify-communes';
import type { NoteProposal, NoteReadingCause } from '@/features/buyer-notes/types';
import { geoProvider } from '@/features/competitor-search/services/geo-provider';
import { DEMO_NOTES_OUTPUT } from '@/features/demo/data/notes-arnaud';
import { demoDelay } from '@/features/demo/services/demo-delay';
import { isDemoAgency } from '@/features/demo/services/is-demo-agency';
import { aiModel, callStructured, type AiContentBlock } from '@/lib/ai/bedrock';
import { costMillicents, modelPrice, worstCaseMillicents } from '@/lib/ai/models';
import { reportServerError } from '@/lib/app-errors/report-server-error';
import { getProfile } from '@/lib/auth/get-profile';

// Mission 151 — « Depuis mes notes » : un seul appel, qui propose une fiche à vérifier. Cette action
// n'écrit RIEN d'autre que la ligne de consommation et de trace (`ai_usage` : qui, quand, le
// modèle, le coût, l'issue, les noms des champs) : la proposition, sources comprises, part vers
// l'écran et n'est gardée nulle part (principe 2). Le contenu lu ne passe que par la mémoire du
// serveur le temps de l'appel ; aucune erreur ne le recopie (causes fixes, `lib/ai/bedrock.ts`).

export type ReadNotesResult =
  | { ok: true; proposal: NoteProposal; usageId: string | null }
  | { ok: false; cause: NoteReadingCause; heic?: boolean };

export async function readBuyerNotes(formData: FormData): Promise<ReadNotesResult> {
  const profile = await getProfile();
  if (!profile || profile.removed_at) return { ok: false, cause: 'closed' };

  const images: Uint8Array[] = [];
  for (const entry of formData.getAll('images')) {
    if (typeof entry === 'object' && entry != null && 'arrayBuffer' in entry) {
      images.push(new Uint8Array(await (entry as Blob).arrayBuffer()));
    }
  }
  const input = parseNoteInput({ kind: formData.get('kind'), text: formData.get('text'), images });
  if (!input.ok) return { ok: false, cause: input.cause, ...(input.heic ? { heic: true } : {}) };

  const isDemo = await isDemoAgency(profile.agency_id);
  if (!notesReadingOpen({ isDemo, email: profile.email })) return { ok: false, cause: 'closed' };

  const finish = async (
    raw: unknown,
  ): Promise<Omit<NoteProposal, 'communes'> & { communes: NoteProposal['communes'] }> => {
    const guarded = guardProposal(raw);
    const read = guarded.values.cities ?? [];
    const official =
      read.length > 0 ? await agencyOfficialCommunes(profile.agency_id, geoProvider(isDemo)) : null;
    const communes = verifyCommunes(read, official);
    const cities = proposedCities(communes);
    const values = { ...guarded.values };
    if (cities.length > 0) values.cities = cities;
    else delete values.cities;
    return { ...guarded, values, communes };
  };

  // L'agence de démonstration : aucune lecture réelle, aucun budget (M114).
  if (isDemo) {
    await demoDelay();
    return { ok: true, proposal: await finish(DEMO_NOTES_OUTPUT), usageId: null };
  }

  const model = aiModel();
  if (!modelPrice(model)) return { ok: false, cause: 'unconfigured' };
  const estimatedInputTokens =
    NOTE_FIXED_INPUT_TOKENS +
    input.images.length * NOTE_IMAGE_TOKENS +
    estimatedTextTokens(input.text ?? '');
  const wanted = worstCaseMillicents(model, {
    estimatedInputTokens,
    maxOutputTokens: NOTE_MAX_OUTPUT_TOKENS,
  });
  if (wanted == null) return { ok: false, cause: 'unconfigured' };

  const reservation = await reserveAiBudget({
    agencyId: profile.agency_id,
    userId: profile.id,
    purpose: 'notes',
    model,
    source: input.kind,
    wantedMillicents: wanted,
  });
  if (!reservation.ok) {
    return {
      ok: false,
      cause: reservation.reason === 'reached' ? 'budget_reached' : 'budget_unavailable',
    };
  }

  const content: AiContentBlock[] = [
    ...input.images.map((image): AiContentBlock => ({
      type: 'image',
      source: { type: 'base64', media_type: image.mediaType, data: image.data.toString('base64') },
    })),
    ...(input.text ? [{ type: 'text' as const, text: input.text }] : []),
  ];
  const answer = await callStructured({
    system: NOTE_READING_INSTRUCTIONS,
    content,
    schema: NOTE_OUTPUT_SCHEMA,
    maxTokens: NOTE_MAX_OUTPUT_TOKENS,
    model,
  });
  const cost = answer.usage ? (costMillicents(model, answer.usage) ?? wanted) : 0;

  if (!answer.ok) {
    await settleAiBudget({ usageId: reservation.usageId, costMillicents: cost, outcome: 'failed' });
    // La cause seule, fixe : jamais le message du fournisseur ni la réponse (M100).
    await reportServerError('readBuyerNotes', new Error(`lecture des notes : ${answer.cause}`));
    return {
      ok: false,
      cause:
        answer.cause === 'unconfigured'
          ? 'unconfigured'
          : answer.cause === 'refused'
            ? 'refused'
            : answer.cause === 'unavailable'
              ? 'unavailable'
              : 'unreadable',
    };
  }

  const proposal = await finish(answer.json);
  await settleAiBudget({
    usageId: reservation.usageId,
    costMillicents: cost,
    outcome: 'pending',
    fieldsProposed: proposedFieldNames(proposal),
    personalMentionsSkipped: proposal.personalMentionsSkipped,
  });
  return { ok: true, proposal, usageId: reservation.usageId };
}
