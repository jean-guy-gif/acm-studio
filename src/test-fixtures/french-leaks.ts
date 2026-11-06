// Mission 140 — un document ou un écran rendu dans une autre langue que le français ne doit rien
// garder du français, hors des mentions légales de l'agence (en français jusqu'à la décision du
// juriste, Jean-Guy, 06/11) et des noms propres (communes, personnes, agence). Renvoie les mots
// français trouvés dans le texte visible.
const FRENCH_WORDS =
  /\b(votre|vous|vos|nous|notre|prix|biens?|concurrents?|jours?|rendez-vous|pièces?|chambres?|affichée?s?|aujourd’hui|depuis|baisse|conseiller|étude|marché|classement|tiers|selon|avec|sans|retenue?s?|dernier|moins|plus cher|régénér|annonce|surface|vente)\b/gi;

const LEGAL = /Carte professionnelle[^·<]*|Ne peut recevoir aucun fonds|délivrée par[^·<]*/g;

export function frenchLeaks(html: string, allowed: string[] = []): string[] {
  let text = html
    .replace(/<style[\s\S]*?<\/style>/g, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&[a-z#0-9]+;/gi, ' ')
    .replace(LEGAL, ' ');
  for (const word of allowed) text = text.split(word).join(' ');
  return [...new Set(text.match(FRENCH_WORDS) ?? [])];
}
