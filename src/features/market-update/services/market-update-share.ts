import { clientTexts, type TextLanguage } from '@/lib/client-texts';

// Mission 127 B — envoyer le lien du Point marché : le message prérempli et les trois façons de
// l'envoyer depuis le téléphone ou l'ordinateur du conseiller (l'outil n'envoie rien, M122 B).
// Aucun montant, aucune pression ; la même signature que le lien du dossier acquéreur.
// Mission 140 — dans la langue du vendeur (le français par défaut).
export function marketUpdateShareMessage(
  url: string,
  meetingDate: string | null,
  advisorFirstName: string | null,
  language: TextLanguage = 'fr',
): string {
  const signature = advisorFirstName?.trim();
  return [
    clientTexts(language).documents.marketUpdate.share.message(url, meetingDate),
    ...(signature ? [signature] : []),
  ].join('\n');
}

export type MarketUpdateShareHrefs = { sms: string; whatsapp: string; email: string };

export function marketUpdateShareHrefs(
  message: string,
  pointDate: string | null,
  language: TextLanguage = 'fr',
): MarketUpdateShareHrefs {
  const body = encodeURIComponent(message);
  const subject = encodeURIComponent(
    clientTexts(language).documents.marketUpdate.share.subject(pointDate),
  );
  return {
    sms: `sms:?&body=${body}`,
    whatsapp: `https://wa.me/?text=${body}`,
    email: `mailto:?subject=${subject}&body=${body}`,
  };
}
