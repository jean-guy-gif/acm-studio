// Description longue de l'annonce, encastrée dans les données de la page.
//
// Terrain (19/08, SeLoger) : la seule description que l'outil récupérait était
// celle de la balise `meta` — 148 caractères tronqués par « … ». La vraie
// description (1 037 caractères) vit dans un bloc de données JavaScript, avec
// les guillemets DOUBLEMENT échappés (`\\"description\\":\\"…\\"`), parce que le
// bloc est lui-même une chaîne JSON dans une chaîne JSON.
//
// Enjeu concret : c'est ce texte qui permet de cocher terrasse, véranda, garage
// ou parking. Sans lui, ces cases restaient vides sur toutes les annonces.
//
// Aucune requête, aucune exécution : on lit du texte.

// Décode les échappements JSON usuels, une ou deux couches.
function decodeJsonString(value: string): string {
  let text = value;
  // Deux passes : le bloc est souvent une chaîne dans une chaîne.
  for (let pass = 0; pass < 2; pass += 1) {
    text = text
      .replace(/\\r\\n|\\n|\\r/g, '\n')
      .replace(/\\t/g, ' ')
      .replace(/\\u([0-9a-fA-F]{4})/g, (_, code) => String.fromCharCode(Number.parseInt(code, 16)))
      .replace(/\\"/g, '"')
      .replace(/\\\//g, '/')
      .replace(/\\\\/g, '\\');
  }
  return text.replace(/[ \t]+\n/g, '\n').trim();
}

const KEYS = ['description', 'descriptif', 'longDescription', 'fullDescription'];

// Retourne la description encastrée la PLUS LONGUE, ou null. On prend la plus
// longue et non la première : la balise `meta` arrive en tête du document et
// n'est qu'un résumé tronqué.
export function extractEmbeddedDescription(html: string): string | null {
  let best: string | null = null;

  for (const key of KEYS) {
    // Guillemets simples (`"description":"…"`) puis doublement échappés
    // (`\"description\":\"…\"`).
    const patterns = [
      new RegExp(`"${key}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`, 'gi'),
      new RegExp(`\\\\"${key}\\\\"\\s*:\\s*\\\\"((?:[^"\\\\]|\\\\.)*?)\\\\"`, 'gi'),
    ];
    for (const pattern of patterns) {
      for (const match of html.matchAll(pattern)) {
        const decoded = decodeJsonString(match[1]);
        if (best == null || decoded.length > best.length) {
          best = decoded;
        }
      }
    }
  }

  if (best == null || best.trim() === '') {
    return null;
  }
  return best;
}
