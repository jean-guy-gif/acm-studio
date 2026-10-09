import { describe, expect, it } from 'vitest';

import { parseAdvisorPhone } from '@/features/advisor-profile/services/parse-advisor-phone';
import { lines, paragraphs, parseEmphasis } from '@/features/prospecting-file/services/emphasis';
import { buildQrCode } from '@/features/prospecting-file/services/qr-code';
import { buildVCard } from '@/features/prospecting-file/services/vcard';

describe('carte de contact du conseiller', () => {
  const contact = {
    firstName: 'Anne',
    lastName: 'Durand; Martin',
    agencyName: 'Agence, du Port',
    phone: '06 12 34 56 78',
    email: 'anne@agence.fr',
  };

  it('une vCard 3.0, valeurs échappées', () => {
    expect(buildVCard(contact).split('\r\n')).toEqual([
      'BEGIN:VCARD',
      'VERSION:3.0',
      'N:Durand\\; Martin;Anne;;;',
      'FN:Anne Durand\\; Martin',
      'ORG:Agence\\, du Port',
      'TITLE:Conseiller immobilier',
      'TEL;TYPE=CELL:0612345678',
      'EMAIL;TYPE=WORK:anne@agence.fr',
      'END:VCARD',
    ]);
  });

  it('sans téléphone, pas de ligne TEL', () => {
    expect(buildVCard({ ...contact, phone: null })).not.toContain('TEL');
  });

  it('le QR code est un tracé carré, sans image', () => {
    const qr = buildQrCode(buildVCard(contact));
    expect(qr.size).toBeGreaterThan(20);
    expect(qr.path).toMatch(/^(M\d+ \d+h1v1h-1z)+$/);
  });
});

describe('téléphone du conseiller', () => {
  it('accepte les formes usuelles, vide = retiré', () => {
    expect(parseAdvisorPhone(' 06 12 34 56 78 ')).toEqual({ ok: true, phone: '06 12 34 56 78' });
    expect(parseAdvisorPhone('+33 6 12 34 56 78')).toEqual({
      ok: true,
      phone: '+33 6 12 34 56 78',
    });
    expect(parseAdvisorPhone('')).toEqual({ ok: true, phone: null });
  });

  it('refuse un numéro mal formé', () => {
    for (const value of ['abc', '06 12', '06-12-34-56-78 <b>']) {
      expect(parseAdvisorPhone(value).ok).toBe(false);
    }
  });
});

describe('mise en valeur', () => {
  it('découpe sans jamais interpréter', () => {
    expect(parseEmphasis('attirent *les mêmes acquéreurs.* <b>')).toEqual([
      { text: 'attirent ', strong: false },
      { text: 'les mêmes acquéreurs.', strong: true },
      { text: ' <b>', strong: false },
    ]);
    expect(parseEmphasis('5 * 3')).toEqual([{ text: '5 * 3', strong: false }]);
  });

  it('lignes et paragraphes', () => {
    expect(lines('a\n\n b ')).toEqual(['a', 'b']);
    expect(paragraphs('a\nb\n\n c')).toEqual(['a\nb', 'c']);
  });
});
