import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import { buildBuyerDeck } from '@/features/buyer-deck/services/buyer-deck';
import type { DeckItemInput, ItemResponse } from '@/features/buyer-deck/types';
import type { BuyerInput } from '@/features/buyers/types';

vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh: () => undefined }) }));
vi.mock('@/features/buyer-dossier/actions/submit-dossier-answers', () => ({
  submitDossierAnswers: async () => ({ ok: true, answered: 1 }),
}));

const { GridScreen, ItemScreen } =
  await import('@/features/buyer-deck/components/deck-presentation');
const { DossierPhoneDeck, SeenTogetherView, ThanksView } =
  await import('@/features/buyer-dossier/components/dossier-phone-deck');
const { DossierPublicView } =
  await import('@/features/buyer-dossier/components/dossier-public-view');
const { buildBuyerDossier } = await import('@/features/buyer-dossier/services/build-buyer-dossier');
const { DOSSIER_ALREADY_ANSWERED, DOSSIER_PRESENTED } =
  await import('@/features/buyer-dossier/types');

const frame = {
  agencyName: 'Agence Test',
  logoUrl: null,
  advisorName: 'Carl Conseiller',
  advisorPhone: '06 11 22 33 44',
};

const buyer = {
  name: 'Famille Test',
  phone: null,
  email: null,
  purpose: null,
  timeline: null,
  notes: null,
  propertyTypes: ['house'],
  cities: ['Mougins'],
  budgetIdeal: null,
  budgetMax: 1_650_000,
  roomsMin: null,
  bedroomsMin: null,
  surfaceMin: null,
  outdoor: null,
  parking: null,
  pool: null,
  floorMin: null,
  elevator: null,
  energyRatingMax: null,
  worksAccepted: null,
  mustHave: ['cities'],
  dealBreakers: null,
} as unknown as BuyerInput;

const item = (itemId: string, position: number): DeckItemInput => ({
  itemId,
  position,
  source: 'listing',
  category: 'strong',
  label: `Maison · ${position + 5} pièces · Mougins`,
  city: 'Mougins',
  district: null,
  price: 1_500_000,
  priceSeenOn: '2026-10-24',
  surfaceArea: 200,
  roomsCount: 6,
  bedroomsCount: 4,
  outdoor: [],
  parking: [],
  energyRating: null,
  photos: [],
  gaps: [],
  propertyType: 'Maison',
  floor: null,
  hasPool: null,
  hasElevator: null,
  condition: null,
  listedSince: null,
  priceDrop: null,
  pitch: null,
});

const deck = (presentedAt: string | null) => ({
  ...buildBuyerDeck({
    buyerId: 'b',
    buyer,
    selectionId: 's',
    selectedAt: '2026-10-24T10:00:00Z',
    presentedAt,
    buyerWords: 'Une maison à Mougins.',
    items: [item('i1', 1), item('i2', 2)],
    now: new Date('2026-10-25T10:00:00Z'),
  }),
  presentedAt,
});

const response = (
  itemId: string,
  answer: ItemResponse['answer'],
  answeredDuring: ItemResponse['answeredDuring'],
): ItemResponse => ({
  id: `${itemId}-${answeredDuring}`,
  itemId,
  answer,
  reasons: [],
  answeredDuring,
  answeredAt: '2026-10-25T10:00:00Z',
});

const render = (over: Partial<Parameters<typeof DossierPhoneDeck>[0]> = {}) =>
  renderToStaticMarkup(
    createElement(DossierPhoneDeck, {
      token: 'A'.repeat(43),
      deck: deck(null),
      answered: false,
      initialAnswers: [],
      initialAvailability: [],
      meetingAnswers: [],
      meetingAvailability: [],
      agencyName: 'Agence Test',
      logoUrl: null,
      advisorName: 'Carl Conseiller',
      advisorPhone: '06 11 22 33 44',
      ...over,
    }),
  );

// Mission 122 (partie B, décisions de Jean-Guy, 25/10) — ce que montre le lien selon l'état de la
// sélection : le déroulé à répondre, le merci après sa réponse, « Ce que nous avons vu ensemble »
// après la présentation ; jamais le formulaire une fois la réponse donnée.
describe('le lien du dossier sur téléphone', () => {
  // Essai de Jean-Guy (25/10) : la barre n'est plus fixée en bas, où elle recouvrait « Pas pour
  // moi » ; elle suit le contenu, sous les réponses.
  it('la barre du téléphone suit le contenu, jamais fixée par-dessus les réponses', () => {
    const page = render();
    const nav = page.slice(page.indexOf('<nav'), page.indexOf('data-testid="dossier-nav"'));
    expect(nav).not.toMatch(/\bfixed\b/);
    expect(page.indexOf('data-testid="dossier-nav"')).toBeGreaterThan(page.indexOf('</main>'));
  });

  // Mission 143 (I11) — le conseiller se joint d'un toucher : son numéro et son e-mail sont des
  // liens, assez grands pour le doigt.
  it('le numéro et l’e-mail du conseiller sont des liens tel: et mailto:', () => {
    const page = render({ advisorEmail: 'carl@example.com' });
    expect(page).toContain('href="tel:0611223344"');
    expect(page).toContain('href="mailto:carl@example.com"');
    expect(page).toMatch(/data-testid="dossier-advisor-phone"[^>]*/);
  });

  it('pas encore répondu : le déroulé, et « Télécharger en PDF » à la fin', () => {
    const page = render();
    expect(page).toContain('data-testid="dossier-phone-deck"');
    expect(page).toContain('Vous m’avez dit :');
    expect(page).not.toContain('data-testid="dossier-thanks"');
    // Essai de Jean-Guy (26/10) : le premier écran est une couverture, avec un seul bouton
    // principal ; « Précédent » / « Suivant » n'y sont pas montrés.
    expect(page).toContain('data-testid="dossier-link-cover"');
    expect(page).toContain('Votre sélection du 24/10/2026');
    expect(page).toContain('Votre conseiller : Carl Conseiller');
    expect(page).toContain('Voir ma sélection →');
    expect(page).toMatch(/<nav hidden=""[^>]*data-testid="dossier-nav"/);
  });

  it('déjà répondu : le merci et ses créneaux du lien, sans formulaire', () => {
    const page = render({
      answered: true,
      initialAnswers: [response('i1', 'visit', 'dossier')],
      initialAvailability: ['sunday'],
    });
    expect(page).toContain('Merci, j’ai bien reçu votre réponse');
    expect(page).toContain('data-testid="dossier-recap-item"');
    expect(page).toContain('Vos créneaux : Dimanche');
    expect(page).not.toContain('data-testid="dossier-send"');
    expect(page).not.toContain('data-testid="dossier-phone-deck"');
    expect(page).toContain('Télécharger en PDF');
  });

  it('déjà répondu sur un bien retiré depuis : le merci quand même, jamais le formulaire', () => {
    const page = render({ answered: true, initialAnswers: [] });
    expect(page).toContain('Merci, j’ai bien reçu votre réponse');
    expect(page).not.toContain('data-testid="dossier-send"');
  });

  it('présentation terminée : « Ce que nous avons vu ensemble », ses réponses du rendez-vous, en lecture seule', () => {
    const page = render({
      deck: deck('2026-10-25T11:00:00Z'),
      meetingAnswers: [
        response('i1', 'visit', 'presentation'),
        response('i2', 'no', 'presentation'),
      ],
      meetingAvailability: ['sat_morning'],
    });
    expect(page).toContain('data-testid="dossier-seen-together"');
    expect(page).toContain('Ce que nous avons vu ensemble');
    expect(page).toContain('Je veux le visiter');
    expect(page).toContain('Pas pour moi');
    expect(page).toContain('Vos créneaux : Samedi matin');
    // Le numéro tient sur une ligne (rendus du 26/10) et s'appelle d'un toucher (M143, I11).
    expect(page).toMatch(
      /Carl Conseiller(<!-- -->)? · <a href="tel:0611223344" class="[^"]*whitespace-nowrap[^"]*"[^>]*>06 11 22 33 44<\/a>/,
    );
    expect(page).toContain('Télécharger en PDF');
    for (const form of [
      'dossier-send',
      'dossier-phone-deck',
      'deck-answer',
      'dossier-availability',
    ]) {
      expect(page).not.toContain(`data-testid="${form}"`);
    }
  });

  it('un second envoi refusé (déjà répondu) : le merci et sa raison, jamais le formulaire', () => {
    const page = renderToStaticMarkup(
      createElement(ThanksView, {
        ...frame,
        deck: deck(null),
        answers: new Map(),
        availability: [],
        note: DOSSIER_ALREADY_ANSWERED,
      }),
    );
    expect(page).toContain('data-testid="dossier-thanks"');
    expect(page).toContain('Merci, j’ai bien reçu votre réponse');
    expect(page).toContain(DOSSIER_ALREADY_ANSWERED);
    for (const form of [
      'dossier-send',
      'dossier-phone-deck',
      'deck-answer',
      'dossier-availability',
    ]) {
      expect(page).not.toContain(`data-testid="${form}"`);
    }
  });

  it('un envoi refusé parce que la présentation est terminée : ni merci, ni « réponse enregistrée »', () => {
    const page = renderToStaticMarkup(
      createElement(SeenTogetherView, {
        ...frame,
        deck: deck(null),
        answers: [],
        availability: [],
        note: DOSSIER_PRESENTED,
      }),
    );
    expect(page).toContain('Ce que nous avons vu ensemble');
    expect(page).toContain(DOSSIER_PRESENTED);
    expect(page).not.toContain('bien reçu');
    expect(page).not.toMatch(/réponse est enregistrée/);
    expect(page).not.toContain('data-testid="dossier-send"');
  });
});

// « Télécharger en PDF » : le dossier imprimable est dans la page du lien, caché à l'écran, et le
// déroulé disparaît à l'impression (décision de Jean-Guy, 25/10).
describe('la page du lien et son document imprimable', () => {
  const dossier = buildBuyerDossier({
    buyerId: 'b',
    selectionId: 's',
    selectedAt: '2026-10-24T10:00:00Z',
    sector: 'Mougins',
    deck: deck(null),
    hidden: new Map(),
    answered: false,
    answers: [],
    availability: [],
    meetingAnswers: [],
    meetingAvailability: [],
    agency: {
      name: frame.agencyName,
      logoUrl: null,
      advisorName: frame.advisorName,
      advisorPhone: frame.advisorPhone,
      postalAddress: null,
      professionalCard: null,
      professionalCardIssuer: null,
      financialGuarantee: null,
      advisorEmail: null,
      advisorPhotoUrl: null,
      advisorQr: null,
    },
    brandDeclarations: '',
  });
  const page = renderToStaticMarkup(
    createElement(DossierPublicView, { token: 'A'.repeat(43), dossier }),
  );
  const printPart = page.slice(page.indexOf('data-testid="dossier-print"'));
  const screenPart = page.slice(
    page.indexOf('data-testid="dossier-screen"'),
    page.indexOf('data-testid="dossier-print"'),
  );

  it('le document est présent, hors de l’écran (ses photos se chargent), seul à l’impression', () => {
    expect(page).toMatch(
      /aria-hidden="true" class="pointer-events-none fixed top-0 -left-\[10000px\] w-\[210mm\] print:static print:w-auto" data-testid="dossier-print"/,
    );
    expect(printPart).toContain('data-testid="buyer-dossier"');
    expect(printPart).toContain('data-testid="dossier-choices"');
    expect(page).toMatch(/class="print:hidden" data-testid="dossier-screen"/);
    expect(screenPart).toContain('data-testid="dossier-phone-deck"');
    expect(screenPart).not.toContain('data-testid="buyer-dossier"');
  });
});

// Relecture des rendus par Jean-Guy (25/10) : une miniature et sa lettre en tête de chaque colonne ;
// « Je veux le visiter » est le bouton principal, « Peut-être » et « Pas pour moi » secondaires ;
// la navigation discrète.
describe('la grille et l’écran d’un bien, au même dessin partout', () => {
  const withPhotos = {
    ...deck(null),
    items: deck(null).items.map((entry, index) => ({
      ...entry,
      photos: [`https://photos.example/${index}.jpg`],
    })),
  };

  it('la grille : une miniature et la lettre en tête de chaque colonne', () => {
    const page = renderToStaticMarkup(
      createElement(GridScreen, {
        deck: withPhotos,
        responses: [],
        onOpen: () => undefined,
        onLead: null,
        leadLetter: null,
      }),
    );
    expect(page).toContain('https://photos.example/0.jpg');
    expect(page).toContain('https://photos.example/1.jpg');
    expect(page.split('data-testid="deck-grid-thumb-letter"').length - 1).toBe(2);
  });

  // Essai de Jean-Guy (26/10) : la réponse choisie devient pleine ; les autres restent en contour.
  const itemPage = (answer: 'visit' | 'maybe' | 'no' | null, withReasons = false) =>
    renderToStaticMarkup(
      createElement(ItemScreen, {
        item: withPhotos.items[0]!,
        answer,
        readOnly: false,
        busy: false,
        onAnswer: () => undefined,
        ...(withReasons ? { reasons: ['price' as const], onReason: () => undefined } : {}),
      }),
    );
  const button = (page: string, value: string) => {
    const at = page.indexOf(`data-answer="${value}"`);
    return page.slice(page.lastIndexOf('<button', at), at);
  };

  it('rien de choisi : aucun bouton plein, « Je veux le visiter » compris', () => {
    const page = itemPage(null);
    for (const value of ['visit', 'maybe', 'no']) {
      expect(button(page, value)).not.toMatch(/\bbg-brand\b/);
    }
  });

  it('la réponse choisie est pleine, les deux autres en contour', () => {
    const page = itemPage('maybe');
    expect(button(page, 'maybe')).toMatch(/\bbg-brand\b/);
    expect(button(page, 'visit')).not.toMatch(/\bbg-brand\b/);
    expect(button(page, 'no')).not.toMatch(/\bbg-brand\b/);
  });

  it('sur le lien, « Pas pour moi » choisi : ses raisons tout de suite dessous', () => {
    expect(itemPage('no', true)).toContain('data-testid="item-reasons"');
    expect(itemPage('maybe', true)).not.toContain('data-testid="item-reasons"');
    // En présentation (sans raisons passées), rien ne s'ajoute à l'écran du bien.
    expect(itemPage('no')).not.toContain('data-testid="item-reasons"');
  });

  it('sur le lien, « Suivant » et « Précédent » sont discrets', () => {
    const page = render();
    const next = page.slice(
      page.lastIndexOf('<button', page.indexOf('data-testid="dossier-next"')),
      page.indexOf('data-testid="dossier-next"'),
    );
    expect(next).not.toMatch(/\bbg-brand\b/);
    expect(next).not.toMatch(/\bborder\b/);
  });
});
