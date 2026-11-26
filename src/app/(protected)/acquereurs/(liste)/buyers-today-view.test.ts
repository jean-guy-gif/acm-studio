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
    expect(section).toMatch(/key=\{selected\?\.buyerId \?\? '[a-z]+'\}/);
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
    expect(view).toContain('<OtherTasks item={item} today={today} day={day} inCard />');
    expect(view).toContain('<OtherTasks item={item} today={today} day={day} />');
    expect(view).toContain('also={buyerOthersNote(item.others)}');
  });
});
