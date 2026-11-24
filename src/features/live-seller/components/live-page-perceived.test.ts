import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { LivePagePerceived } from '@/features/live-seller/components/live-page-perceived';
import { LiveTextsProvider } from '@/features/live-seller/components/live-texts';
import type { LiveSellerSummary } from '@/features/live-seller/types';
import type { TextLanguage } from '@/lib/client-texts';

// Lancement, mission 1 (24/11) — le vendeur n'a aucune idée des prix : sur « Votre valeur perçue »,
// la première question du Live, un bouton en contour ouvre la présentation directe (chaque bien avec
// son prix, « Voir l'annonce » en un toucher). Rien ne dit au vendeur qu'il a refusé quoi que ce
// soit (M131) : le libellé parle de voir les biens, à la 2e personne ou sans personne (M89).
const render = (props: {
  saved?: number | null;
  onSeePricesFirst?: () => void;
  switching?: boolean;
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
        onSeePricesFirst: props.onSeePricesFirst,
        switching: props.switching,
      }),
    ),
  );

describe('« Votre valeur perçue » : le vendeur n’a aucune idée des prix', () => {
  it('propose de voir d’abord les biens et leurs prix, en contour, sous la question', () => {
    const html = render({ onSeePricesFirst: () => undefined });
    expect(html).toContain('data-testid="live-see-prices-first"');
    expect(html).toContain('Voir d’abord les biens et leurs prix');
    // Jamais un second bouton plein sur la scène : le seul plein reste « Valider » (M146).
    expect(html).not.toContain('btn-filled');
    // La question et le champ restent : le vendeur peut toujours dire son prix.
    expect(html).toContain('name="seller_perceived_property_price"');
  });

  it('rien ne dit au vendeur qu’il ne sait pas, ni qu’il refuse (M131)', () => {
    const html = render({ onSeePricesFirst: () => undefined });
    expect(html).not.toMatch(/ne sai[st] pas|aucune idée|refus|passer|sans jouer/i);
  });

  it('en anglais, le même bouton, dans les mots du vendeur', () => {
    const html = render({ onSeePricesFirst: () => undefined, language: 'en' });
    expect(html).toContain('data-testid="live-see-prices-first"');
    expect(html).toContain('See the competing properties and their asking prices first');
  });

  it('absent une fois le prix du vendeur noté, et quand la scène ne le propose pas', () => {
    expect(render({ saved: 350_000, onSeePricesFirst: () => undefined })).not.toContain(
      'live-see-prices-first',
    );
    expect(render({})).not.toContain('live-see-prices-first');
  });

  it('pendant l’enregistrement, le bouton ne se touche pas deux fois', () => {
    const html = render({ onSeePricesFirst: () => undefined, switching: true });
    expect(html).toMatch(
      /data-testid="live-see-prices-first"[^>]*disabled|disabled[^>]*data-testid="live-see-prices-first"/,
    );
  });
});
