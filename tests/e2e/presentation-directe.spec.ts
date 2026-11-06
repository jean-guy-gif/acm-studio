import { expect, test, type Page } from '@playwright/test';

import { DEMO_BUYERS } from '../../src/features/demo/services/demo-buyers';
import {
  demoCredentials,
  goViaAccountMenu,
  login,
  mainText,
  pagePayload,
  readDemoBuyersShown,
} from './support';

// Mission 131 — la présentation directe, sur l'URL d'essai, avec le compte de l'agence de
// démonstration (rien d'extérieur, rien de payant) et son dossier « Prêt, en présentation
// directe » : remis en Live interactif, le Live est mené sur les deux premiers concurrents, passé
// en présentation directe au 3e par « Réglages », puis conduit jusqu'à la conclusion. L'Étude de
// marché s'ouvre depuis le dossier (Avant le rendez-vous, Vue d'ensemble) et depuis le Live.
//
// Le passage remet d'abord la démo du compte à zéro : le dossier joué est neuf à chaque fois.

const PERCEIVED_PRICE = 985_500;
const GUESS = 870_500;
const COMMERCIALIZATION_PRICE = 952_500;
const DEMO_LISTING_HOST = 'annonces.demonstration.invalid';

const validate = (page: Page) => page.getByRole('button', { name: /Valider et continuer/ }).click();
const choose = (page: Page, label: string) =>
  page
    .locator('label')
    .filter({ hasText: new RegExp(`^${label}$`) })
    .click();

async function freshDemo(page: Page): Promise<{ direct: string; ready: string }> {
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
  const idOf = async (stage: string) => {
    const href = await page
      .locator(`[data-testid="demo-dossier"][data-stage="${stage}"] a`)
      .first()
      .getAttribute('href');
    const id = /\/builder\/([^/]+)\//.exec(href ?? '')?.[1];
    expect(id, `Le dossier de démo « ${stage} » est introuvable dans « Ma démo »`).toBeTruthy();
    return id as string;
  };
  return { direct: await idOf('direct'), ready: await idOf('ready') };
}

// Mission 133 — ce qui ne doit jamais apparaître devant le vendeur : le nom, le téléphone et
// l'e-mail d'un acquéreur de la démo.
const BUYER_SECRETS = DEMO_BUYERS.flatMap((buyer) =>
  [buyer.name, buyer.phone, buyer.email].filter((value): value is string => value != null),
);

async function expectMarketStudy(page: Page, from: string): Promise<void> {
  await expect(page, `L’Étude de marché ne s’ouvre pas depuis ${from}`).toHaveURL(
    /\/etude-de-marche$/,
  );
  await expect(page.getByText(/Étude de marché/).first()).toBeVisible();
  expect(await pagePayload(page), `Une adresse d’annonce dans l’Étude (${from})`).not.toContain(
    DEMO_LISTING_HOST,
  );
}

// Les deux premiers concurrents, en Live interactif : le sérieux, la devinette, la révélation,
// puis la durée quand elle est connue.
async function interactiveCompetitor(page: Page, position: number): Promise<void> {
  await expect(
    page.getByRole('heading', { name: 'Est-il un sérieux concurrent pour votre bien ?' }),
  ).toBeVisible();
  await expect(page.getByText(new RegExp(`Concurrent ${position} sur 5 · Étape 1`))).toBeVisible();
  await choose(page, 'Oui, un concurrent sérieux');
  await validate(page);
  await expect(
    page.getByRole('heading', { name: 'À quel prix pensez-vous que ce bien est proposé ?' }),
  ).toBeVisible();
  await page.locator('input[name="seller_estimated_listing_price"]').fill(String(GUESS));
  await validate(page);
  await expect(
    page.getByRole('heading', { name: 'Ce prix vous paraît-il cohérent ?' }).first(),
  ).toBeVisible();
  await validate(page);
  const duration = page.getByRole('heading', { name: 'Pourquoi est-il toujours sur le marché ?' });
  const next = page.getByRole('heading', {
    name: 'Est-il un sérieux concurrent pour votre bien ?',
  });
  await expect(duration.or(next).first()).toBeVisible();
  if (await duration.isVisible()) {
    await page.locator('input[name="seller_estimated_days_on_market"]').fill('90');
    await page.getByRole('button', { name: /Révéler la durée/ }).click();
    await expect(page.getByText('Durée observée sur le marché')).toBeVisible();
    await validate(page);
  }
}

test('la présentation directe : passée au 3e concurrent, jusqu’à la conclusion', async ({
  page,
}) => {
  await login(page, demoCredentials());
  const { direct: projectId } = await freshDemo(page);

  await test.step('Avant le rendez-vous : la façon de présenter, et l’Étude de marché', async () => {
    await page.goto(`/builder/${projectId}/avant-rendez-vous`);
    const modes = page.locator('[data-presentation-mode]');
    await expect(modes.locator('input[value="direct"]')).toBeChecked();
    // Pas de note de 1 à 10 en directe : le déroulé ne la compte pas.
    await expect(page.getByText('Question de 1 à 10')).toHaveCount(0);
    await page.getByTestId('market-study-link').click();
    await expectMarketStudy(page, 'Avant le rendez-vous');
    // Le Live commence en interactif : on y revient avant de lancer.
    await page.goto(`/builder/${projectId}/avant-rendez-vous`);
    await modes.locator('label').filter({ hasText: 'Live interactif' }).click();
    await expect(modes.locator('input[value="interactive"]')).toBeChecked();
    // L'enregistrement est fini quand les choix se réactivent (ils sont désactivés pendant l'envoi).
    await expect(modes.locator('input[value="direct"]')).toBeEnabled();
    await expect(modes.locator('[role="alert"]')).toHaveCount(0);
    await page.reload();
    await expect(page.locator('[data-presentation-mode] input[value="interactive"]')).toBeChecked();
    // La Vue d'ensemble propose aussi l'Étude. Mission 133 — et les acquéreurs de l'agence pour ce
    // bien : 5 prêts (la maison a une piscine), M. Fontaine correspond sans être prêt.
    await page.goto(`/builder/${projectId}`);
    await expect(page.getByTestId('property-buyers-headline')).toHaveText(
      '5 prêts à visiter · 1 autre correspond',
    );
    await expect(page.getByTestId('property-buyer-ready')).toHaveCount(5);
    await page.getByTestId('market-study-link').click();
    await expectMarketStudy(page, 'la Vue d’ensemble');
  });

  await test.step('Le Live interactif, deux concurrents', async () => {
    await page.goto(`/live/${projectId}`);
    await expect(page).toHaveURL(new RegExp(`/builder/${projectId}/lancer-le-live$`));
    await page.getByTestId('launch-for-real').click();
    await expect(page).toHaveURL(new RegExp(`/live/${projectId}$`));
    await page.getByRole('button', { name: 'Démarrer la présentation' }).click();
    await expect(page.getByRole('heading', { name: 'Votre bien', exact: true })).toBeVisible();
    // Mission 133 — le compteur caché : une pastille sans chiffre ni texte ; la bulle du conseiller,
    // puis « Montrer au vendeur » : 5 cartes anonymes ; le retour rend le même écran.
    // Dans la barre du bas, à côté de « Précédent ».
    const dot = page.getByTestId('live-buyers-dot');
    await expect(dot).toBeVisible();
    const previous = await page.getByRole('button', { name: '← Précédent' }).boundingBox();
    const dotBox = await dot.boundingBox();
    expect(
      Math.abs(
        (dotBox?.y ?? 0) +
          (dotBox?.height ?? 0) / 2 -
          ((previous?.y ?? 0) + (previous?.height ?? 0) / 2),
      ),
    ).toBeLessThan(12);
    expect((await dot.innerText()).trim()).toBe('');
    const before = page.url();
    await dot.click();
    await expect(page.getByTestId('live-buyers-bubble')).toContainText('5 acquéreurs prêts');
    await page.getByRole('button', { name: 'Montrer au vendeur' }).click();
    const screen = page.getByTestId('live-buyers-screen');
    await expect(screen.getByTestId('live-buyers-count')).toHaveText('5');
    await expect(screen).toContainText(
      'familles cherchent un bien comme le vôtre et sont prêtes à visiter',
    );
    await expect(screen.getByTestId('live-buyers-promise')).toHaveText(
      'Avec votre accord, je les contacte dès cette semaine.',
    );
    // « cherche depuis » : étalé sur plusieurs semaines dans la démo.
    expect(
      new Set(await screen.getByTestId('live-buyer-card').allInnerTexts()).size,
    ).toBeGreaterThan(1);
    await expect(screen.getByText(/cherche depuis \d+ semaines?/)).toHaveCount(5);
    await expect(screen.getByTestId('live-buyer-card')).toHaveCount(5);
    await expect(screen.getByText('Financement validé')).toHaveCount(5);
    const payload = await pagePayload(page);
    for (const secret of BUYER_SECRETS) {
      expect(payload, `« ${secret} » devant le vendeur`).not.toContain(secret);
    }
    await page.getByTestId('live-buyers-back').click();
    await expect(screen).toHaveCount(0);
    expect(page.url()).toBe(before);
    await expect(page.getByRole('heading', { name: 'Votre bien', exact: true })).toBeVisible();
    // Le moment est noté sur le Live, avec le nombre montré (lu en base).
    await expect.poll(() => readDemoBuyersShown(projectId), { timeout: 20_000 }).toBe(5);
    await validate(page);
    await page
      .locator('input[name="seller_perceived_property_price"]')
      .fill(String(PERCEIVED_PRICE));
    await validate(page);
    await page.getByRole('button', { name: /Confirmer et continuer/ }).click();
    await interactiveCompetitor(page, 1);
    await interactiveCompetitor(page, 2);
  });

  await test.step('Au 3e concurrent : « Passer en présentation directe »', async () => {
    await expect(
      page.getByRole('heading', { name: 'Est-il un sérieux concurrent pour votre bien ?' }),
    ).toBeVisible();
    await page.getByTestId('live-options').click();
    const study = page.getByRole('menuitem', { name: 'Télécharger l’Étude de marché' });
    await expect(study).toHaveAttribute('href', `/builder/${projectId}/etude-de-marche?vue=live`);
    // Ouverte devant le vendeur, dans un nouvel onglet : le document seul, rien du conseiller.
    const [popup] = await Promise.all([page.context().waitForEvent('page'), study.click()]);
    await popup.waitForLoadState();
    await expect(popup).toHaveURL(/\/etude-de-marche\?vue=live$/);
    await expect(popup.getByText(/Étude de marché/).first()).toBeVisible();
    await expect(popup.getByRole('link', { name: /Retour au dossier/ })).toHaveCount(0);
    await expect(popup.getByText(/Créer un lien/)).toHaveCount(0);
    expect(await pagePayload(popup)).not.toContain(DEMO_LISTING_HOST);
    await popup.close();
    await page.getByTestId('live-options').click();
    await page.getByRole('menuitem', { name: 'Passer en présentation directe' }).click();
    // Le même concurrent, son prix affiché d'emblée, sans question.
    await expect(
      page.getByRole('heading', { name: 'Un bien en vente près du vôtre' }),
    ).toBeVisible();
    await expect(page.getByText('Concurrent 3 sur 5', { exact: true })).toBeVisible();
    await expect(page.locator('[data-direct-price]')).toBeVisible();
    expect(await mainText(page)).toMatch(/prixaffichésurlemarché\d+€/i);
    await expect(page.locator('input')).toHaveCount(0);
    for (const position of [4, 5]) {
      await validate(page);
      await expect(page.getByText(`Concurrent ${position} sur 5`, { exact: true })).toBeVisible();
      await expect(page.locator('[data-direct-price]')).toBeVisible();
    }
    await validate(page);
  });

  await test.step('Le plus proche, proposé par le conseiller, puis l’analyse', async () => {
    const dpe = page.getByRole('heading', { name: 'Le DPE face au marché' });
    const closest = page.getByRole('heading', {
      name: 'Le concurrent le plus proche de votre bien',
    });
    await expect(dpe.or(closest).first()).toBeVisible();
    if (await dpe.isVisible()) await validate(page);
    await expect(closest).toBeVisible();
    await expect(page.getByText('Quel concurrent vous paraît le plus dangereux ?')).toHaveCount(0);
    const card = page.getByTestId('closest-competitor').first();
    await card.click();
    await expect(card).toHaveAttribute('aria-pressed', 'true');
    await validate(page);
    await expect(
      page.getByRole('heading', { name: 'Analyse des prix', exact: true }),
    ).toBeVisible();
    // Les deux devinés et les trois montrés en directe sont sur la bande.
    await expect(page.locator('[data-price-band] [data-band-dot]')).toHaveCount(5);
    await validate(page);
  });

  await test.step('La conclusion termine le rendez-vous, sans note de 1 à 10', async () => {
    await expect(page.getByRole('heading', { name: 'Conclusion', exact: true })).toBeVisible();
    await expect(page.getByText('Concurrent le plus proche de votre bien').first()).toBeVisible();
    await page
      .locator('input[name="commercialization_price"]')
      .fill(String(COMMERCIALIZATION_PRICE));
    await page.getByRole('button', { name: 'Enregistrer le prix' }).click();
    await expect(page.getByText('Prix de commercialisation enregistré.')).toBeVisible();
    await page.getByRole('button', { name: /Terminer le rendez-vous/ }).click();
    await expect(page).toHaveURL(new RegExp(`/live/${projectId}/merci$`));
  });

  await test.step('L’Étude de marché, depuis le lien du Live', async () => {
    await page.goto(`/builder/${projectId}/etude-de-marche`);
    await expectMarketStudy(page, 'le menu du Live');
  });
});

// Mission 133 — sous 5 acquéreurs prêts, rien : ni pastille, ni bulle, ni écran. La maison de
// Mme Garcia n'a pas de piscine, les Lambert la veulent (★) : il en reste 4.
test('la boucle : un dossier à 4 acquéreurs prêts n’a pas de pastille', async ({ page }) => {
  await login(page, demoCredentials());
  const { ready: garciaId } = await freshDemo(page);
  await page.goto(`/builder/${garciaId}`);
  await expect(page.getByTestId('property-buyers-headline')).toHaveText(
    '4 prêts à visiter · 1 autre correspond',
  );
  await page.goto(`/live/${garciaId}`);
  await expect(page).toHaveURL(new RegExp(`/builder/${garciaId}/lancer-le-live$`));
  await page.getByTestId('launch-for-real').click();
  await expect(page).toHaveURL(new RegExp(`/live/${garciaId}$`));
  await page.getByRole('button', { name: 'Démarrer la présentation' }).click();
  await expect(page.getByRole('heading', { name: 'Votre bien', exact: true })).toBeVisible();
  await expect(page.getByTestId('live-buyers-dot')).toHaveCount(0);
  expect(await pagePayload(page)).not.toContain('familles cherchent un bien');
});

// Mission 134 — « Personne n'est oublié » : un concurrent retenu chez les Bernard (ven-02, Vence,
// 140 m², piscine) fait naître « 4 acquéreurs pour la maison de Vence » ; l'envoi en série en note
// trois, en passe un, la tâche dit « 1 acquéreur » ; le dernier envoyé, elle se vide ; les fiches
// disent « proposé le … ». ACM n'envoie rien : il prépare le lien et note l'envoi.
test('personne n’est oublié : un nouveau bien, ses acquéreurs, l’envoi en série', async ({
  page,
}) => {
  await login(page, demoCredentials());
  const { direct: projectId } = await freshDemo(page);
  const vence = /pour la maison de Vence/;

  await test.step('Retenir ven-02 sur le dossier des Bernard', async () => {
    await page.goto(`/builder/${projectId}/comparables/find`);
    await page.getByRole('button', { name: 'Chercher les concurrents' }).click();
    const target = page
      .getByTestId('ranked-candidate')
      .filter({ has: page.locator('a[href*="ven-02"]') })
      .first();
    await expect(target, 'ven-02 n’est pas proposé par la recherche simulée').toBeVisible({
      timeout: 90_000,
    });
    const boxes = page
      .locator('label')
      .filter({ hasText: /^À retenir$/ })
      .locator('input');
    for (const box of await boxes.all()) {
      if (await box.isChecked()) await box.uncheck();
    }
    await target
      .locator('label')
      .filter({ hasText: /^À retenir$/ })
      .locator('input')
      .check();
    await page
      .getByRole('button', { name: /^Retenir et importer les? 1 concurrents? cochés?$/ })
      .click();
    await expect(page.getByRole('button', { name: /Import en cours…/ })).toHaveCount(0, {
      timeout: 120_000,
    });
    await expect(page.getByText(/en échec/)).toHaveCount(0);
  });

  const openTask = async (count: number) => {
    const task = page.getByTestId('suivi-task').filter({ hasText: vence });
    // La retenue peut s'achever juste après l'import : le Suivi se relit jusqu'à la tâche.
    await expect
      .poll(
        async () => {
          await page.goto('/suivi');
          return task.count();
        },
        { timeout: 45_000, intervals: [2_000, 3_000, 5_000] },
      )
      .toBe(1);
    await expect(task).toContainText(
      `${count} ${count > 1 ? 'acquéreurs' : 'acquéreur'} pour la maison de Vence`,
    );
    await expect(task).toContainText('bien du marché : à vérifier avant d’envoyer');
    await task.getByRole('link', { name: 'Proposer ce bien' }).click();
    await expect(page).toHaveURL(/\/acquereurs\/proposer\?bien=/);
  };
  const sendOne = async () => {
    await page.getByTestId('propose-prepare').click();
    await expect(page.getByTestId('propose-message')).toContainText('/dossier/');
    await expect(page.getByTestId('propose-copy')).toBeVisible();
    const payload = await page.getByTestId('propose-message').innerText();
    expect(payload).toMatch(/^Bonjour /);
    await page.getByTestId('propose-sent').click();
  };

  await test.step('La tâche, puis la série : trois envoyés, un passé', async () => {
    await openTask(4);
    await expect(page.getByTestId('propose-candidate')).toHaveCount(5);
    // M. Fontaine correspond sans être prêt : coché, le conseiller le décoche.
    await page.getByRole('checkbox', { name: 'M. Fontaine' }).uncheck();
    await page.getByTestId('propose-start').click();
    for (let index = 0; index < 3; index += 1) {
      await expect(page.getByText(`${index + 1} sur 4`)).toBeVisible();
      await sendOne();
    }
    await expect(page.getByText('4 sur 4')).toBeVisible();
    await page.getByTestId('propose-skip').click();
    await expect(page.getByTestId('propose-done')).toContainText('3 envois notés');
  });

  await test.step('La tâche dit 1 acquéreur ; le dernier envoyé, elle se vide', async () => {
    await openTask(1);
    await expect(page.getByTestId('propose-already')).toHaveCount(3);
    await expect(page.getByTestId('propose-already').first()).toContainText('déjà proposé le');
    await page.getByRole('checkbox', { name: 'M. Fontaine' }).uncheck();
    await page.getByTestId('propose-start').click();
    await sendOne();
    await expect(page.getByTestId('propose-done')).toContainText('1 envoi noté');
    await page.goto('/suivi');
    await expect(page.getByTestId('suivi-today')).not.toContainText(vence);
  });

  await test.step('Les fiches disent « proposé le … »', async () => {
    await page.goto('/acquereurs');
    await page.getByRole('link', { name: 'M. et Mme Lambert' }).first().click();
    await expect(page.getByTestId('buyer-proposals')).toContainText('proposé le');
    await expect(page.getByTestId('buyer-timeline')).toContainText('Bien proposé');
  });
});

// Mission 135 — « Des fiches qui font visiter » : la sélection des Lambert, partagée il y a 3 jours
// sans réponse, fait naître sa relance ; elle se fait sur place depuis « À faire aujourd'hui ».
// Les deux refus « Le prix » des Keller proposent un ajustement, qui s'applique, se date et change
// leurs correspondances. « Ce mois-ci » est en tête de la liste.
test('des fiches qui font visiter : la relance sur place, l’ajustement appliqué', async ({
  page,
}) => {
  await login(page, demoCredentials());
  await freshDemo(page);

  await test.step('Relancer M. et Mme Lambert, sur place', async () => {
    await page.goto('/suivi');
    const task = page.getByTestId('suivi-task').filter({ hasText: 'Relancer M. et Mme Lambert' });
    await expect(task).toContainText(/sélection envoyée le \d{2}\/\d{2}, pas de réponse/);
    await task.getByTestId('buyer-relaunch-open').click();
    await task.getByTestId('buyer-relaunch-prepare').click();
    const message = task.getByTestId('buyer-relaunch-message');
    await expect(message).toContainText('Avez-vous pu regarder la sélection envoyée le');
    await expect(message).toContainText('/dossier/');
    expect(await message.innerText()).not.toMatch(/disponible|€/);
    await task.getByTestId('buyer-relaunch-record').click();
    await expect(task.getByTestId('buyer-relaunch-done')).toBeVisible();
    await page.reload();
    await expect(
      page.getByTestId('suivi-task').filter({ hasText: 'Relancer M. et Mme Lambert' }),
    ).toHaveCount(0);
  });

  await test.step('Les refus des Keller : l’ajustement s’applique', async () => {
    await page.goto('/acquereurs');
    await expect(page.getByTestId('buyers-month')).toContainText(/^Ce mois-ci : /);
    const kellerRow = page.getByTestId('buyer-row').filter({ hasText: 'Famille Keller' });
    await expect(kellerRow.getByTestId('buyer-row-last-answer')).toContainText(
      'Pas pour moi · Le prix',
    );
    await kellerRow.getByRole('link', { name: 'Famille Keller' }).click();
    const before = Number(
      /· (\d+)/.exec(await page.getByTestId('buyer-matches-link').innerText())?.[1] ?? -1,
    );
    const suggestion = page.locator('[data-testid="answer-suggestion"][data-kind="price"]');
    await expect(suggestion).toContainText(/budget plafond à 1\s579\s000\s€/);
    await suggestion.getByRole('button', { name: /Appliquer|Accepter/ }).click();
    await expect(page).toHaveURL(/\?ajuste=1$/);
    await expect(page.getByTestId('buyer-adjusted-matches')).toBeVisible();
    await expect(page.getByTestId('buyer-timeline')).toContainText(
      'Recherche ajustée : Budget plafond',
    );
    await expect(suggestion).toHaveCount(0);
    // Le budget baissé change ses correspondances : moins de biens qu'avant.
    const after = Number(
      /· (\d+)/.exec(await page.getByTestId('buyer-matches-link').innerText())?.[1] ?? -1,
    );
    expect(before).toBeGreaterThan(0);
    expect(after).toBeLessThan(before);
  });
});

// Mission 136 — « La veille des acquéreurs » : la veille simulée de la démo (un passage d'il y a
// 2 jours, aucun appel) fait naître la tâche des Keller ; elle ouvre leurs biens idéaux, les deux
// nouveaux biens en tête ; la fiche dit la veille ; le manager règle son plafond (jamais plus de la
// moitié du budget de l'agence, 0 € la coupe), remis à 10 € en fin de passage.
test('la veille des acquéreurs : la tâche des Keller, leurs nouveaux biens, le plafond', async ({
  page,
}) => {
  await login(page, demoCredentials());
  await freshDemo(page);

  await test.step('« 2 nouveaux biens pour la famille Keller » dans À faire aujourd’hui', async () => {
    await page.goto('/suivi');
    const task = page
      .getByTestId('suivi-task')
      .filter({ hasText: '2 nouveaux biens pour la famille Keller' });
    await expect(task).toContainText('trouvés par la veille');
    await task.getByRole('link', { name: 'Voir les biens' }).click();
    await expect(page).toHaveURL(/\/acquereurs\/[0-9a-f-]{36}\/biens-ideaux#nouveau$/);
  });

  await test.step('Les biens idéaux, « Nouveau cette semaine » en tête', async () => {
    const watch = page.getByTestId('ideal-watch');
    await expect(watch).toContainText('Nouveau cette semaine');
    await expect(watch.getByTestId('ideal-watch-hit')).toHaveCount(2);
    await expect(watch.getByTestId('ideal-watch-hit').first()).toContainText(
      /affiché le \d{2}\/\d{2}\/\d{4}/,
    );
    await expect(watch.getByTestId('ideal-watch-hit').first()).toContainText(
      /\d+ critères? sur \d+/,
    );
    // Elle vient avant ce que l'agence a déjà.
    const watchBox = await watch.boundingBox();
    const agencyBox = await page.getByTestId('ideal-agency').boundingBox();
    expect(watchBox!.y).toBeLessThan(agencyBox!.y);
    await expect(page.getByText(/disponible|estimation/i)).toHaveCount(0);
    await expect(page.getByText(/\bM\d{2,3}\b/)).toHaveCount(0);
  });

  await test.step('La fiche dit la veille', async () => {
    await page.goto('/acquereurs');
    await page.getByRole('link', { name: 'Famille Keller' }).click();
    await expect(page.getByTestId('buyer-watch-line')).toHaveText(
      /^Veille : dernière recherche le \d{2}\/\d{2}, prochaine le \d{2}\/\d{2}$/,
    );
  });

  await test.step('Le manager règle le plafond de la veille', async () => {
    await page.goto('/admin');
    const admin = page.getByTestId('buyer-watch-admin');
    await expect(admin).toContainText('Veille des acquéreurs');
    await expect(admin.getByTestId('buyer-watch-journal')).toContainText('Famille Keller');
    const cap = admin.getByTestId('buyer-watch-cap');
    try {
      await cap.fill('16');
      await admin.getByRole('button', { name: 'Enregistrer' }).click();
      await expect(admin.getByRole('alert')).toContainText('moitié');
      await cap.fill('0');
      await admin.getByRole('button', { name: 'Enregistrer' }).click();
      await expect(admin.getByTestId('buyer-watch-state')).toHaveText('Veille coupée');
    } finally {
      await cap.fill('10');
      await admin.getByRole('button', { name: 'Enregistrer' }).click();
      await expect(admin.getByTestId('buyer-watch-state')).toHaveText('Veille active');
    }
  });
});

// Mission 137 (partie A) — le bon de visite : la démo arrive avec le bon signé de la visite des
// Keller au mandat de Mougins ; il s'ouvre, texte validé et signature ; un second se signe à la
// souris sur le canevas (n° de mandat repris du premier), son lien s'ouvre sans compte, jamais
// indexé.
test('le bon de visite : celui de la démo, puis un bon signé au doigt et son lien', async ({
  page,
  browser,
}) => {
  await login(page, demoCredentials());
  await freshDemo(page);

  await test.step('La visite des Keller porte son bon signé', async () => {
    await page.goto('/visites');
    const signed = page.getByTestId('visit-voucher-signed').first();
    await expect(signed).toContainText(/^Bon de visite signé le \d{2}\/\d{2}\/\d{4}$/);
    await signed.click();
    const document = page.getByTestId('voucher-document');
    await expect(document).toContainText('BON DE VISITE - BIEN(S) A VENDRE');
    await expect(document).toContainText('Je soussigné(e) M. Paul Keller');
    await expect(document).toContainText('la gestion et le suivi de de relations commerciales');
    await expect(document).not.toContainText(/réseau|\{|\}/);
    await expect(document.getByTestId('voucher-signatures').locator('img')).toHaveCount(1);
    await expect(document).toContainText(/empreinte du texte \(SHA-256\) : [0-9a-f]{64}/);
  });

  let linkPath = '';
  await test.step('Un nouveau bon, signé à la souris', async () => {
    await page.goto('/acquereurs');
    await page.getByRole('link', { name: 'Famille Keller' }).click();
    const fiche = page.url();
    await page.goto(`${fiche}/bon-de-visite`);
    const form = page.getByTestId('voucher-form');
    await expect(form).toBeVisible();
    // Le n° de mandat du bon précédent est repris ; le visiteur aussi.
    await expect(form.getByTestId('voucher-mandate').first()).toHaveValue('M-2026-0142');
    await expect(form.getByTestId('voucher-visitor-1')).toHaveValue('Paul Keller');
    await expect(form.getByTestId('voucher-sign')).toBeDisabled();
    await form.getByTestId('voucher-approved').check();
    const canvas = form.getByTestId('voucher-signature-1');
    const box = (await canvas.boundingBox())!;
    await page.mouse.move(box.x + 30, box.y + box.height / 2);
    await page.mouse.down();
    for (let step = 1; step <= 12; step += 1) {
      await page.mouse.move(box.x + 30 + step * 25, box.y + box.height / 2 + (step % 2 ? 18 : -18));
    }
    await page.mouse.up();
    await form.getByTestId('voucher-sign').click();
    await expect(page.getByTestId('voucher-signed')).toBeVisible({ timeout: 20_000 });
    linkPath = (await page.getByTestId('voucher-link').innerText()).trim();
    expect(linkPath).toMatch(/\/bon-de-visite\/[A-Za-z0-9_-]{43}$/);
    await expect(page.getByText(/\bM\d{2,3}\b/)).toHaveCount(0);
  });

  await test.step('Le lien s’ouvre sans compte, jamais indexé', async () => {
    const bypass = process.env.E2E_VERCEL_BYPASS;
    const context = await browser.newContext(
      bypass ? { extraHTTPHeaders: { 'x-vercel-protection-bypass': bypass } } : {},
    );
    const visitor = await context.newPage();
    const response = await visitor.goto(linkPath);
    expect(response?.headers()['x-robots-tag']).toContain('noindex');
    await expect(visitor.getByTestId('voucher-document')).toContainText(
      'BON DE VISITE - BIEN(S) A VENDRE',
    );
    await expect(visitor.getByTestId('voucher-signatures').locator('img')).toHaveCount(1);
    await context.close();
  });
});
