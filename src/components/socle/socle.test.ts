import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { initialsOf, initialsTint, INITIALS_TINTS } from '@/components/socle/initials';
import { StatTiles } from '@/components/socle/stat-tiles';
import { PersonRow, RowLink, TaskCard } from '@/components/socle/task-card';
import {
  btnPrimary,
  btnSecondary,
  chipGreen,
  chipNeutral,
  chipOrange,
  pillGreen,
  pillNeutral,
  pillOrange,
  socleBtnFilled,
  socleBtnOutline,
  socleBtnQuiet,
} from '@/components/ui/styles';

// La refonte, lot A — les blocs du socle (maquettes REFONTE-1 à 8).
describe('le rond aux initiales', () => {
  it('la première lettre du premier mot et celle du dernier ; rien n’est deviné', () => {
    expect(initialsOf('M. et Mme Moreau')).toBe('MM');
    expect(initialsOf('Mme Rossi')).toBe('MR');
    expect(initialsOf('Famille Keller')).toBe('FK');
    expect(initialsOf('M. et Mme Lambert-Duval')).toBe('ML');
    expect(initialsOf('Jean-Guy Ourmières')).toBe('JO');
    expect(initialsOf('Keller')).toBe('KE');
    expect(initialsOf('  ')).toBe('?');
  });

  it('une teinte par personne, toujours la même, parmi trois', () => {
    expect(INITIALS_TINTS).toHaveLength(3);
    expect(initialsTint('Mme Rossi')).toBe(initialsTint('Mme Rossi'));
    expect(INITIALS_TINTS).toContain(initialsTint('M. et Mme Moreau'));
    // La teinte n'est pas une couleur de sens : ni rouge, ni alerte.
    for (const tint of INITIALS_TINTS) expect(tint).not.toMatch(/red|amber/);
  });
});

describe('les boutons du socle', () => {
  it('un seul genre de bouton plein : il porte le repère que comptent les écrans (M146)', () => {
    expect(socleBtnFilled).toMatch(/^btn-filled /);
    expect(socleBtnOutline).not.toContain('btn-filled');
    expect(socleBtnQuiet).not.toContain('btn-filled');
  });

  it('48 px de haut, coins de 14 px ; la couleur est celle de la charte de l’agence', () => {
    for (const button of [socleBtnFilled, socleBtnOutline]) {
      expect(button).toContain('h-12');
      expect(button).toContain('rounded-[14px]');
      expect(button).toContain('brand-deep');
      expect(button).not.toMatch(/#26327F/i);
    }
    expect(socleBtnOutline).toContain('border-[1.5px]');
  });

  it('les boutons d’avant ne changent pas : le Live, les documents et les liens publics les lisent', () => {
    expect(btnPrimary).toContain('rounded-xl');
    expect(btnPrimary).toContain('text-sm');
    expect(btnSecondary).toContain('border-zinc-300');
  });
});

describe('les pastilles', () => {
  it('trois teintes, deux tailles : 34 px à lire, 44 px à toucher', () => {
    for (const pill of [pillNeutral, pillGreen, pillOrange]) expect(pill).toContain('h-[34px]');
    for (const chip of [chipNeutral, chipGreen, chipOrange]) expect(chip).toContain('h-11');
  });
});

describe('la carte « à faire »', () => {
  it('la personne, ce qu’il y a à faire, et son bouton', () => {
    const html = renderToStaticMarkup(
      createElement(TaskCard, {
        name: 'M. et Mme Moreau',
        task: '4 nouveaux biens pour eux',
        action: createElement('a', { href: '/x', className: socleBtnFilled }, 'Voir les biens'),
      }),
    );
    expect(html).toContain('data-testid="task-card"');
    expect(html).toContain('>MM<');
    const order = ['M. et Mme Moreau', '4 nouveaux biens pour eux', 'Voir les biens'];
    const positions = order.map((text) => html.indexOf(text));
    expect(positions.every((position) => position >= 0)).toBe(true);
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
    expect(html.match(/btn-filled/g)).toHaveLength(1);
  });

  it('en ligne dans la colonne : un lien ; la personne ouverte à droite est dite', () => {
    const row = (selected: boolean) =>
      renderToStaticMarkup(
        createElement(PersonRow, {
          href: '/acquereurs/1',
          name: 'Mme Rossi',
          task: 'Veut visiter la maison de Mougins',
          selected,
        }),
      );
    expect(row(true)).toMatch(
      /<a [^>]*aria-current="true"[^>]*href="\/acquereurs\/1"|<a [^>]*href="\/acquereurs\/1"[^>]*aria-current="true"/,
    );
    expect(row(true)).toContain('border-brand-deep');
    expect(row(false)).not.toContain('aria-current');
    expect(row(false)).not.toContain('btn-filled');
  });

  it('« Tous mes acquéreurs » : une ligne, son nombre, jamais un bouton plein', () => {
    const html = renderToStaticMarkup(
      createElement(RowLink, {
        href: '/acquereurs?vue=agence',
        label: 'Tous mes acquéreurs',
        count: 12,
      }),
    );
    expect(html).toContain('href="/acquereurs?vue=agence"');
    expect(html).toMatch(/Tous mes acquéreurs<\/span>[\s\S]*>12</);
    expect(html).not.toContain('btn-filled');
  });
});

describe('les tuiles de chiffres', () => {
  it('trois chiffres, chacun avec ce qu’il compte ; la teinte ne dit rien seule', () => {
    const html = renderToStaticMarkup(
      createElement(StatTiles, {
        tiles: [
          { value: 6, label: 'Concurrents retenus' },
          { value: 2, label: 'Prix à revérifier', tone: 'watch' },
          { value: 5, label: 'Acquéreurs prêts à visiter', tone: 'good' },
        ],
      }),
    );
    expect(html).toContain('grid-cols-3');
    for (const text of ['Concurrents retenus', 'Prix à revérifier', 'Acquéreurs prêts à visiter']) {
      expect(html).toContain(text);
    }
    expect(html).toMatch(/>6<\/span>[\s\S]*>2<\/span>[\s\S]*>5<\/span>/);
  });
});
