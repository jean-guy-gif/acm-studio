import {
  EXPOSURES,
  GENERAL_CONDITIONS,
  GES_RATINGS,
  HEATING_TYPES,
  OUTDOOR_SPACES,
  PARKING_TYPES,
  type HeatingType,
} from '@/features/subject-property/constants/property-options';

// MISSION 78 — LES CHAMPS À LISTE. Une valeur lue sur une annonce ou une fiche n'entre dans un
// champ à liste que si elle EST une valeur de la liste : sinon le menu affichait « Non renseigné »
// en gardant la valeur cachée, et l'enregistrement répondait « Valeur non autorisée » sur un champ
// que le conseiller croyait vide (Bien'ici : « gaz individuel »). Vide plutôt que faux.

// La valeur si elle est dans la liste, sinon null.
export function listValue<T extends string>(
  value: string | null | undefined,
  list: readonly T[],
): T | null {
  return value != null && (list as readonly string[]).includes(value) ? (value as T) : null;
}

// Les seules valeurs de la liste, sans doublon, dans l'ordre reçu.
export function listValues<T extends string>(
  values: readonly string[] | null | undefined,
  list: readonly T[],
): T[] {
  const kept = (values ?? []).filter((value): value is T =>
    (list as readonly string[]).includes(value),
  );
  return [...new Set(kept)];
}

const normalize = (text: string): string => text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

type Energy = 'electric' | 'gas' | 'heat_pump' | 'fuel' | 'wood';

// Les mots que les portails emploient pour chaque énergie. La climatisation n'en est pas une :
// « Climatisation » + « Collectif » sur une fiche ne dit pas « pompe à chaleur individuelle »
// (parse-agency-brochure.ts).
const ENERGY_WORDS: [Energy, RegExp][] = [
  ['heat_pump', /\bpompes? a chaleur\b|\bpac\b|\baerothermie\b|\bgeothermie\b/],
  ['electric', /\belectri(?:que|ques|cite)\b/],
  ['gas', /\bgaz\b/],
  ['fuel', /\bfioul\b|\bfuel\b|\bmazout\b/],
  ['wood', /\bbois\b|\bgranules\b|\bpellets?\b/],
];

const INDIVIDUAL: Record<Energy, HeatingType> = {
  electric: 'individual_electric',
  gas: 'individual_gas',
  heat_pump: 'individual_heat_pump',
  fuel: 'individual_fuel',
  wood: 'individual_wood',
};

// La liste n'a de collectif que pour le gaz et le fioul : un « électrique collectif » ne se
// traduit pas.
const COLLECTIVE: Partial<Record<Energy, HeatingType>> = {
  gas: 'collective_gas',
  fuel: 'collective_fuel',
};

// Le chauffage lu sur une annonce (« gaz individuel », « radiateur électrique individuel »,
// « central » + « fuel »), traduit dans la liste — ou null s'il ne se reconnaît pas :
// - une valeur déjà dans la liste est gardée ;
// - « réseau de chaleur », « chauffage urbain » → réseau de chaleur ;
// - UNE énergie et « individuel » → individuel ; « collectif » → collectif s'il existe ;
// - une énergie seule : électrique, pompe à chaleur et bois n'existent qu'en individuel dans la
//   liste ; « gaz » ou « fioul » seul ne dit pas individuel ou collectif → vide ;
// - deux énergies, ou individuel ET collectif, ne décident rien (comme deux types de bien, M77).
export function translateHeating(
  heating: string | null | undefined,
  energySource?: string | null,
): HeatingType | null {
  const known = listValue(heating?.trim(), HEATING_TYPES);
  if (known != null) return known;

  const text = normalize([heating, energySource].filter(Boolean).join(' '));
  if (text.trim() === '') return null;

  const energies = ENERGY_WORDS.filter(([, pattern]) => pattern.test(text)).map(
    ([energy]) => energy,
  );
  const individual = /\bindividuel(?:le)?s?\b/.test(text);
  const collective = /\bcollecti(?:f|ve)s?\b/.test(text);
  if (individual && collective) return null;

  if (/\breseaux? de chaleur\b|\bchauffage urbain\b/.test(text)) {
    return energies.length === 0 && !individual ? 'collective_heat_network' : null;
  }
  if (energies.length !== 1) return null;
  const [energy] = energies;
  if (collective) return COLLECTIVE[energy] ?? null;
  if (individual) return INDIVIDUAL[energy];
  return COLLECTIVE[energy] == null ? INDIVIDUAL[energy] : null;
}

// La classe GES telle que la liste l'écrit (« d » → « D »), ou null.
export function gesListValue(value: string | null | undefined) {
  return listValue(value?.trim().toUpperCase(), GES_RATINGS);
}

type ListFields = {
  ges_rating: string | null;
  heating_type: string | null;
  exposure: string | null;
  general_condition: string | null;
  outdoor_spaces: string[];
  parking_types: string[];
};

// LA GARDE GÉNÉRALE de l'import : tout champ à liste d'un pré-remplissage ne garde que des
// valeurs de sa liste. Le chauffage, lui, est d'abord traduit.
export function keepListValues<T extends ListFields>(prefill: T, energySource?: string | null): T {
  return {
    ...prefill,
    ges_rating: gesListValue(prefill.ges_rating),
    heating_type: translateHeating(prefill.heating_type, energySource),
    exposure: listValue(prefill.exposure, EXPOSURES),
    general_condition: listValue(prefill.general_condition, GENERAL_CONDITIONS),
    outdoor_spaces: listValues(prefill.outdoor_spaces, OUTDOOR_SPACES),
    parking_types: listValues(prefill.parking_types, PARKING_TYPES),
  };
}
