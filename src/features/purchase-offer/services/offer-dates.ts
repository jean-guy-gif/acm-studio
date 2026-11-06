// Mission 137 (partie B) — AAAA-MM-JJ → JJ/MM/AAAA ; sans zod, l'écran le lit (M128 B). Pur.
export function frenchDay(iso: string): string {
  const [year, month, date] = iso.split('-');
  return `${date}/${month}/${year}`;
}
