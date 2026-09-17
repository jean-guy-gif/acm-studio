import type { CompetitorSearchCriteria, SearchPortal } from '@/features/competitor-search/types';
import { SEARCH_PORTAL_LABELS } from '@/features/competitor-search/types';

// MISSION 50 §3 — les adresses de recherche, portail par portail. Le `robots.txt` a
// été lu avant toute chose et commande la FORME des adresses. Deux garanties ici :
//   1. on ne construit QUE des formes autorisées ;
//   2. une adresse interdite n'est pas seulement évitée, elle est REFUSÉE
//      (assertAllowedSearchUrl) — « le constructeur refuse » (§10, §11.5).
//
// Bien'ici est le seul portail dont l'adresse de résultats se déduit entièrement de
// {commune, code postal, type} : sa page canonique est /recherche/achat/<commune>-
// <cp>/<type>. SeLoger, Green Acres et Maisons et Appartements encodent dans leur
// adresse un IDENTIFIANT DE LIEU interne (AD08FR2038, city_id gr_3668, villes=2123)
// qu'on ne peut PAS déduire du nom de la ville — le fabriquer serait inventer une
// donnée (§10) et deviner (§9). Pour ces trois-là on ouvre une entrée de recherche
// propre (sans paramètre, donc non interdite) ; l'identifiant de lieu se résout dans
// le navigateur du conseiller, où l'extension capture la page de résultats (§2).

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
    .replace(/['’']/g, '-')
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Type du bien vendeur (vocabulaire subject_properties) -> segment de type Bien'ici.
// Type inconnu -> pas de segment (l'adresse sans type reste autorisée).
const BIENICI_TYPE: Record<string, string> = {
  apartment: 'appartement',
  house: 'maison',
  land: 'terrain',
  building: 'immeuble',
  commercial: 'local-commercial',
  parking: 'parking',
};

// Une adresse INTERDITE par le robots.txt du portail (§3). Renvoie le motif du refus,
// ou null si l'adresse est autorisée. C'est le point de contrôle unique : le
// constructeur ET l'extension le traversent avant d'ouvrir quoi que ce soit.
export function forbiddenSearchReason(portal: SearchPortal, rawUrl: string): string | null {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return 'Adresse illisible.';
  }
  const href = decodeURIComponent(url.href);

  switch (portal) {
    case 'bienici': {
      // Interdits : toute adresse /recherche/ contenant un « & » ou une VIRGULE, et
      // tout « tri= ». Une pagination ?page=2 (paramètre unique) reste autorisée.
      if (url.pathname.includes('/recherche/')) {
        if (href.includes(',') || href.includes('&')) {
          return 'Bien’ici refuse une adresse de recherche à virgule ou à « & ».';
        }
        if (/(?:^|[?&])tri=/i.test(url.search)) {
          return 'Bien’ici refuse un tri dans l’adresse.';
        }
      }
      return null;
    }
    case 'seloger': {
      // Interdits : /classified-search?, /list.htm, /classifiedList/, et TOUTE variante
      // à paramètres. La forme propre est un chemin sans « ? ».
      if (
        /\/classified-search\b/i.test(url.pathname) ||
        url.pathname.includes('/classifiedList/')
      ) {
        return 'SeLoger refuse les adresses /classified-search et /classifiedList.';
      }
      if (/\/list\.htm\b/i.test(url.pathname)) {
        return 'SeLoger refuse /list.htm.';
      }
      if (url.search !== '') {
        return 'SeLoger refuse toute adresse de recherche à paramètre.';
      }
      return null;
    }
    case 'green_acres': {
      // Interdits : searchQuery commençant par sx-, px-, gx-, agn-, ntw-.
      const query = url.searchParams.get('searchQuery');
      if (query && /^(sx|px|gx|agn|ntw)-/i.test(query)) {
        return 'Green Acres refuse un searchQuery préfixé sx-, px-, gx-, agn- ou ntw-.';
      }
      return null;
    }
    case 'maisons_appartements':
      // §3 n'interdit aucune forme ; la pagination &page=N est explicitement permise.
      return null;
    default:
      return null;
  }
}

// « Une adresse interdite n'est pas construite » (§10) : on lève plutôt que de
// renvoyer une adresse interdite. Appelé par le constructeur et par l'extension.
export function assertAllowedSearchUrl(portal: SearchPortal, rawUrl: string): string {
  const reason = forbiddenSearchReason(portal, rawUrl);
  if (reason != null) {
    throw new Error(reason);
  }
  return rawUrl;
}

export function buildPortalSearchUrls(criteria: CompetitorSearchCriteria): PortalSearchLink[] {
  const slug = slugifyCity(criteria.city);
  const postalCode = criteria.postalCode?.trim() ?? '';
  const hasPostal = /^\d{5}$/.test(postalCode);
  const department = hasPostal ? postalCode.slice(0, 2) : null;

  // Bien'ici : /recherche/achat/<commune>-<cp>/<type> — forme canonique mesurée.
  const bieniciType = criteria.propertyType ? BIENICI_TYPE[criteria.propertyType] : undefined;
  const bieniciBase = hasPostal
    ? `https://www.bienici.com/recherche/achat/${slug}-${postalCode}`
    : `https://www.bienici.com/recherche/achat/${slug}`;
  const bienici = bieniciType ? `${bieniciBase}/${bieniciType}` : bieniciBase;

  // Entrées propres (sans paramètre) pour les trois portails à identifiant de lieu :
  // non interdites, elles ouvrent la recherche que le navigateur du conseiller résout.
  //
  // Green Acres titre la page « 1 576 maisons à vendre » alors qu'elle sert tous les
  // types (19 appartements sur 24 mesurés). Le libellé est de la rédaction SEO, pas un
  // filtre. Ne pas changer le chemin en croyant corriger un bug. Le filtrage de type
  // se fait chez nous (garde de type au classement), pas dans l'adresse.
  const greenAcres = `https://www.green-acres.fr/immobilier/${slug}`;
  const seloger = department
    ? `https://www.seloger.com/immobilier/achat/immo-${slug}-${department}/`
    : `https://www.seloger.com/immobilier/achat/immo-${slug}/`;
  const maisons = department
    ? `https://www.maisonsetappartements.fr/fr/${department}/vente/${slug}/`
    : `https://www.maisonsetappartements.fr/fr/vente/${slug}/`;

  const draft: { portal: SearchPortal; url: string }[] = [
    { portal: 'green_acres', url: greenAcres },
    { portal: 'seloger', url: seloger },
    { portal: 'bienici', url: bienici },
    { portal: 'maisons_appartements', url: maisons },
  ];

  // Garde-fou : aucune adresse interdite ne sort du constructeur.
  return draft.map(({ portal, url }) => ({
    portal,
    label: SEARCH_PORTAL_LABELS[portal],
    url: assertAllowedSearchUrl(portal, url),
  }));
}
