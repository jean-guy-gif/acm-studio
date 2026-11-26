import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  NextStepCard,
  ProjectAllLink,
  ProjectHeader,
} from '@/features/projects/components/project-summary';

// La refonte, lot E — les blocs du dossier d'un vendeur (REFONTE-8).

describe('l’en-tête du dossier', () => {
  it('un bien pas encore lu n’a pas de ligne : jamais « non renseigné » pour ce qu’on ignore', () => {
    const html = renderToStaticMarkup(
      createElement(ProjectHeader, { name: 'M. Lefebvre', badge: null }),
    );
    expect(html).toContain('M. Lefebvre');
    expect(html).not.toContain('project-property');
    expect(html).not.toContain('non renseigné');
  });

  it('un dossier sans bien vendeur le dit', () => {
    const html = renderToStaticMarkup(
      createElement(ProjectHeader, { name: 'M. Lefebvre', propertyText: null, badge: null }),
    );
    expect(html).toContain('Bien vendeur non renseigné');
  });

  it('son bien, tel que la liste le dit', () => {
    const html = renderToStaticMarkup(
      createElement(ProjectHeader, {
        name: 'M. Lefebvre',
        propertyText: 'Maison · 5 pièces · 140 m² · Mougins',
        badge: { label: 'Mandat signé', tone: 'good' },
      }),
    );
    expect(html).toContain('Maison · 5 pièces · 140 m² · Mougins');
    expect(html).toContain('Mandat signé');
  });
});

describe('la carte de la prochaine étape', () => {
  it('« Prochaine étape » sur la page du dossier, « À faire aujourd’hui » pour la tâche du jour', () => {
    const page = renderToStaticMarkup(
      createElement(NextStepCard, { title: 'Lancer le Live', action: null }),
    );
    expect(page).toContain('Prochaine étape');
    const today = renderToStaticMarkup(
      createElement(NextStepCard, {
        kicker: 'À faire aujourd’hui',
        title: 'Mandat signé le 26/10 · premier Point marché',
        action: null,
      }),
    );
    expect(today).toContain('À faire aujourd’hui');
    expect(today).not.toContain('Prochaine étape');
  });

  it('« Tout le dossier » mène à l’adresse donnée', () => {
    const html = renderToStaticMarkup(
      createElement(ProjectAllLink, { href: '/builder/p1?tout=1' }),
    );
    expect(html).toContain('href="/builder/p1?tout=1"');
    expect(html).toContain('Tout le dossier');
  });
});
