import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LivePagePerceived } from '@/features/live-seller/components/live-page-perceived';
import { ctaPrimary, navBtn } from '@/features/live-seller/components/live-stage';
import { LiveTextsProvider } from '@/features/live-seller/components/live-texts';
import type { LiveSellerSummary } from '@/features/live-seller/types';
import { clientTexts, type TextLanguage } from '@/lib/client-texts';

// Lancement, mission 1 (24/11) — le vendeur n'a aucune idée des prix : sur « Votre valeur perçue »,
// la première question du Live, un bouton en contour ouvre la présentation directe (chaque bien avec
// son prix, « Voir l'annonce » en un toucher). Rien ne dit au vendeur qu'il a refusé quoi que ce
// soit (M131) ; le geste ne se défait pas, il se confirme d'un second toucher (comme M92).
const render = (props: {
  saved?: number | null;
  confirming?: number | null;
  onSeePricesFirst?: () => void;
  language?: TextLanguage;
}) =>
  renderToStaticMarkup(
    createElement(
      LiveTextsProvider,
      { language: props.language ?? 'fr' },
      createElement(LivePagePerceived, {
        summary:
          props.saved != null
            ? ({ seller_perceived_property_price: props.saved } as LiveSellerSummary)
            : null,
        confirming: props.confirming ?? null,
        onSeePricesFirst: props.onSeePricesFirst,
      }),
    ),
  );

describe('« Votre valeur perçue » : le vendeur n’a aucune idée des prix', () => {
  it('propose de voir les biens et leurs prix, en contour, sous la question', () => {
    const html = render({ onSeePricesFirst: () => undefined });
    expect(html).toContain('data-testid="live-see-prices-first"');
    expect(html).toContain('Voir les biens et leurs prix');
    // En contour : le style des boutons de navigation, jamais celui du bouton plein de la scène.
    const button = /<button[^>]*data-testid="live-see-prices-first"[^>]*>/.exec(html)?.[0] ?? '';
    const classes = (/class="([^"]*)"/.exec(button)?.[1] ?? '').split(' ');
    for (const name of navBtn.split(' ')) expect(classes, name).toContain(name);
    const filledOnly = ctaPrimary.split(' ').filter((name) => !navBtn.split(' ').includes(name));
    expect(filledOnly.length).toBeGreaterThan(0);
    expect(filledOnly.every((name) => !classes.includes(name))).toBe(true);
    expect(html).not.toContain('btn-filled');
    // La question et le champ restent : le vendeur peut toujours dire son prix.
    expect(html).toContain('name="seller_perceived_property_price"');
    // La confirmation n'est pas encore à l'écran : un seul toucher ne change rien.
    expect(html).not.toContain('live-see-prices-confirm');
  });

  it('rien ne dit au vendeur qu’il ne sait pas, ni qu’il refuse (M131), et un seul « d’abord » sur l’écran', () => {
    for (const language of ['fr', 'en'] as const) {
      const t = clientTexts(language).live.perceived;
      const said = [t.seePrices, t.seePricesAsk, t.seePricesYes, t.seePricesBack].join(' ');
      expect(said).not.toMatch(
        /ne sai[st] pas|aucune idée|refus|passer|sans jouer|don.t know|no idea|skip|refuse/i,
      );
      // « D'abord votre intuition… » est déjà dit au-dessus : le bouton ne le contredit pas.
      expect(said).not.toMatch(/d’abord|d'abord|first/i);
    }
  });

  it('en anglais, le même bouton, dans les mots du vendeur', () => {
    const html = render({ onSeePricesFirst: () => undefined, language: 'en' });
    expect(html).toContain('data-testid="live-see-prices-first"');
    expect(html).toContain('See the competing properties and their asking prices');
  });

  it('absent une fois le prix noté, pendant qu’un prix tapé attend sa confirmation, et sans la scène', () => {
    expect(render({ saved: 350_000, onSeePricesFirst: () => undefined })).not.toContain(
      'live-see-prices',
    );
    expect(render({ confirming: 350_000, onSeePricesFirst: () => undefined })).not.toContain(
      'live-see-prices',
    );
    expect(render({})).not.toContain('live-see-prices');
  });
});
