import {
  arrondissementCityOfInsee,
  arrondissementLabel,
  readArrondissementName,
  resolveArrondissement,
} from '@/features/competitor-search/utils/arrondissements';
import { normalizeCommuneName } from '@/features/competitor-search/utils/commune-name';
import { COMMUNE_ALIASES } from '@/features/meeting-conclusion/services/commune-alias';
import { addressKey } from '@/features/prospecting/services/address-key';

// Mission 102 — l'adresse tapée pour une opposition inscrite à la main. Pur.
//
// Mission 103 — une opposition inscrite doit BLOQUER. La clé d'une carte finit par sa commune
// (« 14 chemin des oliviers cagnes sur mer ») et ne porte pas le code postal : une adresse tapée
// sans commune (« 14 chemin des Oliviers 06800 ») donnait une clé qui ne rejoignait jamais
// aucune carte, alors que l'écran annonçait le contraire. Il faut donc une commune RECONNUE —
// tapée, ou déduite du code postal par le référentiel des communes (geo.api.gouv.fr) — et la clé
// est construite par `addressKey`, la fonction des cartes, sur « rue, commune ».
export const MANUAL_OPPOSITION_MAX_LENGTH = 200;

export const MANUAL_OPPOSITION_INCOMPLETE =
  'Saisissez l’adresse complète : numéro, rue, code postal, ville.';
export const MANUAL_OPPOSITION_NO_COMMUNE =
  'Ajoutez le code postal, ou la ville après une virgule : sans commune, l’adresse ne bloquerait rien.';
export const MANUAL_OPPOSITION_UNKNOWN_POSTAL_CODE =
  'Ce code postal n’est pas reconnu : vérifiez l’adresse.';
export const MANUAL_OPPOSITION_UNKNOWN_COMMUNE =
  'Cette commune n’est pas reconnue : vérifiez son nom, ou ajoutez le code postal.';
export const MANUAL_OPPOSITION_MISMATCH =
  'La ville ne correspond pas au code postal : vérifiez l’adresse.';
export const MANUAL_OPPOSITION_ARRONDISSEMENT =
  'Indiquez l’arrondissement, ou le code postal : la ville seule ne bloquerait rien.';
export const MANUAL_OPPOSITION_CHOOSE =
  'Ce code postal couvre plusieurs communes : choisissez la commune.';
export const MANUAL_OPPOSITION_UNAVAILABLE =
  'Le référentiel des communes ne répond pas : l’adresse n’est pas inscrite. Réessayez.';

export type ManualAddressParts = {
  // « 14 chemin des Oliviers » — le numéro et la voie, tels que tapés.
  street: string;
  postalCode: string | null;
  // La commune tapée, ou null : elle se déduira du code postal.
  commune: string | null;
};

// Une commune du référentiel : son code INSEE et son nom officiel.
export type ManualCommune = { code: string; name: string };

export type ManualOppositionDecision =
  // `display` : l'adresse comprise, montrée avant d'inscrire.
  | { status: 'ready'; key: string; display: string }
  // Le code postal couvre plusieurs communes : le conseiller choisit.
  | { status: 'choose'; communes: ManualCommune[] }
  | { status: 'error'; error: string };

const edges = (text: string): string => text.replace(/^[\s,;·—–-]+|[\s,;·—–-]+$/g, '');

// L'adresse tapée, découpée : la voie, le code postal, la commune. null : pas une adresse
// (ni numéro, ni rue). Rien n'est deviné : sans code postal, la commune suit la dernière virgule.
export function parseManualAddress(raw: unknown): ManualAddressParts | null {
  const text =
    typeof raw === 'string'
      ? raw
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/[\s,]+france$/i, '')
      : '';
  if (text === '' || text.length > MANUAL_OPPOSITION_MAX_LENGTH) {
    return null;
  }
  let street = text;
  let postalCode: string | null = null;
  let commune: string | null = null;
  // Le dernier groupe de cinq chiffres qui n'ouvre pas l'adresse (en tête, c'est un numéro).
  const postal = [...text.matchAll(/\b\d{5}\b/g)].filter((match) => match.index > 0).pop();
  if (postal) {
    postalCode = postal[0];
    street = edges(text.slice(0, postal.index));
    commune = edges(text.slice(postal.index + 5)) || null;
  }
  // « 14 chemin des Oliviers, Cagnes-sur-Mer » ou « …, Cagnes-sur-Mer 06800 ».
  if (commune == null && street.includes(',')) {
    const comma = street.lastIndexOf(',');
    commune = edges(street.slice(comma + 1)) || null;
    street = edges(street.slice(0, comma));
  }
  // Un numéro, puis une voie : « 8 rue Foch » ; « 8 Antibes » ou « rue des Pins » n'en sont pas.
  if (!/^\d/.test(street) || street.split(' ').length < 3) {
    return null;
  }
  return { street, postalCode, commune };
}

// Le nom sous lequel le référentiel connaît la commune tapée : « Juan-les-Pins » est Antibes
// (M86), « Paris 15e » est Paris.
export function manualCommuneLookupName(commune: string): string {
  const named = readArrondissementName(commune);
  if (named != null) {
    return named.city;
  }
  const key = normalizeCommuneName(commune);
  return COMMUNE_ALIASES[key] ?? key;
}

// Ce que le référentiel a rendu (les communes du code postal, ou celles du nom tapé) décide.
// `chosenCode` : la commune choisie par le conseiller quand le code postal en couvre plusieurs.
export function decideManualOpposition(
  parts: ManualAddressParts,
  communes: ManualCommune[],
  chosenCode: string | null,
): ManualOppositionDecision {
  const wanted = parts.commune != null ? manualCommuneLookupName(parts.commune) : null;
  const named =
    wanted != null
      ? communes.filter((commune) => normalizeCommuneName(commune.name) === wanted)
      : [];
  let commune: ManualCommune | undefined;
  if (parts.postalCode != null) {
    if (communes.length === 0) {
      return { status: 'error', error: MANUAL_OPPOSITION_UNKNOWN_POSTAL_CODE };
    }
    if (wanted != null) {
      // Ville et code postal en désaccord : on ne devine pas laquelle des deux est fausse.
      if (named.length === 0) {
        return { status: 'error', error: MANUAL_OPPOSITION_MISMATCH };
      }
      [commune] = named;
    } else if (communes.length === 1) {
      [commune] = communes;
    } else {
      commune = communes.find((candidate) => candidate.code === chosenCode);
      if (commune == null) {
        return { status: 'choose', communes };
      }
    }
  } else {
    if (wanted == null) {
      return { status: 'error', error: MANUAL_OPPOSITION_NO_COMMUNE };
    }
    if (named.length === 0) {
      return { status: 'error', error: MANUAL_OPPOSITION_UNKNOWN_COMMUNE };
    }
    // Deux communes homonymes ont la même clé : la clé ne porte que le nom.
    [commune] = named;
  }

  // Paris, Lyon, Marseille : la clé d'une carte porte l'arrondissement (« paris 15 », M99).
  let communeName = commune.name;
  if (arrondissementCityOfInsee(commune.code) != null) {
    const arrondissement = resolveArrondissement(parts.commune ?? commune.name, parts.postalCode);
    if (arrondissement == null) {
      return { status: 'error', error: MANUAL_OPPOSITION_ARRONDISSEMENT };
    }
    communeName = arrondissementLabel(arrondissement);
  }

  const key = addressKey(`${parts.street}, ${communeName}`);
  if (key == null || !/^\d/.test(key)) {
    return { status: 'error', error: MANUAL_OPPOSITION_INCOMPLETE };
  }
  return { status: 'ready', key, display: `${parts.street}, ${communeName}` };
}
