import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  ADVISOR_DEFAULTS_LABEL,
  CUSTOM_SETTING_LABEL,
  KEEP_AS_DEFAULTS_LABEL,
  SearchSettingsBlock,
} from '@/features/competitor-search/components/search-settings-block';
import {
  DEFAULT_SEARCH_SETTINGS,
  settingsToInput,
  type SearchSettings,
} from '@/features/competitor-search/services/search-settings';

// Mission 108 — « Garder comme mes réglages par défaut », et la mention sur un nouveau dossier.
const radius2: SearchSettings = { ...DEFAULT_SEARCH_SETTINGS, sector: { kind: 'radius', km: 2 } };

const render = (saved: SearchSettings, advisorDefaults: SearchSettings | null) =>
  renderToStaticMarkup(
    createElement(SearchSettingsBlock, {
      saved,
      input: settingsToInput(saved),
      defaults: { located: true, price: null, rooms: 3, surface: { min: 63, max: 77 } },
      dirty: false,
      saving: false,
      disabled: false,
      error: null,
      onChange: () => undefined,
      onSave: () => undefined,
      advisorDefaults,
      onSaveDefaults: () => undefined,
    }),
  );

describe('les réglages par défaut du conseiller', () => {
  it('le bouton « Garder comme mes réglages par défaut » est proposé', () => {
    expect(render(radius2, null)).toContain(KEEP_AS_DEFAULTS_LABEL);
  });

  it('un dossier réglé comme ses réglages par défaut le dit', () => {
    const html = render(radius2, radius2);
    expect(html).toContain(ADVISOR_DEFAULTS_LABEL);
  });

  it('un réglage propre au dossier reste « réglé par vous »', () => {
    const html = render(radius2, { ...DEFAULT_SEARCH_SETTINGS, sector: { kind: 'commune' } });
    expect(html).toContain(CUSTOM_SETTING_LABEL);
    expect(html).not.toContain(ADVISOR_DEFAULTS_LABEL);
  });
});
