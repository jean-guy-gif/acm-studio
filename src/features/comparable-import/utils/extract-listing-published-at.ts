// Date de première mise en ligne de l'annonce, lue dans l'annonce elle-même.
//
// Terrain (19/08, SeLoger) : on cherchait le délai de commercialisation chez des
// tiers (Castorus, L'Acquéreur) alors que le portail le publie lui-même. La page
// d'une annonce Antibes contenait, en clair :
//
//   {"type":"datePosted","content":"2026-04-10T07:32:00.000Z"}   (schema.org)
//   "creationDate":"2026-04-10T07:32:00Z"                        (données SeLoger)
//
// Soit 131 jours de commercialisation au 19/08. Aucun compte, aucun tiers,
// aucune manipulation supplémentaire pour le conseiller : le raccourci
// navigateur capture déjà cette page.
//
// Ce module lit du texte. Aucune requête, aucune exécution.

// Clés de PREMIÈRE publication uniquement. `updateDate` / `modifiedAt` en sont
// volontairement absentes : une annonce modifiée n'est pas une annonce republiée,
// et les confondre gonflerait ou raboterait le délai affiché au vendeur.
const PUBLICATION_KEYS = [
  'datePosted',
  'datePublished',
  'dateCreated',
  'creationDate',
  'publicationDate',
  'firstPublicationDate',
  'publishedAt',
  'createdAt',
  'newPropertyDate',
  'dateMiseEnLigne',
];

// Bornes de vraisemblance. Une date future ou vieille de plus de dix ans est un
// artefact (horloge, gabarit, date de construction) — on préfère ne rien dire.
const MAX_AGE_DAYS = 3650;
const MAX_FUTURE_SKEW_DAYS = 2;

// Les blocs de données sont souvent des chaînes JSON dans des chaînes JSON :
// les guillemets y arrivent échappés une ou deux fois. On aplatit avant de lire.
function unescapeQuotes(html: string): string {
  return html.replace(/\\+"/g, '"');
}

const ISO_DATE =
  /^\d{4}-\d{2}-\d{2}(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

function parseIsoDate(value: string, nowMs: number): number | null {
  const trimmed = value.trim();
  if (!ISO_DATE.test(trimmed)) {
    return null;
  }
  const time = new Date(trimmed).getTime();
  if (Number.isNaN(time)) {
    return null;
  }
  if (time > nowMs + MAX_FUTURE_SKEW_DAYS * 86_400_000) {
    return null;
  }
  if (time < nowMs - MAX_AGE_DAYS * 86_400_000) {
    return null;
  }
  return time;
}

// Second recours : les pages construites avec Nuxt (Le Figaro) ne publient pas
// la date en clair. Leur bloc `__NUXT_DATA__` est un tableau « aplati » où les
// valeurs sont remplacées par leur INDICE : `"creationDate":1020` signifie « la
// valeur est à la case 1020 ». Il suffit donc de déréférencer.
//
// Terrain (19/08, Le Figaro) : une page d'agence contient 31 annonces, donc 31
// dates. Impossible de savoir laquelle est « la bonne » — on ne devine pas. On
// n'accepte donc la date que si la page n'en contient QU'UNE : c'est le cas
// d'une page d'annonce, et le cas d'une liste est écarté au lieu d'être bâclé.
function fromFlatPayload(html: string, nowMs: number): number | null {
  const block = /<script[^>]*id="__NUXT_DATA__"[^>]*>([\s\S]*?)<\/script>/i.exec(html);
  if (!block) {
    return null;
  }

  let payload: unknown;
  try {
    payload = JSON.parse(block[1]);
  } catch {
    return null;
  }
  if (!Array.isArray(payload)) {
    return null;
  }

  // `firstPublicationDate` d'abord : sur les portails qui distinguent les deux,
  // c'est la mise en ligne ; `creationDate` peut précéder la publication.
  for (const key of ['firstPublicationDate', 'creationDate']) {
    const found = new Set<number>();
    for (const node of payload) {
      if (node == null || typeof node !== 'object' || Array.isArray(node)) {
        continue;
      }
      const index = (node as Record<string, unknown>)[key];
      if (typeof index !== 'number' || !Number.isInteger(index)) {
        continue;
      }
      const value = payload[index];
      if (typeof value !== 'string') {
        continue;
      }
      const time = parseIsoDate(value, nowMs);
      if (time != null) {
        found.add(time);
      }
    }
    if (found.size === 1) {
      return [...found][0];
    }
  }

  return null;
}

// Retourne la date de publication la PLUS ANCIENNE trouvée, au format ISO, ou
// null. La plus ancienne et non la première rencontrée : une même page peut
// dater le bien, l'agence et l'annonce, et c'est l'annonce qui nous intéresse.
export function extractListingPublishedAt(html: string, now: Date = new Date()): string | null {
  if (html === '') {
    return null;
  }

  const nowMs = now.getTime();
  const flat = unescapeQuotes(html);
  let earliest: number | null = null;

  for (const key of PUBLICATION_KEYS) {
    // Forme usuelle : "datePosted":"2026-04-10T07:32:00.000Z"
    // Forme aplatie schema.org (SeLoger) : {"type":"datePosted","content":"…"}
    const patterns = [
      new RegExp(`"${key}"\\s*:\\s*"([^"]{4,40})"`, 'gi'),
      new RegExp(`"type"\\s*:\\s*"${key}"\\s*,\\s*"content"\\s*:\\s*"([^"]{4,40})"`, 'gi'),
    ];
    for (const pattern of patterns) {
      for (const match of flat.matchAll(pattern)) {
        const time = parseIsoDate(match[1], nowMs);
        if (time != null && (earliest == null || time < earliest)) {
          earliest = time;
        }
      }
    }
  }

  if (earliest == null) {
    earliest = fromFlatPayload(html, nowMs);
  }

  return earliest == null ? null : new Date(earliest).toISOString();
}

// Nombre de jours entre la mise en ligne et maintenant. Jamais négatif, jamais
// inventé : une date absente donne null, et le champ reste à remplir à la main.
export function daysOnMarketSince(
  publishedAtIso: string | null,
  now: Date = new Date(),
): number | null {
  if (publishedAtIso == null) {
    return null;
  }
  const from = new Date(publishedAtIso).getTime();
  if (Number.isNaN(from)) {
    return null;
  }
  return Math.max(0, Math.floor((now.getTime() - from) / 86_400_000));
}
