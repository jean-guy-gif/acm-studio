import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('@/features/buyer-notes/actions/read-notes', () => ({ readBuyerNotes: vi.fn() }));
vi.mock('@/features/buyer-notes/actions/save-from-notes', () => ({
  cancelNotesReading: vi.fn(),
  saveBuyerFromNotes: vi.fn(),
}));
vi.mock('@/features/buyer-notes/client/prepare-notes', () => ({ prepareFiles: vi.fn() }));

const { PhraseChips, PhraseFlow } = await import('@/features/buyer-notes/components/phrase-flow');
const { NOTES_AI_WARNING } = await import('@/features/buyer-notes/components/notes-warning');
const { guardProposal } = await import('@/features/buyer-notes/services/guard-proposal');
const { draftFromProposal, phraseChips } =
  await import('@/features/buyer-notes/services/phrase-chips');
const { DEMO_NOTES_OUTPUT, DEMO_NOTES_PHOTO, DEMO_NOTES_TEXT, DEMO_PHRASE_TEXT } =
  await import('@/features/demo/data/notes-arnaud');

// La refonte, lot D (maquette REFONTE-2) — « Nouvel acquéreur par une phrase », au repos, et les
// pastilles de « Ce que j'ai compris ». La lecture et les corrections se jouent dans un vrai
// navigateur (spec `depuis-mes-notes`).

const tag = (html: string, testId: string) =>
  new RegExp(`<[a-z0-9]+[^>]*data-testid="${testId}"[^>]*>`).exec(html)?.[0] ?? '';
const filled = (html: string) => html.match(/(^|[" ])btn-filled( |")/g) ?? [];
const quick = createElement('form', { 'data-testid': 'buyer-quick-form' }, 'La saisie rapide');
// La saisie rapide est l'enfant de l'écran (elle n'apparaît que derrière « Saisir à la main »).
type FlowProps = Parameters<typeof PhraseFlow>[0];
const flow = (demo: FlowProps['demo']) => createElement(PhraseFlow, { demo } as FlowProps, quick);

describe('« Que cherche-t-il ? », avant la lecture', () => {
  const html = renderToStaticMarkup(flow(null));

  it('une phrase, « Dicter », « Photo de mes notes », un seul bouton plein', () => {
    expect(html).toContain('>Sa recherche<');
    expect(tag(html, 'phrase-text')).toContain('rows="4"');
    expect(html).toMatch(/data-testid="phrase-dictate"[^>]*>[\s\S]*?Dicter</);
    expect(html).toContain('Photo de mes notes');
    expect(filled(html)).toHaveLength(1);
    expect(tag(html, 'phrase-read')).toContain('btn-filled');
    expect(html).toContain('Voir ce que j’ai compris');
    expect(html).toContain('Vous pourrez tout compléter plus tard.');
  });

  it('rien n’est compris avant la lecture : ni pastille, ni « Trouver ses biens »', () => {
    expect(html).not.toContain('data-testid="phrase-understood"');
    expect(html).not.toContain('Trouver ses biens');
    expect(html).not.toContain('data-testid="notes-not-kept"');
  });

  it('l’avertissement validé de la lecture par l’IA est là, mot pour mot', () => {
    expect(html).toContain(`>${NOTES_AI_WARNING}<`);
    expect(NOTES_AI_WARNING).toContain('l’outil ne la relève pas, mais elle serait envoyée.');
  });

  it('la saisie rapide reste derrière « Saisir à la main », jamais sous la phrase', () => {
    expect(html).toContain('Saisir à la main');
    expect(html).not.toContain('data-testid="buyer-quick-form"');
  });

  it('la dictée est celle de l’appareil : rien ne le dit avant « Dicter »', () => {
    expect(html).not.toContain('data-testid="phrase-dictate-hint"');
  });

  it('dans l’agence de démonstration : une phrase d’avance, et la photo des notes, sans le mot « démo »', () => {
    const demo = renderToStaticMarkup(flow({ text: DEMO_PHRASE_TEXT, photo: DEMO_NOTES_PHOTO }));
    expect(demo).toContain('M. et Mme Arnaud. Une maison de 4 pièces ou plus');
    expect(demo).toContain('Lire cette photo');
    expect(tag(demo, 'phrase-text')).toContain('rows="4"');
    // Un texte de plusieurs lignes (des notes collées) agrandit la zone : dix lignes au plus.
    const pasted = renderToStaticMarkup(flow({ text: DEMO_NOTES_TEXT, photo: DEMO_NOTES_PHOTO }));
    expect(tag(pasted, 'phrase-text')).toContain('rows="10"');
    // Rien à l'écran ne dit « démo » (M114) : ni un texte, ni le nom d'une image.
    const shown = [...demo.matchAll(/>([^<]+)</g), ...demo.matchAll(/ alt="([^"]*)"/g)]
      .map((match) => match[1])
      .join(' ');
    expect(shown).toContain('Les notes de M. et Mme Arnaud');
    expect(shown).not.toMatch(/d[ée]mo/i);
    expect(filled(demo)).toHaveLength(1);
  });
});

describe('« Ce que j’ai compris » : les pastilles à toucher', () => {
  const guarded = guardProposal(DEMO_NOTES_OUTPUT);
  const proposal = {
    ...guarded,
    communes: (guarded.values.cities ?? []).map((name) => ({
      read: name,
      status: 'official' as const,
      name,
    })),
  };
  const chips = phraseChips(draftFromProposal(proposal), proposal);
  const render = (open: string | null) =>
    renderToStaticMarkup(
      createElement(PhraseChips, {
        chips,
        open,
        onOpen: () => {},
        onEdit: () => {},
        starsLeft: true,
      }),
    );

  it('le titre, « Touchez pour corriger », une pastille par chose comprise', () => {
    const html = render(null);
    expect(html).toContain('>Ce que j’ai compris<');
    expect(html).toContain('>Touchez pour corriger<');
    expect(html.match(/data-testid="phrase-chip"/g)).toHaveLength(chips.length);
    expect(html).toMatch(/data-chip="name"[^>]*data-tone="plain"/);
    expect(html).toMatch(/data-chip="soft:calme"[^>]*data-tone="soft"/);
    expect(html).toMatch(/data-chip="outdoor"[^>]*data-tone="must"/);
    // Aucun bouton plein parmi les pastilles ; aucune correction ouverte.
    expect(filled(html)).toHaveLength(0);
    expect(html).not.toContain('data-testid="chip-correction"');
  });

  it('une pastille touchée s’ouvre : sa valeur à corriger, et la ligne des notes d’où elle vient', () => {
    const html = render('name');
    expect(html).toContain('data-testid="chip-correction"');
    expect(tag(html, 'chip-input')).toContain('value="M. et Mme Arnaud"');
    expect(tag(html, 'chip-source')).not.toBe('');
    expect(html).toContain('d’après : « ARNAUD (M. et Mme) »');
    // Le nom ne se retire pas : il se corrige.
    expect(html).not.toContain('data-testid="chip-remove"');
    expect(filled(html)).toHaveLength(0);
  });

  it('un indispensable se dit simple souhait, ou se retire ; un nombre se retape', () => {
    const wish = render('outdoor');
    expect(wish).toContain('>Souhaité<');
    expect(wish).toContain('>Indispensable<');
    expect(wish).toContain('data-testid="chip-remove"');
    const budget = render('budgetMax');
    expect(tag(budget, 'chip-input')).toContain('value="750000"');
    expect(tag(budget, 'chip-input')).toContain('inputMode="numeric"');
  });
});
