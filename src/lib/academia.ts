// Mission 147 (partie A) — Academia : le dossier d'adresse et « Vivre ici » d'un bien sont ceux
// d'Academia, plus ceux d'ACM (décision de Jean-Guy, 07/11). Un seul module fabrique les liens qui
// l'ouvrent, et dit si un lien client « Vivre ici » collé par le conseiller est bien d'Academia.
//
// Module pur, lisible des deux côtés : la page décide (adresse, démo), l'écran ouvre et copie.

// L'adresse d'Academia, un réglage (`NEXT_PUBLIC_ACADEMIA_URL`, lue à la compilation).
export const ACADEMIA_URL = (
  process.env.NEXT_PUBLIC_ACADEMIA_URL?.trim() || 'https://app.myacademia.ai'
).replace(/\/+$/, '');

// La page de présentation d'Academia, ouverte dans l'agence de démonstration à la place de toute
// adresse inventée (décision de Jean-Guy, 09/11).
export const ACADEMIA_PRESENTATION_URL = 'https://app.myacademia.ai';

// Le lien direct (`/app/ouvrir?adresse=…&vers=…`) n'existe pas encore : d'ici là, l'accueil
// d'Academia s'ouvre et l'adresse du bien est copiée. Basculer cette constante suffit (sur le modèle
// de `OFFRE_AVEC_PRET_VALIDEE`) ; ce jour-là, `/confidentialite` dit que l'adresse part vers Academia.
export const ACADEMIA_LIEN_DIRECT = false;

// Ce que le conseiller ouvre : le dossier d'adresse, « Vivre ici », ou les ventes réelles (qui sont
// dans le dossier d'adresse d'Academia).
export type AcademiaTarget = 'address' | 'living' | 'sales';

// Un lien prêt : où il mène, et l'adresse à copier au même geste (rien à copier en démo et avec le
// lien direct).
export type AcademiaLink = { href: string; copy: string | null };

export type PropertyAddress = {
  address: string | null | undefined;
  postalCode: string | null | undefined;
  city: string | null | undefined;
};

const clean = (value: string | null | undefined): string =>
  (value ?? '').replace(/\s+/g, ' ').trim();

// L'adresse complète du bien, telle qu'enregistrée : « 4 chemin des Restanques Hautes, 06140 Vence ».
// Sans rue ou sans commune, aucune : jamais une adresse à moitié. Une rue saisie avec sa commune
// (« 12 rue X, 06600 Antibes ») n'est pas doublée.
export function propertyAddressLine(property: PropertyAddress): string | null {
  const street = clean(property.address);
  const city = clean(property.city);
  if (!street || !city) return null;
  const postalCode = clean(property.postalCode);
  const lower = street.toLowerCase();
  if ((postalCode && street.includes(postalCode)) || lower.endsWith(`, ${city.toLowerCase()}`)) {
    return street;
  }
  return `${street}, ${postalCode ? `${postalCode} ` : ''}${city}`;
}

const DIRECT_TARGET: Record<AcademiaTarget, string> = {
  address: 'dossier',
  living: 'vivre-ici',
  sales: 'dossier',
};

// Le lien vers Academia pour une adresse, ou `null` sans adresse (« Ajoutez l'adresse du bien »).
export function academiaLinkView(input: {
  target: AcademiaTarget;
  address: string | null;
  demo: boolean;
  direct?: boolean;
  base?: string;
}): AcademiaLink | null {
  if (!input.address) return null;
  if (input.demo) return { href: ACADEMIA_PRESENTATION_URL, copy: null };
  const base = (input.base ?? ACADEMIA_URL).replace(/\/+$/, '');
  if (input.direct ?? ACADEMIA_LIEN_DIRECT) {
    const query = new URLSearchParams({
      adresse: input.address,
      vers: DIRECT_TARGET[input.target],
    });
    return { href: `${base}/app/ouvrir?${query.toString()}`, copy: null };
  }
  return { href: base, copy: input.address };
}

// Le lien client « Vivre ici » collé sur le mandat : seulement https://app.myacademia.ai/l/<jeton>,
// le jeton seulement (aujourd'hui « identifiant.signature »), aucun autre site, 500 caractères au
// plus (décision de Jean-Guy, 09/11). La même règle que la contrainte de la base (migration
// `vivre_ici_academia`, un test compare les deux).
export const ACADEMIA_LIVING_HERE_PATTERN = /^https:\/\/app\.myacademia\.ai\/l\/[A-Za-z0-9._~-]+$/;
export const ACADEMIA_LIVING_HERE_MAX = 500;
export const ACADEMIA_LIVING_HERE_ERROR =
  'Collez le lien «\u00a0Vivre ici\u00a0» donné par Academia\u00a0: il commence par https://app.myacademia.ai/l/';

// Le lien s'il est d'Academia, sinon `null` ; une valeur vide aussi (relu à l'écran, au serveur, et
// à la lecture avant de partir vers l'acquéreur).
export function academiaLivingHereUrl(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const url = value.trim();
  if (url.length === 0 || url.length > ACADEMIA_LIVING_HERE_MAX) return null;
  // Ni caractère de contrôle ni caractère invisible (déjà hors de la règle, gardé par prudence).
  if (/[\p{Cc}\p{Cf}\p{Zl}\p{Zp}]/u.test(url)) return null;
  if (!ACADEMIA_LIVING_HERE_PATTERN.test(url)) return null;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== 'https:' || parsed.host !== 'app.myacademia.ai') return null;
    if (!parsed.pathname.startsWith('/l/') || parsed.pathname.length <= 3) return null;
    if (parsed.username || parsed.password) return null;
  } catch {
    return null;
  }
  return url;
}

// Correctifs 161 — la rue inventée du dossier de démonstration d'Academia (« Avenue de la
// Démonstration », écrite sans accent dans ses ventes et ses permis) ne s'écrit nulle part, ni côté
// conseiller ni côté vendeur (M114) : la vente ou le permis reste, sans sa rue. Lu à chaque
// lecture, quartiers déjà enregistrés compris. Pur.
export function isDemonstrationStreet(street: string): boolean {
  return /d[eé]monstration/i.test(street.normalize('NFC'));
}
