// Mission 148 A — la frise des prix de la synthèse au vendeur (« L'analyse des prix », « Le chemin
// de votre prix ») : son échelle et la place de ses étiquettes. Pur.
//
// La règle :
//   • l'échelle va du plus petit au plus grand de TOUT ce qui est montré, prix et repères, et ses
//     deux bornes sont celles qu'on écrit sous la frise : aucun repère n'en sort ;
//   • deux repères au même montant n'ont qu'une étiquette (« Après le marché · Convenu ensemble ») ;
//   • rangées par montant, les étiquettes prennent la première place libre, au-dessus de la frise,
//     sinon au-dessous : centrée sur son repère, ou glissée de côté sans jamais le quitter (la boîte
//     couvre toujours le repère, que relie un trait) ; près d'un bord, elle se cale contre lui ;
//   • si l'une d'elles ne trouve pas de place, la frise porte des repères numérotés, et la légende
//     dessous dit chacun avec son montant : jamais deux textes l'un sur l'autre.
//
// La page est rendue au serveur : la largeur réelle de la frise n'y est pas connue. Le placement se
// décide donc pour une largeur de calcul (la plus étroite où cette mise en page s'affiche), avec des
// boîtes de largeur fixe, estimées large ; posées à leur repère moins un décalage fixe et calées par
// `clamp`, elles s'écartent quand la frise s'élargit et ne se touchent jamais au-delà
// (`labelBoxes` le vérifie à toute largeur).

export type BandMarker<Tone extends string = string> = {
  label: string;
  value: number;
  // Le montant tel qu'il sera écrit (« 129 000 € »), pour estimer la largeur de l'étiquette.
  amount: string;
  tone: Tone;
};

export type BandGroup<Tone extends string = string> = {
  labels: string[];
  value: number;
  amount: string;
  tone: Tone;
  // Place sur l'échelle, de 0 (borne basse) à 1 (borne haute).
  position: number;
  // Largeur de la boîte de l'étiquette, en px (mode « labels »), et la distance de son bord gauche
  // au repère (la moitié de la largeur quand elle est centrée).
  width: number;
  offset: number;
  lane: 'above' | 'below';
  // Mode « numbered » : le numéro (à partir de 1) et la rangée du rond (0 = au ras de la frise).
  number: number;
  row: number;
};

export type BandLayout<Tone extends string = string> = {
  low: number;
  high: number;
  dots: number[];
  mode: 'labels' | 'numbered';
  groups: BandGroup<Tone>[];
  rows: number;
};

// Le texte des étiquettes : libellé à 0,68 rem (≈ 10,9 px), montant en gras à 0,7 rem. Mesuré le
// 08/11 dans les sept polices de charte embarquées : au plus 6,0 px par caractère d'un libellé
// (Montserrat, Poppins), 6,3 px pour un montant ; on compte un peu plus, et la marge de la boîte
// couvre les mots courts (« Au début »).
const LABEL_CHAR_PX = 6.2;
const AMOUNT_CHAR_PX = 6.6;
const LABEL_PADDING_PX = 8;
// L'espace minimal entre deux étiquettes d'une même rangée, et entre deux ronds numérotés.
export const LABEL_GAP_PX = 6;
export const NUMBER_SIZE_PX = 20;
const NUMBER_GAP_PX = 4;

export function estimateLabelWidth(labels: readonly string[], amount: string): number {
  const text = labels.join(' · ');
  return Math.ceil(
    Math.max(text.length * LABEL_CHAR_PX, amount.length * AMOUNT_CHAR_PX) + LABEL_PADDING_PX,
  );
}

// La boîte d'une étiquette (ou d'un rond) à une largeur de frise donnée : son repère moins son
// décalage, calée contre un bord quand elle en sortirait — le `clamp` que pose l'écran.
export function boxLeft(
  position: number,
  offset: number,
  width: number,
  bandWidth: number,
): number {
  return Math.min(Math.max(0, position * bandWidth - offset), Math.max(0, bandWidth - width));
}

export function layoutBand<Tone extends string>(
  prices: readonly number[],
  markers: readonly BandMarker<Tone>[],
  bandWidth: number,
): BandLayout<Tone> {
  const values = [...prices, ...markers.map((marker) => marker.value)].filter(Number.isFinite);
  const low = values.length > 0 ? Math.min(...values) : 0;
  const high = values.length > 0 ? Math.max(...values) : 0;
  const at = (value: number) => (high > low ? (value - low) / (high - low) : 0.5);

  // Deux repères au même montant : une seule étiquette, leurs libellés dans l'ordre donné.
  const merged: { labels: string[]; value: number; amount: string; tone: Tone }[] = [];
  for (const marker of markers) {
    if (!Number.isFinite(marker.value)) continue;
    const same = merged.find((group) => group.value === marker.value);
    if (same) same.labels.push(marker.label);
    else
      merged.push({
        labels: [marker.label],
        value: marker.value,
        amount: marker.amount,
        tone: marker.tone,
      });
  }
  merged.sort((a, b) => a.value - b.value);

  // Le bord droit de la dernière étiquette posée sur chaque rangée : rangées par montant, les
  // étiquettes ne butent que sur celles de gauche.
  const lastRight: Record<'above' | 'below', number> = { above: -Infinity, below: -Infinity };
  let crowded = false;
  const groups: BandGroup<Tone>[] = merged.map((group, index) => {
    const position = at(group.value);
    const x = position * bandWidth;
    const width = estimateLabelWidth(group.labels, group.amount);
    const centered = boxLeft(position, width / 2, width, bandWidth);
    // La place la plus proche du centre, sur une rangée : à droite de sa voisine, sans quitter
    // le repère ni la frise.
    const place = (lane: 'above' | 'below'): number | null => {
      const left = Math.max(centered, lastRight[lane] + LABEL_GAP_PX);
      return left <= x && left + width <= bandWidth ? left : null;
    };
    const above = place('above');
    const below = above == null ? place('below') : null;
    const lane = above != null ? 'above' : below != null ? 'below' : null;
    const left = above ?? below ?? centered;
    if (lane) lastRight[lane] = left + width;
    else crowded = true;
    return {
      ...group,
      position,
      width,
      offset: x - left,
      lane: lane ?? 'above',
      number: index + 1,
      row: 0,
    };
  });

  let rows = 1;
  if (crowded) {
    // Les ronds numérotés : sur la rangée la plus basse où ils ne touchent pas un voisin.
    const placed: { left: number; row: number }[] = [];
    for (const group of groups) {
      const left = boxLeft(group.position, NUMBER_SIZE_PX / 2, NUMBER_SIZE_PX, bandWidth);
      let row = 0;
      while (
        placed.some(
          (other) =>
            other.row === row && Math.abs(other.left - left) < NUMBER_SIZE_PX + NUMBER_GAP_PX,
        )
      ) {
        row += 1;
      }
      placed.push({ left, row });
      group.row = row;
      rows = Math.max(rows, row + 1);
    }
  }

  return {
    low,
    high,
    dots: prices.filter(Number.isFinite).map(at),
    mode: crowded ? 'numbered' : 'labels',
    groups,
    rows,
  };
}

// Les boîtes posées à une largeur de frise donnée (pour les tests, et pour qui veut vérifier) :
// les étiquettes en mode « labels », les ronds en mode « numbered », chacune avec sa rangée.
export function labelBoxes(
  layout: BandLayout,
  bandWidth: number,
): { left: number; right: number; row: string }[] {
  return layout.groups.map((group) => {
    const labels = layout.mode === 'labels';
    const width = labels ? group.width : NUMBER_SIZE_PX;
    const left = boxLeft(
      group.position,
      labels ? group.offset : NUMBER_SIZE_PX / 2,
      width,
      bandWidth,
    );
    return {
      left,
      right: left + width,
      row: layout.mode === 'labels' ? group.lane : `row-${group.row}`,
    };
  });
}
