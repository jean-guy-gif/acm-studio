// Reading-order reconstruction of one PDF page's text, from positioned glyphs.
// PURE and environment-agnostic — no `server-only`, no browser API — so the SAME
// function runs where the PDF is read (the advisor's browser, Mission 43) and in
// the tests that pin the committed .txt fixtures. Moving the text source from the
// server to the browser must not change a single character it produces.

// A minimal, testable view of a pdfjs text item (position + width + string).
export type PdfTextItem = { str: string; x: number; y: number; width: number };

// Two glyphs on the same visual line whose horizontal gap exceeds this (PDF
// user-space units) belong to DIFFERENT cells — the agency sheet is laid out in two
// columns, and splitting on the gap keeps each "Libellé : valeur" on its own line
// instead of merging the left and right columns.
const COLUMN_GAP = 10;
// Glyphs within this vertical distance share a line.
const LINE_TOLERANCE = 3;

// Rebuilds one page's text: cluster into lines by Y (top→bottom), order each line by
// X (left→right), and split a line wherever a wide horizontal gap marks a column
// boundary. Deterministic — same input, same output.
export function reconstructPageText(items: PdfTextItem[]): string {
  const glyphs = items.filter((it) => it.str != null && it.str.trim() !== '');
  const lines: { y: number; cells: PdfTextItem[] }[] = [];
  for (const glyph of glyphs) {
    let line = lines.find((l) => Math.abs(l.y - glyph.y) <= LINE_TOLERANCE);
    if (!line) {
      line = { y: glyph.y, cells: [] };
      lines.push(line);
    }
    line.cells.push(glyph);
  }
  lines.sort((a, b) => b.y - a.y);

  const out: string[] = [];
  for (const line of lines) {
    line.cells.sort((a, b) => a.x - b.x);
    let segment = '';
    let previousEnd: number | null = null;
    const flush = () => {
      const text = segment.replace(/\s+/g, ' ').trim();
      if (text) {
        out.push(text);
      }
      segment = '';
    };
    for (const cell of line.cells) {
      if (previousEnd != null && cell.x - previousEnd > COLUMN_GAP) {
        flush();
      }
      segment += (segment ? ' ' : '') + cell.str;
      previousEnd = cell.x + cell.width;
    }
    flush();
  }
  return out.join('\n');
}
