import type { ProspectingSender } from '@/features/prospecting-file/types';

// Mission 90 — la mention en pied du courrier adressé à un propriétaire (version propriétaire).
// Courte, deux lignes au plus, elle dit trois choses :
//   • qui est responsable du traitement : l'agence, avec son adresse ;
//   • comment s'opposer à tout nouveau contact : le téléphone ou l'e-mail du conseiller ;
//   • que l'on peut saisir la CNIL.
// TEXTE PROPOSÉ — à faire relire par un juriste avant toute vente. Pur : il ne lit que
// l'expéditeur du courrier. Le courrier n'est pas préparé sans l'adresse de l'agence ni le
// téléphone du conseiller (file-access.ts) : la mention est donc toujours complète.
export function ownerLegalMention(
  sender: Pick<ProspectingSender, 'agencyName' | 'postalAddress' | 'phone' | 'email'>,
): string {
  const responsible = [sender.agencyName.trim(), sender.postalAddress?.trim()]
    .filter(Boolean)
    .join(', ');
  const reach = [sender.phone?.trim(), sender.email.trim()].filter(Boolean).join(' ou ');
  return [
    `Responsable du traitement : ${responsible}.`,
    'Votre adresse provient d’une annonce publiée.',
    `Pour vous opposer à tout nouveau contact : ${reach}.`,
    'Vous pouvez saisir la CNIL (cnil.fr).',
  ].join(' ');
}
