// Mission 127 B — le « jour » d'un point marché est celui de Paris, partout (le Suivi, l'écriture
// du point, la recherche des nouveaux venus) : un point du jour se réécrit, une recherche par
// point. Pur.
export function parisDay(value: string | Date): string {
  return (typeof value === 'string' ? new Date(value) : value).toLocaleDateString('fr-FR', {
    timeZone: 'Europe/Paris',
  });
}

export function isPointOfDay(madeAt: string, now: Date = new Date()): boolean {
  return parisDay(madeAt) === parisDay(now);
}
