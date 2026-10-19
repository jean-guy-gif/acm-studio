import type { ProspectingStep } from '@/features/competitor-mandate/services/mandate-columns';
import { OPPOSED_MESSAGE } from '@/features/prospecting/services/opposition';
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

// Mission 102 — tout courrier porte la carte professionnelle de l'agence et qui l'a délivrée :
// sans elles, aucune version ne se prépare.
export const PROFESSIONAL_CARD_MISSING_MESSAGE =
  'Renseignez la carte professionnelle de l’agence (Administration → Identité)';

// Mission 98 — une adresse de la liste « Ne plus solliciter » ne reçoit plus de courrier.
export type FileBlocker =
  | 'opposed'
  | 'address_unconfirmed'
  | 'phone_missing'
  | 'agency_address_missing'
  | 'professional_card_missing';

export const FILE_BLOCKER_MESSAGES: Record<FileBlocker, string> = {
  opposed: OPPOSED_MESSAGE,
  address_unconfirmed: ADDRESS_TO_CONFIRM_MESSAGE,
  phone_missing: PHONE_MISSING_MESSAGE,
  agency_address_missing: AGENCY_ADDRESS_MISSING_MESSAGE,
  professional_card_missing: PROFESSIONAL_CARD_MISSING_MESSAGE,
};

// Ce qui retient un dossier, dans l'ordre où le conseiller peut le lever. Le dossier s'ouvre dès
// le mandat signé ; aucun dossier propriétaire sans adresse confirmée, ni sans le téléphone qui
// permet de s'opposer à un nouveau contact, ni sans l'adresse de l'agence (mission 90). Et
// d'abord : aucun courrier à un propriétaire qui a demandé à ne plus être sollicité (mission 98)
// — rien de ce que le conseiller peut renseigner ne lève ce refus. Enfin, pour les DEUX
// versions : pas de courrier sans le numéro de carte professionnelle ni l'autorité qui l'a
// délivrée (mission 102).
export function fileBlocker(input: {
  version: ProspectingFileVersion;
  // L'adresse du bien est sur la liste « Ne plus solliciter » de l'agence.
  opposed: boolean;
  addressConfirmed: boolean;
  advisorPhone: string | null;
  // L'adresse postale de l'agence (Administration → Identité).
  agencyAddress: string | null;
  // La carte professionnelle de l'agence et la CCI ou la préfecture qui l'a délivrée.
  professionalCard: string | null;
  professionalCardIssuer: string | null;
}): FileBlocker | null {
  // Mission 109 — pendant la bêta, aucun courrier sur un bien « Ne plus solliciter », ni au
  // propriétaire ni au confrère (décision de Laurent, 19/10).
  if (input.opposed) {
    return 'opposed';
  }
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
  if (!input.professionalCard?.trim() || !input.professionalCardIssuer?.trim()) {
    return 'professional_card_missing';
  }
  return null;
}
