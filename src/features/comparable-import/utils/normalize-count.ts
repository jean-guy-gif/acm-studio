const MAX_COUNT = 1000;

// Normalises a room/bedroom/bathroom count to a non-negative integer, or null.
// Decimal values (e.g. "3.5 pièces") are rejected.
export function normalizeCount(raw: unknown): number | null {
  if (typeof raw === 'number') {
    return Number.isInteger(raw) && raw >= 0 && raw <= MAX_COUNT ? raw : null;
  }
  if (typeof raw !== 'string') {
    return null;
  }
  const cleaned = raw.replace(/[\s ]/g, '');
  const match = cleaned.match(/^(\d+)([.,]\d+)?/);
  if (!match || match[2]) {
    return null;
  }
  const value = Number(match[1]);
  return Number.isInteger(value) && value >= 0 && value <= MAX_COUNT ? value : null;
}

// Mission 68 — un STUDIO est un 1 pièce, et les portails l'écrivent sans « 1 pièce » :
// « Studio », « T1 » ou « F1 ». À n'appeler QUE sur un libellé court de l'annonce (titre,
// étiquette « Pièces »), et seulement quand aucun « N pièces » n'y figure : sur une page
// entière, « studio indépendant » dans la description d'une maison ferait un faux 1 pièce.
export function studioRoomsCount(label: string | null | undefined): number | null {
  if (label == null) {
    return null;
  }
  return /\bstudio\b|\b[TF]1\b/i.test(label) ? 1 : null;
}
