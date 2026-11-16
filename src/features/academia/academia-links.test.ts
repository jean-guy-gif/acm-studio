import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// Mission 147 (partie A) — les liens vers Academia, pour le conseiller (planches M147-1, 2, 3, 6 bis).

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => undefined }) }));
vi.mock('@/features/projects/actions/set-academia-link', () => ({
  setAcademiaLivingHereLink: async () => ({ ok: true, url: null, pastedAt: null }),
}));

const { AcademiaLinks, AcademiaSalesLink, copyAddress } =
  await import('@/features/academia/components/academia-links');
const { AcademiaCard } = await import('@/features/academia/components/academia-card');

const ADDRESS = '4 chemin des Restanques Hautes, 06140 Vence';
const live = { href: 'https://app.myacademia.ai', copy: ADDRESS };
const demo = { href: 'https://app.myacademia.ai', copy: null };
const plain = (html: string) => html.replace(/&#x27;|&#39;/g, '’');

describe('la copie de l’adresse', () => {
  it('copiée, ou échouée (pas de presse-papiers, ou refusé) : l’écran montre alors l’adresse', async () => {
    expect(await copyAddress(ADDRESS, { writeText: async () => undefined })).toBe('copied');
    expect(
      await copyAddress(ADDRESS, {
        writeText: async () => {
          throw new Error('refusé');
        },
      }),
    ).toBe('failed');
    expect(await copyAddress(ADDRESS, undefined)).toBe('failed');
  });
});

describe('AcademiaLinks', () => {
  it('deux vrais liens qui ouvrent un nouvel onglet, et l’adresse qui sera copiée', () => {
    const html = plain(
      renderToStaticMarkup(
        createElement(AcademiaLinks, { addressLink: live, livingLink: live, missingHref: '#x' }),
      ),
    );
    expect(html).toContain('Dossier d’adresse ↗');
    expect(html).toContain('Vivre ici ↗');
    expect(html.match(/target="_blank"/g)).toHaveLength(2);
    expect(html.match(/rel="noopener noreferrer"/g)).toHaveLength(2);
    expect(html).toContain('Adresse copiée en un toucher :');
    expect(html).toContain(ADDRESS);
  });

  it('dans la démo : la présentation d’Academia, aucune adresse', () => {
    const html = plain(
      renderToStaticMarkup(
        createElement(AcademiaLinks, { addressLink: demo, livingLink: demo, missingHref: '#x' }),
      ),
    );
    expect(html).toContain('S’ouvre sur la présentation d’Academia.');
    expect(html).not.toContain('Adresse copiée');
  });

  it('sans adresse : « Ajoutez l’adresse du bien », vers le champ ; jamais un lien vide', () => {
    const html = plain(
      renderToStaticMarkup(
        createElement(AcademiaLinks, {
          addressLink: null,
          livingLink: null,
          missingHref: '/builder/p1/property#champ-address',
        }),
      ),
    );
    expect(html).toContain('Ajoutez l’adresse du bien');
    expect(html).toContain('href="/builder/p1/property#champ-address"');
    expect(html).not.toContain('target="_blank"');
  });

  it('« La vente » : à la suite des autres liens, « Adresse du bien : » dessous ; adresse illisible : rien de faux', () => {
    const leading = createElement('a', { href: '/offre' }, 'Offre d’achat signée');
    const html = plain(
      renderToStaticMarkup(
        createElement(AcademiaLinks, {
          variant: 'links',
          leading,
          addressLink: live,
          livingLink: live,
          missingHref: '#x',
        }),
      ),
    );
    expect(html.indexOf('Offre d’achat signée')).toBeLessThan(html.indexOf('Dossier d’adresse'));
    expect(html).toContain('Adresse du bien :');
    expect(html.indexOf('Adresse du bien :')).toBeLessThan(html.indexOf(ADDRESS));
    const unread = plain(
      renderToStaticMarkup(
        createElement(AcademiaLinks, {
          variant: 'links',
          leading,
          unread: true,
          addressLink: null,
          livingLink: null,
          missingHref: '#x',
        }),
      ),
    );
    expect(unread).toContain('Offre d’achat signée');
    expect(unread).not.toContain('Ajoutez l’adresse du bien');
    expect(unread).not.toContain('Dossier d’adresse');
  });
});

describe('AcademiaSalesLink', () => {
  it('« Ventes réelles dans Academia ↗ », ou l’adresse à ajouter', () => {
    const html = plain(
      renderToStaticMarkup(
        createElement(AcademiaSalesLink, { salesLink: live, missingHref: '#x' }),
      ),
    );
    expect(html).toContain('Ventes réelles dans Academia ↗');
    expect(html).toContain('target="_blank"');
    const missing = plain(
      renderToStaticMarkup(
        createElement(AcademiaSalesLink, { salesLink: null, missingHref: '#x' }),
      ),
    );
    expect(missing).toContain('Ajoutez l’adresse du bien');
  });
});

describe('AcademiaCard', () => {
  const card = (
    signed: boolean,
    savedUrl: string | null,
    savedLine: { tone: 'hint' | 'warn'; text: string } | null = null,
  ) =>
    plain(
      renderToStaticMarkup(
        createElement(AcademiaCard, {
          projectId: 'p1',
          addressLink: live,
          livingLink: live,
          savedUrl,
          savedLine,
          signed,
        }),
      ),
    );

  it('pour le conseiller seul ; le lien collé sert une fois le mandat signé', () => {
    const before = card(false, null);
    expect(before).toContain('Le bien dans Academia');
    expect(before).toContain('Pour vous seul.');
    expect(before).toContain('Lien « Vivre ici » à montrer aux acquéreurs (facultatif)');
    expect(before).toContain('Montré aux acquéreurs une fois le mandat signé.');
    expect(before).not.toContain('Retirer');
    const signed = card(true, 'https://app.myacademia.ai/l/abc');
    expect(signed).toContain('Lien « Vivre ici » montré aux acquéreurs');
    expect(signed).toContain('Montré sur le lien de chaque acquéreur');
    expect(signed).toContain('value="https://app.myacademia.ai/l/abc"');
    expect(signed).toContain('Retirer');
    // Aucun bouton plein : le seul de l'écran reste « Enregistrer » (M146 A).
    expect(signed).not.toContain('btn-filled');
  });

  it('mission 156 — l’âge du lien du mandat, et l’avertissement orange, sans cacher le lien', () => {
    const warn =
      'Collé il y a 34 jours : un lien d’Academia vaut 30 jours, il ne s’ouvre peut-être plus. Collez un lien neuf.';
    const old = card(true, 'https://app.myacademia.ai/l/abc', { tone: 'warn', text: warn });
    expect(old).toContain(warn);
    expect(old).toContain('value="https://app.myacademia.ai/l/abc"');
    expect(old).toContain('data-tone="warn"');
    // Un lien d'avant la mission, sans date : aucune ligne, rien n'est inventé.
    expect(card(true, 'https://app.myacademia.ai/l/abc', null)).not.toContain('Collé');
    // La carte n'a pas « Ouvrir ↗ » (la maquette ne le montre pas).
    expect(old).not.toContain('Ouvrir ↗');
  });
});
