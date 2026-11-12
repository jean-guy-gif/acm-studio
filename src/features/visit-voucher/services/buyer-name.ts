// Mission 154 — le nom de la fiche acquéreur n'est pas une identité civile (« Famille Keller »,
// « Mr and Mrs Wilson ») : repris dans le bon de visite, il ne remplit que le NOM, sans le mot qui
// n'est pas un nom de personne ; le prénom et la civilité restent vides, à compléter. Jamais « M.
// Famille Keller » sur un bon (Jean-Guy, 12/11). Pur.

const NON_PERSON =
  /^(?:famille|couple|consorts|m\.\s+et\s+mme|monsieur\s+et\s+madame|mr\s+and\s+mrs)(?:\s+|$)/i;

export function nameFromBuyer(name: string): string {
  const clean = name.trim().replace(/\s+/g, ' ');
  return clean.replace(NON_PERSON, '').trim();
}
