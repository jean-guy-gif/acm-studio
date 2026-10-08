// MISSION 80 — LE DPE SE COMPARE. Tout ce que l'outil sait dire d'une classe DPE vit ici : la
// liste, l'écart entre deux classes, le décompte des concurrents, le repère du marché et ce que
// l'écran du Live en dit. Aucun montant, aucun prix : l'outil ne produit aucune estimation.

export const DPE_CLASSES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
export type DpeClass = (typeof DPE_CLASSES)[number];

// La classe telle que la liste l'écrit (« d » → « D »), ou null : une valeur hors liste n'est
// jamais une classe (vide plutôt que faux).
export function dpeClass(value: string | null | undefined): DpeClass | null {
  const letter = value?.trim().toUpperCase();
  return (DPE_CLASSES as readonly string[]).includes(letter ?? '') ? (letter as DpeClass) : null;
}

// Couleurs de l'étiquette officielle, de A (vert) à G (rouge). Sémantiques : la charte de
// l'agence n'y touche pas (M55).
export const DPE_COLORS: Record<DpeClass, { background: string; text: string }> = {
  A: { background: '#00a06d', text: '#ffffff' },
  B: { background: '#51b74b', text: '#ffffff' },
  C: { background: '#a5cc74', text: '#18181b' },
  D: { background: '#f4e70f', text: '#18181b' },
  E: { background: '#f0b50f', text: '#18181b' },
  F: { background: '#eb8235', text: '#ffffff' },
  G: { background: '#d7221f', text: '#ffffff' },
};

// Nombre de classes entre deux lettres : > 0 quand `value` est MOINS bonne que `reference`.
export function dpeGap(value: DpeClass, reference: DpeClass): number {
  return DPE_CLASSES.indexOf(value) - DPE_CLASSES.indexOf(reference);
}

const COUNT_WORDS = ['', 'une', 'deux', 'trois', 'quatre', 'cinq', 'six'];

// Ce que la carte dit du DPE d'un concurrent : « DPE D, comme le vôtre », « DPE F, deux classes
// de moins », « DPE B, une classe de mieux » ; « DPE D » seul tant que le bien vendeur n'a pas de
// classe.
export function dpeGapLabel(value: DpeClass, subject: DpeClass | null): string {
  if (subject == null) return `DPE ${value}`;
  const gap = dpeGap(value, subject);
  if (gap === 0) return `DPE ${value}, comme le vôtre`;
  const count = Math.abs(gap);
  return `DPE ${value}, ${COUNT_WORDS[count]} classe${count > 1 ? 's' : ''} ${gap > 0 ? 'de moins' : 'de mieux'}`;
}

// % de correspondance : le DPE sur 10 points — même classe 10, une classe d'écart 5, au-delà 0.
// null dès qu'une des deux classes est inconnue : le critère sort du calcul (M71).
export const DPE_MATCH_POINTS = 10;

export function dpeMatchPoints(value: DpeClass | null, subject: DpeClass | null): number | null {
  if (value == null || subject == null) return null;
  const gap = Math.abs(dpeGap(value, subject));
  return gap === 0 ? DPE_MATCH_POINTS : gap === 1 ? DPE_MATCH_POINTS / 2 : 0;
}

export type DpeCount = {
  // Les classes rencontrées, de A à G, avec leur nombre de concurrents.
  classes: { letter: DpeClass; count: number }[];
  unknown: number;
};

export function countDpe(values: readonly (string | null | undefined)[]): DpeCount {
  const letters = values.map(dpeClass);
  return {
    classes: DPE_CLASSES.map((letter) => ({
      letter,
      count: letters.filter((value) => value === letter).length,
    })).filter((entry) => entry.count > 0),
    unknown: letters.filter((value) => value == null).length,
  };
}

// « 2 C, 4 D, 1 E, 3 non indiqués » — null sans aucun concurrent.
export function dpeCountLabel(count: DpeCount): string | null {
  const parts = count.classes.map((entry) => `${entry.count} ${entry.letter}`);
  if (count.unknown > 0) {
    parts.push(`${count.unknown} non indiqué${count.unknown > 1 ? 's' : ''}`);
  }
  return parts.length > 0 ? parts.join(', ') : null;
}

// LE REPÈRE : la lettre médiane des concurrents qui en affichent une. Avec un nombre pair, la
// moins bonne des deux lettres du milieu : entre un C et un D, un vendeur en D n'est pas « moins
// bon que la plupart ». null quand aucun concurrent n'affiche de classe.
export function dpeMedian(values: readonly (string | null | undefined)[]): DpeClass | null {
  const letters = values
    .map(dpeClass)
    .filter((value): value is DpeClass => value != null)
    .sort((a, b) => DPE_CLASSES.indexOf(a) - DPE_CLASSES.indexOf(b));
  return letters.length > 0 ? letters[Math.floor(letters.length / 2)] : null;
}

export type DpeMarketVerdict = 'better' | 'equal' | 'worse' | 'unknown';

export type DpeMarket = {
  reference: DpeClass;
  subject: DpeClass | null;
  verdict: DpeMarketVerdict;
  message: string;
};

// L'écran « Le DPE face au marché » du Live. null quand aucun concurrent n'affiche de classe :
// l'écran n'apparaît pas. Jamais de montant : on parle de stratégie de prix, on n'en chiffre rien.
export function dpeMarket(
  subjectValue: string | null | undefined,
  competitorValues: readonly (string | null | undefined)[],
): DpeMarket | null {
  const reference = dpeMedian(competitorValues);
  if (reference == null) return null;
  const subject = dpeClass(subjectValue);
  if (subject == null) {
    const target = reference === 'A' ? 'en A' : `en ${reference} ou mieux`;
    return {
      reference,
      subject,
      verdict: 'unknown',
      message: `Vos concurrents affichent surtout ${reference}. Après le passage du diagnostiqueur, votre bien devra être ${target} pour rester dans la course ; au-delà, il faudra peut-être ajuster la stratégie de prix.`,
    };
  }
  const gap = dpeGap(subject, reference);
  if (gap < 0) {
    return {
      reference,
      subject,
      verdict: 'better',
      message: 'Votre DPE est un atout face à vos concurrents.',
    };
  }
  if (gap === 0) {
    return {
      reference,
      subject,
      verdict: 'equal',
      message: 'Votre DPE est dans la moyenne de vos concurrents.',
    };
  }
  return {
    reference,
    subject,
    verdict: 'worse',
    message:
      'Votre DPE est moins bon que celui de la plupart de vos concurrents : les acheteurs compareront. À intégrer dans la stratégie de prix.',
  };
}
