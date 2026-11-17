// Mission 158 — la vue « bien » d'Academia (le dossier d'adresse, pour le conseiller seul), relue
// champ par champ : ce module construit lui-même chaque objet, rien de la réponse n'est recopié tel
// quel (liste d'autorisation). La valeur indicative d'Academia est rangée à part (`indicative`) :
// elle ne s'affiche qu'au conseiller, ne s'enregistre jamais et n'atteint jamais le vendeur
// (CLAUDE.md, décision de Jean-Guy du 17/11). Pur.

export type SourceInfo = {
  // `etat` d'Academia : « ok », sinon la source n'a pas pu être lue (dit, jamais « rien », M98).
  ok: boolean;
  source: string | null;
  date: string | null;
  note: string | null;
};

export type ViewSale = {
  date: string;
  price: number;
  surface: number | null;
  rooms: number | null;
  land: number | null;
  pricePerSquareMeter: number | null;
  distance: number | null;
  street: string | null;
};

export type ViewSales = SourceInfo & {
  type: string | null;
  rooms: number | null;
  since: number | null;
  // Le rayon retenu par Academia pour la liste, et les ventes cumulées par rayon.
  listRadius: number | null;
  rings: { radius: number; sales: number }[];
  atAddress: {
    date: string;
    price: number;
    surface: number | null;
    rooms: number | null;
    type: string | null;
    pricePerSquareMeter: number | null;
  } | null;
  list: ViewSale[];
};

export type ViewDpe = SourceInfo & {
  latest: {
    date: string | null;
    label: string | null;
    type: string | null;
    surface: number | null;
    year: number | null;
    matches: boolean | null;
    surfaceGapPercent: number | null;
  } | null;
};

export type ViewPlanning = SourceInfo & {
  parcel: string | null;
  sentence: string | null;
  zone: string | null;
  elements: { level: string; label: string | null; distance: number | null }[];
};

export type ViewPermits = SourceInfo & {
  radius: number | null;
  since: number | null;
  build: {
    authorizedOn: string | null;
    state: string | null;
    dwellings: number | null;
    surface: number | null;
    distance: number | null;
    address: string | null;
  }[];
  // « non_verifie » : les permis de démolir n'ont pas été vérifiés (dit au conseiller seul).
  demolitionUnchecked: boolean;
};

export type ViewRisks = SourceInfo & {
  clay: string | null;
  earthquake: string | null;
  radon: string | null;
  floodArea: string | null;
  disasters: { count: number; latest: string | null } | null;
  planningZone: string | null;
};

export type ViewPopulation = SourceInfo & {
  radius: number | null;
  inhabitants: number | null;
  households: number | null;
  peoplePerHousehold: number | null;
};

export type ViewCondominium = SourceInfo & {
  name: string | null;
  dwellingLots: number | null;
  builtPeriod: string | null;
  syndicMandateEnded: string | null;
  syndicMandateActive: boolean | null;
};

// La valeur indicative d'Academia : pour le conseiller seul, jamais enregistrée, jamais montrée au
// vendeur.
export type IndicativeValue = {
  low: number;
  high: number;
  middle: number | null;
  pricePerSquareMeter: number | null;
  reliability: string | null;
  mention: string | null;
  date: string | null;
};

export type AcademiaPropertyView = {
  computedOn: string | null;
  indicative: IndicativeValue | null;
  sales: ViewSales | null;
  dpe: ViewDpe | null;
  planning: ViewPlanning | null;
  permits: ViewPermits | null;
  risks: ViewRisks | null;
  population: ViewPopulation | null;
  condominium: ViewCondominium | null;
};

type Json = Record<string, unknown>;

const obj = (value: unknown): Json | null =>
  value != null && typeof value === 'object' && !Array.isArray(value) ? (value as Json) : null;
const num = (value: unknown): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;
const text = (value: unknown, max = 300): string | null =>
  typeof value === 'string' && value.trim() ? value.trim().slice(0, max) : null;
// Une phrase d'Academia montrée telle quelle (mention, note) : jamais le mot « estimation » à
// l'écran (M105) ; une phrase qui le dirait n'est pas montrée.
const phrase = (value: unknown, max = 300): string | null => {
  const found = text(value, max);
  return found && !/estimat/i.test(found) ? found : null;
};
const bool = (value: unknown): boolean | null => (typeof value === 'boolean' ? value : null);
const list = (value: unknown, max = 50): Json[] =>
  Array.isArray(value)
    ? value
        .map(obj)
        .filter((item): item is Json => item != null)
        .slice(0, max)
    : [];

function sourceOf(block: Json): SourceInfo {
  return {
    ok: block.etat === 'ok',
    source: text(block.source, 200),
    date: text(block.date, 30),
    note: phrase(block.note, 300),
  };
}

function sales(block: Json | null): ViewSales | null {
  if (!block) return null;
  const at = obj(block.venteALAdresse);
  const atPrice = at ? num(at.prix) : null;
  return {
    ...sourceOf(block),
    type: text(block.type, 30),
    rooms: num(block.pieces),
    since: num(block.depuis),
    listRadius: num(block.anneau),
    rings: list(block.anneaux, 12).flatMap((ring) => {
      const radius = num(ring.rayon);
      const count = num(ring.ventes);
      return radius != null && count != null ? [{ radius, sales: count }] : [];
    }),
    atAddress:
      at && atPrice != null && text(at.date, 30)
        ? {
            date: text(at.date, 30) as string,
            price: atPrice,
            surface: num(at.surface),
            rooms: num(at.pieces),
            type: text(at.type, 30),
            pricePerSquareMeter: num(at.prixM2),
          }
        : null,
    list: list(block.liste, 50).flatMap((sale) => {
      const price = num(sale.prix);
      const date = text(sale.date, 30);
      return price != null && date
        ? [
            {
              date,
              price,
              surface: num(sale.surface),
              rooms: num(sale.pieces),
              land: num(sale.terrain),
              pricePerSquareMeter: num(sale.prixM2),
              distance: num(sale.distance),
              street: text(sale.rue, 120),
            },
          ]
        : [];
    }),
  };
}

function dpe(block: Json | null): ViewDpe | null {
  if (!block) return null;
  const latest = obj(block.dernier);
  return {
    ...sourceOf(block),
    latest: latest
      ? {
          date: text(latest.date, 30),
          label: text(latest.etiquette, 2),
          type: text(latest.type, 30),
          surface: num(latest.surface),
          year: num(latest.annee),
          matches: bool(latest.correspond),
          surfaceGapPercent: num(latest.ecartSurfacePct),
        }
      : null,
  };
}

function planning(block: Json | null): ViewPlanning | null {
  if (!block) return null;
  const zone = obj(block.zonagePlu);
  return {
    ...sourceOf(block),
    parcel: text(block.parcelle, 40),
    sentence: phrase(block.phrase, 400),
    zone: zone ? text(zone.libelle, 120) : null,
    elements: list(block.elements, 30).flatMap((element) => {
      const level = text(element.niveau, 20);
      return level
        ? [{ level, label: text(element.libelle, 160), distance: num(element.distance) }]
        : [];
    }),
  };
}

function permits(block: Json | null): ViewPermits | null {
  if (!block) return null;
  return {
    ...sourceOf(block),
    radius: num(block.rayon),
    since: num(block.depuis),
    build: list(block.construire, 30).map((permit) => ({
      authorizedOn: text(permit.autorise, 30),
      state: text(permit.etat, 30),
      dwellings: num(permit.logements),
      surface: num(permit.surface),
      distance: num(permit.distance),
      address: text(permit.adresse, 160),
    })),
    demolitionUnchecked: block.demolirEtat === 'non_verifie',
  };
}

function risks(block: Json | null): ViewRisks | null {
  if (!block) return null;
  const disasters = obj(block.catastrophesNaturelles);
  const zone = obj(block.zonagePlu);
  const count = disasters ? num(disasters.nombre) : null;
  return {
    ...sourceOf(block),
    clay: text(block.argile, 60),
    earthquake: text(block.seisme, 60),
    radon: text(block.radon, 20),
    floodArea: text(block.tri, 120),
    disasters: count != null ? { count, latest: text(disasters?.derniere, 30) } : null,
    planningZone: zone ? text(zone.libelle, 120) : null,
  };
}

function population(block: Json | null): ViewPopulation | null {
  if (!block) return null;
  return {
    ...sourceOf(block),
    radius: num(block.rayon),
    inhabitants: num(block.habitants),
    households: num(block.menages),
    peoplePerHousehold: num(block.personnesParMenage),
  };
}

function condominium(block: Json | null): ViewCondominium | null {
  if (!block) return null;
  return {
    ...sourceOf(block),
    name: text(block.nom, 160),
    dwellingLots: num(block.lotsHabitation),
    builtPeriod: text(block.periodeConstruction, 30),
    syndicMandateEnded: text(block.finMandat, 30),
    syndicMandateActive: bool(block.mandatEnCours),
  };
}

function indicative(block: Json | null): IndicativeValue | null {
  if (!block || block.etat !== 'ok') return null;
  const low = num(block.bas);
  const high = num(block.haut);
  if (low == null || high == null || low > high) return null;
  return {
    low,
    high,
    middle: num(block.prix),
    pricePerSquareMeter: num(block.prixM2),
    reliability: text(block.fiabilite, 30),
    mention: phrase(block.mention, 200),
    date: text(block.date, 30),
  };
}

export function parsePropertyView(json: unknown): AcademiaPropertyView | null {
  const root = obj(json);
  const blocks = root ? obj(root.blocs) : null;
  if (!root || !blocks) return null;
  return {
    computedOn: text(root.calculeLe, 30),
    indicative: indicative(obj(blocks.estimation)),
    sales: sales(obj(blocks.ventes)),
    dpe: dpe(obj(blocks.dpe)),
    planning: planning(obj(blocks.urbanisme)),
    permits: permits(obj(blocks.permis)),
    risks: risks(obj(blocks.risques)),
    population: population(obj(blocks.population)),
    condominium: condominium(obj(blocks.copropriete)),
  };
}
