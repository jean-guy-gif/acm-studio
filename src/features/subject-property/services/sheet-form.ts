// MISSION 77 — la fiche du bien vendeur s'enregistre en une fois : bien, diagnostics et
// copropriété voyagent dans UN formulaire. Les champs du bien gardent leur nom ; ceux des deux
// autres parties portent un préfixe. Une partie que le conseiller n'a pas touchée n'est pas
// envoyée, donc pas écrite : aucune ligne vide ne naît d'un simple enregistrement.

export type SheetEntries = [name: string, value: string][];

// Ce que chaque partie de la fiche expose à la barre d'enregistrement : ses valeurs courantes.
export type SheetSectionHandle = { entries: () => SheetEntries };

export type SheetParts = {
  property: SheetEntries;
  diagnostics: SheetEntries | null;
  condominium: SheetEntries | null;
};

const DIAGNOSTICS_PREFIX = 'diagnostics.';
const CONDOMINIUM_PREFIX = 'condominium.';

export function buildSheetForm(parts: SheetParts): FormData {
  const formData = new FormData();
  for (const [name, value] of parts.property) {
    formData.append(name, value);
  }
  for (const [name, value] of parts.diagnostics ?? []) {
    formData.append(`${DIAGNOSTICS_PREFIX}${name}`, value);
  }
  for (const [name, value] of parts.condominium ?? []) {
    formData.append(`${CONDOMINIUM_PREFIX}${name}`, value);
  }
  return formData;
}

export type SplitSheetForm = {
  property: FormData;
  diagnostics: FormData | null;
  condominium: FormData | null;
};

export function splitSheetForm(formData: FormData): SplitSheetForm {
  const property = new FormData();
  const diagnostics = new FormData();
  const condominium = new FormData();
  let hasDiagnostics = false;
  let hasCondominium = false;
  for (const [name, value] of formData.entries()) {
    if (name.startsWith(DIAGNOSTICS_PREFIX)) {
      diagnostics.append(name.slice(DIAGNOSTICS_PREFIX.length), value);
      hasDiagnostics = true;
    } else if (name.startsWith(CONDOMINIUM_PREFIX)) {
      condominium.append(name.slice(CONDOMINIUM_PREFIX.length), value);
      hasCondominium = true;
    } else {
      property.append(name, value);
    }
  }
  return {
    property,
    diagnostics: hasDiagnostics ? diagnostics : null,
    condominium: hasCondominium ? condominium : null,
  };
}

export type SheetFieldErrors = {
  property: Record<string, string>;
  diagnostics: Record<string, string>;
  condominium: Record<string, string>;
};

export const NO_SHEET_ERRORS: SheetFieldErrors = {
  property: {},
  diagnostics: {},
  condominium: {},
};

export function countSheetErrors(errors: SheetFieldErrors): number {
  return (
    Object.keys(errors.property).length +
    Object.keys(errors.diagnostics).length +
    Object.keys(errors.condominium).length
  );
}
