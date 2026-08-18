'use server';

// Actions factices de l'aperçu design du shell applicatif : elles n'écrivent
// RIEN et répondent toujours par un refus explicite. Uniquement référencées par
// /design-preview/app (gardé hors production) — jamais par l'application réelle.

import type { ComparableImportResult } from '@/features/comparable-import/types';
import type { CreateComparableState } from '@/features/comparables/actions/create-comparable-state';
import type {
  CompetitorSearchResult,
  SearchResultsHtmlImport,
} from '@/features/competitor-search/types';
import type { DeletePositioningResult } from '@/features/price-positioning/actions/delete-price-positioning';
import type { SavePositioningResult } from '@/features/price-positioning/actions/save-price-positioning';
import type { SaveCondominiumResult } from '@/features/subject-property-condominium/actions/save-subject-property-condominium';
import type { SaveDiagnosticsResult } from '@/features/subject-property-diagnostics/actions/save-subject-property-diagnostics';
import type { SaveSubjectPropertyResult } from '@/features/subject-property/actions/save-subject-property';

const REFUSAL = 'Aperçu design : aucune donnée n’est enregistrée ici.';

export async function previewSaveProperty(): Promise<SaveSubjectPropertyResult> {
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

export async function previewSearchCompetitors(): Promise<CompetitorSearchResult> {
  return { ok: false, error: REFUSAL };
}

export async function previewImportSearchResults(): Promise<SearchResultsHtmlImport> {
  return { ok: false, error: REFUSAL };
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
