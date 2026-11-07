import { describe, expect, it } from 'vitest';

import { CONNECTION_LOST_MESSAGE } from '@/features/live-seller/services/guarded-save';
import {
  liveErrorKind,
  liveErrorMessage,
  SESSION_REQUIRED_ERROR,
} from '@/features/live-seller/services/live-error-message';
import { BACKGROUND_TIMEOUT_ERROR } from '@/features/live-seller/services/save-chain';
import { clientTexts } from '@/lib/client-texts';

// Mission 144 — devant le vendeur, trois messages d'échec qui disent quoi faire, jamais un détail
// technique ; le Live en anglais ne change pas.
const fr = clientTexts('fr').live.shell;
const en = clientTexts('en').live.shell;

describe('les messages d’échec du Live, devant le vendeur', () => {
  it('réseau absent ou silencieux : « Connexion perdue — touchez Valider pour réessayer »', () => {
    for (const error of [CONNECTION_LOST_MESSAGE, BACKGROUND_TIMEOUT_ERROR]) {
      expect(liveErrorKind(error)).toBe('connection');
      expect(liveErrorMessage(error, 'fr', fr, fr.saveFailed)).toBe(
        'Connexion perdue — touchez Valider pour réessayer',
      );
    }
  });

  it('session expirée : « Session expirée — reconnectez-vous pour reprendre le Live »', () => {
    expect(liveErrorMessage(SESSION_REQUIRED_ERROR, 'fr', fr, fr.saveFailed)).toBe(
      'Session expirée — reconnectez-vous pour reprendre le Live',
    );
  });

  it('tout le reste : « Enregistrement impossible — touchez Valider pour réessayer »', () => {
    for (const error of [
      'Projet introuvable pour votre agence.',
      'Corrigez les champs indiqués.',
      'L’enregistrement a échoué.',
      'Rendez-vous terminé : la réponse n’est pas enregistrée.',
      undefined,
    ]) {
      const message = liveErrorMessage(error, 'fr', fr, fr.analysisFailed);
      expect(message).toBe('Enregistrement impossible — touchez Valider pour réessayer');
      expect(message).not.toMatch(/projet|champs/i);
    }
  });

  it('le Live en anglais ne change pas', () => {
    expect(liveErrorMessage(CONNECTION_LOST_MESSAGE, 'en', en, en.saveFailed)).toBe(
      en.connectionLost,
    );
    expect(liveErrorMessage(SESSION_REQUIRED_ERROR, 'en', en, en.saveFailed)).toBe(en.saveFailed);
    expect(liveErrorMessage('Corrigez les champs indiqués.', 'en', en, en.analysisFailed)).toBe(
      en.analysisFailed,
    );
  });
});
