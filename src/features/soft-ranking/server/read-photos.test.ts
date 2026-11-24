import { beforeEach, describe, expect, it, vi } from 'vitest';

// Lancement, mission 9 — la lecture des photos côté serveur, avec Bedrock et le chargeur d'images
// SIMULÉS : aucun test n'appelle le vrai modèle ni un vrai hébergeur.

type Block = { type: string; text?: string; source?: { media_type: string; data: string } };
const state = vi.hoisted(() => ({
  calls: [] as { system: string; content: Block[]; timeoutMs?: number; maxTokens: number }[],
  answer: {} as unknown,
  fail: false,
}));

vi.mock('@/lib/ai/bedrock', () => ({
  callStructured: async (input: {
    system: string;
    content: Block[];
    timeoutMs?: number;
    maxTokens: number;
  }) => {
    state.calls.push(input);
    if (state.fail) return { ok: false, cause: 'unavailable', model: 'm', usage: null };
    return {
      ok: true,
      json: state.answer,
      model: 'eu.anthropic.claude-sonnet-4-6',
      usage: { input_tokens: 10_000, output_tokens: 200 },
    };
  },
}));
vi.mock('@/features/subject-property-import/services/fetch-listing-image', () => ({
  fetchListingImage: async () => ({ ok: false, error: 'jamais appelé dans ces tests' }),
}));

const { photoWorstCase, readListingPhotos } =
  await import('@/features/soft-ranking/server/read-photos');

const MODEL = 'eu.anthropic.claude-sonnet-4-6';
const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 1, 2, 3]);
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 1, 2, 3]);
// Le chargeur simulé : « refus » dans l'adresse, l'hébergeur refuse ; « pdf », ce n'est pas une image.
const fetchImage = async (url: string) =>
  url.includes('refus')
    ? ({ ok: false, error: 'refusé' } as const)
    : ({ ok: true, bytes: url.includes('pdf') ? PDF : JPEG } as const);
const fetched: string[] = [];
const tracked = async (url: string) => {
  fetched.push(url);
  return fetchImage(url);
};

const base = () => ({
  picks: [
    { key: 'https://x.fr/1', urls: ['https://p/1.jpg', 'https://p/refus.jpg', 'https://p/3.jpg'] },
  ],
  criteria: ['lumineux' as const, 'vue' as const],
  model: MODEL,
  deadline: Date.now() + 30_000,
  room: 10 * photoWorstCase(MODEL),
  fetchImage: tracked,
});

beforeEach(() => {
  state.calls = [];
  state.fail = false;
  fetched.length = 0;
  state.answer = {
    jugements: [
      { critere: 'lumineux', verdict: 'montre', photos: [1, 2, 3] },
      { critere: 'vue', verdict: 'ne_se_voit_pas', photos: [] },
    ],
  };
});

describe('readListingPhotos', () => {
  it('envoie les photos chargées, chacune sous son numéro ; une photo refusée garde le sien', async () => {
    const read = await readListingPhotos(base());
    expect(state.calls).toHaveLength(1);
    const content = state.calls[0]!.content;
    expect(content.filter((block) => block.type === 'text').map((block) => block.text)).toEqual([
      'Photo 1 :',
      'Photo 3 :',
    ]);
    expect(content.filter((block) => block.type === 'image')).toHaveLength(2);
    expect(content[1]!.source!.media_type).toBe('image/jpeg');
    // La photo 2, jamais envoyée, ne peut pas être citée : le conseiller n'aurait rien à vérifier.
    expect(read.byKey.get('https://x.fr/1')!.get('lumineux')).toEqual({
      verdict: 'shown',
      numbers: [1, 3],
    });
    expect(read.byKey.get('https://x.fr/1')!.has('vue')).toBe(false);
    expect(read.spent).toBeGreaterThan(0);
    expect(read.spent).toBeLessThan(photoWorstCase(MODEL));
    // Ni lien ni clé du bien dans la demande : des numéros et des images.
    expect(JSON.stringify(state.calls[0]!.content.filter((b) => b.type === 'text'))).not.toMatch(
      /x\.fr|https/,
    );
  });

  it('les six premières photos au plus ; un fichier qui n’est pas une image n’est pas envoyé', async () => {
    const urls = Array.from({ length: 9 }, (_, index) => `https://p/${index + 1}.jpg`);
    urls[1] = 'https://p/pdf-2';
    await readListingPhotos({ ...base(), picks: [{ key: 'k', urls }] });
    expect(fetched).toHaveLength(6);
    expect(state.calls[0]!.content.filter((block) => block.type === 'image')).toHaveLength(5);
  });

  it('aucune photo chargée : aucun appel, rien de dépensé', async () => {
    const read = await readListingPhotos({
      ...base(),
      picks: [{ key: 'k', urls: ['https://p/refus-1.jpg', 'https://p/refus-2.jpg'] }],
    });
    expect(state.calls).toHaveLength(0);
    expect(read).toEqual({ byKey: new Map(), spent: 0 });
  });

  it('jamais plus que ce que la réservation couvre (M105)', async () => {
    const picks = ['a', 'b', 'c'].map((key) => ({ key, urls: ['https://p/1.jpg'] }));
    await readListingPhotos({ ...base(), picks, room: 2 * photoWorstCase(MODEL) });
    expect(state.calls).toHaveLength(2);
    state.calls = [];
    await readListingPhotos({ ...base(), picks, room: photoWorstCase(MODEL) - 1 });
    expect(state.calls).toHaveLength(0);
    expect(fetched).toHaveLength(2);
  });

  it('le délai écoulé, ou aucun critère visible sur une photo : rien ne part', async () => {
    await readListingPhotos({ ...base(), deadline: Date.now() + 1_000 });
    await readListingPhotos({ ...base(), criteria: [] });
    expect(state.calls).toHaveLength(0);
    expect(fetched).toHaveLength(0);
  });

  it('le fournisseur échoue : compté au pire, rien n’est lu, rien n’est inventé', async () => {
    state.fail = true;
    const read = await readListingPhotos(base());
    expect(read.byKey.size).toBe(0);
    expect(read.spent).toBe(photoWorstCase(MODEL));
  });
});
