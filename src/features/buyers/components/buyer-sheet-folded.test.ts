import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

// Mission 10 bis (Jean-Guy, 25/11 ; maquette `M10bis-fiche-acquereur-repliee.png`) — la fiche
// acquéreur, repliée. À l'ouverture, trois blocs : qui il est et ce qu'il cherche, la prochaine
// étape, « Son suivi » ; tout le reste sous un seul « Tout le dossier ». La page est un composant
// serveur qui lit la base : sa disposition se prouve ici sur son code, ses règles dans
// `buyer-sheet-layout.test.ts`, son rendu dans les specs e2e de la fiche.
const root = join(process.cwd(), 'src');
const read = (...parts: string[]) => readFileSync(join(root, ...parts), 'utf8');
const page = read('app', '(protected)', 'acquereurs', '[buyerId]', 'page.tsx');
const at = (marker: string) => {
  const index = page.indexOf(marker);
  expect(index, `« ${marker} » absent de la fiche`).toBeGreaterThan(-1);
  return index;
};
// La page écrit ses blocs dans l'ordre de l'écran ; « Tout le dossier » est le dernier pli.
const dossier = () =>
  page.slice(at('data-testid="buyer-all"'), at('data-testid="buyer-form-details"'));
const opening = () => page.slice(at('data-testid="buyer-header"'), at('data-testid="buyer-all"'));

describe('la fiche acquéreur, repliée', () => {
  it('à l’ouverture, dans l’ordre : qui il est, la prochaine étape, son suivi, « Tout le dossier »', () => {
    const order = [
      at('data-testid="buyer-header"'),
      at('data-testid="buyer-next-step"'),
      at('<BuyerFollowUp'),
      at('data-testid="buyer-all"'),
    ];
    expect([...order].sort((a, b) => a - b)).toEqual(order);
  });

  it('le premier bloc : son nom, son statut en simple badge, sa phrase, son téléphone', () => {
    const header = page.slice(
      at('data-testid="buyer-header"'),
      at('data-testid="buyer-next-step"'),
    );
    for (const marker of [
      'data-testid="buyer-name"',
      'data-testid="buyer-status-pill"',
      'data-testid="buyer-words"',
      'data-testid="buyer-phone"',
    ]) {
      expect(header, marker).toContain(marker);
    }
    // Le statut ne se change plus en tête : le badge n'est pas un lien.
    expect(header).not.toContain('href="#statut"');
    // Un seul bouton en contour, le téléphone : l'e-mail est un lien.
    expect(header.match(/btnSecondary/g) ?? []).toHaveLength(1);
  });

  it('ses critères et « Ce qui compte pour eux » sont repliés, dans le premier bloc', () => {
    const header = page.slice(
      at('data-testid="buyer-header"'),
      at('data-testid="buyer-next-step"'),
    );
    const fold = header.slice(header.indexOf('data-testid="buyer-search-fold"'));
    expect(fold).toContain('<summary');
    expect(fold).toContain('Ses critères et ce qui compte pour eux');
    expect(fold).toContain('data-testid="buyer-criteria"');
    expect(fold).toContain('<BuyerSoftCriteria');
    expect(fold).toContain('open={searchFoldOpen(');
  });

  it('« Modifier sa recherche » n’apparaît qu’une fois, sous ses critères', () => {
    expect(page.match(/Modifier sa recherche\s*</g) ?? []).toHaveLength(1);
    const header = page.slice(
      at('data-testid="buyer-header"'),
      at('data-testid="buyer-next-step"'),
    );
    expect(header).toContain('data-testid="buyer-edit-search"');
    // Ni « Ce qui compte pour eux », ni « Autres actions » ne le redisent.
    expect(read('features', 'buyer-notes', 'components', 'buyer-soft-criteria.tsx')).not.toMatch(
      /modifier=1|<Link|href=/,
    );
    expect(read('features', 'buyers', 'services', 'buyer-sheet-layout.ts')).not.toMatch(
      /label: 'Modifier sa recherche'/,
    );
  });

  it('un seul bouton plein à l’ouverture : la prochaine étape', () => {
    expect(page.match(/btn-filled/g) ?? []).toHaveLength(1);
    expect(
      page.slice(
        at('data-testid="buyer-next-button"') - 200,
        at('data-testid="buyer-next-button"') + 200,
      ),
    ).toContain('btn-filled');
    // Ni le suivi ni « Tout le dossier » n'en portent.
    expect(read('features', 'buyers', 'components', 'buyer-follow-up.tsx')).not.toContain(
      'btn-filled',
    );
  });

  it('tout le reste est sous « Tout le dossier » : rien n’est retiré', () => {
    const inside = dossier();
    for (const marker of [
      'Tout le dossier',
      'data-testid="buyer-steps"',
      'data-testid="ideal-selection"',
      'data-testid="buyer-other-actions"',
      'data-testid="buyer-dossier"',
      'Changer la sélection',
      'data-testid="buyer-vouchers"',
      'data-testid="buyer-offers"',
      '<BuyerDismissed',
      'readinessFold(true)',
      'data-testid="buyer-timeline"',
      'id="statut"',
      '<BuyerStatusActions',
      '<BuyerArchiveButton',
    ]) {
      expect(inside, marker).toContain(marker);
    }
    // … et plus à l'ouverture.
    const before = opening();
    for (const marker of [
      'data-testid="buyer-steps"',
      'data-testid="buyer-other-actions"',
      'data-testid="buyer-vouchers"',
      'data-testid="buyer-offers"',
      'data-testid="buyer-timeline"',
      '<BuyerStatusActions',
      '<BuyerArchiveButton',
    ]) {
      expect(before, marker).not.toContain(marker);
    }
  });

  it('« Tout le dossier » est replié ; il s’ouvre quand on y mène ou qu’une lecture y a échoué', () => {
    const inside = dossier();
    expect(inside).toContain('<summary');
    expect(inside).toContain('open={everythingOpen({');
    expect(inside).toContain("asked: tout === '1'");
    expect(inside).toContain('history.failed');
    // « Sa sélection », gardée parce que le suivi n'a pas pu être lu (Lancement 10), ne reste pas
    // sous un pli fermé ; ni une visite à organiser rangée ici.
    expect(inside).toContain('(showSelection && suiviUnread)');
    expect(inside).toContain('pendingVisit: dismissedPending');
    // Là où l'on rouvre sa recherche pendant une vente : « Tout le dossier », sur son statut.
    expect(page).toContain('href={statusHref(buyer.id)}');
  });

  it('« Prêt à visiter ? » reste dehors, ouvert, seulement quand il manque quelque chose', () => {
    expect(opening()).toContain('{readinessOutside ? readinessFold(false) : null}');
    expect(dossier()).toContain('{sale == null && !readinessOutside ? readinessFold(true) : null}');
    expect(page).toContain(
      'const readinessOutside = sale == null && readinessOpen(readiness.state, searching);',
    );
  });

  it('pendant une vente, « Avant le compromis » et « La vente » restent visibles, hors du dossier', () => {
    const before = opening();
    expect(before).toContain('data-testid="buyer-before-compromise"');
    expect(before).toContain('data-testid="buyer-sale"');
  });

  it('le formulaire de sa recherche ne s’écrit que sur demande, dans un pli qui garde la saisie', () => {
    const form = page.slice(at("{modifier === '1' ? ("));
    expect(form).toContain('data-testid="buyer-form-details"');
    expect(form).toContain('<details');
    expect(form).toContain('<BuyerForm');
    expect(page.match(/<BuyerForm/g) ?? []).toHaveLength(1);
  });

  it('le mot « dossier » ne nomme rien dans le code de la fiche repliée (CLAUDE.md, vocabulaire)', () => {
    const layout = read('features', 'buyers', 'services', 'buyer-sheet-layout.ts');
    expect(layout).not.toMatch(/\bdossier(Line|Open)\b/);
    expect(page).not.toMatch(/[?&]dossier=1|id="dossier"|\bdossier ===/);
  });
});
