import { describe, expect, it } from 'vitest';

import { departmentsOfPostalCode } from '@/features/buyer-notes/services/agency-communes';
import {
  fieldsStillToVerify,
  sanitizeBuyerFieldsToVerify,
} from '@/features/buyer-notes/services/fields-to-verify';
import { imageMediaType, parseNoteInput } from '@/features/buyer-notes/services/note-input';
import { notesReadingOpen } from '@/features/buyer-notes/services/reading-gate';
import { refusedWordIn } from '@/features/buyer-notes/services/refused-words';
import {
  proposedCities,
  verifyCommune,
  verifyCommunes,
} from '@/features/buyer-notes/services/verify-communes';

const OFFICIAL = [
  { nom: 'Châteauneuf-Grasse', code: '06038' },
  { nom: 'Saint-Laurent-du-Var', code: '06123' },
  { nom: 'Opio', code: '06089' },
  { nom: 'Valbonne', code: '06152' },
  { nom: 'Antibes', code: '06004' },
  // Deux homonymes, pour l'ambiguïté.
  { nom: 'Le Bar-sur-Loup', code: '06010' },
  { nom: 'Bar-sur-Loup', code: '99999' },
];

describe('verifyCommune (règle de Jean-Guy, 12/11)', () => {
  it('rattache « Châteauneuf-de-Grasse » et « St-Laurent-du-Var » à leur nom officiel', () => {
    expect(verifyCommune('Châteauneuf-de-Grasse', OFFICIAL)).toEqual({
      read: 'Châteauneuf-de-Grasse',
      status: 'corrected',
      name: 'Châteauneuf-Grasse',
    });
    expect(verifyCommune('St-Laurent-du-Var', OFFICIAL)).toMatchObject({
      status: 'corrected',
      name: 'Saint-Laurent-du-Var',
    });
    expect(verifyCommune('Opio', OFFICIAL)).toEqual({
      read: 'Opio',
      status: 'official',
      name: 'Opio',
    });
  });

  it('garde un nom d’usage et un arrondissement tels que lus', () => {
    expect(verifyCommune('Juan-les-Pins', OFFICIAL)).toMatchObject({
      status: 'usage',
      name: 'Juan-les-Pins',
    });
    expect(verifyCommune('Paris 15e', OFFICIAL)).toMatchObject({ status: 'usage' });
  });

  it('ne devine jamais : inconnue ou ambiguë, le champ reste au conseiller', () => {
    expect(verifyCommune('Cagnes', OFFICIAL)).toEqual({
      read: 'Cagnes',
      status: 'unknown',
      name: null,
    });
    expect(verifyCommune('Le Bar sur le Loup', OFFICIAL)).toMatchObject({
      status: 'ambiguous',
      name: null,
    });
  });

  it('une liste illisible n’est pas « aucune commune » : « non vérifiée »', () => {
    expect(verifyCommune('Valbonne', null)).toEqual({
      read: 'Valbonne',
      status: 'unverified',
      name: 'Valbonne',
    });
  });

  it('propose les noms officiels ou d’usage, sans doublon, sans les inconnues', () => {
    const checks = verifyCommunes(
      ['Valbonne', 'Opio', 'Châteauneuf-de-Grasse', 'Cagnes', 'Opio'],
      OFFICIAL,
    );
    expect(proposedCities(checks)).toEqual(['Valbonne', 'Opio', 'Châteauneuf-Grasse']);
  });

  it('lit les départements d’un code postal, Corse et outre-mer compris', () => {
    expect(departmentsOfPostalCode('06140 Vence')).toEqual(['06']);
    expect(departmentsOfPostalCode('20000')).toEqual(['2A', '2B']);
    expect(departmentsOfPostalCode('97400')).toEqual(['974']);
    expect(departmentsOfPostalCode('Vence')).toEqual([]);
  });
});

describe('parseNoteInput', () => {
  const jpeg = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2]);
  const png = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const webp = new Uint8Array(
    [...'RIFF']
      .map((c) => c.charCodeAt(0))
      .concat(
        [0, 0, 0, 0],
        [...'WEBP'].map((c) => c.charCodeAt(0)),
      ),
  );
  const heic = new Uint8Array([0, 0, 0, 24, ...[...'ftypheic'].map((c) => c.charCodeAt(0))]);

  it('lit le type d’une image sur ses octets', () => {
    expect(imageMediaType(jpeg)).toBe('image/jpeg');
    expect(imageMediaType(png)).toBe('image/png');
    expect(imageMediaType(webp)).toBe('image/webp');
    expect(imageMediaType(heic)).toBe('heic');
    expect(imageMediaType(new Uint8Array([1, 2, 3, 4]))).toBeNull();
  });

  it('refuse HEIC avec sa consigne, un fichier inconnu, trop d’images, rien à lire', () => {
    expect(parseNoteInput({ kind: 'photo', text: '', images: [heic] })).toEqual({
      ok: false,
      cause: 'unsupported_file',
      heic: true,
    });
    expect(
      parseNoteInput({ kind: 'photo', text: '', images: [new Uint8Array([1, 2, 3])] }),
    ).toMatchObject({
      cause: 'unsupported_file',
    });
    expect(
      parseNoteInput({ kind: 'photo', text: '', images: [jpeg, jpeg, jpeg, jpeg] }),
    ).toMatchObject({
      cause: 'too_large',
    });
    expect(parseNoteInput({ kind: 'text', text: '   ', images: [] })).toMatchObject({
      cause: 'empty',
    });
    expect(parseNoteInput({ kind: 'texte', text: 'x', images: [] })).toMatchObject({
      cause: 'empty',
    });
    expect(parseNoteInput({ kind: 'text', text: 'x'.repeat(20_001), images: [] })).toMatchObject({
      cause: 'too_large',
    });
  });

  it('accepte un texte, ou jusqu’à trois images', () => {
    const text = parseNoteInput({ kind: 'text', text: ' T3 Antibes ', images: [] });
    expect(text).toMatchObject({ ok: true, kind: 'text', text: 'T3 Antibes', images: [] });
    const photos = parseNoteInput({ kind: 'photo', text: null, images: [jpeg, png] });
    expect(photos.ok && photos.images.map((image) => image.mediaType)).toEqual([
      'image/jpeg',
      'image/png',
    ]);
  });
});

describe('refusedWordIn', () => {
  it('attrape santé, famille, origine, patrimoine, métier, jugement, en début de mot', () => {
    for (const phrase of [
      'Mère malade',
      'divorce en cours',
      'couple suédois',
      'rentier, très fortuné',
      'travaille de nuit',
      'Monsieur un peu radin',
      'très gentille',
    ]) {
      expect(refusedWordIn(phrase), phrase).not.toBeNull();
    }
  });

  it('laisse passer les faits pratiques', () => {
    for (const phrase of [
      'Visites le samedi après-midi',
      'Pas de voiture le week-end (à vérifier)',
      'Doivent vendre leur maison avant (compromis signé)',
      'AU CALME — pas de route',
    ]) {
      expect(refusedWordIn(phrase), phrase).toBeNull();
    }
  });
});

describe('notesReadingOpen', () => {
  it('reste fermée sauf pour la démo (simulée) et les opérateurs', () => {
    const operators = 'jean-guy@exemple.fr';
    const env = process.env.ACM_OPERATOR_EMAILS;
    process.env.ACM_OPERATOR_EMAILS = operators;
    try {
      expect(notesReadingOpen({ isDemo: false, email: 'conseiller@agence.fr' })).toBe(false);
      expect(notesReadingOpen({ isDemo: true, email: 'conseiller@agence.fr' })).toBe(true);
      expect(notesReadingOpen({ isDemo: false, email: 'Jean-Guy@exemple.fr' })).toBe(true);
      expect(notesReadingOpen({ isDemo: false, email: 'conseiller@agence.fr', open: true })).toBe(
        true,
      );
    } finally {
      process.env.ACM_OPERATOR_EMAILS = env;
    }
  });
});

describe('les champs « À vérifier »', () => {
  it('ne gardent que des noms de champs de la fiche', () => {
    expect(
      sanitizeBuyerFieldsToVerify(['name', 'cities', 'sources', 'name', 42, 'financing']),
    ).toEqual(['name', 'cities', 'financing']);
  });

  it('un champ modifié perd sa pastille ; un champ inchangé la garde (surface « 65.00 » = 65)', () => {
    const before = { name: 'M. Arnaud', surface_min: '65.00', budget_max: 750000 };
    const written = { name: 'M. et Mme Arnaud', surface_min: 65, budget_max: 750000 };
    expect(
      fieldsStillToVerify(['name', 'surface_min', 'budget_max', 'financing'], before, written),
    ).toEqual(['surface_min', 'budget_max', 'financing']);
  });
});
