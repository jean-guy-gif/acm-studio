import type { QrCode } from '@/features/contact-card/services/qr-code';
import { academiaLivingHereUrl } from '@/lib/academia';

// Mission 157 B — le lien « Vivre ici » du bien, montré au vendeur : au Live (« Votre bien »), dans
// la synthèse et dans l'Étude de marché (décision de Jean-Guy, 16/11). Ce module est la seule porte
// entre le lien du mandat et ce que voit le vendeur : il ne laisse passer que le lien client relu
// (`https://app.myacademia.ai/l/<jeton>`) et sa date de validité, jamais rien d'autre de la demande
// (son identifiant, l'adresse envoyée). Le nom du service ne se dit pas devant le vendeur : seule
// l'adresse du lien se voit (Jean-Guy, 17/11). Pur.

export type NeighbourhoodLink = {
  url: string;
  // La date d'expiration donnée par le service quand le lien a été créé en un clic ; null pour un
  // lien collé à la main, dont la date n'est pas connue.
  validUntil: string | null;
};

export type NeighbourhoodRequest = {
  property_address: string | null;
  link_url: string | null;
  link_expires_at: string | null;
};

export function neighbourhoodLink(input: {
  url: unknown;
  request: NeighbourhoodRequest | null;
  propertyAddress: string | null;
  now: Date;
}): NeighbourhoodLink | null {
  const url = academiaLivingHereUrl(input.url);
  if (!url) return null;
  const request = input.request;
  if (request?.link_url && request.link_expires_at && request.link_url === url) {
    // Créé en un clic : expiré, ou l'adresse du bien changée depuis, il n'est plus montré.
    if (new Date(request.link_expires_at).getTime() <= input.now.getTime()) return null;
    if (request.property_address !== input.propertyAddress) return null;
    return { url, validUntil: request.link_expires_at };
  }
  return { url, validUntil: null };
}

// L'adresse du lien à taper, sur un document imprimé : sans « https:// ».
export function shortLinkAddress(url: string): string {
  return url.replace(/^https:\/\//, '');
}

// Sur un document imprimé, le lien vient avec son QR code (tracé sans image ni service extérieur,
// comme celui du conseiller, M84) : construit au serveur, avec le document.
export type NeighbourhoodDocumentLink = NeighbourhoodLink & { qr: QrCode };
