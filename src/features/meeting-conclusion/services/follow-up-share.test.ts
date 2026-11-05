import { describe, expect, it } from 'vitest';

import {
  followUpShareHrefs,
  telHref,
} from '@/features/meeting-conclusion/services/follow-up-share';

// Mission 130 — la relance s'ouvre dans l'application choisie, au numéro et à l'adresse du dossier.
describe('les liens de la relance', () => {
  it('SMS et WhatsApp au numéro du dossier, E-mail à son adresse', () => {
    const hrefs = followUpShareHrefs('Bonjour, …', '06 12 34 56 78', 'martin@exemple.fr');
    expect(hrefs.sms).toBe('sms:0612345678?&body=Bonjour%2C%20%E2%80%A6');
    expect(hrefs.whatsapp).toBe('https://wa.me/33612345678?text=Bonjour%2C%20%E2%80%A6');
    expect(hrefs.email).toMatch(/^mailto:martin%40exemple\.fr\?subject=/);
    expect(telHref('06 12 34 56 78')).toBe('tel:0612345678');
  });

  it('sans numéro, ni SMS ni WhatsApp ; sans e-mail, la messagerie s’ouvre sans destinataire', () => {
    const hrefs = followUpShareHrefs('Bonjour', null, null);
    expect(hrefs.sms).toBeNull();
    expect(hrefs.whatsapp).toBeNull();
    expect(hrefs.email).toMatch(/^mailto:\?subject=/);
  });

  it('un numéro déjà international garde son indicatif', () => {
    expect(followUpShareHrefs('x', '+41 79 123 45 67', null).whatsapp).toMatch(
      /^https:\/\/wa\.me\/41791234567\?/,
    );
  });
});
