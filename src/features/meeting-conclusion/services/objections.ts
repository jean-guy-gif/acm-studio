import {
  isObjection,
  OBJECTION_NOTE_MAX,
  OBJECTIONS,
  type Objection,
} from '@/features/meeting-conclusion/types';

// Mission 110 — les objections reçues de l'écran, relues : seules celles de la liste, sans
// doublon, dans l'ordre de la liste ; la ligne libre, d'une ligne et 200 caractères au plus.
export function readObjections(formData: FormData): {
  objections: Objection[];
  note: string | null;
} {
  const ticked = new Set(formData.getAll('objections').filter(isObjection));
  const raw = formData.get('objection_note');
  const note =
    typeof raw === 'string' ? raw.replace(/\s+/g, ' ').trim().slice(0, OBJECTION_NOTE_MAX) : '';
  return { objections: OBJECTIONS.filter((value) => ticked.has(value)), note: note || null };
}

// Relues en base : une valeur hors liste est ignorée.
export function parseObjections(value: unknown): Objection[] {
  return Array.isArray(value) ? OBJECTIONS.filter((item) => value.includes(item)) : [];
}
