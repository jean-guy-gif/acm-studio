import { expect, test, type Page } from '@playwright/test';

import { demoCredentials, goViaAccountMenu, login } from './support';

// Mission 142 — « Vivre ici », sur l'URL d'essai, avec le compte de l'agence de démonstration
// (aucun appel aux sources publiques : les fiches de la démo sont figées, M114). La visite demandée
// des Wilson (un appartement d'Antibes) : sa fiche sur Visites, en français, « depuis le quartier » ;
// « Confirmer la visite » prépare le message en anglais avec un lien neuf ; le lien, ouvert sur un
// téléphone, montre « Living here » sous le bien. La démo est remise à zéro d'abord.

async function resetDemo(page: Page): Promise<void> {
  await goViaAccountMenu(page, 'Ma démo');
  await expect(page).toHaveURL(/\/ma-demo$/);
  const hrefs = () =>
    page
      .getByTestId('demo-dossier')
      .evaluateAll((items) => items.map((item) => item.querySelector('a')?.getAttribute('href')));
  const before = await hrefs();
  if (before.length === 0) {
    await page.getByRole('button', { name: 'Préparer ma démo' }).click();
  } else {
    await page.getByRole('button', { name: 'Remettre ma démo à zéro' }).click();
    await page
      .getByTestId('demo-reset-confirm')
      .getByRole('button', { name: 'Remettre à zéro' })
      .click();
    await expect.poll(async () => (await hrefs())[0], { timeout: 180_000 }).not.toBe(before[0]);
  }
  await expect(page.getByTestId('demo-dossier')).toHaveCount(5, { timeout: 180_000 });
}

// Demain, à Paris.
const tomorrow = () => {
  const date = new Date(Date.now() + 86_400_000);
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Paris' }).format(date);
};

test('Vivre ici : la fiche sur Visites, la confirmation de visite, et le lien de l’acquéreur', async ({
  page,
}) => {
  await login(page, demoCredentials());
  await resetDemo(page);

  let link = '';
  await test.step('La visite des Wilson sur Visites : « Vivre ici » en français, depuis le quartier', async () => {
    await page.goto('/visites');
    const line = page
      .getByTestId('visit-line')
      .filter({ has: page.getByTestId('living-here-panel') })
      .filter({ hasText: 'Antibes' })
      .first();
    await expect(line).toBeVisible();
    const advisor = line.getByTestId('living-here-advisor');
    await advisor.locator('summary').click();
    await expect(advisor.getByTestId('living-here-from')).toContainText(
      'Distances depuis le quartier, pas depuis le bien lui-même.',
    );
    await expect(advisor.getByTestId('living-here-daily')).toContainText('min à pied');
    await expect(advisor.getByTestId('living-here-priorities')).toContainText(
      '★ Des commerces à pied',
    );
    await expect(advisor.getByTestId('living-here-risks')).toContainText(
      'Risques connus sur la commune',
    );
    // Jamais l'adresse de l'annonce, ni celle de ses lieux.
    await expect(advisor).not.toContainText(/allée|rue |avenue|chemin/i);

    await line.getByTestId('visit-confirm-open').click();
    await line.getByTestId('visit-confirm-day').fill(tomorrow());
    await line.getByTestId('visit-confirm-time').fill('10:30');
    await line.getByTestId('visit-confirm-prepare').click();
    const message = line.getByTestId('visit-confirm-message');
    await expect(message).toContainText('Hello Mr and Mrs Wilson');
    await expect(message).toContainText('I am confirming the viewing of the apartment in Antibes');
    await expect(message).toContainText('at 10:30 am');
    link = /https?:\/\/\S+\/dossier\/[A-Za-z0-9_-]{43}/.exec(await message.innerText())?.[0] ?? '';
    expect(link).not.toBe('');
    await page.reload();
    await expect(
      page
        .getByTestId('visit-line')
        .filter({ hasText: 'Antibes' })
        .getByTestId('visit-scheduled')
        .first(),
    ).toContainText('Visite planifiée le');
  });

  await test.step('Le lien, ouvert sur un téléphone : « Living here » sous le bien, en anglais', async () => {
    const bypass = process.env.E2E_VERCEL_BYPASS;
    const phone = await page
      .context()
      .browser()!
      .newContext({
        viewport: { width: 390, height: 844 },
        ...(bypass ? { extraHTTPHeaders: { 'x-vercel-protection-bypass': bypass } } : {}),
      });
    try {
      const visitor = await phone.newPage();
      await visitor.goto(link);
      await visitor.getByTestId('dossier-start').click();
      await visitor.getByTestId('deck-open-item').first().click();
      const living = visitor.getByTestId('living-here');
      await expect(living).toContainText('Living here');
      await expect(living.getByTestId('living-here-from')).toContainText(
        'Distances from the neighbourhood, not from the property itself.',
      );
      await expect(living).toContainText('min on foot');
      await expect(living.getByTestId('living-here-priorities')).toContainText(
        '★ Shops within walking distance',
      );
      await expect(living).not.toContainText(/Vivre ici|à pied|Distances depuis/);
    } finally {
      await phone.close();
    }
  });
});
