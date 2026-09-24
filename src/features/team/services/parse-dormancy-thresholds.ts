import type { DormancyThresholds } from '@/features/team/services/build-manager-overview';

// Mission 59 (seuils) — le seul contrôle : au moins 1 jour, un entier. Rien d'autre : un manager
// qui met 90 jours sait ce qu'il fait. Pur, déterministe, testable.
export type DormancyThresholdsResult =
  { ok: true; value: DormancyThresholds } | { ok: false; error: string };

function parseDay(raw: FormDataEntryValue | null): number | null {
  const value = Number(String(raw ?? '').trim());
  if (!Number.isInteger(value) || value < 1) {
    return null;
  }
  return value;
}

export function parseDormancyThresholds(formData: FormData): DormancyThresholdsResult {
  const preparationDays = parseDay(formData.get('preparationDays'));
  const followUpDays = parseDay(formData.get('followUpDays'));
  if (preparationDays == null || followUpDays == null) {
    return { ok: false, error: 'Chaque seuil doit être un nombre de jours entier, au moins 1.' };
  }
  return { ok: true, value: { preparationDays, followUpDays } };
}
