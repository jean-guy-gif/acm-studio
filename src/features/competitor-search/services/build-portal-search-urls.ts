import type { CompetitorSearchCriteria, SearchPortal } from '@/features/competitor-search/types';
import { SEARCH_PORTAL_LABELS } from '@/features/competitor-search/types';

// Construit, pour chaque portail, l'URL de la page de résultats correspondant au
// bien vendeur (ville / code postal / type). Déterministe et sans requête : ces
// URLs servent à la tentative serveur ET au bouton « Ouvrir la recherche » dans
// le navigateur du conseiller. Formats relevés sur les portails réels (2026-08).

export type PortalSearchLink = {
  portal: SearchPortal;
  label: string;
  url: string;
};

// "Lège-Cap-Ferret" -> "lege-cap-ferret", "L'Haÿ-les-Roses" -> "l-hay-les-roses"
export function slugifyCity(city: string): string {
  return city
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[''’]/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Vocabulaire subject_properties -> segment d'URL Figaro.
function figaroType(propertyType: string | null): string {
  if (propertyType === 'house') {
    return 'maison';
  }
  return 'appartement';
}

export function buildPortalSearchUrls(criteria: CompetitorSearchCriteria): PortalSearchLink[] {
  const slug = slugifyCity(criteria.city);
  const postalCode = criteria.postalCode?.trim() ?? '';
  const department = /^\d{5}$/.test(postalCode) ? postalCode.slice(0, 2) : null;

  const links: PortalSearchLink[] = [];

  // Green Acres : page ville — https://www.green-acres.fr/immobilier/nice
  links.push({
    portal: 'green_acres',
    label: SEARCH_PORTAL_LABELS.green_acres,
    url: `https://www.green-acres.fr/immobilier/${slug}`,
  });

  // SeLoger : https://www.seloger.com/immobilier/achat/immo-nice-06/
  links.push({
    portal: 'seloger',
    label: SEARCH_PORTAL_LABELS.seloger,
    url: department
      ? `https://www.seloger.com/immobilier/achat/immo-${slug}-${department}/`
      : `https://www.seloger.com/immobilier/achat/immo-${slug}/`,
  });

  // Bien'ici : https://www.bienici.com/recherche/achat/nice-06000
  links.push({
    portal: 'bienici',
    label: SEARCH_PORTAL_LABELS.bienici,
    url: /^\d{5}$/.test(postalCode)
      ? `https://www.bienici.com/recherche/achat/${slug}-${postalCode}`
      : `https://www.bienici.com/recherche/achat/${slug}`,
  });

  // Figaro Immobilier :
  // https://immobilier.lefigaro.fr/annonces/immobilier-vente-appartement-nice+06000.html
  links.push({
    portal: 'figaro',
    label: SEARCH_PORTAL_LABELS.figaro,
    url: /^\d{5}$/.test(postalCode)
      ? `https://immobilier.lefigaro.fr/annonces/immobilier-vente-${figaroType(criteria.propertyType)}-${slug}+${postalCode}.html`
      : `https://immobilier.lefigaro.fr/annonces/immobilier-vente-${figaroType(criteria.propertyType)}-${slug}.html`,
  });

  return links;
}
