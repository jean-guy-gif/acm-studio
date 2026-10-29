import { randomBytes } from 'node:crypto';

import { describe, expect, it } from 'vitest';

import { MASQUE, contientSecret, masquerSecrets, premierePhrase } from './secrets.mjs';

// Mission 126 — aucun secret sur la page ni dans le journal (fiche, point 7).
describe('le masque des secrets', () => {
  it('masque les jetons connus, les variables sensibles et les longues chaînes opaques', () => {
    const cas = [
      'curl -H "x-vercel-protection-bypass: Ab3dEfGh1jKlMnOpQrStUvWxYz012345" https://essai',
      'E2E_VERCEL_BYPASS=Ab3dEfGh1jKlMnOpQrStUvWxYz012345 npm run e2e',
      'token ghp_abcdefghijklmnopqrstuvwxyz0123456789',
      'clé sbp_0123456789abcdef0123456789abcdef',
      'jwt eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c',
      'https://acm.test/dossier/abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ',
      'SUPABASE_SERVICE_KEY: "shhh" et ?token=secret123',
      'condensat 0123456789abcdef0123456789abcdef0123456789abcdef',
    ];
    for (const texte of cas) {
      const masque = masquerSecrets(texte);
      expect(masque, texte).toContain(MASQUE);
      expect(masque).not.toMatch(
        /Ab3dEfGh1jKlMnOpQrStUvWxYz012345|ghp_abc|sbp_0123|eyJhbGci|abcdefghijklmnopqrstuvwxyzABC|shhh|secret123|0123456789abcdef0123456789abcdef/,
      );
    }
    expect(masquerSecrets('E2E_VERCEL_BYPASS=Ab3dEfGh1jKlMnOpQrStUvWxYz012345')).toBe(
      `E2E_VERCEL_BYPASS=${MASQUE}`,
    );
  });

  it('ne prend ni une branche de mission ni une migration pour un secret (relecteur, 29/10)', () => {
    const noms = [
      'Branche mission-120-j-ai-un-acquereur-pour-votre-bien ouverte',
      'Branche mission-120B-j-ai-un-acquereur-pour-votre-bien ouverte',
      'Migration 20261027090000_live_closed_after_conclusion appliquée',
      'Migration 20261118090000_une_carte_par_bien_et_une_origine_acquereur soumise',
    ];
    for (const texte of noms) {
      expect(masquerSecrets(texte), texte).toBe(texte);
      expect(contientSecret(JSON.stringify({ branche: texte })), texte).toBe(false);
    }
    // Un vrai jeton de 43 caractères, lui, reste masqué.
    expect(masquerSecrets('jeton abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQ')).toContain(MASQUE);
  });

  it('masque les jetons de synthèse et de dossier tels que l’outil les fabrique, bords compris', () => {
    // Le jeton réel : randomBytes(32).toString('base64url') (synthesis-token.ts, dossier-token.ts) ;
    // un sur trente-deux commence ou finit par « - » ou « _ », sans frontière de mot (relecteur, 29/10).
    const jetons = [];
    while (jetons.length < 400) jetons.push(randomBytes(32).toString('base64url'));
    jetons.push(
      '-SifuhbxPzLhH_WKO93pnZHrGTowYdlG0MT0vi2vAZE',
      '_AifuhbxPzLhH-WKO93pnZHrGTowYdlG0MT0vi2vAZ-',
    );
    for (const jeton of jetons) {
      for (const texte of [
        `https://acm.test/synthese/${jeton}`,
        `https://acm.test/dossier/${jeton} ouvert`,
        JSON.stringify({ phrase: `Lien créé : https://acm.test/synthese/${jeton}` }),
      ]) {
        expect(masquerSecrets(texte), texte).not.toContain(jeton);
        expect(contientSecret(texte), texte).toBe(true);
      }
    }
  });

  it('une valeur déjà masquée n’est plus un secret, même dans un JSON', () => {
    const phrase =
      'E2E joué avec E2E_VERCEL_BYPASS=[masqué] et x-vercel-protection-bypass: [masqué]';
    expect(masquerSecrets(phrase)).toBe(phrase);
    expect(contientSecret(JSON.stringify({ phrase }))).toBe(false);
  });

  it('laisse une phrase ordinaire telle quelle', () => {
    const phrase = 'Poussé : git push -u origin mission-126-atelier · essai 5e06dba · CI verte';
    expect(masquerSecrets(phrase)).toBe(phrase);
    expect(contientSecret(phrase)).toBe(false);
    expect(contientSecret('jeton ghp_abcdefghijklmnopqrstuvwxyz0123456789')).toBe(true);
  });

  it('la première phrase d’un rapport, masquée et bornée à 140 caractères', () => {
    expect(premierePhrase('\n**Relecture** — aucun bloquant.\nDétail…')).toBe(
      'Relecture — aucun bloquant.',
    );
    expect(premierePhrase('x'.repeat(300))).toHaveLength(140);
    expect(premierePhrase('rapport avec ghp_abcdefghijklmnopqrstuvwxyz0123456789')).toContain(
      MASQUE,
    );
    expect(premierePhrase(null)).toBe('');
  });
});
