import { describe, expect, it } from 'vitest';

import {
  OUTSIDE_MANDATE_NOTE,
  outsideMandateNote,
  visitNextStep,
  type VisitNextStepInput,
} from '@/features/buyer-presentation/services/visit-next-step';

// Mission 146 (partie B, I10) — le chemin d'une visite : une prochaine étape, le reste en liens.
const base: VisitNextStepInput = {
  done: false,
  outcome: null,
  scheduledAt: null,
  voucherSigned: false,
  hasReport: false,
  action: { kind: 'choose' },
  letterPrepared: false,
  letterState: { kind: 'none' },
  colleague: false,
};
const now = (input: Partial<VisitNextStepInput>) =>
  visitNextStep({ ...base, ...input })
    .track.filter((step) => step.status === 'now')
    .map((step) => step.label);

describe('visitNextStep — un bien qui n’est pas à l’agence', () => {
  it('l’exclusivité inconnue : écrire d’abord (« À qui écrire ? »)', () => {
    const result = visitNextStep(base);
    expect(result.agency).toBe(false);
    expect(result.step).toBe('write');
    expect(result.track.map((step) => step.label)).toEqual([
      'Écrire au propriétaire',
      'Réponse du propriétaire',
      'Confirmer la visite',
      'Visite faite',
    ]);
    expect(result.links).toMatchObject({ confirm: 'confirm', visitDone: true, voucher: false });
  });

  it('en exclusivité : écrire au confrère, puis sa réponse', () => {
    const result = visitNextStep({ ...base, action: { kind: 'colleague_letter' } });
    expect(result.track[0]?.label).toBe('Écrire au confrère');
    expect(result.track[1]?.label).toBe('Réponse du confrère');
  });

  it('le courrier préparé, pas encore remis : l’ouvrir', () => {
    for (const state of [
      { kind: 'ready', label: 'Courrier prêt' },
      { kind: 'address', label: 'Adresse à confirmer' },
    ] as const) {
      const result = visitNextStep({
        ...base,
        action: { kind: 'owner_letter' },
        letterPrepared: true,
        letterState: state,
      });
      expect(result.step).toBe('open_letter');
      expect(
        now({ action: { kind: 'owner_letter' }, letterPrepared: true, letterState: state }),
      ).toEqual(['Écrire au propriétaire']);
    }
  });

  it('remis ou rendez-vous obtenu : attendre sa réponse, sur sa carte', () => {
    for (const state of [
      { kind: 'handed', label: 'Remis le 02/11' },
      { kind: 'waiting', label: 'Rendez-vous obtenu' },
    ] as const) {
      const input = {
        action: { kind: 'owner_letter' } as const,
        letterPrepared: true,
        letterState: state,
      };
      expect(visitNextStep({ ...base, ...input }).step).toBe('wait');
      expect(now(input)).toEqual(['Réponse du propriétaire']);
    }
  });

  it('le dossier au confrère préparé dit le confrère, même si l’exclusivité était inconnue', () => {
    const result = visitNextStep({
      ...base,
      letterPrepared: true,
      colleague: true,
      letterState: { kind: 'handed', label: 'Contacté le 03/11' },
    });
    expect(result.track[1]?.label).toBe('Réponse du confrère');
  });

  it('« Ne plus solliciter » ou « Pas intéressé » : rien à faire ici', () => {
    const result = visitNextStep({
      ...base,
      letterPrepared: true,
      letterState: { kind: 'closed', label: 'Pas intéressé' },
    });
    expect(result.step).toBe('closed');
    expect(result.links.visitDone).toBe(true);
  });

  it('un vendeur à relancer : le rappeler d’abord', () => {
    const result = visitNextStep({ ...base, action: { kind: 'call_seller', projectId: 'p1' } });
    expect(result.step).toBe('call_seller');
    expect(result.agency).toBe(false);
  });
});

describe('visitNextStep — un bien de l’agence', () => {
  const signed = { action: { kind: 'propose_visit', projectId: 'p1' } } as const;

  it('mandat signé : confirmer la visite, puis le bon, puis visite faite', () => {
    const result = visitNextStep({ ...base, ...signed });
    expect(result.agency).toBe(true);
    expect(result.step).toBe('confirm');
    expect(result.track.map((step) => step.label)).toEqual([
      'Confirmer la visite',
      'Bon de visite',
      'Visite faite',
    ]);
    expect(result.links).toMatchObject({ confirm: null, visitDone: true, proposeToSeller: true });
  });

  it('planifiée : signer le bon de visite ; « Changer la date » en lien', () => {
    const result = visitNextStep({ ...base, ...signed, scheduledAt: '2026-11-10T13:00:00Z' });
    expect(result.step).toBe('voucher');
    expect(result.links.confirm).toBe('change');
    expect(now({ ...signed, scheduledAt: '2026-11-10T13:00:00Z' })).toEqual(['Bon de visite']);
  });

  it('le bon signé : visite faite', () => {
    const result = visitNextStep({ ...base, ...signed, voucherSigned: true });
    expect(result.step).toBe('visit_done');
    expect(result.links.visitDone).toBe(false);
    expect(result.track.map((step) => step.status)).toEqual(['done', 'done', 'now']);
  });

  it('mandat rentré ou collaboration obtenue : le bien est à l’agence', () => {
    const result = visitNextStep({
      ...base,
      action: { kind: 'colleague_letter' },
      letterPrepared: true,
      colleague: true,
      letterState: { kind: 'done', label: 'Collaboration obtenue' },
    });
    expect(result.agency).toBe(true);
    expect(result.step).toBe('confirm');
    expect(result.links.proposeToSeller).toBe(false);
  });
});

describe('visitNextStep — une visite faite', () => {
  it('« Offre envisagée » : l’offre d’achat, les messages en lien', () => {
    const result = visitNextStep({
      ...base,
      action: { kind: 'propose_visit', projectId: 'p1' },
      done: true,
      outcome: 'offer',
      hasReport: true,
      voucherSigned: true,
    });
    expect(result.step).toBe('offer');
    expect(result.links).toMatchObject({ messages: true, voucher: false, visitDone: false });
    expect(result.track.every((step) => step.status === 'done')).toBe(true);
  });

  it('sinon, ses messages prêts ; un bon jamais signé reste à signer, en lien', () => {
    const result = visitNextStep({
      ...base,
      action: { kind: 'propose_visit', projectId: 'p1' },
      done: true,
      outcome: 'follow',
      hasReport: true,
    });
    expect(result.step).toBe('messages');
    expect(result.links.voucher).toBe(true);
    expect(result.track.find((step) => step.key === 'voucher')?.status).toBe('later');
  });

  it('une visite faite sans compte rendu : aucune étape', () => {
    expect(visitNextStep({ ...base, done: true }).step).toBe('none');
  });
});

describe('outsideMandateNote — pourquoi pas de bon de visite (Jean-Guy, 12/11)', () => {
  it('une annonce du marché ou un concurrent pas encore à l’agence : la ligne grise', () => {
    expect(outsideMandateNote('listing', visitNextStep(base))).toBe(OUTSIDE_MANDATE_NOTE);
    expect(
      outsideMandateNote(
        'competitor',
        visitNextStep({
          ...base,
          letterPrepared: true,
          letterState: { kind: 'waiting', label: 'Contacté' },
        }),
      ),
    ).toBe(OUTSIDE_MANDATE_NOTE);
  });

  it('rien pour un bien de l’agence, un dossier vendeur ou un propriétaire opposé', () => {
    const collaboration = visitNextStep({
      ...base,
      letterPrepared: true,
      letterState: { kind: 'done', label: 'Collaboration obtenue' },
    });
    expect(outsideMandateNote('listing', collaboration)).toBeNull();
    expect(
      outsideMandateNote(
        'project',
        visitNextStep({ ...base, action: { kind: 'call_seller', projectId: 'p-1' } }),
      ),
    ).toBeNull();
    const closed = visitNextStep({
      ...base,
      letterPrepared: true,
      letterState: { kind: 'closed', label: 'Ne plus solliciter' },
    });
    expect(outsideMandateNote('competitor', closed)).toBeNull();
  });
});

// Mission 153 (planche M153-1) — hors mandat, l'étape « Bon de visite » existe aussi.
describe('visitNextStep — un bien hors mandat, la fonction ouverte', () => {
  const labels = (input: Partial<VisitNextStepInput>) =>
    visitNextStep({ ...base, outside: true, ...input }).track.map((step) => step.label);

  it('sans courrier : le chemin court, écrire reste en liens', () => {
    const result = visitNextStep({ ...base, outside: true, action: { kind: 'owner_letter' } });
    expect(result.track.map((step) => step.label)).toEqual([
      'Confirmer la visite',
      'Bon de visite',
      'Visite faite',
    ]);
    expect(result.step).toBe('confirm');
    expect(result.links.write).toBe(true);
    expect(
      visitNextStep({
        ...base,
        outside: true,
        action: { kind: 'owner_letter' },
        scheduledAt: '2026-11-14T08:00:00Z',
      }).step,
    ).toBe('voucher');
  });

  it('avec un courrier : son chemin, plus le bon de visite', () => {
    expect(
      labels({
        action: { kind: 'colleague_letter' },
        letterPrepared: true,
        colleague: true,
        letterState: { kind: 'handed', label: 'Contacté le 10/11' },
      }),
    ).toEqual([
      'Écrire au confrère',
      'Réponse du confrère',
      'Confirmer la visite',
      'Bon de visite',
      'Visite faite',
    ]);
  });

  it('un propriétaire qui ne veut plus être sollicité : aucun bon', () => {
    const closed = visitNextStep({
      ...base,
      outside: true,
      letterPrepared: true,
      letterState: { kind: 'closed', label: 'Ne plus solliciter' },
    });
    expect(closed.track.map((step) => step.label)).not.toContain('Bon de visite');
    expect(closed.links.voucher).toBe(false);
  });

  it('une visite faite sans bon : « Signer le bon de visite » en lien', () => {
    const done = visitNextStep({ ...base, outside: true, done: true, outcome: 'offer' });
    expect(done.step).toBe('offer');
    expect(done.links.voucher).toBe(true);
  });

  it('la ligne grise dit ce que le bon demandera, jusqu’au bon signé', () => {
    const next = visitNextStep({ ...base, outside: true });
    expect(
      outsideMandateNote('listing', next, { buyerName: 'Famille Keller', voucherSigned: false }),
    ).toBe(
      'Hors mandat de l’agence : le bon de visite et l’offre d’achat demandent votre mandat de recherche avec la famille Keller, ou la collaboration du confrère.',
    );
    expect(
      outsideMandateNote('listing', next, { buyerName: 'Famille Keller', voucherSigned: true }),
    ).toBeNull();
  });
});
