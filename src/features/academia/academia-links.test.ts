import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// Mission 147 (partie A) — les liens vers Academia, pour le conseiller (planches M147-1, 2, 3, 6 bis).

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => undefined }) }));
vi.mock('@/features/projects/actions/set-academia-link', () => ({
  setAcademiaLivingHereLink: async () => ({ ok: true, url: null, pastedAt: null }),
}));
vi.mock('@/features/academia/actions/living-here-link', () => ({
  createLivingHereLink: async () => ({ state: 'idle' }),
  refreshLivingHereLink: async () => ({ state: 'idle' }),
}));

const { AcademiaLinks, AcademiaSalesLink, copyAddress } =
  await import('@/features/academia/components/academia-links');
const { AcademiaCard } = await import('@/features/academia/components/academia-card');
type LivingHereApiInitial =
  import('@/features/academia/queries/living-here-api-view').LivingHereApiInitial;

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

// Mission 157 — « Vivre ici » en un clic (planche M157-1), l'API ouverte : le bouton, l'attente, le
// lien et sa validité, bientôt expiré, expiré, sans adresse ; le champ à coller devient le repli.
describe('AcademiaCard, l’API ouverte', () => {
  const LINK = 'https://app.myacademia.ai/l/Vb4nT8wLp2';
  const withApi = (
    initial: LivingHereApiInitial,
    address: string | null = ADDRESS,
    savedUrl: string | null = null,
    signed = true,
  ) =>
    plain(
      renderToStaticMarkup(
        createElement(AcademiaCard, {
          projectId: 'p1',
          addressLink: live,
          livingLink: live,
          savedUrl,
          savedLine: null,
          signed,
          api: { address, initial },
        }),
      ),
    );

  it('rien encore : l’adresse enregistrée, le bouton en contour, pas de repli (correctifs 161)', () => {
    const html = withApi({ kind: 'idle', stale: false });
    expect(html).toContain('Créer le lien « Vivre ici »');
    expect(html).toContain(ADDRESS);
    expect(html).not.toContain('Coller le lien à la main');
    expect(html).not.toContain('btn-filled');
  });

  it('dans la démo : l’adresse envoyée (« démonstration ») ne se montre pas (M114)', () => {
    const html = plain(
      renderToStaticMarkup(
        createElement(AcademiaCard, {
          projectId: 'p1',
          addressLink: live,
          livingLink: live,
          savedUrl: null,
          savedLine: null,
          signed: true,
          api: { address: ADDRESS, initial: { kind: 'idle', stale: false }, showAddress: false },
        }),
      ),
    );
    expect(html).toContain('Academia prépare la page du quartier du bien');
    expect(html).toContain('Créer le lien « Vivre ici »');
    // L'adresse du bien reste (la copie de M147 A) ; celle qui part vers Academia, jamais.
    const intro = html.match(/data-testid="living-here-intro">([^<]*)</)?.[1] ?? '';
    expect(intro).not.toContain(ADDRESS);
    expect(html).not.toMatch(/démonstration/i);
  });

  it('dans la démo, le lien créé ne s’écrit pas : « Ouvrir » et « Copier » restent', () => {
    const html = plain(
      renderToStaticMarkup(
        createElement(AcademiaCard, {
          projectId: 'p1',
          addressLink: live,
          livingLink: live,
          savedUrl: 'https://app.myacademia.ai/l/demonstration',
          savedLine: null,
          signed: true,
          api: {
            address: ADDRESS,
            initial: {
              kind: 'ready',
              url: 'https://app.myacademia.ai/l/demonstration',
              expiresAt: '2026-12-17T13:52:35Z',
              expiry: { level: 'ok', days: 30 },
            },
            showAddress: false,
          },
        }),
      ),
    );
    expect(html).toContain('Lien créé');
    expect(html).toContain('href="https://app.myacademia.ai/l/demonstration"');
    expect(html).toContain('Ouvrir ↗');
    expect(html).toContain('Copier');
    // Le lien n'est que dans l'adresse du bouton, jamais dans le texte lu.
    const text = html.replace(/href="[^"]*"/g, '').replace(/<[^>]+>/g, ' ');
    expect(text).not.toMatch(/demonstration|démonstration/i);
  });

  it('un lien collé à la main : montré tel quel, sans le champ (correctifs 161)', () => {
    const html = withApi({ kind: 'idle', stale: false }, ADDRESS, LINK);
    expect(html).toContain('data-testid="living-here-pasted"');
    expect(html).toContain(LINK);
    expect(html).not.toContain('Coller le lien à la main');
  });

  it('le lien créé : sa validité, Ouvrir, Copier, Retirer', () => {
    const html = withApi({
      kind: 'ready',
      url: LINK,
      expiresAt: '2026-12-16T00:00:00Z',
      expiry: { level: 'ok', days: 30 },
    });
    expect(html).toContain(LINK);
    expect(html).toContain('Valable jusqu’au 16/12');
    expect(html).toContain('Ouvrir ↗');
    expect(html).toContain('Copier');
    expect(html).toContain('Retirer');
    expect(html).not.toContain('Créer le lien « Vivre ici »');
  });

  it('bientôt expiré : en orange, « Créer un lien neuf » ; expiré : plus montré', () => {
    const soon = withApi({
      kind: 'ready',
      url: LINK,
      expiresAt: '2026-11-19T12:00:00Z',
      expiry: { level: 'soon', days: 3 },
    });
    expect(soon).toContain('Valable jusqu’au 19/11, dans 3 jours.');
    expect(soon).toContain('Créer un lien neuf');
    const expired = withApi({
      kind: 'ready',
      url: LINK,
      expiresAt: '2026-11-14T00:00:00Z',
      expiry: { level: 'expired', days: 0 },
    });
    expect(expired).toContain('Le lien a expiré le 14/11 : il n’est plus montré aux acquéreurs.');
    expect(expired).not.toContain(LINK);
    expect(expired).toContain('Créer un lien neuf');
  });

  it('sans adresse : « Ajoutez l’adresse du bien », aucun bouton', () => {
    const html = withApi({ kind: 'idle', stale: false }, null);
    expect(html).toContain('Il faut l’adresse du bien pour créer le lien.');
    expect(html).not.toContain('Créer le lien « Vivre ici »');
  });

  it('l’adresse du bien a changé : le lien de l’ancienne adresse n’est plus montré, le dire', () => {
    const html = withApi({ kind: 'idle', stale: true }, ADDRESS, LINK);
    expect(html).toContain('L’adresse du bien a changé');
    expect(html).toContain('Créer le lien « Vivre ici »');
    expect(html).not.toMatch(/data-testid="living-here-fallback" open/);
  });

  it('la demande illisible : le dire, jamais « rien » ; le repli reste', () => {
    const html = withApi({ kind: 'unread' });
    expect(html).toContain('La demande à Academia n’a pas pu être lue : rechargez la page.');
    expect(html).toContain('Coller le lien à la main');
  });

  it('un mandat pas encore signé : le lien n’est montré aux acquéreurs qu’une fois signé', () => {
    const html = withApi(
      {
        kind: 'ready',
        url: LINK,
        expiresAt: '2026-12-16T00:00:00Z',
        expiry: { level: 'ok', days: 30 },
      },
      ADDRESS,
      LINK,
      false,
    );
    expect(html).toContain('montré aux acquéreurs une fois le mandat signé');
    expect(html).not.toContain('montré à chaque acquéreur');
  });

  it('sans adresse : pas de repli, l’adresse d’abord (correctifs 161)', () => {
    expect(withApi({ kind: 'idle', stale: false }, null)).not.toContain('Coller le lien à la main');
  });

  it('en préparation : l’attente, dite (20 à 60 secondes, vérifiée toutes les 5 s, M161)', () => {
    const html = withApi({ kind: 'waiting' });
    expect(html).toContain('Academia prépare le dossier de cette adresse : 20 à 60 secondes.');
    expect(html).toContain(
      'La page vérifie toute seule, toutes les 5 secondes, deux minutes au plus.',
    );
  });
});
