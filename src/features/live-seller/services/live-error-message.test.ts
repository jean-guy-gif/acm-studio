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

  it('le message nomme le bouton présent à l’écran', () => {
    // La note sur 10, ou la Conclusion quand elle est le dernier écran (présentation directe).
    expect(liveErrorMessage('L’enregistrement a échoué.', 'fr', fr, fr.noteFailed, fr.finish)).toBe(
      'Enregistrement impossible — touchez Terminer le rendez-vous pour réessayer',
    );
    expect(liveErrorMessage(CONNECTION_LOST_MESSAGE, 'fr', fr, fr.saveFailed, fr.finish)).toBe(
      'Connexion perdue — touchez Terminer le rendez-vous pour réessayer',
    );
    // Le prix de commercialisation, son bouton à lui.
    const save = clientTexts('fr').live.conclusion.save;
    expect(liveErrorMessage(undefined, 'fr', fr, fr.saveFailed, save)).toBe(
      'Enregistrement impossible — touchez Enregistrer le prix pour réessayer',
    );
    // « Confirmer et continuer → », « Révéler la durée → », « Réessayer », « Passer ».
    expect(liveErrorMessage(undefined, 'fr', fr, fr.saveFailed, fr.confirm)).toContain(
      'touchez Confirmer pour',
    );
    expect(liveErrorMessage(undefined, 'fr', fr, fr.saveFailed, fr.revealDuration)).toContain(
      'touchez Révéler la durée pour',
    );
    // Le bouton s'appelle déjà « Réessayer » : le message s'arrête là.
    expect(liveErrorMessage(undefined, 'fr', fr, fr.saveFailed, fr.retry)).toBe(
      'Enregistrement impossible — touchez Réessayer',
    );
    expect(liveErrorMessage(CONNECTION_LOST_MESSAGE, 'fr', fr, fr.saveFailed, fr.retry)).toBe(
      'Connexion perdue — touchez Réessayer',
    );
    expect(liveErrorMessage(undefined, 'fr', fr, fr.saveFailed, fr.skip)).toContain(
      'touchez Passer pour',
    );
    // La session expirée ne nomme pas de bouton : il faut se reconnecter.
    expect(liveErrorMessage(SESSION_REQUIRED_ERROR, 'fr', fr, fr.saveFailed, fr.finish)).toBe(
      'Session expirée — reconnectez-vous pour reprendre le Live',
    );
  });

  it('le Live en anglais ne change pas', () => {
    expect(liveErrorMessage(CONNECTION_LOST_MESSAGE, 'en', en, en.saveFailed)).toBe(
      en.connectionLost,
    );
    expect(liveErrorMessage(SESSION_REQUIRED_ERROR, 'en', en, en.saveFailed)).toBe(en.saveFailed);
    expect(liveErrorMessage('Corrigez les champs indiqués.', 'en', en, en.analysisFailed)).toBe(
      en.analysisFailed,
    );
    expect(liveErrorMessage(undefined, 'en', en, en.noteFailed, en.finish)).toBe(en.noteFailed);
  });
});
