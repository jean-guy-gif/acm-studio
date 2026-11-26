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
  taskButtonClass,
  taskConfirmClass,
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

  // Relecture du lot B — un seul bouton plein par écran, geste ouvert compris : dans une carte « à
  // faire » qui ne mène pas l'écran, le bouton qui conclut (« J'ai relancé », « Envoyé ») reste en
  // contour. Sur « Aujourd'hui », rien ne change.
  it('le bouton d’une tâche et celui qui conclut son geste : pleins pour la carte qui mène l’écran', () => {
    const filled = (className: string) => /(^| )btn-filled( |$)/.test(className);
    expect(filled(taskButtonClass(true, 'socle'))).toBe(true);
    expect(filled(taskButtonClass(false, 'socle'))).toBe(false);
    expect(filled(taskConfirmClass(true, 'socle'))).toBe(true);
    expect(filled(taskConfirmClass(false, 'socle'))).toBe(false);
    // « Aujourd'hui » : le bouton qui conclut un geste ouvert est plein, quelle que soit la ligne.
    expect(taskConfirmClass(true)).toBe(btnPrimary);
    expect(taskConfirmClass(false)).toBe(btnPrimary);
    expect(taskConfirmClass(false, 'socle')).toBe(btnSecondary);
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

  // Relecture du lot B — une personne qui a plusieurs choses à faire : rien de dû n'est caché
  // derrière sa première tâche.
  it('ses autres choses à faire : sous son bouton dans la carte, « Aussi : … » dans la ligne', () => {
    const card = renderToStaticMarkup(
      createElement(TaskCard, {
        name: 'M. et Mme Moreau',
        task: 'Visite demandée : la maison de Mougins',
        action: createElement(
          'a',
          { href: '/x', className: socleBtnFilled },
          'Organiser la visite',
        ),
        more: createElement('div', { 'data-testid': 'more' }, 'Aussi aujourd’hui'),
      }),
    );
    expect(card.indexOf('Organiser la visite')).toBeLessThan(card.indexOf('data-testid="more"'));
    const row = renderToStaticMarkup(
      createElement(PersonRow, {
        href: '/acquereurs?personne=1',
        name: 'M. et Mme Moreau',
        task: '4 nouveaux biens trouvés par la veille',
        also: [
          {
            key: 'a',
            task: 'Sélection envoyée le 22/11, pas de réponse',
            late: 'en retard de 2 jours',
          },
          { key: 'b', task: 'Un point à proposer', late: null },
        ],
      }),
    );
    // La tâche de tête garde sa ligne à elle : les autres suivent, chacune la sienne.
    expect(row).toMatch(
      /data-testid="person-task"[^>]*>4 nouveaux biens trouvés par la veille<\/span>/,
    );
    const notes = row.match(/data-testid="person-also"/g) ?? [];
    expect(notes).toHaveLength(2);
    expect(row).toContain('>Aussi : Sélection envoyée le 22/11, pas de réponse<');
    // Le retard d'une autre tâche se dit aussi, en orange.
    expect(row.slice(row.indexOf('person-also'))).toContain('en retard de 2 jours');
    expect(row).not.toContain('btn-filled');
  });

  // Le toucher d'une ligne est pris tout de suite : la ligne choisie n'a pas besoin de le dire.
  it('une ligne choisie ne porte pas le repère d’attente ; au repos, aucune ne l’affiche', () => {
    const row = (selected: boolean) =>
      renderToStaticMarkup(
        createElement(PersonRow, {
          href: '/x',
          name: 'Mme Rossi',
          task: 'Visite demandée',
          selected,
        }),
      );
    expect(row(false)).not.toContain('data-testid="link-pending"');
    expect(row(true)).not.toContain('data-testid="link-pending"');
    // Le contour d'attente se pose sur la ligne : elle le contient.
    expect(row(false)).toMatch(/<a [^>]*class="relative /);
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
