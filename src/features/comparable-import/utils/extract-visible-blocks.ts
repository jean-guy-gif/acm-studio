// Découpe des blocs de la page à partir de leurs attributs.
//
// Terrain (19/08) : sur les cinq portails testés, la liste des caractéristiques
// de l'annonce n'était JAMAIS lue — `listingFeatures` sortait vide partout — et
// la description ne venait que de la balise `meta`, tronquée. Les deux vivent
// pourtant dans la page, dans des blocs identifiables par leur classe
// (`description-text`, `caracteristiques`, `annonceSpecsList`…).
//
// On lit du texte : pas de moteur de rendu, pas d'exécution, pas de requête.

// Le fragment le plus long que l'on accepte de traiter, pour ne pas partir dans
// un conteneur qui envelopperait toute la page.
const MAX_FRAGMENT = 80_000;

// Trouve la fin d'un élément en comptant les ouvertures et fermetures de MÊME
// nom. Retourne l'indice juste après la balise fermante, ou null si l'élément
// n'est jamais refermé (page tronquée).
function findElementEnd(html: string, tagName: string, afterOpenTag: number): number | null {
  const scanner = new RegExp(`<(/?)${tagName}\\b[^>]*?(/?)>`, 'gi');
  scanner.lastIndex = afterOpenTag;
  let depth = 1;
  let match: RegExpExecArray | null;
  while ((match = scanner.exec(html)) !== null) {
    if (match.index - afterOpenTag > MAX_FRAGMENT) {
      return null;
    }
    const closing = match[1] === '/';
    const selfClosing = match[2] === '/';
    if (closing) {
      depth -= 1;
      if (depth === 0) {
        return match.index;
      }
    } else if (!selfClosing) {
      depth += 1;
    }
  }
  return null;
}

// Contenu intérieur des éléments dont un attribut contient l'un des mots-clés.
// Les blocs sont rendus dans l'ordre du document, sans doublon exact.
export function collectBlocksByAttribute(html: string, keywords: RegExp): string[] {
  const openTag = /<(div|section|article|aside|ul|ol|dl|p|table)\b([^>]*)>/gi;
  const blocks: string[] = [];
  const seen = new Set<string>();
  let match: RegExpExecArray | null;

  while ((match = openTag.exec(html)) !== null) {
    const [whole, tagName, attributes] = match;
    if (whole.endsWith('/>') || !keywords.test(attributes)) {
      continue;
    }
    const start = match.index + whole.length;
    const end = findElementEnd(html, tagName, start);
    if (end == null || end <= start) {
      continue;
    }
    const fragment = html.slice(start, end);
    if (!seen.has(fragment)) {
      seen.add(fragment);
      blocks.push(fragment);
    }
  }

  return blocks;
}
