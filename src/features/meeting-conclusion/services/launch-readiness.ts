// Mission 85 — « Prêt à lancer : 7/10 → 10/10 ». La note que le vendeur s'est donnée après
// le prix de commercialisation : la première, puis la dernière si elle a changé. Pur et
// testable ; une note absente reste absente (M56) — null, et la carte ne dit rien.
export function launchReadinessLabel(first: number | null, last: number | null): string | null {
  const start = first ?? last;
  const end = last ?? first;
  if (start == null || end == null) {
    return null;
  }
  return start === end ? `${end}/10` : `${start}/10 → ${end}/10`;
}

// Mission 86 — la même note, en court, sur la ligne du Suivi : « 7 → 10/10 », ou « 10/10 ».
export function launchReadinessShort(first: number | null, last: number | null): string | null {
  const start = first ?? last;
  const end = last ?? first;
  if (start == null || end == null) {
    return null;
  }
  return start === end ? `${end}/10` : `${start} → ${end}/10`;
}
