import { describe, expect, it } from 'vitest';

import { LOGIN_ERROR_MESSAGES, loginErrorCode, loginErrorMessage } from '@/lib/auth/auth-messages';

describe('loginErrorCode — une erreur Supabase devient un code, jamais un texte anglais', () => {
  it('identifiants incorrects', () => {
    expect(
      loginErrorCode({
        code: 'invalid_credentials',
        status: 400,
        message: 'Invalid login credentials',
      }),
    ).toBe('identifiants');
    expect(loginErrorCode({ message: 'Invalid login credentials' })).toBe('identifiants');
  });

  it('e-mail non confirmé', () => {
    expect(
      loginErrorCode({ code: 'email_not_confirmed', status: 400, message: 'Email not confirmed' }),
    ).toBe('email-non-confirme');
  });

  it('trop de tentatives', () => {
    expect(loginErrorCode({ code: 'over_request_rate_limit', status: 429 })).toBe(
      'trop-de-tentatives',
    );
    expect(loginErrorCode({ code: 'over_email_send_rate_limit', status: 429 })).toBe(
      'trop-de-tentatives',
    );
    expect(loginErrorCode({ status: 429, message: 'Request rate limit reached' })).toBe(
      'trop-de-tentatives',
    );
  });

  it('lien expiré', () => {
    expect(
      loginErrorCode({
        code: 'otp_expired',
        status: 403,
        message: 'Email link is invalid or has expired',
      }),
    ).toBe('lien-invalide');
  });

  it('tout le reste : indisponible, sans rien dire de technique', () => {
    expect(loginErrorCode({ status: 500, message: 'Database error querying schema' })).toBe(
      'indisponible',
    );
    expect(loginErrorCode({})).toBe('indisponible');
  });
});

describe('loginErrorMessage — la page n’affiche que ses propres phrases', () => {
  it('traduit chaque code, « lien-invalide » de /auth/confirm compris', () => {
    expect(loginErrorMessage('identifiants')).toBe('Adresse e-mail ou mot de passe incorrect.');
    expect(loginErrorMessage('lien-invalide')).toContain('n’est plus valable');
    expect(loginErrorMessage(undefined)).toBeNull();
  });

  it('un texte venu de l’adresse n’est jamais affiché tel quel', () => {
    for (const forged of ['Invalid login credentials', '<script>alert(1)</script>', 'toString']) {
      expect(loginErrorMessage(forged)).toBe(LOGIN_ERROR_MESSAGES.indisponible);
    }
  });

  it('aucune phrase n’est en anglais', () => {
    for (const message of Object.values(LOGIN_ERROR_MESSAGES)) {
      expect(message).not.toMatch(/\b(invalid|error|credentials|expired|failed|rate limit)\b/i);
    }
  });
});
