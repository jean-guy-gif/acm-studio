import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// La refonte, lot B — « à faire aujourd'hui » d'Acquéreurs est un composant serveur qui lit la
// base : ses règles se prouvent dans `buyers-today.test.ts`, son rendu dans la spec e2e
// `acquereurs-a-faire`. Ici, ce que son code doit garder — trois points trouvés à la relecture.
const view = readFileSync(
  join(
    process.cwd(),
    'src',
    'app',
    '(protected)',
    'acquereurs',
    '(liste)',
    'buyers-today-view.tsx',
  ),
  'utf8',
);

describe('« à faire aujourd’hui » d’Acquéreurs : ce que la vue garde', () => {
  // Choisir une personne ne change que l'adresse (`?personne=`) : sans clé, React gardait l'état
  // du geste ouvert, et le message préparé pour l'une restait sous le nom de la suivante.
  it('le détail est neuf à chaque personne : sa clé est la personne choisie', () => {
    const at = view.indexOf('data-testid="buyers-today-detail"');
    expect(at).toBeGreaterThan(-1);
    const section = view.slice(view.lastIndexOf('<section', at), at);
    // La personne du détail : celle dont on voit les biens (lot C), sinon la personne choisie.
    expect(section).toMatch(/key=\{detailId \?\? '[a-z]+'\}/);
    expect(view).toContain('const detailId = deckBuyer?.id ?? selected?.buyerId ?? null;');
  });

  it('aucune ligne n’a son rang pour clé : une tâche faite ne lègue pas son geste à la suivante', () => {
    expect(view).not.toMatch(/key=\{[^}]*\bindex\b/);
    expect(view).toContain('key={buyerTaskKey(other.task)}');
  });

  it('un seul bouton plein : la première carte, ou le geste de la personne choisie ; ses autres tâches en contour', () => {
    expect(view.match(/primary=\{index === 0\}/g) ?? []).toHaveLength(1);
    expect(view.match(/ primary \/>/g) ?? []).toHaveLength(1);
    expect(view.match(/primary=\{false\}/g) ?? []).toHaveLength(1);
    expect(view.match(/primary=/g) ?? []).toHaveLength(3);
  });

  it('les autres choses à faire d’une personne sont aux trois tailles : carte, ligne, détail', () => {
    expect(view).toContain('<OtherTasks tasks={item.others} today={today} day={day} inCard />');
    expect(view).toContain(
      '<OtherTasks tasks={item.others} today={today} day={day} onPlace={watchOnPlace} />',
    );
    expect(view).toContain('also={buyerOthersNote(item.others)}');
  });

  // Relecture du lot C (bloquant) — écarter le dernier bien de la veille fait sortir la tâche de la
  // liste : le détail reste sur les biens de la personne tant que l'adresse le dit, et ses autres
  // choses à faire suivent, sous ses biens.
  it('le détail tient la personne sur ses biens par l’adresse ; la règle est dans le service', () => {
    expect(view).toContain('buyersTodayDetail(items, { personne, biens }');
    expect(view).toContain('href={buyerTodayHref(item)}');
    expect(view).toContain('<OtherTasks tasks={detail.beside} today={today} day={day} />');
    // La vue ne décide plus seule de qui voit ses biens.
    expect(view).not.toMatch(/task\.kind === 'buyer_watch'/);
  });
});
