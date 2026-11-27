import type { AddressSource, ProspectingSender } from '@/features/prospecting-file/types';

// Mission 90 — la mention en pied du courrier adressé à un propriétaire (version propriétaire).
// Mission 102 — elle dit VRAI sur l'origine de l'adresse, et porte tout ce qu'un propriétaire
// doit savoir :
//   • qui est responsable du traitement : l'agence, avec son adresse ;
//   • d'où vient son adresse : déduite par le Localisateur de données publiques, ou relevée par
//     le conseiller — jamais « d'une annonce publiée », qui ne donne pas l'adresse ;
//     (mission 103) c'est la source D'ORIGINE qui parle : une adresse du Localisateur que le
//     conseiller a seulement confirmée reste « déterminée à partir de données publiques », et
//     une adresse dont l'origine n'est plus connue prend une formule vraie dans les deux cas ;
//   • à quoi elle sert, et combien de temps elle est gardée ;
//   • ses droits d'accès, d'opposition et d'effacement, et comment les exercer : le téléphone ou
//     l'e-mail du conseiller ;
//   • le droit de saisir la CNIL, et la page de confidentialité.
// TEXTE PROPOSÉ — à faire relire par un juriste avant toute vente. Pur : il ne lit que
// l'expéditeur du courrier et l'origine de l'adresse. Le courrier n'est pas préparé sans
// l'adresse de l'agence ni le téléphone du conseiller (file-access.ts) : la mention est donc
// toujours complète.

// La durée de conservation d'une adresse de propriétaire sans contact (décision de Laurent,
// 12/10/2026). La purge nocturne de la base applique la même (`purge_stale_owner_addresses`).
export const OWNER_ADDRESS_RETENTION_YEARS = 3;

export const ADDRESS_SOURCE_MENTIONS: Record<AddressSource, string> = {
  locator:
    'Votre adresse a été déterminée à partir de données publiques (diagnostic de performance énergétique, registre des copropriétés ou cadastre) et de l’annonce de votre bien.',
  advisor: 'Votre adresse a été relevée par notre conseiller à partir de l’annonce de votre bien.',
  verified:
    'Votre adresse a été déterminée à partir de l’annonce de votre bien et de données publiques, puis vérifiée par notre conseiller.',
};

// Mission 120 — le courrier né d'une recherche acquéreur dit sa propre finalité.
export const OWNER_PURPOSE =
  'Finalité\u00a0: vous proposer nos services pour la vente de votre bien.';
export const BUYER_SEARCH_PURPOSE =
  'Finalité\u00a0: vous présenter une recherche qui correspond à votre bien.';

export function ownerLegalMention(
  sender: Pick<
    ProspectingSender,
    'agencyName' | 'postalAddress' | 'phone' | 'email' | 'privacyUrl'
  >,
  addressSource: AddressSource,
  purpose: string = OWNER_PURPOSE,
): string {
  const responsible = [sender.agencyName.trim(), sender.postalAddress?.trim()]
    .filter(Boolean)
    .join(', ');
  const reach = [sender.phone?.trim(), sender.email.trim()].filter(Boolean).join(' ou ');
  return [
    `Responsable du traitement\u00a0: ${responsible}.`,
    ADDRESS_SOURCE_MENTIONS[addressSource],
    purpose,
    `Conservation\u00a0: ${OWNER_ADDRESS_RETENTION_YEARS} ans au plus sans contact entre nous.`,
    `Vos droits d’accès, d’opposition et d’effacement\u00a0: ${reach}.`,
    'Vous pouvez saisir la CNIL (cnil.fr).',
    `Confidentialité\u00a0: ${sender.privacyUrl}.`,
  ].join(' ');
}
