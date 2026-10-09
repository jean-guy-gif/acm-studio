import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { canConcludeProject } from '@/features/meeting-conclusion/services/can-conclude-project';

describe('canConcludeProject', () => {
  it('ouvre la conclusion pour un dossier en préparation, prêt ou conclu', () => {
    expect(canConcludeProject('draft')).toBe(true);
    expect(canConcludeProject('ready_for_meeting')).toBe(true);
    expect(canConcludeProject('meeting_completed')).toBe(true);
  });

  it('reste fermé pour un dossier archivé ou un statut inconnu', () => {
    expect(canConcludeProject('archived')).toBe(false);
    expect(canConcludeProject('preparation')).toBe(false);
    expect(canConcludeProject('')).toBe(false);
  });
});

// La page et l'action décident sur la même règle : aucune des deux ne compare elle-même le
// statut pour ouvrir ou refuser la conclusion (c'est ce doublon qui donnait le 404).
describe('la page et l’action de conclusion', () => {
  const sources = [
    'src/app/(protected)/builder/[projectId]/conclusion/page.tsx',
    'src/features/meeting-conclusion/actions/conclude-meeting.ts',
  ];

  it.each(sources)('%s passe par canConcludeProject', (path) => {
    const source = readFileSync(join(process.cwd(), path), 'utf8');
    expect(source).toContain('canConcludeProject(project.status)');
    expect(source).not.toMatch(/project\.status !== 'ready_for_meeting'/);
  });
});
