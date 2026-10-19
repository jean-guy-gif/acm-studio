import {
  extractListingKey,
  LISTING_PORTAL_LABELS,
} from '@/features/comparable-import/utils/extract-listing-key';
import { pricePerSquareMeter } from '@/features/comparables/services/calculate-comparable-summary';
import type { Comparable } from '@/features/comparables/types';
import { confirmedByAdvisor } from '@/features/competitor-locator/services/advisor-address';
import { dpeClass } from '@/features/dpe/services/dpe';
import { propertyTypeLabel } from '@/features/subject-property/services/property-type-choice';

// MISSION 110 — « Exporter le comparatif » : un tableur pour l'usage du conseiller, jamais
// transmis au vendeur (il ne quitte que l'écran du conseiller, en mode expert). Les concurrents
// RETENUS du dossier, dans l'ordre du Live, une ligne chacun. Liste d'autorisation de colonnes :
//   • l'adresse d'un concurrent n'y est que si le conseiller l'a lui-même confirmée ou saisie
//     (`confirmedByAdvisor`, M84, M103) — jamais celle que le Localisateur seul propose ;
//   • ni titre, ni description, ni « Vendu par », ni exclusivité, ni note du conseiller ;
//   • ni prix, ni fourchette du bien vendeur : le tableur compare des biens en vente.
// Format : point-virgule, virgule décimale, BOM UTF-8 (Excel en français l'ouvre tel quel).

export type ComparisonSubject = {
  property_type: string | null;
  rooms_count: number | null;
  surface_area: number | null;
  land_area: number | null;
  city: string | null;
  energy_rating: string | null;
};

export const COMPARISON_COLUMNS = [
  'Rang',
  'Au Live',
  'Type',
  'Pièces',
  'Chambres',
  'Surface (m²)',
  'Terrain (m²)',
  'Commune',
  'Quartier',
  'Prix affiché (€)',
  'Prix au m² (€)',
  'DPE',
  'En ligne depuis',
  'Baisse de prix connue (%)',
  'Portail',
  'Annonce',
  'Adresse (confirmée par vous)',
] as const;

type Cell = string | number | null | undefined;

// Un nombre s'écrit sans espace des milliers et avec une virgule décimale ; une cellule qui
// commence par =, +, - ou @ est neutralisée (un tableur l'exécuterait comme une formule).
export function csvCell(value: Cell): string {
  if (value == null) return '';
  const text =
    typeof value === 'number'
      ? Number.isFinite(value)
        ? String(Math.round(value * 100) / 100).replace('.', ',')
        : ''
      : value;
  const safe = /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[";\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

const row = (cells: Cell[]): string => cells.map(csvCell).join(';');
const whole = (value: number | null): number | null => (value == null ? null : Math.round(value));

function portalOf(url: string | null): string | null {
  if (!url) return null;
  const identity = extractListingKey(url);
  return identity ? (LISTING_PORTAL_LABELS[identity.portal] ?? identity.portal) : null;
}

function day(value: string | null): string | null {
  if (!value) return null;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : null;
}

export function buildComparisonCsv(
  subject: ComparisonSubject | null,
  comparables: Comparable[],
): string {
  const retained = comparables
    .filter((comparable) => comparable.is_selected)
    .sort((a, b) => a.display_order - b.display_order || a.created_at.localeCompare(b.created_at));
  const lines = [row([...COMPARISON_COLUMNS])];
  if (subject) {
    lines.push(
      row([
        'Votre bien',
        null,
        propertyTypeLabel(subject.property_type) ?? subject.property_type,
        subject.rooms_count,
        null,
        whole(subject.surface_area),
        whole(subject.land_area),
        subject.city,
      ]),
    );
  }
  retained.forEach((comparable, index) => {
    lines.push(
      row([
        index + 1,
        comparable.excluded_from_live === true ? 'non' : 'oui',
        propertyTypeLabel(comparable.property_type) ?? comparable.property_type,
        comparable.rooms_count,
        comparable.bedrooms_count,
        whole(comparable.surface_area),
        whole(comparable.land_area),
        comparable.city,
        comparable.district,
        whole(comparable.price),
        pricePerSquareMeter(comparable.price, comparable.surface_area),
        dpeClass(comparable.energy_rating) ?? null,
        day(comparable.listing_published_at),
        comparable.price_drop_percentage,
        portalOf(comparable.listing_url),
        comparable.listing_url,
        confirmedByAdvisor(comparable) ? comparable.locator_address : null,
      ]),
    );
  });
  return `﻿${lines.join('\r\n')}\r\n`;
}
