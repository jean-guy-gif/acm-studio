import { clientTexts, type TextLanguage } from '@/lib/client-texts';
import {
  hashSynthesisToken,
  newSynthesisToken,
  SYNTHESIS_TOKEN_PATTERN,
} from '@/features/seller-synthesis/services/synthesis-token';

// Mission 131 — le lien de l'Étude de marché : même jeton que la synthèse et le Point marché (43
// caractères, seul le condensat est gardé), sous « /etude-de-marche/ ».
export const MARKET_STUDY_TOKEN_PATTERN = SYNTHESIS_TOKEN_PATTERN;
export const newMarketStudyToken = newSynthesisToken;
export const hashMarketStudyToken = hashSynthesisToken;
export const marketStudyPath = (token: string): string => `/etude-de-marche/${token}`;

// L'adresse de la page conseiller, à brancher sur le dossier et le Live.
export const marketStudyAdvisorPath = (projectId: string): string =>
  `/builder/${projectId}/etude-de-marche`;

// Envoyer le lien : le message prérempli et les trois façons de l'envoyer depuis le téléphone ou
// l'ordinateur du conseiller (l'outil n'envoie rien, M122 B). Aucun montant, aucune pression.
// Mission 140 — dans la langue du vendeur (le français par défaut).
export function marketStudyShareMessage(
  url: string,
  advisorFirstName: string | null,
  language: TextLanguage = 'fr',
): string {
  const signature = advisorFirstName?.trim();
  return [
    clientTexts(language).documents.marketStudy.share.message(url),
    ...(signature ? [signature] : []),
  ].join('\n');
}

export function marketStudyShareHrefs(
  message: string,
  studyDate: string | null,
  language: TextLanguage = 'fr',
): { sms: string; whatsapp: string; email: string } {
  const body = encodeURIComponent(message);
  const subject = encodeURIComponent(
    clientTexts(language).documents.marketStudy.share.subject(studyDate),
  );
  return {
    sms: `sms:?&body=${body}`,
    whatsapp: `https://wa.me/?text=${body}`,
    email: `mailto:?subject=${subject}&body=${body}`,
  };
}
