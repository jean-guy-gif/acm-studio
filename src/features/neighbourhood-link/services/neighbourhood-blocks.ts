// Mission 159 — les pièces du quartier montrées au vendeur, lues dans la vue « bien-client » du
// dossier d'adresse. Ce module construit lui-même chaque objet, champ par champ (liste
// d'autorisation) : des nombres, des dates, des niveaux d'échelles officielles et des noms de rue ;
// aucune phrase de la source (les textes vus par le vendeur sont recomposés depuis ces chiffres, en
// français et en anglais, décision de Jean-Guy du 17/11). Il ne connaît aucun champ réservé au
// conseiller : rien du prix calculé, ni de l'étiquette énergétique, ni de la parcelle, ni du prix au
// m², ni du terrain, ni de la vente à l'adresse, ni d'une adresse numérotée ou du numéro d'un
// permis, ni du nom ou de l'immatriculation d'une copropriété, ni du code d'un emplacement réservé,
// ni du zonage. Les ventes sortent au mois, la distance arrondie à 50 m, même si une autre vue lui
// était passée par erreur (test 2, validé par Jean-Guy le 17/11).
//
// Une seule relecture : la réponse de la source est d'abord ramenée à la forme d'ACM, puis passe
// par les mêmes fonctions que l'instantané relu en base (`readStoredNeighbourhood`). Pur.

import { isDemonstrationStreet } from '@/lib/academia';

export const NEIGHBOURHOOD_BLOCK_KEYS = [
  'urbanisme',
  'risques',
  'population',
  'copropriete',
  'permis',
  'ventes',
] as const;
export type NeighbourhoodBlockKey = (typeof NEIGHBOURHOOD_BLOCK_KEYS)[number];

export const isNeighbourhoodBlockKey = (value: unknown): value is NeighbourhoodBlockKey =>
  typeof value === 'string' && (NEIGHBOURHOOD_BLOCK_KEYS as readonly string[]).includes(value);

// La source publique de chaque bloc est nommée par ACM, dans la langue du vendeur
// (`client-texts`, `quartier.sources`) : seul le jour de ses données vient de la vue.
export type BlockSource = { date: string | null };

// Le début de la période des ventes réelles : Academia les compte depuis 2021 (confirmé par
// Jean-Guy le 18/11, docs/DECISIONS.md). La vue « bien-client » ne le donne pas encore ; le jour où
// elle le donne (`depuis`), c'est sa valeur qui compte. Écrit ici seulement.
export const SALES_COUNTED_SINCE = 2021;

export type NeighbourhoodSale = {
  month: string;
  type: 'maison' | 'appartement' | null;
  rooms: number | null;
  surface: number | null;
  price: number;
  distance: number | null;
  street: string | null;
};

export const PLANNING_CATEGORIES = [
  'voirie',
  'alignement',
  'equipement',
  'logements',
  'attente',
  'oap',
  'perimetre',
] as const;
export type PlanningCategory = (typeof PLANNING_CATEGORIES)[number];
export type PlanningLevel = {
  counts: Record<PlanningCategory, number>;
  nearest: number | null;
};

export type NeighbourhoodSales = BlockSource & {
  type: 'maison' | 'appartement' | null;
  rooms: number | null;
  // Correctifs 161 — la règle de Laurent (19/11) : les ventes du même type, de surface comprise dans
  // une fourchette (la surface du bien à ±25 %, bornes comprises), toutes pièces confondues ; la vue
  // rend la fourchette appliquée. Un instantané d'avant ne l'a pas : le titre dit alors le type seul.
  surfaceMin: number | null;
  surfaceMax: number | null;
  since: number | null;
  listRadius: number | null;
  list: NeighbourhoodSale[];
};
export type NeighbourhoodPlanning = BlockSource & {
  parcel: PlanningLevel;
  within40: PlanningLevel;
  within300: PlanningLevel;
};
export type NeighbourhoodPermit = {
  authorizedOn: string | null;
  state: 'autorise' | 'commence' | 'termine' | null;
  dwellings: number | null;
  surface: number | null;
  distance: number | null;
  street: string | null;
};
export type NeighbourhoodPermits = BlockSource & {
  radius: number | null;
  since: number | null;
  build: NeighbourhoodPermit[];
};
export type NeighbourhoodRisks = BlockSource & {
  // Les niveaux des échelles officielles (`risk-scales.ts`) : argiles 1 à 3, séisme 1 à 5, radon 1 à 3.
  clay: number | null;
  earthquake: number | null;
  radon: number | null;
  // Le nom du territoire à risque important d'inondation où la commune est classée.
  floodArea: string | null;
  disasters: { count: number; latest: string | null } | null;
};
export type NeighbourhoodPopulation = BlockSource & {
  radius: number | null;
  inhabitants: number | null;
  households: number | null;
  peoplePerHousehold: number | null;
};
export type NeighbourhoodCondominium = BlockSource & {
  // L'échelle du fait : la copropriété à l'adresse du bien, ou à N mètres (rattachée par proximité).
  linkedToAddress: boolean;
  distance: number | null;
  dwellingLots: number | null;
  builtFrom: number | null;
  builtTo: number | null;
  syndicMandateEnded: string | null;
  syndicMandateActive: boolean | null;
};

export type NeighbourhoodBlocks = {
  urbanisme: NeighbourhoodPlanning | null;
  risques: NeighbourhoodRisks | null;
  population: NeighbourhoodPopulation | null;
  copropriete: NeighbourhoodCondominium | null;
  permis: NeighbourhoodPermits | null;
  ventes: NeighbourhoodSales | null;
};

type Json = Record<string, unknown>;

const obj = (value: unknown): Json | null =>
  value != null && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : null;
const num = (value: unknown, max = 1e9): number | null =>
  typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max ? value : null;
const int = (value: unknown, max = 1e9): number | null => {
  const found = num(value, max);
  return found == null ? null : Math.round(found);
};
const text = (value: unknown, max = 200): string | null =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
const list = (value: unknown, max: number): Json[] =>
  Array.isArray(value)
    ? value
        .map(obj)
        .filter((item): item is Json => item != null)
        .slice(0, max)
    : [];
const day = (value: unknown): string | null => {
  const found = text(value, 10);
  return found && /^\d{4}-\d{2}-\d{2}$/.test(found) ? found : null;
};
const monthOf = (value: unknown): string | null => {
  const found = text(value, 10)?.slice(0, 7) ?? null;
  return found && /^\d{4}-\d{2}$/.test(found) ? found : null;
};
const round50 = (value: number | null) => (value == null ? null : Math.round(value / 50) * 50);
const level = (value: unknown, max: number): number | null => {
  const found = int(value, max);
  return found != null && found >= 1 ? found : null;
};
const propertyType = (value: unknown): 'maison' | 'appartement' | null =>
  value === 'maison' || value === 'appartement' ? value : null;
const year = (value: unknown): number | null => {
  const found = int(value, 2200);
  return found != null && found >= 1500 ? found : null;
};
// Une rue sans numéro : un texte qui commence par un chiffre n'en est pas une ; la rue inventée du
// dossier de démonstration d'Academia ne s'écrit pas (correctifs 161, M114).
const street = (value: unknown): string | null => {
  const found = text(value, 120);
  return found && !/^\d/.test(found) && !isDemonstrationStreet(found) ? found : null;
};
const source = (block: Json): BlockSource => ({ date: day(block.date) });

// ─── La forme d'ACM, relue champ par champ (réponse de la source ou instantané en base) ──────────

// La fourchette de surface des ventes : deux bornes de 9 à 1 000 m² (l'API de Laurent), la plus
// petite d'abord ; sinon aucune, jamais une borne seule.
function surfaceRange(
  minValue: unknown,
  maxValue: unknown,
): { surfaceMin: number | null; surfaceMax: number | null } {
  const min = int(minValue, 1000);
  const max = int(maxValue, 1000);
  return min != null && max != null && min >= 9 && min < max
    ? { surfaceMin: min, surfaceMax: max }
    : { surfaceMin: null, surfaceMax: null };
}

function sales(block: Json): NeighbourhoodSales {
  return {
    ...source(block),
    type: propertyType(block.type),
    rooms: int(block.rooms, 100),
    ...surfaceRange(block.surfaceMin, block.surfaceMax),
    since: year(block.since),
    listRadius: int(block.listRadius, 10_000),
    list: list(block.list, 50).flatMap((sale) => {
      const price = int(sale.price);
      const month = monthOf(sale.month);
      return price != null && price > 0 && month
        ? [
            {
              month,
              type: propertyType(sale.type),
              rooms: int(sale.rooms, 100),
              surface: int(sale.surface, 100_000),
              price,
              distance: round50(num(sale.distance, 100_000)),
              street: street(sale.street),
            },
          ]
        : [];
    }),
  };
}

function planningLevel(value: unknown): PlanningLevel {
  const found = obj(value);
  const counts = obj(found?.counts);
  return {
    counts: Object.fromEntries(
      PLANNING_CATEGORIES.map((category) => [category, int(counts?.[category], 10_000) ?? 0]),
    ) as Record<PlanningCategory, number>,
    nearest: int(found?.nearest, 100_000),
  };
}
function planning(block: Json): NeighbourhoodPlanning {
  return {
    ...source(block),
    parcel: planningLevel(block.parcel),
    within40: planningLevel(block.within40),
    within300: planningLevel(block.within300),
  };
}

const PERMIT_STATES = ['autorise', 'commence', 'termine'] as const;
function permits(block: Json): NeighbourhoodPermits {
  return {
    ...source(block),
    radius: int(block.radius, 100_000),
    since: year(block.since),
    build: list(block.build, 30).map((permit) => ({
      authorizedOn: day(permit.authorizedOn),
      state: (PERMIT_STATES as readonly unknown[]).includes(permit.state)
        ? (permit.state as NeighbourhoodPermit['state'])
        : null,
      dwellings: int(permit.dwellings, 10_000),
      surface: int(permit.surface, 1_000_000),
      distance: int(permit.distance, 100_000),
      street: street(permit.street),
    })),
  };
}

function risks(block: Json): NeighbourhoodRisks {
  const disasters = obj(block.disasters);
  const count = int(disasters?.count, 10_000);
  return {
    ...source(block),
    clay: level(block.clay, 3),
    earthquake: level(block.earthquake, 5),
    radon: level(block.radon, 3),
    floodArea: text(block.floodArea, 120),
    disasters: count != null ? { count, latest: day(disasters?.latest) } : null,
  };
}

function population(block: Json): NeighbourhoodPopulation {
  return {
    ...source(block),
    radius: int(block.radius, 100_000),
    inhabitants: int(block.inhabitants, 10_000_000),
    households: int(block.households, 10_000_000),
    peoplePerHousehold: num(block.peoplePerHousehold, 20),
  };
}

function condominium(block: Json): NeighbourhoodCondominium {
  return {
    ...source(block),
    linkedToAddress: block.linkedToAddress === true,
    distance: int(block.distance, 100_000),
    dwellingLots: int(block.dwellingLots, 100_000),
    builtFrom: year(block.builtFrom),
    builtTo: year(block.builtTo),
    syndicMandateEnded: day(block.syndicMandateEnded),
    syndicMandateActive:
      typeof block.syndicMandateActive === 'boolean' ? block.syndicMandateActive : null,
  };
}

const READERS: { [K in NeighbourhoodBlockKey]: (block: Json) => NeighbourhoodBlocks[K] } = {
  urbanisme: planning,
  risques: risks,
  population,
  copropriete: condominium,
  permis: permits,
  ventes: sales,
};

function readAll(blocks: Json): NeighbourhoodBlocks {
  const read = <K extends NeighbourhoodBlockKey>(key: K): NeighbourhoodBlocks[K] => {
    const block = obj(blocks[key]);
    return block ? READERS[key](block) : null;
  };
  return {
    urbanisme: read('urbanisme'),
    risques: read('risques'),
    population: read('population'),
    copropriete: read('copropriete'),
    permis: read('permis'),
    ventes: read('ventes'),
  };
}

// Un bloc qui dirait quelque chose au vendeur : jamais un écran vide ; une copropriété sans échelle
// (ni à l'adresse, ni à une distance connue) n'est pas montrée.
export function isShowableBlock(blocks: NeighbourhoodBlocks, key: NeighbourhoodBlockKey): boolean {
  switch (key) {
    case 'risques': {
      const r = blocks.risques;
      return (
        r != null &&
        (r.clay != null ||
          r.earthquake != null ||
          r.radon != null ||
          r.floodArea != null ||
          r.disasters != null)
      );
    }
    case 'population':
      return blocks.population?.inhabitants != null;
    case 'copropriete': {
      const c = blocks.copropriete;
      return (
        c != null &&
        (c.linkedToAddress || c.distance != null) &&
        (c.dwellingLots != null ||
          c.builtFrom != null ||
          c.builtTo != null ||
          c.syndicMandateEnded != null ||
          c.syndicMandateActive != null)
      );
    }
    default:
      return blocks[key] != null;
  }
}

// L'instantané relu en base : seuls les blocs qu'il porte, relus de nouveau.
export function readStoredNeighbourhood(json: unknown): NeighbourhoodBlocks {
  return readAll(obj(json) ?? {});
}

// Les blocs cochés, prêts à garder : jamais une autre clé.
export function pickNeighbourhoodBlocks(
  blocks: NeighbourhoodBlocks,
  keys: readonly NeighbourhoodBlockKey[],
): Partial<NeighbourhoodBlocks> {
  return Object.fromEntries(
    NEIGHBOURHOOD_BLOCK_KEYS.filter(
      (key) => keys.includes(key) && isShowableBlock(blocks, key),
    ).map((key) => [key, blocks[key]]),
  );
}

// ─── La réponse de la source, ramenée à la forme d'ACM ──────────────────────────────────────────

// Seul un bloc que la source dit lu passe au vendeur. Mission 161 — « aucun » (lu, rien trouvé) est
// une information pour l'urbanisme, les permis et les ventes (« Rien de relevé », « Aucun permis… »),
// jamais pour les autres blocs ; « non_verifie » ne passe jamais.
function readable(value: unknown, emptyIsNews = false): Json | null {
  const block = obj(value);
  if (!block) return null;
  if (block.etat === 'ok') return block;
  return emptyIsNews && block.etat === 'aucun' ? block : null;
}

// Ce que la source a dit de chaque bloc, pour le panneau du conseiller (un bloc qui ne se propose
// pas dit pourquoi).
export type NeighbourhoodBlockStatus = 'ok' | 'empty' | 'unchecked' | 'unread';
const SOURCE_KEYS: Record<NeighbourhoodBlockKey, string> = {
  urbanisme: 'urbanisme',
  risques: 'risques',
  population: 'population',
  copropriete: 'copropriete',
  permis: 'permis',
  ventes: 'ventes',
};
export function neighbourhoodBlockStatuses(
  json: unknown,
): Record<NeighbourhoodBlockKey, NeighbourhoodBlockStatus> {
  const blocks = obj(obj(json)?.blocs) ?? {};
  return Object.fromEntries(
    NEIGHBOURHOOD_BLOCK_KEYS.map((key) => {
      const etat = obj(blocks[SOURCE_KEYS[key]])?.etat;
      const status: NeighbourhoodBlockStatus =
        etat === 'ok'
          ? 'ok'
          : etat === 'aucun'
            ? 'empty'
            : etat === 'non_verifie' || etat === 'non vérifié'
              ? 'unchecked'
              : 'unread';
      return [key, status];
    }),
  ) as Record<NeighbourhoodBlockKey, NeighbourhoodBlockStatus>;
}

const LEVELS = { parcelle: 'parcel', a40m: 'within40', a300m: 'within300' } as const;

function sourcePlanning(block: Json): Json {
  const levels = obj(block.niveaux);
  const elements = list(block.elements, 60);
  return {
    date: block.date,
    ...Object.fromEntries(
      (Object.keys(LEVELS) as (keyof typeof LEVELS)[]).map((name) => {
        const distances = elements
          .filter((element) => element.niveau === name)
          .map((element) => num(element.distance, 100_000))
          .filter((distance): distance is number => distance != null);
        return [
          LEVELS[name],
          {
            counts: obj(levels?.[name]) ?? {},
            nearest: distances.length ? Math.min(...distances) : null,
          },
        ];
      }),
    ),
  };
}

// « Exposition moyenne » → 2 ; « 4 - MOYENNE » → 4 ; « 1 » → 1.
function clayLevel(value: unknown): number | null {
  const found = text(value, 60)?.toLowerCase() ?? '';
  if (/fort/.test(found)) return 3;
  if (/moyen/.test(found)) return 2;
  if (/faible/.test(found)) return 1;
  return null;
}
const leadingDigit = (value: unknown): number | null => {
  const found = text(value, 60)?.match(/^\s*(\d)/);
  return found ? Number(found[1]) : null;
};
const floodName = (value: unknown): string | null =>
  text(value, 120)?.replace(/^TRI\s+/i, '') || null;

function sourceRisks(block: Json): Json {
  const disasters = obj(block.catastrophesNaturelles);
  return {
    date: block.date,
    clay: clayLevel(block.argile),
    earthquake: leadingDigit(block.seisme),
    radon: leadingDigit(block.radon),
    floodArea: floodName(block.tri),
    disasters: disasters ? { count: disasters.nombre, latest: disasters.derniere } : null,
  };
}

function builtPeriod(value: unknown): { builtFrom: number | null; builtTo: number | null } {
  const found = text(value, 30) ?? '';
  const range = found.match(/^(\d{4})\s*-\s*(\d{4})$/);
  if (range) return { builtFrom: Number(range[1]), builtTo: Number(range[2]) };
  const before = found.match(/avant\s*(\d{4})/i);
  if (before) return { builtFrom: null, builtTo: Number(before[1]) };
  const after = found.match(/apr[eè]s\s*(\d{4})/i);
  if (after) return { builtFrom: Number(after[1]), builtTo: null };
  return { builtFrom: null, builtTo: null };
}

// Le jour où la source a calculé la vue (« calculeLe »).
export function neighbourhoodComputedOn(json: unknown): string | null {
  const root = obj(json);
  return root ? day(root.calculeLe) : null;
}

export function parseNeighbourhoodBlocks(json: unknown): NeighbourhoodBlocks | null {
  const root = obj(json);
  const blocks = root ? obj(root.blocs) : null;
  if (!blocks) return null;
  const ventes = readable(blocks.ventes, true);
  const urbanisme = readable(blocks.urbanisme, true);
  const permis = readable(blocks.permis, true);
  const risques = readable(blocks.risques);
  const populationBlock = readable(blocks.population);
  const copropriete = readable(blocks.copropriete);

  return readAll({
    ventes: ventes && {
      date: ventes.date,
      type: ventes.type,
      rooms: ventes.pieces,
      surfaceMin: ventes.surfaceMin,
      surfaceMax: ventes.surfaceMax,
      since: ventes.depuis,
      listRadius: ventes.anneau,
      list: list(ventes.liste, 50).map((sale) => ({
        month: sale.mois ?? sale.date,
        type: sale.type,
        rooms: sale.pieces,
        surface: sale.surface,
        price: sale.prix,
        distance: sale.distance,
        street: sale.rue,
      })),
    },
    urbanisme: urbanisme && sourcePlanning(urbanisme),
    permis: permis && {
      date: permis.date,
      radius: permis.rayon,
      since: permis.depuis,
      build: list(permis.construire, 30).map((permit) => ({
        authorizedOn: permit.autorise,
        state: permit.etat,
        dwellings: permit.logements,
        surface: permit.surface,
        distance: permit.distance,
        // La rue seule : la vue « bien-client » ne donne qu'elle ; une autre vue n'en laisse rien
        // passer.
        street: permit.rue,
      })),
    },
    risques: risques && sourceRisks(risques),
    population: populationBlock && {
      date: populationBlock.date,
      radius: populationBlock.rayon,
      inhabitants: populationBlock.habitants,
      households: populationBlock.menages,
      peoplePerHousehold: populationBlock.personnesParMenage,
    },
    copropriete: copropriete && {
      date: copropriete.date,
      linkedToAddress: copropriete.rattachement === 'adresse',
      distance: copropriete.distance,
      dwellingLots: copropriete.lotsHabitation,
      ...builtPeriod(copropriete.periodeConstruction),
      syndicMandateEnded: copropriete.finMandat,
      syndicMandateActive: copropriete.mandatEnCours,
    },
  });
}
