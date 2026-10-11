import { describe, expect, it } from 'vitest';

import { leavesPage, UNSAVED_CHANGES_MESSAGE } from '@/lib/navigation/unsaved-changes';

const HERE = 'https://acm.test/builder/abc/property';
const plain = {
  button: 0,
  metaKey: false,
  ctrlKey: false,
  shiftKey: false,
  altKey: false,
  defaultPrevented: false,
};
const link = (href: string | null, target: string | null = null, download = false) => ({
  href,
  target,
  download,
});

describe('quitter une page aux modifications non enregistrées (mission 93)', () => {
  it('un lien du menu fait quitter la page', () => {
    expect(leavesPage(plain, link('/suivi'), HERE)).toBe(true);
    expect(leavesPage(plain, link('https://acm.test/builder'), HERE)).toBe(true);
    expect(leavesPage(plain, link('https://ailleurs.test/'), HERE)).toBe(true);
  });

  it('un nouvel onglet, un téléchargement ou un clic modifié ne la quittent pas', () => {
    expect(leavesPage(plain, link('/suivi', '_blank'), HERE)).toBe(false);
    expect(leavesPage(plain, link('/fichier.pdf', null, true), HERE)).toBe(false);
    expect(leavesPage({ ...plain, metaKey: true }, link('/suivi'), HERE)).toBe(false);
    expect(leavesPage({ ...plain, ctrlKey: true }, link('/suivi'), HERE)).toBe(false);
    expect(leavesPage({ ...plain, button: 1 }, link('/suivi'), HERE)).toBe(false);
  });

  it('une ancre de la même page, un lien sans adresse ou déjà annulé non plus', () => {
    expect(leavesPage(plain, link('#surface'), HERE)).toBe(false);
    expect(leavesPage(plain, link(null), HERE)).toBe(false);
    expect(leavesPage(plain, link('tel:+33600000000'), HERE)).toBe(false);
    expect(leavesPage({ ...plain, defaultPrevented: true }, link('/suivi'), HERE)).toBe(false);
  });

  it('pose la question en français', () => {
    expect(UNSAVED_CHANGES_MESSAGE).toMatch(/ne sont pas enregistrées/);
  });
});
