import { z } from 'zod';

import { judgeGeocode } from '@/features/competitor-search/services/geocode-subject';
import { normalizePropertyType } from '@/features/competitor-search/utils/normalize-property-type';
import {
  GES_RATINGS,
  type HeatingType,
} from '@/features/subject-property/constants/property-options';
import { listValue, translateHeating } from '@/features/subject-property/services/list-values';
import { DPE_FIELDS, type DpeField, type DpeReading } from '@/features/subject-property-dpe/types';

// MISSION 79 — LE DPE OFFICIEL. Quand ni le conseiller, ni la fiche PDF, ni l'annonce ne donnent
// le chauffage, on le lit dans le DPE public du bien : jeu « DPE Logements existants (depuis
// juillet 2021) » de l'ADEME (data.ademe.fr, gratuit, sans clé), cherché par l'identifiant BAN de
// l'adresse géocodée. Partie PURE : construire la requête, juger la réponse. Les DPE d'avant
// juillet 2021 (autre jeu, tous expirés) ne sont pas lus.
//
// Mesuré le 08/10/2026 sur les Alpes-Maritimes (300 819 DPE) : l'énergie n'est jamais vide,
// l'installation (individuel / collectif / mixte) est vide pour toutes les maisons, le générateur
// est vide dans 76 % des DPE.

export const ADEME_DPE_ENDPOINT =
  'https://data.ademe.fr/data-fair/api/v1/datasets/dpe03existant/lines';
const MAX_ROWS = 100;
const SURFACE_TOLERANCE = 0.05;

const SELECT = [
  'date_etablissement_dpe',
  'type_batiment',
  'surface_habitable_logement',
  'etiquette_dpe',
  'etiquette_ges',
  'type_energie_principale_chauffage',
  'type_installation_chauffage',
  'type_generateur_chauffage_principal',
].join(',');

const banFeatureSchema = z.object({
  properties: z.object({ id: z.string().regex(/^[\w-]+$/), type: z.string() }),
});
const banResponseSchema = z.object({ features: z.array(z.unknown()) });

// L'identifiant BAN de l'adresse, seulement si elle est géocodée sûrement (règle de
// `geocode-subject.ts`) ET trouvée AU NUMÉRO : à la rue, l'ADEME rend les DPE de toute la rue
// (mesuré : chemin des Collettes, Cagnes-sur-Mer — maisons et appartements mélangés).
export function banHouseNumberId(json: unknown, city: string): string | null {
  if (!judgeGeocode(json, city).ok) return null;
  const response = banResponseSchema.safeParse(json);
  if (!response.success) return null;
  const first = banFeatureSchema.safeParse(response.data.features[0]);
  if (!first.success || first.data.properties.type !== 'housenumber') return null;
  return first.data.properties.id;
}

export function ademeDpeUrl(banId: string): string {
  const params = new URLSearchParams();
  params.set('qs', `identifiant_ban:"${banId}"`);
  params.set('size', String(MAX_ROWS));
  params.set('select', SELECT);
  return `${ADEME_DPE_ENDPOINT}?${params}`;
}

const rowSchema = z.object({
  date_etablissement_dpe: z.string().regex(/^\d{4}-\d{2}-\d{2}/),
  type_batiment: z.string().optional(),
  surface_habitable_logement: z.number().optional(),
  etiquette_dpe: z.string().optional(),
  etiquette_ges: z.string().optional(),
  type_energie_principale_chauffage: z.string().optional(),
  type_installation_chauffage: z.string().optional(),
  type_generateur_chauffage_principal: z.string().optional(),
});
type AdemeDpeRow = z.infer<typeof rowSchema>;
const linesSchema = z.object({ total: z.number(), results: z.array(z.unknown()) });

// Le chauffage d'un DPE, traduit dans la liste de la fiche — ou null :
// - « mixte (collectif-individuel) » → mixte ;
// - une maison est en individuel (son installation est toujours vide dans la base) ;
// - énergie + installation passent par le traducteur des annonces (`translateHeating`) :
//   électricité collective, propane, GPL, butane, charbon n'ont pas de choix dans la liste → vide ;
// - pompe à chaleur SEULEMENT si le générateur le dit ; une électricité sans générateur reste
//   « individuel électrique » (décision de Laurent : moins précis, pas faux).
export function translateDpeHeating(row: AdemeDpeRow): HeatingType | null {
  const installation = row.type_installation_chauffage ?? '';
  if (/mixte/i.test(installation)) return 'mixed';
  const heating = translateHeating(row.type_energie_principale_chauffage, installation, {
    house: row.type_batiment === 'maison',
  });
  if (
    heating === 'individual_electric' &&
    /^pac\b/i.test(row.type_generateur_chauffage_principal?.trim() ?? '')
  ) {
    return 'individual_heat_pump';
  }
  return heating;
}

// La lettre seule, de A à G — ou null.
const letter = (value: string | undefined): string | null =>
  listValue(value?.trim().toUpperCase(), GES_RATINGS);

const READERS: Record<DpeField, (row: AdemeDpeRow) => string | null> = {
  heating_type: translateDpeHeating,
  energy_rating: (row) => letter(row.etiquette_dpe),
  ges_rating: (row) => letter(row.etiquette_ges),
};

const DPE_BUILDING_TYPES: Record<string, string> = { house: 'maison', apartment: 'appartement' };

// La valeur commune à tous ces DPE, avec la date du plus récent — ou null s'ils ne disent pas
// tous la même chose (ou si l'un d'eux ne dit rien).
function agreed(rows: AdemeDpeRow[], read: (row: AdemeDpeRow) => string | null) {
  if (rows.length === 0) return null;
  const value = read(rows[0]);
  if (value == null || rows.some((row) => read(row) !== value)) return null;
  const date =
    rows
      .map((row) => row.date_etablissement_dpe.slice(0, 10))
      .sort()
      .at(-1) ?? '';
  return { value, date };
}

// CE QUE LES DPE DE L'ADRESSE PERMETTENT D'ÉCRIRE, champ par champ :
// - les DPE d'immeuble et ceux d'un autre type que le bien (maison / appartement) sont ignorés ;
// - un seul DPE, ou plusieurs qui disent la même chose : le champ est rempli ;
// - sinon, on ne garde que les DPE dont la surface est à 5 % de celle du bien, s'ils sont
//   d'accord entre eux (un même appartement diagnostiqué deux fois compte) ;
// - sinon rien, en silence. Une réponse incomplète (plus de DPE que de lignes lues) ne décide
//   rien : on ne peut pas dire « tous d'accord » sans les avoir tous lus.
export function chooseDpe(
  json: unknown,
  subject: { propertyType: string | null; surface: number | null },
): DpeReading {
  const lines = linesSchema.safeParse(json);
  if (!lines.success || lines.data.total > lines.data.results.length) return {};
  const wanted = DPE_BUILDING_TYPES[normalizePropertyType(subject.propertyType) ?? ''];
  if (wanted == null) return {};
  const rows = lines.data.results
    .map((result) => rowSchema.safeParse(result))
    .filter((parsed) => parsed.success)
    .map((parsed) => parsed.data)
    .filter((row) => row.type_batiment === wanted);

  const surface = subject.surface;
  const sameSurface =
    surface != null && surface > 0
      ? rows.filter(
          (row) =>
            row.surface_habitable_logement != null &&
            Math.abs(row.surface_habitable_logement - surface) <= surface * SURFACE_TOLERANCE,
        )
      : [];

  const reading: DpeReading = {};
  for (const field of DPE_FIELDS) {
    const found = agreed(rows, READERS[field]) ?? agreed(sameSurface, READERS[field]);
    if (found != null) reading[field] = found;
  }
  return reading;
}
