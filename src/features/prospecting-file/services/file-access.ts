import type { ProspectingStep } from '@/features/competitor-mandate/services/mandate-columns';
import {
  PROSPECTING_FILE_VERSIONS,
  type ProspectingFileVersion,
} from '@/features/prospecting-file/types';

// Mission 84 — quelle version du dossier pour ce concurrent, et ce qui empêche de la préparer.

// Exclusivité → confrère ; particulier ou mandat simple → propriétaire ; inconnu → le
// conseiller choisit.
export function fileVersions(step: ProspectingStep): ProspectingFileVersion[] {
  if (step === 'colleague') {
    return ['colleague'];
  }
  if (step === 'owner') {
    return ['owner'];
  }
  return ['colleague', 'owner'];
}

export function isFileVersion(value: unknown): value is ProspectingFileVersion {
  return (PROSPECTING_FILE_VERSIONS as readonly unknown[]).includes(value);
}

// La version à ouvrir : la seule possible, sinon celle que le conseiller a choisie ; null tant
// qu'il n'a pas choisi (ou a demandé une version que ce concurrent n'ouvre pas).
export function resolveFileVersion(
  step: ProspectingStep,
  requested: unknown,
): ProspectingFileVersion | null {
  const versions = fileVersions(step);
  if (versions.length === 1) {
    return versions[0];
  }
  return isFileVersion(requested) && versions.includes(requested) ? requested : null;
}

export const ADDRESS_TO_CONFIRM_MESSAGE = 'Adresse à confirmer avant d’envoyer';
export const PHONE_MISSING_MESSAGE =
  'Renseignez votre téléphone dans « Mon profil » : il figure dans la mention « Pour ne plus être sollicité ».';

// Mission 90 — le courrier à un propriétaire porte l'adresse de l'agence (responsable du
// traitement) : sans elle, il ne se prépare pas.
export const AGENCY_ADDRESS_MISSING_MESSAGE =
  'Ajoutez l’adresse de l’agence dans Administration → Identité pour préparer ce courrier.';

export type FileBlocker = 'address_unconfirmed' | 'phone_missing' | 'agency_address_missing';

export const FILE_BLOCKER_MESSAGES: Record<FileBlocker, string> = {
  address_unconfirmed: ADDRESS_TO_CONFIRM_MESSAGE,
  phone_missing: PHONE_MISSING_MESSAGE,
  agency_address_missing: AGENCY_ADDRESS_MISSING_MESSAGE,
};

// Ce qui retient un dossier, dans l'ordre où le conseiller peut le lever. Le dossier s'ouvre dès
// le mandat signé ; aucun dossier propriétaire sans adresse confirmée, ni sans le téléphone qui
// permet de s'opposer à un nouveau contact, ni sans l'adresse de l'agence (mission 90).
export function fileBlocker(input: {
  version: ProspectingFileVersion;
  addressConfirmed: boolean;
  advisorPhone: string | null;
  // L'adresse postale de l'agence (Administration → Identité).
  agencyAddress: string | null;
}): FileBlocker | null {
  if (input.version === 'owner') {
    if (!input.addressConfirmed) {
      return 'address_unconfirmed';
    }
    if (!input.advisorPhone?.trim()) {
      return 'phone_missing';
    }
    if (!input.agencyAddress?.trim()) {
      return 'agency_address_missing';
    }
  }
  return null;
}
