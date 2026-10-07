// Photos de galerie encastrées dans le code de la page, hors balises <img>.
//
// Terrain (19/08, SeLoger) : en collant le code d'une annonce, seule la photo de
// couverture remontait. Les portails modernes n'écrivent qu'elle en HTML ; le
// reste de la galerie vit dans un bloc de données JavaScript que le navigateur
// transforme en images APRÈS coup. Le lecteur de balises ne pouvait donc pas les
// voir.
//
// Ce module lit ces adresses telles qu'elles apparaissent dans le texte de la
// page, y compris échappées à la mode JSON (« https:\/\/… »). Il ne fait aucune
// requête et n'exécute évidemment rien.

const IMAGE_EXTENSIONS = 'jpe?g|png|webp|avif';

// Une adresse http(s) ENTIÈRE, telle qu'elle est écrite dans la page.
//
// Mission 76 — l'adresse ne se coupe plus à son extension. Mesuré le 07/10/2026 sur
// Bien'ici : « …52960884b.jpg_DATEMAJ_02_10_2026-15_21_57 ». L'ancien motif
// s'arrêtait à « .jpg » : 18 adresses sur 19 n'existaient pas (404). On lit donc
// jusqu'à ce qui BORNE vraiment l'adresse dans la page :
//   - guillemets, apostrophes, accents graves, espaces, chevrons, parenthèses ;
//   - les mêmes guillemets écrits en entités (« &quot; », « &#39; »…) ;
//   - le début de l'adresse suivante d'une liste sans espace (« a.jpg,https://… ») ;
//   - une barre oblique inverse qui n'est pas un échappement d'adresse : seuls
//     « \/ », « \\ » et « & » (l'esperluette en JSON) font partie de l'adresse.
const URL_TOKEN = new RegExp(
  String.raw`https?:(?:\\?/){2}(?:(?!&quot;|&apos;|&#0*(?:34|39);|&#x0*(?:22|27);|&[lg]t;|,https?:|\\(?![/\\]|u0026))[^"'` +
    '`' +
    String.raw`\s<>()])+`,
  'gi',
);

// L'extension d'image se cherche dans le CHEMIN, où qu'elle soit, pourvu qu'elle ne
// soit pas le début d'un mot plus long (« .jpg_DATEMAJ », « .jpg/800 » : oui ;
// « .jpgx » : non). C'est elle qui dit « image », plus elle qui borne l'adresse.
const IMAGE_PATH = new RegExp(String.raw`\.(?:${IMAGE_EXTENSIONS})(?![a-z0-9])`, 'i');

// Paramètres de VIGNETTE connus, par hébergeur : ceux-là seulement sont retirés,
// parce qu'on a mesuré que l'adresse sans eux rend la photo en pleine taille. Tout
// autre paramètre est gardé tel quel — chez SeLoger, la signature (« ci_seal ») en
// fait partie et l'image n'existe pas sans elle.
//   file.bienici.com — « ?width=600&height=370&fit=cover » (mesuré le 07/10/2026).
const THUMBNAIL_PARAMS: Record<string, readonly string[]> = {
  'file.bienici.com': ['width', 'height', 'fit'],
};

function stripThumbnailParams(url: string): string {
  const queryStart = url.indexOf('?');
  if (queryStart === -1) {
    return url;
  }
  let host: string;
  try {
    host = new URL(url).hostname.toLowerCase();
  } catch {
    return url;
  }
  const known = THUMBNAIL_PARAMS[host];
  if (!known) {
    return url;
  }
  const kept = url
    .slice(queryStart + 1)
    .split('&')
    .filter((pair) => pair !== '' && !known.includes(pair.split('=')[0].toLowerCase()));
  return kept.length > 0
    ? `${url.slice(0, queryStart)}?${kept.join('&')}`
    : url.slice(0, queryStart);
}

// Les blocs JSON échappent les barres obliques : « https:\/\/v.seloger.com\/… »,
// et parfois l'esperluette (« & ») ; le HTML l'écrit « &amp; ».
// Terrain (19/08, SeLoger) : l'échappement qui FERME la chaîne pouvait rester
// collé à la fin de l'adresse (« …seal=abc\ ») et rendait la photo introuvable.
function cleanUrl(url: string): string {
  return url
    .replace(/\\u0026/gi, '&')
    .replace(/\\+\//g, '/')
    .replace(/&amp;/gi, '&')
    .replace(/[\\,;.]+$/, '');
}

function isImageUrl(url: string): boolean {
  const queryStart = url.indexOf('?');
  return IMAGE_PATH.test(queryStart === -1 ? url : url.slice(0, queryStart));
}

// Retourne les adresses d'images trouvées dans le texte brut, dans l'ordre
// d'apparition et sans doublon exact. Le tri utile (photos de l'annonce vs
// habillage du site) est fait par l'appelant, qui connaît les hôtes de confiance.
export function extractEmbeddedImageUrls(html: string): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const match of html.matchAll(URL_TOKEN)) {
    const cleaned = cleanUrl(match[0]);
    if (!isImageUrl(cleaned)) {
      continue;
    }
    const url = stripThumbnailParams(cleaned);
    if (!seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  }

  return urls;
}
