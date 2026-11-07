import { WIDE_RADIUS_M } from '@/features/address-dossier/services/sales-stats';
import type { DossierPropertyType, RealSale } from '@/features/address-dossier/types';
import { distanceMeters } from '@/features/competitor-search/services/proximity';
import type { GeoPoint } from '@/features/competitor-search/types';

// Mission 141 — les ventes réelles, lues dans les fichiers « geo-dvf » d'Etalab (une commune, une
// année : une ligne par local et par nature de culture, avec la position de la parcelle). Partie
// PURE : lire le fichier, ne garder que les ventes dont le prix se rapporte à UN logement du type du
// bien, à 1 km au plus, sur les 3 dernières années.
//
// Une vente de plusieurs logements, ou d'un logement avec un local commercial, n'a pas de prix par
// logement : elle est écartée (un prix au m² faux est pire qu'une vente de moins, M47). Une
// dépendance (cave, garage) reste avec son logement. Seules les « Vente » comptent : ni
// adjudication, ni échange, ni vente en l'état futur d'achèvement (le neuf).

const DVF_TYPES: Record<string, DossierPropertyType> = {
  Maison: 'house',
  Appartement: 'apartment',
};
const OTHER_LOCALS = new Set(['Local industriel. commercial ou assimilé']);
export const SALES_YEARS = 3;

// Un CSV simple, guillemets compris (un nom de voie peut porter une virgule).
export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index]!;
    if (quoted) {
      if (char === '"' && text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ',') {
      row.push(field);
      field = '';
    } else if (char === '\n' || char === '\r') {
      if (char === '\r' && text[index + 1] === '\n') index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = '';
    } else {
      field += char;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

type Local = {
  type: string;
  surface: number | null;
  rooms: number | null;
  point: GeoPoint | null;
  key: string;
};

type Mutation = { date: string; nature: string; price: number | null; locals: Map<string, Local> };

const numberOf = (text: string | undefined): number | null => {
  if (text == null || text.trim() === '') return null;
  const value = Number(text);
  return Number.isFinite(value) ? value : null;
};

// Le jour qui ouvre la période : il y a 3 ans, jour pour jour.
export function salesSince(today: Date): string {
  const since = new Date(today);
  since.setUTCFullYear(since.getUTCFullYear() - SALES_YEARS);
  return since.toISOString().slice(0, 10);
}

export function salesFromCsv(
  texts: string[],
  input: { point: GeoPoint; propertyType: DossierPropertyType; today: Date },
): RealSale[] {
  const since = salesSince(input.today);
  const until = input.today.toISOString().slice(0, 10);
  const mutations = new Map<string, Mutation>();
  for (const text of texts) {
    const [header, ...rows] = parseCsv(text);
    if (!header) continue;
    const column = (name: string) => header.indexOf(name);
    const at = {
      id: column('id_mutation'),
      date: column('date_mutation'),
      nature: column('nature_mutation'),
      price: column('valeur_fonciere'),
      type: column('type_local'),
      surface: column('surface_reelle_bati'),
      rooms: column('nombre_pieces_principales'),
      parcel: column('id_parcelle'),
      lot: column('lot1_numero'),
      lon: column('longitude'),
      lat: column('latitude'),
    };
    if (Object.values(at).some((index) => index < 0)) continue;
    for (const row of rows) {
      const id = row[at.id];
      if (!id) continue;
      const mutation = mutations.get(id) ?? {
        date: row[at.date] ?? '',
        nature: row[at.nature] ?? '',
        price: numberOf(row[at.price]),
        locals: new Map<string, Local>(),
      };
      mutations.set(id, mutation);
      const type = row[at.type] ?? '';
      if (type === '' || type === 'Dépendance') continue;
      const surface = numberOf(row[at.surface]);
      const rooms = numberOf(row[at.rooms]);
      const lon = numberOf(row[at.lon]);
      const lat = numberOf(row[at.lat]);
      // Une même ligne se répète pour chaque nature de culture de la parcelle : un logement est
      // une parcelle, un type, un lot, une surface et des pièces.
      const key = [row[at.parcel], type, row[at.lot], surface, rooms].join('|');
      mutation.locals.set(key, {
        type,
        surface,
        rooms,
        point: lon != null && lat != null ? { lat, lon } : null,
        key,
      });
    }
  }

  const sales: RealSale[] = [];
  for (const mutation of mutations.values()) {
    if (mutation.nature !== 'Vente') continue;
    if (mutation.date < since || mutation.date > until) continue;
    if (mutation.price == null || mutation.price <= 0) continue;
    const locals = [...mutation.locals.values()];
    if (locals.length !== 1) continue; // plusieurs logements, ou un logement et un local
    const local = locals[0]!;
    if (OTHER_LOCALS.has(local.type) || DVF_TYPES[local.type] !== input.propertyType) continue;
    if (local.surface == null || local.surface <= 0 || local.point == null) continue;
    const distanceM = Math.round(distanceMeters(input.point, local.point));
    if (distanceM > WIDE_RADIUS_M) continue;
    sales.push({
      date: mutation.date,
      price: Math.round(mutation.price),
      surface: local.surface,
      pricePerM2: Math.round(mutation.price / local.surface),
      rooms: local.rooms != null && local.rooms > 0 ? local.rooms : null,
      distanceM,
    });
  }
  return sales.sort((a, b) => a.distanceM - b.distanceM);
}

// Les années de fichiers à lire pour couvrir les 3 dernières années (l'année en cours comprise :
// un fichier pas encore publié est simplement absent).
export function salesYears(today: Date): number[] {
  const year = today.getUTCFullYear();
  return Array.from({ length: SALES_YEARS + 1 }, (_, index) => year - SALES_YEARS + index);
}
