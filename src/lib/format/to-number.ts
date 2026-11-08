// Une colonne `numeric` revient en texte de l'API (« 140.00 ») : convertie avant toute règle.
// Mission 145 — sortie de `get-property-buyers.ts` (réservé au serveur) pour les services purs.
export const toNumber = (value: unknown): number | null => {
  const parsed = typeof value === 'string' && value.trim() !== '' ? Number(value) : value;
  return typeof parsed === 'number' && Number.isFinite(parsed) ? parsed : null;
};
