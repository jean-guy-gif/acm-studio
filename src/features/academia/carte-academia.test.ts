import { createElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

// Correctifs 161 — la carte « Le bien dans Academia » de Bien vendeur (maquette C161-1, validée par
// Jean-Guy le 19/11) : pour une agence qui a l'accès, plus de « Dossier d'adresse ↗ », « Vivre ici
// ↗ » ni « Adresse copiée en un toucher » ; « Coller le lien à la main » seulement quand Academia ne
// répond pas, que le plafond est atteint ou après les 2 minutes d'attente ; un lien déjà collé
// montré tel quel, avec « Retirer », sans le champ ; « Enregistrez d'abord la fiche » tant que
// l'adresse tapée n'est pas enregistrée ; et, sur « Avant le rendez-vous », plus de « Ventes réelles
// dans Academia ↗ » quand le dossier d'adresse est sur la page.

vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh: () => undefined, push: () => undefined }),
}));
vi.mock('@/features/projects/actions/set-academia-link', () => ({
  setAcademiaLivingHereLink: async () => ({ ok: true, url: null, pastedAt: null }),
}));
vi.mock('@/features/academia/actions/living-here-link', () => ({
  createLivingHereLink: async () => ({ state: 'idle' }),
  refreshLivingHereLink: async () => ({ state: 'idle' }),
}));

const { AcademiaCard } = await import('@/features/academia/components/academia-card');
const { PropertyDraftContext } = await import('@/features/academia/components/property-draft');
const { showsFallback } = await import('@/features/academia/services/card-address');
const { cardAddressState, reportedDraft, saveFirstKind } =
  await import('@/features/academia/services/card-address');
const { livingHereAgeLine } = await import('@/features/academia/services/living-here-age');
const { AcademiaSalesLink } = await import('@/features/academia/components/academia-links');
const { PositioningDecisionForm } =
  await import('@/features/price-positioning/components/positioning-decision-form');
type LivingHereApiInitial =
  import('@/features/academia/queries/living-here-api-view').LivingHereApiInitial;

const ADDRESS = '4 chemin des Restanques Hautes, 06140 Vence';
const PASTED = 'https://app.myacademia.ai/l/k3RfPq9';
const live = { href: 'https://app.myacademia.ai', copy: ADDRESS };
const plain = (html: string) => html.replace(/&#x27;|&#39;/g, '’');

const inDraft = (typed: string | null | undefined, node: ReactNode) =>
  createElement(PropertyDraftContext.Provider, { value: { typed, report: () => undefined } }, node);

const cardHtml = ({
  api,
  address = ADDRESS,
  savedUrl = null,
  savedLine = null,
  typed,
}: {
  api: LivingHereApiInitial | null;
  address?: string | null;
  savedUrl?: string | null;
  savedLine?: { tone: 'hint' | 'warn'; text: string } | null;
  typed?: string | null;
}) =>
  plain(
    renderToStaticMarkup(
      inDraft(
        typed,
        createElement(AcademiaCard, {
          projectId: 'p1',
          addressLink: address ? live : null,
          livingLink: address ? live : null,
          savedUrl,
          savedLine,
          signed: true,
          savedAddress: address,
          api: api ? { address, initial: api } : null,
        }),
      ),
    ),
  );

const IDLE: LivingHereApiInitial = { kind: 'idle', stale: false };

describe('l’état de l’adresse vu par la carte', () => {
  it('rien de tapé : l’adresse enregistrée décide', () => {
    expect(cardAddressState(ADDRESS, undefined)).toBe('saved');
    expect(cardAddressState(null, undefined)).toBe('missing');
  });
  it('une adresse tapée, pas encore enregistrée : « Enregistrez d’abord la fiche »', () => {
    expect(cardAddressState(null, ADDRESS)).toBe('save_first');
    expect(cardAddressState(ADDRESS, '6 chemin des Restanques Hautes, 06140 Vence')).toBe(
      'save_first',
    );
  });
  it('la fiche modifiée ailleurs, l’adresse identique : rien ne change', () => {
    expect(cardAddressState(ADDRESS, ADDRESS)).toBe('saved');
    expect(cardAddressState(null, null)).toBe('missing');
  });
});

describe('ce que la fiche dit à la carte', () => {
  it('l’adresse tapée tant que la fiche a des modifications non enregistrées, rien ensuite', () => {
    expect(reportedDraft(true, ADDRESS)).toBe(ADDRESS);
    expect(reportedDraft(true, null)).toBeNull();
    // Enregistrée : la carte suit l'adresse relue par la page.
    expect(reportedDraft(false, ADDRESS)).toBeUndefined();
  });
  it('une fiche sans adresse (« new ») ou une adresse modifiée (« changed »)', () => {
    expect(saveFirstKind('save_first', null)).toBe('new');
    expect(saveFirstKind('save_first', ADDRESS)).toBe('changed');
    expect(saveFirstKind('saved', ADDRESS)).toBeNull();
    expect(saveFirstKind('missing', null)).toBeNull();
  });
});

describe('une agence qui a l’accès : la carte sans les deux boutons', () => {
  it('ni « Dossier d’adresse ↗ », ni « Vivre ici ↗ », ni « Adresse copiée en un toucher »', () => {
    const html = cardHtml({ api: IDLE });
    expect(html).not.toContain('data-testid="academia-address"');
    expect(html).not.toContain('data-testid="academia-living"');
    expect(html).not.toContain('Adresse copiée en un toucher');
    expect(html).not.toContain('s’ouvrent dans Academia, dans un nouvel onglet');
    expect(html).toContain('Créer le lien «\u00a0Vivre ici\u00a0»');
  });

  it('la phrase du haut dit où se lit le dossier d’adresse, en lien', () => {
    const html = cardHtml({ api: IDLE });
    expect(html).toMatch(/Le dossier d’adresse d’Academia se lit sur/);
    expect(html).toContain('href="/builder/p1/avant-rendez-vous"');
    expect(html).toContain('le lien «\u00a0Vivre ici\u00a0» se crée ici, en un clic.');
    expect(html).not.toContain('btn-filled');
  });

  it('sans accès : la carte d’aujourd’hui, les deux boutons et l’adresse copiée', () => {
    const html = cardHtml({ api: null });
    expect(html).toContain('data-testid="academia-address"');
    expect(html).toContain('data-testid="academia-living"');
    expect(html).toContain('Adresse copiée en un toucher');
  });
});

describe('« Coller le lien à la main » : seulement quand Academia ne répond pas', () => {
  it('rien encore, sans adresse, adresse changée, lien expiré : pas de repli', () => {
    expect(cardHtml({ api: IDLE })).not.toContain('Coller le lien à la main');
    expect(cardHtml({ api: IDLE, address: null })).not.toContain('Coller le lien à la main');
    expect(cardHtml({ api: { kind: 'idle', stale: true } })).not.toContain(
      'Coller le lien à la main',
    );
    const expired = cardHtml({
      api: {
        kind: 'ready',
        url: 'https://app.myacademia.ai/l/x',
        expiresAt: '2026-11-14T00:00:00Z',
        expiry: { level: 'expired', days: 0 },
      },
    });
    expect(expired).toContain('Créer un lien neuf');
    expect(expired).not.toContain('Coller le lien à la main');
  });

  it('échec (Academia ne répond pas, plafond, demande illisible) : le repli reste', () => {
    expect(cardHtml({ api: { kind: 'unread' } })).toContain('Coller le lien à la main');
  });

  it('la règle, état par état', () => {
    expect(showsFallback({ kind: 'failed', message: 'x', retry: true })).toBe(true);
    expect(showsFallback({ kind: 'waiting', gaveUp: true })).toBe(true);
    expect(showsFallback({ kind: 'waiting', gaveUp: false })).toBe(false);
    expect(showsFallback({ kind: 'address_not_found' })).toBe(false);
    expect(showsFallback({ kind: 'ambiguous', propositions: ['a'] })).toBe(false);
    expect(showsFallback({ kind: 'no_address' })).toBe(false);
    expect(showsFallback({ kind: 'idle', stale: false })).toBe(false);
    expect(
      showsFallback({
        kind: 'ready',
        url: 'u',
        expiresAt: '2026-11-14T00:00:00Z',
        expiry: { level: 'expired', days: 0 },
      }),
    ).toBe(false);
  });
});

describe('un lien déjà collé à la main avant l’ouverture', () => {
  it('montré tel quel, avec « Retirer », sans le champ ; « Créer le lien » le remplace', () => {
    const html = cardHtml({
      api: IDLE,
      savedUrl: PASTED,
      savedLine: { tone: 'hint', text: 'Collé le 02/11.' },
    });
    expect(html).toContain('data-testid="living-here-pasted"');
    expect(html).toContain(PASTED);
    expect(html).toContain('Collé le 02/11.');
    expect(html).toContain('Retirer');
    expect(html).toContain('Créer le lien «\u00a0Vivre ici\u00a0»');
    expect(html).not.toContain('Coller le lien à la main');
    expect(html).not.toContain(`value="${PASTED}"`);
  });

  it('un lien collé qui ne vaut plus reste affiché, avec « Retirer » et sa ligne orange', () => {
    const now = new Date('2026-11-19T10:00:00Z');
    for (const savedLine of [
      livingHereAgeLine('2026-10-10T10:00:00Z', now, { canCreate: true }),
      livingHereAgeLine('2026-11-10T10:00:00Z', now, { moved: true, canCreate: true }),
      livingHereAgeLine(null, now, { canCreate: true }),
    ]) {
      expect(savedLine?.tone).toBe('warn');
      const html = cardHtml({ api: IDLE, savedUrl: PASTED, savedLine });
      expect(html).toContain('data-testid="living-here-pasted"');
      expect(html).toContain(PASTED);
      expect(html).toContain('data-testid="living-here-pasted-remove"');
      expect(html).toContain('n’est plus montré, ni au vendeur ni aux acquéreurs');
      expect(html).toContain('Créer le lien «\u00a0Vivre ici\u00a0»');
    }
  });

  it('sans lien collé : aucun bloc', () => {
    expect(cardHtml({ api: IDLE })).not.toContain('data-testid="living-here-pasted"');
  });
});

describe('« Enregistrez d’abord la fiche »', () => {
  it('une adresse tapée sur une fiche sans adresse : à la place de « Il faut l’adresse du bien »', () => {
    const html = cardHtml({ api: IDLE, address: null, typed: ADDRESS });
    expect(html).toContain(
      'Enregistrez d’abord la fiche\u00a0: le lien se crée sur l’adresse enregistrée du bien.',
    );
    expect(html).not.toContain('Il faut l’adresse du bien');
    expect(html).not.toContain('Créer le lien «\u00a0Vivre ici\u00a0»');
  });

  it('une adresse enregistrée puis modifiée : le dire, pas de lien sur l’ancienne', () => {
    const html = cardHtml({ api: IDLE, typed: '6 chemin des Restanques Hautes, 06140 Vence' });
    expect(html).toContain(
      'Enregistrez d’abord la fiche\u00a0: le lien se crée sur l’adresse enregistrée du bien (vous l’avez modifiée).',
    );
    expect(html).not.toContain('Créer le lien «\u00a0Vivre ici\u00a0»');
  });

  it('une agence sans accès : « Enregistrez d’abord la fiche » au lieu de « Ajoutez l’adresse du bien »', () => {
    const html = cardHtml({ api: null, address: null, typed: ADDRESS });
    expect(html).toContain('Enregistrez d’abord la fiche');
    expect(html).not.toContain('Ajoutez l’adresse du bien');
    // Le champ à coller reste, comme aujourd'hui.
    expect(html).toContain('Lien «\u00a0Vivre ici\u00a0» à montrer aux acquéreurs (facultatif)');
  });

  it('rien de tapé : la carte d’aujourd’hui', () => {
    expect(cardHtml({ api: IDLE, address: null })).toContain('Il faut l’adresse du bien');
    expect(cardHtml({ api: null, address: null })).toContain('Ajoutez l’adresse du bien');
  });
});

describe('« Ventes réelles dans Academia ↗ » sur « Avant le rendez-vous »', () => {
  const form = (salesLinkHidden: boolean) =>
    plain(
      renderToStaticMarkup(
        createElement(PositioningDecisionForm, {
          defaultAdvisorPrice: 700_000,
          formulaNote: '',
          hasSaved: false,
          isOutdated: false,
          initialAdvisorPrice: 700_000,
          initialAdvisorAnalysis: null,
          initialJustification: '',
          saveAction: async () => ({ ok: true }) as never,
          deleteAction: async () => ({ ok: true }) as never,
          projectId: 'p1',
          salesLink: live,
          salesLinkHidden,
        }),
      ),
    );

  it('une agence qui a l’accès : le dossier d’adresse est juste au-dessus, le lien part', () => {
    expect(form(true)).not.toContain('Ventes réelles dans Academia');
    expect(form(true)).not.toContain('Ajoutez l’adresse du bien');
  });

  it('sans accès : le lien reste', () => {
    expect(form(false)).toContain('Ventes réelles dans Academia ↗');
  });

  it('caché, il ne dit pas non plus « Ajoutez l’adresse du bien »', () => {
    expect(
      renderToStaticMarkup(
        createElement(AcademiaSalesLink, { salesLink: null, missingHref: '#x', hidden: true }),
      ),
    ).toBe('');
  });
});
