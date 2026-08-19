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

// Adresses http(s) se terminant par une extension d'image, éventuellement
// suivies de paramètres. Les guillemets, apostrophes, parenthèses et espaces
// bornent l'adresse.
const IMAGE_URL = new RegExp(
  // Schéma, puis « // » ou « \/\/ » (échappé), puis le chemin. Les barres
  // obliques inverses sont autorisées DANS le chemin — ce sont justement les
  // échappements JSON ; ce sont les guillemets et les espaces qui bornent
  // l'adresse.
  `https?:(?:\\\\?/){2}[^"'\`\\s<>()]+?\\.(?:${IMAGE_EXTENSIONS})(?:\\?[^"'\`\\s<>()]*)?`,
  'gi',
);

// Les blocs JSON échappent les barres obliques : « https:\/\/v.seloger.com\/… ».
// Terrain (19/08, SeLoger) : l'échappement qui FERME la chaîne pouvait rester
// collé à la fin de l'adresse (« …seal=abc\ ») et rendait la photo introuvable.
function cleanUrl(url: string): string {
  return url.replace(/\\+$/, '').replace(/\\\//g, '/').replace(/\\+$/, '');
}

// Retourne les adresses d'images trouvées dans le texte brut, dans l'ordre
// d'apparition et sans doublon exact. Le tri utile (photos de l'annonce vs
// habillage du site) est fait par l'appelant, qui connaît les hôtes de confiance.
export function extractEmbeddedImageUrls(html: string): string[] {
  const seen = new Set<string>();
  const urls: string[] = [];

  for (const match of html.matchAll(IMAGE_URL)) {
    const url = cleanUrl(match[0]);
    if (!seen.has(url)) {
      seen.add(url);
      urls.push(url);
    }
  }

  return urls;
}
