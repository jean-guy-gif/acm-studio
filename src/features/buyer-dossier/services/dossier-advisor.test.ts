import { describe, expect, it } from 'vitest';

import {
  chooseDossierAdvisor,
  type DossierAdvisorRow,
} from '@/features/buyer-dossier/services/dossier-advisor';

const row = (id: string, removed: string | null = null): DossierAdvisorRow => ({
  id,
  first_name: id,
  last_name: 'Conseiller',
  phone: null,
  email: `${id}@example.org`,
  photo_path: null,
  removed_at: removed,
});

// Décision de Jean-Guy (25/10) : le conseiller de la fiche signe le dossier ; retiré, c'est le
// conseiller connecté (ou le créateur du lien) ; retiré lui aussi, personne.
describe('chooseDossierAdvisor', () => {
  it('le conseiller de la fiche, tant qu’il est membre', () => {
    expect(chooseDossierAdvisor(row('fiche'), row('connecte'))?.id).toBe('fiche');
    expect(chooseDossierAdvisor(row('fiche'), null)?.id).toBe('fiche');
  });

  it('retiré : le conseiller connecté prend sa place', () => {
    expect(chooseDossierAdvisor(row('fiche', '2026-10-01'), row('connecte'))?.id).toBe('connecte');
    expect(chooseDossierAdvisor(null, row('connecte'))?.id).toBe('connecte');
  });

  it('un membre retiré ne signe jamais, même connecté par un ancien lien', () => {
    expect(chooseDossierAdvisor(row('fiche', '2026-10-01'), row('connecte', '2026-10-02'))).toBe(
      null,
    );
    expect(chooseDossierAdvisor(null, null)).toBe(null);
  });
});
