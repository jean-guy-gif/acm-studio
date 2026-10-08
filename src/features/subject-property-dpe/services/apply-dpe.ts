import { DPE_FIELDS, type DpeField, type DpeReading } from '@/features/subject-property-dpe/types';

// MISSION 79 — LE DPE PASSE EN DERNIER : saisie du conseiller > fiche PDF > annonce > DPE. Il ne
// remplit qu'un champ VIDE, jamais par-dessus une valeur déjà là, et jamais un champ que le
// conseiller a lui-même vidé (`touched`). Chaque champ rempli porte sa mention.
export function applyDpe<T extends Record<DpeField, string>>(
  values: T,
  reading: DpeReading,
  touched: ReadonlySet<string>,
): { values: T; mentions: Partial<Record<DpeField, string>> } {
  const filled: Partial<Record<DpeField, string>> = {};
  const mentions: Partial<Record<DpeField, string>> = {};
  for (const field of DPE_FIELDS) {
    const found = reading[field];
    if (found != null && values[field] === '' && !touched.has(field)) {
      filled[field] = found.value;
      mentions[field] = dpeMention(found.date);
    }
  }
  return { values: { ...values, ...filled }, mentions };
}

// « 2025-04-27 » → « d’après le DPE du 27/04/2025 ».
export function dpeMention(date: string): string {
  const [year, month, day] = date.split('-');
  return `d’après le DPE du ${day}/${month}/${year}`;
}
