import { BUYER_FORM_FIELDS } from '@/features/buyers/schemas/buyer-input';

// Mission 151 — les champs « À vérifier » d'une fiche née d'une lecture (M97), relus par liste
// d'autorisation : des noms de champs de la fiche, jamais une valeur ; un nom hors liste n'est ni
// écrit ni compté.
const ALLOWED = new Set<string>([
  ...BUYER_FORM_FIELDS,
  'financing',
  'soft_criteria',
  // Lot B — comment il finance, lu dans les notes.
  'financing_mode',
]);

export function sanitizeBuyerFieldsToVerify(names: readonly unknown[]): string[] {
  return [
    ...new Set(
      names.filter((name): name is string => typeof name === 'string' && ALLOWED.has(name)),
    ),
  ].slice(0, 60);
}

// M97 — un champ que le conseiller modifie perd sa pastille. Les noms des champs de la fiche sont
// ceux de ses colonnes : on compare la ligne d'avant et ce qui s'écrit.
export function fieldsStillToVerify(
  toVerify: readonly string[],
  before: Record<string, unknown>,
  written: Record<string, unknown>,
): string[] {
  // La base rend une surface en texte (« 65.00 ») : deux nombres égaux sont la même valeur.
  const asNumber = (value: unknown) =>
    typeof value === 'number' || (typeof value === 'string' && value.trim() !== '')
      ? Number(value)
      : Number.NaN;
  const same = (a: unknown, b: unknown) =>
    (Number.isFinite(asNumber(a)) && asNumber(a) === asNumber(b)) ||
    JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  return toVerify.filter((name) => !(name in written) || same(before[name], written[name]));
}
