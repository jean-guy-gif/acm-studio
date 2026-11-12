import { describe, expect, it } from 'vitest';

import { nameFromBuyer } from '@/features/visit-voucher/services/buyer-name';

// Mission 154 — « Reprendre « Famille Keller » » : le nom de la fiche n'est pas une identité. Le
// bouton ne remplit que le NOM, sans le mot qui n'est pas un nom de personne ; le prénom et la
// civilité restent vides, à compléter. Jamais « M. Famille Keller » (Jean-Guy, 12/11).
describe('nameFromBuyer', () => {
  it('ôte le mot qui n’est pas un nom de personne', () => {
    expect(nameFromBuyer('Famille Keller')).toBe('Keller');
    expect(nameFromBuyer('Couple Martin')).toBe('Martin');
    expect(nameFromBuyer('Consorts Garcia')).toBe('Garcia');
    expect(nameFromBuyer('M. et Mme Lambert')).toBe('Lambert');
    expect(nameFromBuyer('Monsieur et Madame Lopez')).toBe('Lopez');
    expect(nameFromBuyer('Mr and Mrs Wilson')).toBe('Wilson');
  });

  it('sans casse ni espace de trop, un nom composé gardé entier', () => {
    expect(nameFromBuyer('  famille   de La Fontaine ')).toBe('de La Fontaine');
    expect(nameFromBuyer('MR AND MRS Wilson')).toBe('Wilson');
    expect(nameFromBuyer('M. et Mme Lambert-Duval')).toBe('Lambert-Duval');
  });

  it('un nom sans ce mot reste tel quel ; rien après le mot, rien', () => {
    expect(nameFromBuyer('Keller')).toBe('Keller');
    expect(nameFromBuyer('Jean-Guy Ourmières')).toBe('Jean-Guy Ourmières');
    expect(nameFromBuyer('Famille')).toBe('');
    expect(nameFromBuyer('   ')).toBe('');
    // « Famillet » n'est pas « Famille » : le mot entier seulement.
    expect(nameFromBuyer('Famillet Paul')).toBe('Famillet Paul');
  });
});
