// Essai de Jean-Guy (26/10) — envoyer le lien : le message prérempli, et les quatre façons de
// l'envoyer depuis le téléphone ou l'ordinateur du conseiller (l'outil n'envoie rien lui-même).
export function dossierShareMessage(url: string, advisorFirstName: string | null): string {
  const signature = advisorFirstName?.trim();
  return [
    `Bonjour, voici les biens que j’ai sélectionnés pour vous : ${url}`,
    'Dites-moi lesquels vous voulez visiter.',
    ...(signature ? [signature] : []),
  ].join('\n');
}

export type DossierShareHrefs = { sms: string; whatsapp: string; email: string };

export function dossierShareHrefs(message: string): DossierShareHrefs {
  const body = encodeURIComponent(message);
  return {
    sms: `sms:?&body=${body}`,
    whatsapp: `https://wa.me/?text=${body}`,
    email: `mailto:?subject=${encodeURIComponent('Votre sélection de biens')}&body=${body}`,
  };
}
