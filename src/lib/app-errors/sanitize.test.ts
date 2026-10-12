import { describe, expect, it } from 'vitest';

import {
  EMPTY_ERROR_MESSAGE,
  isFrameworkSignal,
  MAX_ERROR_MESSAGE,
  MAX_ERROR_PAGE,
  sanitizeErrorMessage,
  sanitizeErrorPage,
  UNKNOWN_PAGE,
} from '@/lib/app-errors/sanitize';

// Mission 100 — jamais de contenu saisi, de prix ni d'adresse dans le journal des erreurs.
describe('sanitizeErrorMessage', () => {
  it('garde un message technique tel quel', () => {
    expect(sanitizeErrorMessage(new Error('fetch failed'))).toBe('fetch failed');
    expect(sanitizeErrorMessage('Stream Estate 502')).toBe('Stream Estate 502');
  });

  it('garde les identifiants techniques entre guillemets, masque tout autre texte cité', () => {
    expect(
      sanitizeErrorMessage(
        'new row for relation "comparables" violates check constraint "comparables_price_check"',
      ),
    ).toBe(
      'new row for relation "comparables" violates check constraint "comparables_price_check"',
    );
    expect(sanitizeErrorMessage('invalid input syntax for type integer: "12 rue des Lilas"')).toBe(
      'invalid input syntax for type integer: [texte]',
    );
    expect(sanitizeErrorMessage('Vendeur « M. et Mme Martin » introuvable')).toBe(
      'Vendeur [texte] introuvable',
    );
    expect(sanitizeErrorMessage("valeur 'Villa des Pins' refusée")).toBe('valeur [texte] refusée');
  });

  it('ne prend pas l’apostrophe d’un mot pour un guillemet', () => {
    expect(sanitizeErrorMessage("l'enregistrement n'a pas abouti")).toBe(
      "l'enregistrement n'a pas abouti",
    );
  });

  it('masque la valeur d’une clé Postgres', () => {
    expect(
      sanitizeErrorMessage(
        'duplicate key value violates unique constraint "x_key" Key (address_key)=(8 avenue du docteur hochet 06160 antibes) already exists.',
      ),
    ).toBe(
      'duplicate key value violates unique constraint "x_key" Key (address_key)=([valeur]) already exists.',
    );
  });

  it('masque les prix, les surfaces, les codes postaux et les téléphones', () => {
    expect(sanitizeErrorMessage('prix 350 000 € refusé')).toBe('prix [n] refusé');
    expect(sanitizeErrorMessage('prix 350000 refusé')).toBe('prix [n] refusé');
    expect(sanitizeErrorMessage('surface 68,5 m² hors tolérance')).toBe(
      'surface [n] hors tolérance',
    );
    expect(sanitizeErrorMessage('commune 06600 inconnue')).toBe('commune [n] inconnue');
    expect(sanitizeErrorMessage('appel au 0612345678')).toBe('appel au [n]');
    expect(sanitizeErrorMessage('écart de 12,5 %')).toBe('écart de [n]');
  });

  it('masque les e-mails, les identifiants et ne garde d’une adresse web que son hôte', () => {
    expect(sanitizeErrorMessage('compte laurent@start-academy.fr refusé')).toBe(
      'compte [e-mail] refusé',
    );
    expect(sanitizeErrorMessage('dossier 3f2b8c1e-1a2b-4c3d-9e8f-0123456789ab absent')).toBe(
      'dossier [id] absent',
    );
    expect(
      sanitizeErrorMessage(
        'GET https://api-adresse.data.gouv.fr/search/?q=12+rue+des+Lilas+Antibes a échoué',
      ),
    ).toBe('GET [url api-adresse.data.gouv.fr] a échoué');
  });

  it('tronque, et ne rend jamais un message vide', () => {
    const long = sanitizeErrorMessage('a'.repeat(1000));
    expect(long).toHaveLength(MAX_ERROR_MESSAGE);
    expect(long.endsWith('…')).toBe(true);
    expect(sanitizeErrorMessage('')).toBe(EMPTY_ERROR_MESSAGE);
    expect(sanitizeErrorMessage(null)).toBe(EMPTY_ERROR_MESSAGE);
    expect(sanitizeErrorMessage({ message: 42 })).toBe(EMPTY_ERROR_MESSAGE);
    expect(sanitizeErrorMessage({ message: 'permission denied for table app_errors' })).toBe(
      'permission denied for table app_errors',
    );
  });
});

describe('sanitizeErrorPage', () => {
  it('ne garde que le chemin, sans identifiant de dossier ni paramètre', () => {
    expect(
      sanitizeErrorPage(
        'https://acm-studio-henna.vercel.app/builder/3f2b8c1e-1a2b-4c3d-9e8f-0123456789ab/property?ville=Antibes#city',
      ),
    ).toBe('/builder/[id]/property');
    expect(sanitizeErrorPage('/suivi?motif=prix')).toBe('/suivi');
    expect(sanitizeErrorPage('/live/3F2B8C1E-1A2B-4C3D-9E8F-0123456789AB')).toBe('/live/[id]');
  });

  it('refuse ce qui n’est pas un chemin', () => {
    expect(sanitizeErrorPage(null)).toBe(UNKNOWN_PAGE);
    expect(sanitizeErrorPage('12 rue des Lilas')).toBe(UNKNOWN_PAGE);
    expect(sanitizeErrorPage('')).toBe(UNKNOWN_PAGE);
  });

  it('tronque un chemin trop long', () => {
    expect(sanitizeErrorPage(`/${'a'.repeat(500)}`)).toHaveLength(MAX_ERROR_PAGE);
  });
});

describe('isFrameworkSignal', () => {
  it('reconnaît une redirection et une page introuvable, qui ne sont pas des pannes', () => {
    expect(isFrameworkSignal({ digest: 'NEXT_REDIRECT;replace;/login;307;' })).toBe(true);
    expect(isFrameworkSignal({ digest: 'NEXT_NOT_FOUND' })).toBe(true);
    expect(isFrameworkSignal({ digest: 'NEXT_HTTP_ERROR_FALLBACK;404' })).toBe(true);
  });

  it('laisse passer une vraie erreur', () => {
    expect(isFrameworkSignal(new Error('boom'))).toBe(false);
    expect(isFrameworkSignal({ digest: '1234567890' })).toBe(false);
    expect(isFrameworkSignal(null)).toBe(false);
  });
});
