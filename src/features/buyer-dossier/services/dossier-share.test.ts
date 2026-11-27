import { describe, expect, it } from 'vitest';

import {
  dossierShareHrefs,
  dossierShareMessage,
} from '@/features/buyer-dossier/services/dossier-share';

const URL = 'https://acm.example/dossier/abc';

describe('envoyer le lien de la sélection', () => {
  it('le message prérempli, signé du prénom du conseiller', () => {
    expect(dossierShareMessage(URL, 'Natacha')).toBe(
      `Bonjour, voici les biens que j’ai sélectionnés pour vous\u00a0: ${URL}\nDites-moi lesquels vous voulez visiter.\nNatacha`,
    );
  });

  it('sans prénom, pas de signature vide', () => {
    expect(dossierShareMessage(URL, '  ')).not.toMatch(/\n$/);
    expect(dossierShareMessage(URL, null).split('\n')).toHaveLength(2);
  });

  it('SMS, WhatsApp et e-mail portent le message entier, lien compris', () => {
    const message = dossierShareMessage(URL, 'Natacha');
    const hrefs = dossierShareHrefs(message);
    expect(hrefs.sms.startsWith('sms:')).toBe(true);
    expect(hrefs.whatsapp.startsWith('https://wa.me/?text=')).toBe(true);
    expect(hrefs.email.startsWith('mailto:?subject=')).toBe(true);
    for (const href of Object.values(hrefs)) {
      expect(decodeURIComponent(href)).toContain(URL);
      expect(decodeURIComponent(href)).toContain('Natacha');
    }
  });
});
