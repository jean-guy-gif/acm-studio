// State shared between the createComparable server action and its form. Kept in
// a plain module because a 'use server' file may only export async functions.
export type CreateComparableState = {
  error: string | null;
  fieldErrors: Record<string, string>;
  // Raw submitted values, echoed back so the form repopulates on error.
  values: Record<string, string> | null;
  // Opaque import generation token, echoed so a later re-import can supersede
  // this echo (see the panel). Never interpreted server-side.
  importGen: string | null;
  // Mission 108 — l'annonce avait déjà sa fiche dans le dossier : jamais avalé en silence.
  duplicate?: { id: string; selected: boolean } | null;
};

export const initialCreateComparableState: CreateComparableState = {
  error: null,
  fieldErrors: {},
  values: null,
  importGen: null,
};
