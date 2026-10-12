// Correctif du 12/10 — la page d'une annonce, lue par l'extension, voyage vers l'action d'import
// dans un FORMULAIRE, jamais comme une chaîne passée en argument.
//
// Pourquoi : React refuse les arguments d'une action serveur dès que les tableaux qu'ils forment
// dépassent un million d'éléments, et il compte dans ce total la LONGUEUR de chaque chaîne
// (« Maximum array nesting exceeded »). Une page d'annonce de plus d'un million de caractères
// faisait donc échouer l'appel avant même d'atteindre notre code — l'action rejetait, et l'import
// en lot restait figé. Les champs d'un formulaire ne passent pas par ce compteur (mesuré : 3,6
// millions de caractères passent) ; la taille reste bornée par `bodySizeLimit` et par l'action.
const URL_FIELD = 'url';
const HTML_FIELD = 'html';
const TYPE_FIELD = 'propertyType';

export function listingPayload(url: string, html: string, propertyType: string | null): FormData {
  const payload = new FormData();
  payload.set(URL_FIELD, url);
  payload.set(HTML_FIELD, html);
  if (propertyType != null) payload.set(TYPE_FIELD, propertyType);
  return payload;
}

export type ListingPayload = { url: string; html: string; propertyType: string | null };

// Ce qui arrive du navigateur est relu : trois champs texte, rien d'autre. null = mal formé.
export function readListingPayload(payload: unknown): ListingPayload | null {
  if (!(payload instanceof FormData)) return null;
  const url = payload.get(URL_FIELD);
  const html = payload.get(HTML_FIELD);
  const propertyType = payload.get(TYPE_FIELD);
  if (typeof url !== 'string' || typeof html !== 'string') return null;
  if (propertyType != null && typeof propertyType !== 'string') return null;
  return { url, html, propertyType: propertyType ?? null };
}
