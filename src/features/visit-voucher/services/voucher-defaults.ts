// Mission 154 — ce que le bon de visite propose d'office : les biens de la tournée (toutes les
// visites demandées ou confirmées, pas encore faites, qui ont droit au bon), sous un même régime
// (Mission 153 : un bon ne réunit jamais un bien sous mandat et un bien hors mandat) — celui de la
// visite d'où l'on vient, sinon les biens sous mandat d'abord. Sans visite à venir, la seule qui a
// droit au bon. Tout reste modifiable. Pur.

export function initiallyChecked(
  visits: { visitId: string; eligible: boolean; outside: boolean; visited: boolean }[],
  preselected: string | null,
  // Mission 154 (point 3) — le bon de la tournée ouvert : tous les régimes ensemble.
  anyRegime = false,
): Set<string> {
  const eligible = visits.filter((visit) => visit.eligible);
  const from = eligible.find((visit) => visit.visitId === preselected) ?? null;
  const pending = eligible.filter((visit) => !visit.visited);
  const outside = from
    ? from.outside
    : pending.some((visit) => !visit.outside)
      ? false
      : pending.length > 0;
  const chosen = new Set(
    pending.filter((visit) => anyRegime || visit.outside === outside).map((visit) => visit.visitId),
  );
  if (from) chosen.add(from.visitId);
  if (chosen.size === 0) {
    const mandate = eligible.filter((visit) => !visit.outside);
    const only =
      mandate.length === 1
        ? mandate
        : mandate.length === 0 && eligible.length === 1
          ? eligible
          : [];
    for (const visit of only) chosen.add(visit.visitId);
  }
  return chosen;
}
