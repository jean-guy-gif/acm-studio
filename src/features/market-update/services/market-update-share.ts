// Mission 127 B — envoyer le lien du Point marché : le message prérempli et les trois façons de
// l'envoyer depuis le téléphone ou l'ordinateur du conseiller (l'outil n'envoie rien, M122 B).
// Aucun montant, aucune pression ; la même signature que le lien du dossier acquéreur.
export function marketUpdateShareMessage(
  url: string,
  meetingDate: string | null,
  advisorFirstName: string | null,
): string {
  const signature = advisorFirstName?.trim();
  const since = meetingDate ? ` depuis notre rendez-vous du ${meetingDate}` : '';
  return [
    `Bonjour, voici le Point marché${since} : ${url}`,
    'Il montre ce qui a bougé chez les biens que nous avons regardés ensemble, et où en est votre prix.',
    ...(signature ? [signature] : []),
  ].join('\n');
}

export type MarketUpdateShareHrefs = { sms: string; whatsapp: string; email: string };

export function marketUpdateShareHrefs(
  message: string,
  pointDate: string | null,
): MarketUpdateShareHrefs {
  const body = encodeURIComponent(message);
  const subject = encodeURIComponent(pointDate ? `Point marché du ${pointDate}` : 'Point marché');
  return {
    sms: `sms:?&body=${body}`,
    whatsapp: `https://wa.me/?text=${body}`,
    email: `mailto:?subject=${subject}&body=${body}`,
  };
}
