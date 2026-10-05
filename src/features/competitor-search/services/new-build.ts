// LE NEUF (règle de Laurent, 05/10) : PAS DE NEUF, sauf en COMPLÉMENT quand il reste moins de 3
// concurrents admis dans l'ancien après le desserrage complet. Chaque bien neuf ajouté le dit.
//
// Le neuf se reconnaît à la STRUCTURE de l'annonce, jamais à sa description : « refait à neuf »
// n'est pas du neuf. Repères retenus, mesurés le 05/10 :
// - adresse de l'annonce : segment /programme/ (Bien'ici), /neuf/ (Green Acres, selogerneuf.com) ;
// - titre GÉNÉRÉ par le portail : « Appartement neuf à vendre » (SeLoger, repris par Stream
//   Estate), segment « neuf » du titre de carte SeLoger, « Immobilier neuf - … » (M&A) ;
// - Stream Estate : année de construction POSTÉRIEURE à l'année en cours (livraison à venir).
// Stream Estate ne marque pas le neuf et ne donne aucun type « promoteur » (éditeur « SL », type
// pro, contact « Agence professionnelle » : le même pour 64 annonces SeLoger de l'ancien).

export const NEW_BUILD_COMPLEMENT_MENTION = 'Neuf — ajouté faute de 3 concurrents dans l’ancien';

// /programme/ (Bien'ici, selogerneuf.com), /neuf/ (Green Acres « /properties/neuf/… »,
// selogerneuf.com « /annonces/neuf/… »), ou le domaine du neuf de SeLoger.
export function isNewBuildAddress(rawUrl: string | null | undefined): boolean {
  if (!rawUrl) return false;
  let url: URL;
  try {
    url = new URL(rawUrl, 'https://invalid.local/');
  } catch {
    return false;
  }
  const host = url.hostname.toLowerCase();
  if (host === 'selogerneuf.com' || host.endsWith('.selogerneuf.com')) return true;
  return /\/(?:programme|neuf)\//i.test(url.pathname);
}

// Le titre que SeLoger GÉNÈRE (« Appartement à vendre » pour l'ancien, « Appartement neuf à
// vendre » pour le neuf), repris tel quel par Stream Estate. Gabarit EXACT : un type (un mot, ou
// « Maison de ville »), « neuf/neuve », « à vendre », rien d'autre. Un titre libre d'agence
// (« 4 pièces refait à neuf ») ne s'y plie pas.
const GENERATED_NEW_BUILD_TITLE =
  /^\s*[a-zà-ÿ]+(?:\s+de\s+ville)?\s+neu(?:f|ve)s?\s+à\s+vendre\s*$/i;

export function isGeneratedNewBuildTitle(title: string | null | undefined): boolean {
  return title != null && GENERATED_NEW_BUILD_TITLE.test(title);
}
