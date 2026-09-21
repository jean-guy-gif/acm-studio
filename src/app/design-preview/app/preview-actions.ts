'use server';

// Actions factices de l'aperçu design du shell applicatif : elles n'écrivent
// RIEN et répondent toujours par un refus explicite. Uniquement référencées par
// /design-preview/app (gardé hors production) — jamais par l'application réelle.

import type { EnrichCandidateResult } from '@/features/competitor-search/actions/enrich-candidate';
import type { BulkComparableResult } from '@/features/comparables/actions/bulk-comparable-actions';
import type { ImportAndCreateResult } from '@/features/competitor-search/actions/import-and-create-competitor';
import type { PrepareSearchResult } from '@/features/competitor-search/actions/prepare-competitor-search';
import type { RankSearchResult } from '@/features/competitor-search/actions/rank-competitor-candidates';
import type { ComparableImportResult } from '@/features/comparable-import/types';
import type { CreateComparableState } from '@/features/comparables/actions/create-comparable-state';
import type {
  RecordDecisionResult,
  SearchResultsHtmlImport,
} from '@/features/competitor-search/types';
import type { DeletePositioningResult } from '@/features/price-positioning/actions/delete-price-positioning';
import type { SavePositioningResult } from '@/features/price-positioning/actions/save-price-positioning';
import type { SaveCondominiumResult } from '@/features/subject-property-condominium/actions/save-subject-property-condominium';
import type { SaveDiagnosticsResult } from '@/features/subject-property-diagnostics/actions/save-subject-property-diagnostics';
import type { SaveSubjectPropertyResult } from '@/features/subject-property/actions/save-subject-property';
import type { UpdatePropertyPhotosResult } from '@/features/subject-property-photos/actions/update-property-photos';
import type { UploadPropertyPhotosResult } from '@/features/subject-property-photos/actions/upload-property-photos';

const REFUSAL = 'Aperçu design : aucune donnée n’est enregistrée ici.';

export async function previewSaveProperty(): Promise<SaveSubjectPropertyResult> {
  return { ok: false, error: REFUSAL };
}

export async function previewUploadPropertyPhotos(): Promise<UploadPropertyPhotosResult> {
  return { ok: false, error: REFUSAL };
}

export async function previewUpdatePropertyPhotos(): Promise<UpdatePropertyPhotosResult> {
  return { ok: false, error: REFUSAL };
}

export async function previewSaveDiagnostics(): Promise<SaveDiagnosticsResult> {
  return { ok: false, error: REFUSAL };
}

export async function previewSaveCondominium(): Promise<SaveCondominiumResult> {
  return { ok: false, error: REFUSAL };
}

export async function previewCreateComparable(
  state: CreateComparableState,
): Promise<CreateComparableState> {
  return { ...state, error: REFUSAL, fieldErrors: {}, values: null };
}

export async function previewImport(): Promise<ComparableImportResult> {
  return { ok: false, error: REFUSAL };
}

export async function previewPrepareSearch(): Promise<PrepareSearchResult> {
  return { ok: false, error: REFUSAL };
}

export async function previewRankCandidates(): Promise<RankSearchResult> {
  return { ok: false, error: REFUSAL };
}

export async function previewImportAndCreate(): Promise<ImportAndCreateResult> {
  return { ok: false, error: REFUSAL };
}

export async function previewBulkComparables(): Promise<BulkComparableResult> {
  return { ok: false, error: REFUSAL };
}

export async function previewRecordDecisions(): Promise<RecordDecisionResult> {
  return { ok: false, error: REFUSAL };
}

export async function previewImportSearchResults(): Promise<SearchResultsHtmlImport> {
  return { ok: false, error: REFUSAL };
}

export async function previewRecordDecision(): Promise<RecordDecisionResult> {
  return { ok: false, error: REFUSAL };
}

export async function previewEnrichCandidate(url: string): Promise<EnrichCandidateResult> {
  return { ok: false, url, error: REFUSAL };
}

export async function previewSavePositioning(): Promise<SavePositioningResult> {
  return { ok: false, error: REFUSAL };
}

export async function previewDeletePositioning(): Promise<DeletePositioningResult> {
  return { ok: false, error: REFUSAL };
}

export async function previewVoid(): Promise<void> {
  // no-op
}
