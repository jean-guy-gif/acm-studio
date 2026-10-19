import { describe, expect, it } from 'vitest';

import { parseObjections, readObjections } from '@/features/meeting-conclusion/services/objections';

// Mission 110 — les objections relues côté serveur : liste fermée, sans doublon, ligne bornée.
describe('les objections reçues de l’écran', () => {
  it('ne gardent que la liste, dans son ordre, et une ligne de 200 caractères au plus', () => {
    const form = new FormData();
    for (const value of ['timing', 'price', 'price', 'pirate']) form.append('objections', value);
    form.set('objection_note', `  Le notaire   ${'x'.repeat(300)}`);
    const read = readObjections(form);
    expect(read.objections).toEqual(['price', 'timing']);
    expect(read.note?.startsWith('Le notaire x')).toBe(true);
    expect(read.note?.length).toBe(200);
  });

  it('rien de coché, rien de saisi', () => {
    expect(readObjections(new FormData())).toEqual({ objections: [], note: null });
    expect(parseObjections(null)).toEqual([]);
    expect(parseObjections(['not_ready', 'x'])).toEqual(['not_ready']);
  });
});
