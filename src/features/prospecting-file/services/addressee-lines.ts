// Mission 87 — l'adresse du destinataire ne se coupe plus au milieu : la voie sur une ligne,
// le code postal et la commune (et ce qui suit : étage, bâtiment) sur la suivante.
//   « 8 avenue Docteur Hochet 06160 Antibes · 2e étage »
//     → « 8 avenue Docteur Hochet » / « 06160 Antibes · 2e étage »
// Sans code postal, on coupe à la dernière virgule ; sans virgule, l'adresse reste d'un bloc.
// Pur : chaque ligne s'imprime sans retour à la ligne.
export function addressLines(address: string): string[] {
  const text = address.replace(/\s+/g, ' ').trim();
  if (text === '') {
    return [];
  }
  const withPostalCode = /^(.+?)[\s,;·-]+(\d{5}(?!\d)\s.*|\d{5})$/.exec(text);
  if (withPostalCode) {
    return [withPostalCode[1].trim(), withPostalCode[2].trim()];
  }
  const comma = text.lastIndexOf(',');
  if (comma > 0 && comma < text.length - 1) {
    return [text.slice(0, comma).trim(), text.slice(comma + 1).trim()];
  }
  return [text];
}
