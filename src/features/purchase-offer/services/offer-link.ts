// Mission 137 (partie B) — les liens de l'offre d'achat : la copie des offrants, et celui du vendeur
// (accepter ou refuser), de 30 jours, condensat seul en base. Pur.
export function offerPath(token: string): string {
  return `/offre/${token}`;
}

export function offerBuyerMessage(input: { url: string; advisorFirstName: string | null }): string {
  return [
    'Bonjour,',
    `Voici votre offre d’achat signée\u00a0: ${input.url}`,
    input.advisorFirstName?.trim() ?? '',
  ]
    .filter(Boolean)
    .join('\n');
}

export function offerSellerMessage(input: {
  url: string;
  validUntil: string;
  advisorFirstName: string | null;
}): string {
  return [
    'Bonjour,',
    `Voici l’offre d’achat reçue pour votre bien, valable jusqu’au ${input.validUntil} inclus\u00a0: ${input.url}`,
    'Vous pouvez l’accepter en la signant, ou la refuser, depuis ce lien.',
    input.advisorFirstName?.trim() ?? '',
  ]
    .filter(Boolean)
    .join('\n');
}
