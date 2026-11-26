import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { readFileSync } from 'node:fs';
import path from 'node:path';

import { initialsOf } from '@/components/socle/initials';
import { soclePreviewOpen } from '@/components/socle/preview-open';
import { StatTiles } from '@/components/socle/stat-tiles';
import { PersonMark, PersonRow, RowLink, TaskCard } from '@/components/socle/task-card';
import { MARK_TONES, TEXT_TONES } from '@/components/socle/tone';
import {
  btnPrimary,
  btnSecondary,
  chipGreen,
  chipNeutral,
  chipOrange,
  pillGreen,
  pillNeutral,
  pillOrange,
  socleBigPair,
  socleBigStep,
  socleBtnFilled,
  socleBtnFilledBig,
  socleBtnOutline,
  socleBtnQuiet,
  socleBtnQuietBig,
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

  // Sur les maquettes, l'orange va avec « Financement à valider » et « 2 prix ont changé », le vert
  // avec « Veut visiter » et « Mandat signé » : une couleur de sens ne se tire pas au sort.
  it('la teinte suit ce qu’il y a à faire, jamais le nom', () => {
    const mark = (name: string, tone?: 'plain' | 'watch' | 'good') =>
      renderToStaticMarkup(createElement(PersonMark, { name, tone }));
    const classOf = (html: string) => /class="([^"]*)"/.exec(html)?.[1];

    // Deux personnes, la même tâche : la même teinte.
    expect(classOf(mark('Mme Rossi', 'watch'))).toBe(classOf(mark('M. Fontaine', 'watch')));
    // La même personne, deux tâches : deux teintes.
    expect(classOf(mark('Mme Rossi', 'watch'))).not.toBe(classOf(mark('Mme Rossi', 'good')));
    // Sans rien dire : la couleur de l'agence, pour tout le monde.
    for (const name of ['Mme Rossi', 'M. Fontaine', 'Famille Keller', 'M. et Mme Moreau']) {
      expect(classOf(mark(name))).toBe(classOf(mark('Mme Rossi', 'plain')));
      expect(mark(name)).toContain(MARK_TONES.plain);
    }
    expect(mark('Mme Rossi', 'watch')).toContain(MARK_TONES.watch);
    expect(mark('Mme Rossi', 'good')).toContain(MARK_TONES.good);
  });

  it('trois teintes : la couleur de l’agence, un vert, un orange ; jamais de rouge', () => {
    for (const tones of [MARK_TONES, TEXT_TONES]) {
      expect(Object.keys(tones).sort()).toEqual(['good', 'plain', 'watch']);
      expect(tones.plain).toContain('brand');
      expect(new Set(Object.values(tones)).size).toBe(3);
      for (const tone of Object.values(tones)) expect(tone).not.toMatch(/red|#26327F/i);
    }
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

  it('les grands boutons d’une décision : coins de 16 px, la hauteur donnée par l’écran', () => {
    expect(socleBtnFilledBig).toMatch(/^btn-filled /);
    expect(socleBtnQuietBig).not.toContain('btn-filled');
    for (const button of [socleBtnFilledBig, socleBtnQuietBig]) {
      expect(button).toContain('rounded-2xl');
      expect(button).toContain('text-[17px]');
      // Aucune hauteur dans le jeton : deux hauteurs sur le même bouton se contrediraient.
      expect(button).not.toMatch(/(^| )h-/);
    }
    expect(socleBigStep).toBe('h-[54px] xl:h-14');
    expect(socleBigPair).toBe('h-[58px] xl:h-14');
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

  it('la carte prend la teinte de sa tâche', () => {
    const card = (tone?: 'watch' | 'good') =>
      renderToStaticMarkup(
        createElement(TaskCard, {
          name: 'M. Fontaine',
          task: 'Financement à valider avant de visiter',
          tone,
          action: createElement('a', { href: '/x', className: socleBtnOutline }, 'L’appeler'),
        }),
      );
    expect(card('watch')).toContain(MARK_TONES.watch);
    expect(card('watch')).not.toContain(MARK_TONES.good);
    expect(card()).toContain(MARK_TONES.plain);
  });

  it('en ligne dans la colonne : un lien ; la personne ouverte à droite est dite', () => {
    const row = (selected: boolean) =>
      renderToStaticMarkup(
        createElement(PersonRow, {
          href: '/acquereurs/1',
          name: 'Mme Rossi',
          task: 'Veut visiter la maison de Mougins',
          tone: 'good',
          selected,
        }),
      );
    expect(row(true)).toContain(MARK_TONES.good);
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

describe('l’aperçu du socle', () => {
  it('ouvert sur l’essai et en local ; un environnement qui ne se dit pas reste fermé', () => {
    expect(soclePreviewOpen({ VERCEL_ENV: 'preview', NODE_ENV: 'production' })).toBe(true);
    expect(soclePreviewOpen({ NODE_ENV: 'development' })).toBe(true);
    expect(soclePreviewOpen({ VERCEL_ENV: 'production', NODE_ENV: 'production' })).toBe(false);
    expect(soclePreviewOpen({ NODE_ENV: 'production' })).toBe(false);
    expect(soclePreviewOpen({ VERCEL_ENV: 'development', NODE_ENV: 'production' })).toBe(false);
    expect(soclePreviewOpen({})).toBe(false);
  });

  it('la page se garde par cette règle, avant de rendre quoi que ce soit', () => {
    const page = readFileSync(path.resolve('src/app/(protected)/socle/page.tsx'), 'utf8');
    const guard = page.indexOf('if (!soclePreviewOpen()) notFound();');
    expect(guard).toBeGreaterThan(0);
    expect(guard).toBeLessThan(page.indexOf('return ('));
    expect(page).not.toContain('process.env');
  });
});
