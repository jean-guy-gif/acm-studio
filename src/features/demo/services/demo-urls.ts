import { demoCommuneByCode } from '@/features/demo/data/communes';
import { DEMO_LISTINGS, DEMO_SCENARIOS } from '@/features/demo/data/scenarios';
import type { DemoListing, DemoScenario, DemoScenarioId } from '@/features/demo/data/types';
import { DEMO_LISTING_HOST, DEMO_PHOTOS_PATH } from '@/features/demo/constants';
import { siteUrl } from '@/lib/site-url';

// Mission 114 — les adresses de la démonstration : annonces sur l'hôte réservé, photos servies
// par l'application elle-même. Une annonce de démonstration se reconnaît à son hôte ; son
// identifiant publié (M47) est le dernier segment du chemin, comme sur les portails mesurés.

const slug = (name: string): string =>
  name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

export function demoListingUrl(listing: Pick<DemoListing, 'id' | 'inseeCode'>): string {
  const commune = demoCommuneByCode(listing.inseeCode);
  return `https://${DEMO_LISTING_HOST}/${commune ? slug(commune.nom) : 'commune'}/${listing.id}`;
}

// L'annonce du BIEN VENDEUR d'un scénario, proposée d'avance dans « Importer une annonce ».
export function demoSubjectListingUrl(scenarioId: DemoScenarioId): string {
  return `https://${DEMO_LISTING_HOST}/bien-vendeur/${scenarioId}`;
}

export function isDemoListingHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  return host === DEMO_LISTING_HOST || host.endsWith(`.${DEMO_LISTING_HOST}`);
}

export function isDemoListingUrl(rawUrl: string | null | undefined): boolean {
  if (!rawUrl) return false;
  try {
    return isDemoListingHost(new URL(rawUrl).hostname);
  } catch {
    return false;
  }
}

const lastSegment = (rawUrl: string): string | null => {
  try {
    const url = new URL(rawUrl);
    if (!isDemoListingHost(url.hostname)) return null;
    const segments = url.pathname.split('/').filter(Boolean);
    return segments[segments.length - 1] ?? null;
  } catch {
    return null;
  }
};

export function findDemoListing(rawUrl: string): DemoListing | null {
  const id = lastSegment(rawUrl);
  return id ? (DEMO_LISTINGS.find((listing) => listing.id === id) ?? null) : null;
}

export function findDemoSubjectScenario(rawUrl: string): DemoScenario | null {
  const id = lastSegment(rawUrl);
  if (!id || !rawUrl.includes('/bien-vendeur/')) return null;
  return DEMO_SCENARIOS.find((scenario) => scenario.id === id) ?? null;
}

// `https://acm-studio-essai.vercel.app/demo/photos/appartement-01.jpg` : une adresse absolue,
// parce que les photos des concurrents sont enregistrées comme les adresses publiées par un
// portail (`comparables.photo_urls`), et relues telles quelles par le Live et la synthèse.
export function demoPhotoUrl(file: string): string {
  return `${siteUrl().replace(/\/$/, '')}${DEMO_PHOTOS_PATH}/${file}`;
}

// Le nom de fichier d'une photo de démonstration servie par l'application, sinon null.
export function demoPhotoFile(rawUrl: string): string | null {
  try {
    const url = new URL(rawUrl);
    const base = new URL(siteUrl());
    if (url.host !== base.host) return null;
    const match = url.pathname.match(new RegExp(`^${DEMO_PHOTOS_PATH}/([a-z0-9-]+\\.jpg)$`));
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
