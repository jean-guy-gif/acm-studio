import { clientTexts, type TextLanguage } from '@/lib/client-texts';

// Essai de Jean-Guy (26/10) — envoyer le lien : le message prérempli, et les quatre façons de
// l'envoyer depuis le téléphone ou l'ordinateur du conseiller (l'outil n'envoie rien lui-même).
// Mission 140 — dans la langue de l'acquéreur (le français par défaut).
export function dossierShareMessage(
  url: string,
  advisorFirstName: string | null,
  language: TextLanguage = 'fr',
): string {
  const signature = advisorFirstName?.trim();
  return [
    clientTexts(language).buyer.messages.share.message(url),
    ...(signature ? [signature] : []),
  ].join('\n');
}

export type DossierShareHrefs = { sms: string; whatsapp: string; email: string };

export function dossierShareHrefs(
  message: string,
  language: TextLanguage = 'fr',
): DossierShareHrefs {
  const body = encodeURIComponent(message);
  return {
    sms: `sms:?&body=${body}`,
    whatsapp: `https://wa.me/?text=${body}`,
    email: `mailto:?subject=${encodeURIComponent(clientTexts(language).buyer.messages.share.subject)}&body=${body}`,
  };
}
