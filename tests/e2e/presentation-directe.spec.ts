import { expect, test, type Page } from './test';

import { DEMO_BUYERS } from '../../src/features/demo/services/demo-buyers';
import {
  demoCredentials,
  expectOneFilled,
  goViaAccountMenu,
  login,
  mainText,
  openToday,
  pagePayload,
  readDemoBuyersShown,
  readDemoWatchCap,
  resetDemoByScreen,
  restoreDemoWatchCap,
} from './support';

// Mission 145 (partie B) — le point de la semaine est dû le lundi et retiré le mercredi soir
// (décision de Jean-Guy, 07/11) : du jeudi au dimanche, il n'est pas sur « Aujourd'hui ».
const weeklyReportDue = (): boolean =>
  ['Mon', 'Tue', 'Wed'].includes(
    new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Paris', weekday: 'short' }).format(
      new Date(),
    ),
  );

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
  await resetDemoByScreen(page);
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
  await page.locator('input[data-price-for="seller_estimated_listing_price"]').fill(String(GUESS));
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
    // Mission 140 — les Bernard préfèrent l'anglais (la spec « langue-du-vendeur » le joue) : ce
    // passage-ci est mené en français.
    const languages = page.locator('[data-client-language]');
    await expect(languages.locator('input[value="en"]')).toBeChecked();
    await languages.locator('label').filter({ hasText: 'Français' }).click();
    await expect(languages.locator('input[value="fr"]')).toBeChecked();
    await expect(languages.locator('input[value="en"]')).toBeEnabled();
    await page.reload();
    await expect(page.locator('[data-client-language] input[value="fr"]')).toBeChecked();
    const modes = page.locator('[data-presentation-mode]');
    await expect(modes.locator('input[value="direct"]')).toBeChecked();
    await expectOneFilled(page, 'Avant le rendez-vous, présentation directe');
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
    await expectOneFilled(page, 'Vue d’ensemble, présentation directe');
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
    await expectOneFilled(page, 'Lancer le Live');
    await page.getByTestId('launch-for-real').click();
    await expect(page).toHaveURL(new RegExp(`/live/${projectId}$`));
    await expectOneFilled(page, 'Accueil du Live');
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
    // Mission 155 — deux fiches de moins d'une semaine (M. Girard et Mme Chevalier, M. et Mme Roux).
    await expect(
      screen.getByText(/cherche depuis (\d+ semaines?|moins d’une semaine)/),
    ).toHaveCount(5);
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
      .locator('input[data-price-for="seller_perceived_property_price"]')
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
      .locator('input[data-price-for="commercialization_price"]')
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
  // Mission 143 (B4, maquette AUDIT-garcia.png) — la Vue d'ensemble dit vrai : le bien, ses
  // concurrents et la décision de prix sont faits, le Live est maintenant ; UNE prochaine étape,
  // un seul bouton plein, et pas de second bouton dans l'en-tête.
  const steps = page.getByTestId('overview-step');
  await expect(steps).toHaveCount(5);
  for (const key of ['property', 'competitors', 'decision']) {
    await expect(page.locator(`[data-testid="overview-step"][data-step="${key}"]`)).toHaveAttribute(
      'data-status',
      'done',
    );
  }
  await expect(page.locator('[data-testid="overview-step"][data-step="live"]')).toHaveAttribute(
    'data-status',
    'current',
  );
  await expect(page.getByTestId('overview-next-step')).toContainText(
    'Faire le Live avec Mme Garcia',
  );
  await expect(page.getByTestId('next-step')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Supprimer le dossier…' })).toBeVisible();
  await page.goto(`/live/${garciaId}`);
  await expect(page).toHaveURL(new RegExp(`/builder/${garciaId}/lancer-le-live$`));
  await page.getByTestId('launch-for-real').click();
  await expect(page).toHaveURL(new RegExp(`/live/${garciaId}$`));
  await page.getByRole('button', { name: 'Démarrer la présentation' }).click();
  await expect(page.getByRole('heading', { name: 'Votre bien', exact: true })).toBeVisible();
  await expect(page.getByTestId('live-buyers-dot')).toHaveCount(0);
  expect(await pagePayload(page)).not.toContain('familles cherchent un bien');
});

// Mission 134 — « Personne n'est oublié » ; Mission 145 (partie A) — seul un bien sous mandat signé,
// sans offre acceptée, se propose (décision de Jean-Guy, 07/11). Un concurrent retenu chez les
// Bernard (ven-02) ne fait plus naître de tâche ; le mandat signé de Vence (M. et Mme Lopez, semé
// par « Préparer ma démo ») fait naître « 4 acquéreurs pour la maison de Vence » ; la fiche de la
// famille Moreau dit « Lui proposer la maison de M. et Mme Lopez » ; l'envoi en série en note trois,
// en passe un, la tâche dit « 1 acquéreur » ; le dernier envoyé, elle se vide ; les fiches disent
// « proposé le … ». ACM n'envoie rien : il prépare le lien et note l'envoi.
test('personne n’est oublié : un mandat signé, ses acquéreurs, l’envoi en série', async ({
  page,
}) => {
  await login(page, demoCredentials());
  const { direct: projectId } = await freshDemo(page);
  const vence = /pour la maison de Vence/;

  await test.step('Retenir ven-02 chez les Bernard : aucune tâche, ce n’est pas un mandat', async () => {
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
    await openToday(page);
    await expect(page.getByTestId('today-page')).not.toContainText('bien du marché');
  });

  // Mission 155 — M. Girard et Mme Chevalier, nouveaux, sans sélection (la famille Moreau a des
  // visites à organiser, qui passent avant).
  await test.step('La fiche et la liste de M. Girard et Mme Chevalier : « Lui proposer la maison de M. et Mme Lopez »', async () => {
    await page.goto('/acquereurs');
    const row = page.getByTestId('buyer-row').filter({ hasText: 'M. Girard et Mme Chevalier' });
    await expect(row).toContainText('Prochaine étape · Lui proposer la maison de M. et Mme Lopez');
    await row.getByRole('link', { name: 'M. Girard et Mme Chevalier' }).click();
    await expect(page.getByText('Lui proposer la maison de M. et Mme Lopez').first()).toBeVisible();
    // M. et Mme Rossi : l'appartement des Lambert-Duval, sans mandat, ne leur est pas proposé.
    await page.goto('/acquereurs');
    await expect(
      page.getByTestId('buyer-row').filter({ hasText: 'M. et Mme Rossi' }),
    ).not.toContainText('Lui proposer');
  });

  const openTask = async (count: number) => {
    const task = page.getByTestId('today-task').filter({ hasText: vence });
    await expect
      .poll(
        async () => {
          await openToday(page);
          return task.count();
        },
        { timeout: 45_000, intervals: [2_000, 3_000, 5_000] },
      )
      .toBe(1);
    await expect(task).toContainText(
      `${count} ${count > 1 ? 'acquéreurs' : 'acquéreur'} pour la maison de Vence`,
    );
    await expect(task).toContainText('mandat signé');
    await task.getByRole('link', { name: 'Proposer ce bien' }).click();
    await expect(page).toHaveURL(/\/acquereurs\/proposer\?bien=project/);
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
    // Mission 145 (partie B) — M. Fontaine correspond sans être prêt : à part, décoché.
    await expect(page.getByTestId('propose-ready-title')).toHaveText(
      '4 acquéreurs prêts à visiter',
    );
    await expect(page.getByTestId('propose-others-title')).toHaveText(
      'Correspond aussi, pas encore prêt · 1',
    );
    await expect(page.getByRole('checkbox', { name: 'M. Fontaine' })).not.toBeChecked();
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
    await expect(page.getByRole('checkbox', { name: 'M. Fontaine' })).not.toBeChecked();
    await page.getByTestId('propose-start').click();
    await sendOne();
    await expect(page.getByTestId('propose-done')).toContainText('1 envoi noté');
    await openToday(page);
    await expect(page.getByTestId('today-page')).not.toContainText(vence);
  });

  await test.step('Les fiches disent « proposé le … » ; la prochaine étape revient', async () => {
    await page.goto('/acquereurs');
    const row = page.getByTestId('buyer-row').filter({ hasText: 'Famille Moreau' });
    await expect(row).not.toContainText('Lui proposer la maison');
    await row.getByRole('link', { name: 'Famille Moreau' }).click();
    // Lancement, mission 6 — l'envoi noté se lit dans « Son suivi », sur la ligne du bien.
    await expect(page.getByTestId('buyer-follow-up')).toContainText('Proposé aujourd’hui');
    await expect(page.getByTestId('buyer-proposals')).toHaveCount(0);
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
    await openToday(page);
    const task = page
      .getByTestId('today-task')
      .filter({ hasText: /Relancer M\. et Mme Lambert(?!-)/ });
    await expect(task).toContainText(/sélection envoyée le \d{2}\/\d{2}, pas de réponse/);
    await task.getByTestId('buyer-relaunch-open').click();
    await task.getByTestId('buyer-relaunch-prepare').click();
    const message = task.getByTestId('buyer-relaunch-message');
    await expect(message).toContainText('Avez-vous pu regarder la sélection envoyée le');
    await expect(message).toContainText('/dossier/');
    expect(await message.innerText()).not.toMatch(/disponible|€/);
    await task.getByTestId('buyer-relaunch-record').click();
    await expect(task.getByTestId('buyer-relaunch-done')).toBeVisible();
    await openToday(page);
    await expect(
      page.getByTestId('today-task').filter({ hasText: /Relancer M\. et Mme Lambert(?!-)/ }),
    ).toHaveCount(0);
  });

  await test.step('Les refus des Keller : l’ajustement s’applique', async () => {
    await page.goto('/acquereurs');
    await expect(page.getByTestId('buyers-month')).toContainText(/^Ce mois-ci : /);
    const kellerRow = page.getByTestId('buyer-row').filter({ hasText: 'Famille Keller' });
    await expect(kellerRow.getByTestId('buyer-row-last-answer')).toContainText(
      'Pas pour moi · Le prix',
    );
    await kellerRow.getByRole('link', { name: 'Famille Keller', exact: true }).click();
    // Mission 143 (B1) — leur offre est acceptée : la recherche est en pause, ni suggestion de
    // budget ni « Rapprocher » ; l'offre tombée, tout revient.
    await expect(page.getByTestId('buyer-paused')).toBeVisible();
    await expect(page.getByTestId('answer-suggestion')).toHaveCount(0);
    await expect(page.getByTestId('buyer-matching')).toHaveCount(0);
    await page.getByRole('button', { name: 'L’offre est tombée : revenir en visite' }).click();
    await expect(page.getByTestId('buyer-status-badge')).toHaveText('En visite');
    await expect(page.getByTestId('buyer-paused')).toHaveCount(0);
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

  // Mission 138 — l'offre des Keller est acceptée : « Sous offre », ils ne sont plus veillés ; la
  // veille revient quand le conseiller remet leur statut, l'offre tombée.
  await test.step('« Sous offre » : plus de veille, jusqu’à « L’offre est tombée »', async () => {
    await openToday(page);
    await expect(page.getByText('2 nouveaux biens pour la famille Keller')).toHaveCount(0);
    await page.goto('/acquereurs');
    await page.getByRole('link', { name: 'Famille Keller', exact: true }).click();
    await expect(page.getByTestId('buyer-status-badge')).toHaveText('Sous offre');
    // Mission 143 (B1) — pendant la vente, la veille et « Prêt à visiter ? » sont en pause.
    await expect(page.getByTestId('buyer-watch-line')).toHaveCount(0);
    await page.getByRole('button', { name: 'L’offre est tombée : revenir en visite' }).click();
    await expect(page.getByTestId('buyer-status-badge')).toHaveText('En visite');
    await page.reload();
    await expect(page.getByTestId('buyer-ready')).toBeVisible();
  });

  await test.step('« 2 nouveaux biens pour la famille Keller » dans À faire aujourd’hui', async () => {
    await openToday(page);
    const task = page
      .getByTestId('today-task')
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
    await page.getByRole('link', { name: 'Famille Keller', exact: true }).click();
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
    // Mission 155 — le plafond de départ, relu en base, est TOUJOURS remis à la fin, même en cas
    // d'échec (décision de Jean-Guy, 13/11) ; un 0 € laissé par un passage interrompu revient au
    // plafond par défaut, 10 €.
    const startCap = readDemoWatchCap();
    const restoreCap = startCap > 0 ? startCap : 1000;
    try {
      await cap.fill('16');
      await admin.getByRole('button', { name: 'Enregistrer' }).click();
      await expect(admin.getByRole('alert')).toContainText('moitié');
      // L'écran ne suffit pas : le message de l'action, puis le plafond relu en base, puis l'état
      // à l'écran sans recharger (le 13/11, la base tenait 0 € et l'écran disait encore « Veille
      // active »).
      await cap.fill('0');
      await admin.getByRole('button', { name: 'Enregistrer' }).click();
      await expect(admin.getByText('Plafond de la veille enregistré.')).toBeVisible();
      await expect.poll(() => readDemoWatchCap(), { timeout: 20_000 }).toBe(0);
      await expect(admin.getByTestId('buyer-watch-state')).toHaveText('Veille coupée');
      // Le plafond de départ, remis par l'écran : le message, la base, puis l'état.
      await cap.fill(String(restoreCap / 100));
      await admin.getByRole('button', { name: 'Enregistrer' }).click();
      await expect(admin.getByText('Plafond de la veille enregistré.')).toBeVisible();
      await expect.poll(() => readDemoWatchCap(), { timeout: 20_000 }).toBe(restoreCap);
      await expect(admin.getByTestId('buyer-watch-state')).toHaveText('Veille active');
      // Une réponse perdue (connexion coupée pendant l'action) : l'écran le dit et propose de
      // recharger ; rien n'est écrit, et la page rechargée relit le plafond en base.
      await page.route('**/admin', (route) =>
        route.request().method() === 'POST' && route.request().headers()['next-action']
          ? route.abort('internetdisconnected')
          : route.continue(),
      );
      await cap.fill('0');
      await admin.getByRole('button', { name: 'Enregistrer' }).click();
      await expect(admin.getByRole('alert')).toContainText(
        'L’enregistrement n’a pas abouti : rechargez la page pour voir le plafond enregistré.',
      );
      await page.unroute('**/admin');
      await admin.getByRole('button', { name: 'Recharger la page' }).click();
      await expect(page.getByTestId('buyer-watch-state')).toHaveText('Veille active');
      expect(readDemoWatchCap()).toBe(restoreCap);
    } finally {
      if (readDemoWatchCap() !== restoreCap) restoreDemoWatchCap(restoreCap);
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
    await expect(document).toContainText(/empreinte du texte signé : [0-9a-f]{64}/);
  });

  let linkPath = '';
  await test.step('Un nouveau bon, signé à la souris', async () => {
    await page.goto('/acquereurs');
    await page.getByRole('link', { name: 'Famille Keller', exact: true }).click();
    // Le bon signé se lit sur la fiche, ses visites toutes faites ; un nouveau bon part d'ici.
    await expect(page.getByTestId('buyer-voucher-signed').first()).toContainText(/^Signé le /);
    await page.getByTestId('buyer-voucher-new').click();
    await expect(page).toHaveURL(/\/acquereurs\/[0-9a-f-]{36}\/bon-de-visite$/);
    const form = page.getByTestId('voucher-form');
    await expect(form).toBeVisible();
    // Mission 154 — la tournée des Keller (deux visites demandées) est cochée d'office : ce bon ne
    // garde que le mandat de Mougins, déjà visité.
    const visits = form.getByTestId('voucher-visit');
    for (let index = 0; index < (await visits.count()); index += 1) {
      const box = visits.nth(index).getByRole('checkbox');
      const mandate = /210\sm²/.test(await visits.nth(index).innerText());
      if ((await box.isChecked()) !== mandate && (await box.isEnabled())) await box.click();
    }
    // Le n° de mandat du bon précédent est repris ; le visiteur aussi.
    await expect(form.getByTestId('voucher-mandate').first()).toHaveValue('M-2026-0142');
    await expect(form.getByTestId('voucher-visitor-first-1')).toHaveValue('Paul');
    await expect(form.getByTestId('voucher-visitor-last-1')).toHaveValue('Keller');
    await expect(form.getByTestId('voucher-sign')).toBeDisabled();
    await form.getByTestId('voucher-approved').check();
    const canvas = form.getByTestId('voucher-signature-1');
    const box = (await canvas.boundingBox())!;
    await page.mouse.move(box.x + 30, box.y + box.height / 2);
    await page.mouse.down();
    for (let step = 1; step <= 20; step += 1) {
      await page.mouse.move(box.x + 30 + step * 15, box.y + box.height / 2 + (step % 2 ? 18 : -18));
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

// Mission 137 (partie B) et 138 — l'offre d'achat : la démo arrive avec l'offre des Keller signée
// et ACCEPTÉE par le vendeur ; sa tâche est en tête de « À faire aujourd'hui » : prévenir l'acquéreur
// (un lien neuf vers sa copie), transmettre au notaire (son lien à part, qui montre l'acceptation) ; les Keller sont « Sous offre », les badges datés sont sur la fiche, la visite et le
// dossier vendeur. Puis une nouvelle offre depuis la visite (l'écran prévient de l'offre acceptée),
// valable jusqu'à demain : son échéance est rappelée ; le vendeur la refuse sur son lien : « L'offre
// des Keller est refusée », « Faire une nouvelle offre » ; les deux tâches côte à côte, « Fait »
// sur chacune.
test('l’offre d’achat : acceptée, ses suites, une nouvelle offre refusée', async ({
  page,
  browser,
}) => {
  await login(page, demoCredentials());
  await freshDemo(page);
  const bypass = process.env.E2E_VERCEL_BYPASS;
  const publicContext = () =>
    browser.newContext(
      bypass ? { extraHTTPHeaders: { 'x-vercel-protection-bypass': bypass } } : {},
    );

  const draw = async (target: Page, testId: string) => {
    const canvas = target.getByTestId(testId);
    await canvas.scrollIntoViewIfNeeded();
    const box = (await canvas.boundingBox())!;
    await target.mouse.move(box.x + 30, box.y + box.height / 2);
    await target.mouse.down();
    for (let step = 1; step <= 20; step += 1) {
      await target.mouse.move(
        box.x + 30 + step * 15,
        box.y + box.height / 2 + (step % 2 ? 18 : -18),
      );
    }
    await target.mouse.up();
  };
  const linkIn = (message: string) =>
    /https?:\/\/\S+\/offre\/[A-Za-z0-9_-]{43}/.exec(message)?.[0] ?? '';

  await test.step('« Le vendeur a accepté l’offre de la famille Keller », en tête', async () => {
    await openToday(page);
    const task = page.getByTestId('today-task').first();
    await expect(task).toContainText('Le vendeur a accepté l’offre de la famille Keller');
    await expect(task).toContainText('prévenir l’acquéreur, transmettre au notaire');
    await task.getByTestId('offer-answer-buyer').click();
    const buyerMessage = task.getByTestId('offer-answer-message-buyer');
    await expect(buyerMessage).toContainText('Bonjour Famille Keller,');
    await expect(buyerMessage).toContainText('le vendeur a accepté votre offre d’achat');
    await expect(buyerMessage).toContainText('/offre/');
    await expect(task.getByRole('link', { name: 'E-mail' })).toHaveAttribute('href', /^mailto:/);
    await expect(buyerMessage).not.toContainText(/€|estimation|disponible|Lefebvre/);

    await task.getByTestId('offer-answer-notary').click();
    const notaryMessage = task.getByTestId('offer-answer-message-notary');
    await expect(notaryMessage).toContainText('Maître,');
    await expect(notaryMessage).toContainText('mandat n° M-2026-0142');
    const notaryLink = linkIn(await notaryMessage.innerText());
    expect(notaryLink).not.toBe('');
    // Le notaire lit l'offre signée et l'acceptation du vendeur, sans compte, sans rien à signer.
    const context = await publicContext();
    const notary = await context.newPage();
    const response = await notary.goto(notaryLink);
    expect(response?.headers()['x-robots-tag']).toContain('noindex');
    await expect(notary.getByTestId('offer-answer')).toHaveAttribute('data-decision', 'accepted');
    await expect(notary.getByTestId('seller-response')).toHaveCount(0);
    await context.close();
  });

  await test.step('Les Keller « Sous offre », les badges datés', async () => {
    await page.goto('/acquereurs');
    await page.getByRole('link', { name: 'Famille Keller', exact: true }).click();
    await expect(page.getByTestId('buyer-status-badge')).toHaveText('Sous offre');
    await expect(page.getByTestId('buyer-ready')).toHaveCount(0);
    await expect(page.getByTestId('buyer-paused')).toBeVisible();
    await expect(page.getByTestId('offer-answer-badge').first()).toHaveText(
      /^Offre acceptée le \d{2}\/\d{2}$/,
    );
    await page.goto('/visites');
    await expect(page.getByTestId('offer-answer-badge').first()).toHaveText(
      /^Offre acceptée le \d{2}\/\d{2}$/,
    );
    await goViaAccountMenu(page, 'Ma démo');
    const mougins = await page
      .getByTestId('demo-dossier')
      .filter({ hasText: 'M. Lefebvre' })
      .locator('a')
      .first()
      .getAttribute('href');
    await page.goto(mougins!);
    await expect(page.getByTestId('offer-answer-badge')).toHaveText(
      /^Offre acceptée le \d{2}\/\d{2} · Famille Keller$/,
    );
  });

  await test.step('L’offre signée s’ouvre : couverture, texte validé', async () => {
    await page.goto('/acquereurs');
    await page.getByRole('link', { name: 'Famille Keller', exact: true }).click();
    await page.getByTestId('buyer-offer-signed').first().click();
    await expect(page.getByTestId('offer-cover')).toContainText("OFFRE D'ACHAT FERME");
    await expect(page.getByTestId('offer-cover-mandate')).toHaveText('Mandat n° M-2026-0142');
    const offer = page.getByTestId('offer-document');
    await expect(offer).toContainText(
      "L'OFFRANT déclare ne pas avoir l'intention de recourir à un prêt",
    );
    await expect(offer).toContainText('Agence Horizon Côte d’Azur');
    await expect(offer).not.toContainText(/réseau|Démo|\{|\}/);
    await expect(offer.getByTestId('offer-signatures').locator('img')).toHaveCount(2);
  });

  let sellerLink = '';
  await test.step('Une nouvelle offre, depuis la visite : l’écran prévient de l’offre acceptée', async () => {
    await page.goto('/visites');
    await page.getByTestId('visit-offer-open').first().click();
    const form = page.getByTestId('offer-form');
    await expect(form).toBeVisible();
    await expect(form.getByTestId('offer-already-accepted')).toHaveText(
      /^Une offre acceptée existe déjà sur ce bien \(le \d{2}\/\d{2}\/\d{4}\)\.$/,
    );
    // Repris : le n° de mandat (conclusion), les offrants de la dernière offre.
    await expect(form.getByTestId('offer-mandate-known')).toHaveText('N° de mandat : M-2026-0142');
    await expect(form.getByTestId('offer-lastname-1')).toHaveValue('Keller');
    await expect(form.getByTestId('offer-lastname-2')).toHaveValue('Keller');
    await form.getByTestId('offer-parcel-section-1').fill('AB');
    await form.getByTestId('offer-parcel-number-1').fill('214');
    await form.getByTestId('offer-parcel-area-1').fill('18 a 40 ca');
    await form.getByTestId('offer-total-area').fill('18 a 40 ca');
    await form.getByTestId('offer-deposit').fill('80000');
    await expect(form).toContainText('quatre-vingt mille euros');
    // Valable jusqu'à demain : son échéance se rappelle aujourd'hui.
    const tomorrow = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Paris' }).format(
      new Date(Date.now() + 86_400_000),
    );
    await form.getByLabel('Offre valable jusqu’au').fill(tomorrow);
    await expect(form.getByTestId('offer-sign')).toBeDisabled();
    await form.getByTestId('offer-preview').locator('summary').click();
    await expect(form.getByTestId('offer-preview')).toContainText("OFFRE D'ACHAT");
    await form.getByTestId('offer-approved').check();
    await draw(page, 'offer-signature-1');
    await draw(page, 'offer-signature-2');
    await form.getByTestId('offer-sign').click();
    await expect(page.getByTestId('offer-signed')).toBeVisible({ timeout: 20_000 });
    sellerLink = (await page.getByTestId('offer-link-seller').innerText()).trim();
    expect(sellerLink).toMatch(/\/offre\/[A-Za-z0-9_-]{43}$/);
    await expect(page.getByText(/\bM\d{2,3}\b/)).toHaveCount(0);
    await openToday(page);
    // Sous la réponse de la première offre (en tête), l'échéance de la nouvelle, avant tout le reste.
    await expect(page.getByTestId('today-task').nth(1)).toContainText(
      'L’offre de la famille Keller expire demain',
    );
  });

  await test.step('Le vendeur refuse sur son lien : « L’offre des Keller est refusée »', async () => {
    const context = await publicContext();
    const seller = await context.newPage();
    await seller.goto(sellerLink);
    await seller.getByTestId('seller-refuse').click();
    await seller.getByTestId('seller-refuse-confirm').click();
    await expect(seller.getByTestId('offer-answer')).toHaveAttribute('data-decision', 'refused', {
      timeout: 20_000,
    });
    await context.close();
    await openToday(page);
    await expect(page.getByText('L’offre de la famille Keller expire demain')).toHaveCount(0);
    // Les deux réponses, chacune sa tâche et son message (jamais l'état de l'une sur l'autre).
    const task = page
      .getByTestId('today-task')
      .filter({ hasText: 'L’offre des Keller est refusée' });
    await expect(task).toHaveCount(1);
    await expect(task.getByTestId('offer-answer-notary')).toHaveCount(0);
    await task.getByTestId('offer-answer-buyer').click();
    await expect(task.getByTestId('offer-answer-message-buyer')).toContainText(
      'Le vendeur n’a pas retenu votre offre d’achat',
    );
    await expect(task.getByTestId('offer-answer-message-buyer')).not.toContainText('/offre/');
    await expect(task.getByTestId('offer-answer-new-offer')).toHaveAttribute(
      'href',
      /\/acquereurs\/[0-9a-f-]{36}\/offre\?visite=[0-9a-f-]{36}$/,
    );
    const accepted = page
      .getByTestId('today-task')
      .filter({ hasText: 'Le vendeur a accepté l’offre de la famille Keller' });
    await accepted.getByTestId('offer-answer-buyer').click();
    await expect(accepted.getByTestId('offer-answer-message-buyer')).toContainText(
      'Bonne nouvelle',
    );
    await expect(task.getByTestId('offer-answer-message-buyer')).not.toContainText(
      'Bonne nouvelle',
    );
    await expect(accepted.getByTestId('offer-answer-open')).toHaveAttribute(
      'href',
      /\/acquereurs\/[0-9a-f-]{36}\/offre\/[0-9a-f-]{36}$/,
    );
    // « Fait » ferme une tâche, et seulement elle.
    await task.getByTestId('offer-answer-mark-done').click();
    await expect(task.getByTestId('offer-answer-done')).toBeVisible();
    await expect(accepted.getByTestId('offer-answer-done')).toHaveCount(0);
    await openToday(page);
    await expect(page.getByText('L’offre des Keller est refusée')).toHaveCount(0);
    await page
      .getByTestId('today-task')
      .filter({ hasText: 'Le vendeur a accepté l’offre de la famille Keller' })
      .getByTestId('offer-answer-mark-done')
      .click();
    await expect(page.getByTestId('offer-answer-done')).toBeVisible();
    await openToday(page);
    await expect(page.getByText('Le vendeur a accepté l’offre de la famille Keller')).toHaveCount(
      0,
    );
    // Un refus ne change pas le statut : les Keller restent « Sous offre » (la première offre).
    await page.goto('/acquereurs');
    await page.getByRole('link', { name: 'Famille Keller', exact: true }).click();
    await expect(page.getByTestId('buyer-status-badge')).toHaveText('Sous offre');
    await expect(page.getByTestId('offer-answer-badge').first()).toHaveText(
      /^Offre (acceptée|refusée) le \d{2}\/\d{2}$/,
    );
  });
});

// Mission 139 — après la visite : la visite des Keller a son compte rendu (« Intéressé · aimé :
// piscine, extérieur · gêné : prix ») et ses deux messages prêts (à l'acquéreur, au vendeur) ; le
// lundi, le point de la semaine des Lambert dit les six biens écartés pour eux, celui des Wilson est
// en anglais ; « Écarter pour lui » sort un bien de ses biens idéaux, « Annuler » le rend.
test('après la visite : le compte rendu, le point de la semaine, écarter pour lui', async ({
  page,
}) => {
  await login(page, demoCredentials());
  await freshDemo(page);

  await test.step('La visite des Keller : son compte rendu, ses deux messages', async () => {
    await page.goto('/visites');
    const done = page.getByTestId('visits-done');
    await expect(done.getByTestId('visit-report').first()).toHaveText(
      'Intéressé · a aimé : l’extérieur, la piscine · gêné : le prix · Offre envisagée',
    );
    await done.getByTestId('visit-messages-open').first().click();
    const buyer = done.getByTestId('visit-message-buyer-text').first();
    await expect(buyer).toHaveValue(
      /^Bonjour Famille Keller,\nMerci pour la visite de la maison de Mougins le /,
    );
    await expect(buyer).toHaveValue(/Ce qui vous a plu : l’extérieur et la piscine\./);
    await expect(buyer).toHaveValue(/Ce qui vous a gêné : le prix\./);
    const seller = done.getByTestId('visit-message-seller-text').first();
    await expect(seller).toHaveValue(/^Bonjour M\. Lefebvre,\nLa visite de votre bien du /);
    await expect(seller).not.toHaveValue(/Keller|budget|offre/i);
    // Modifiable : le texte envoyé est celui de l'écran.
    await buyer.fill('Bonjour, merci pour la visite.');
    await expect(
      done.getByTestId('visit-message-buyer').first().getByRole('link', { name: 'E-mail' }),
    ).toHaveAttribute('href', /merci%20pour%20la%20visite/);
  });

  await test.step('Le point de la semaine des Lambert : six biens écartés, « Envoyé »', async () => {
    await openToday(page);
    const task = page
      .getByTestId('today-task')
      .filter({ hasText: /Envoyer le point de la semaine à M\. et Mme Lambert(?!-)/ });
    if (!weeklyReportDue()) {
      await expect(task).toHaveCount(0);
      return;
    }
    await expect(task).toContainText(/semaine du \d{2}\/\d{2} au \d{2}\/\d{2}/);
    await task.getByTestId('buyer-report-open-weekly_report').click();
    const message = task.getByTestId('buyer-report-message');
    await expect(message).toHaveValue(/^Bonjour M\. et Mme Lambert,/);
    await expect(message).toHaveValue(
      /6 écartés \(3 pour le prix, 2 pour le secteur, 1 pour le stationnement\)/,
    );
    await task.getByTestId('buyer-report-sent').click();
    await expect(page.getByTestId('buyer-report-done')).toBeVisible();
    await openToday(page);
    await expect(
      page
        .getByTestId('today-task')
        .filter({ hasText: /Envoyer le point de la semaine à M\. et Mme Lambert(?!-)/ }),
    ).toHaveCount(0);
  });

  await test.step('Le point des Wilson, en anglais', async () => {
    const task = page
      .getByTestId('today-task')
      .filter({ hasText: 'Envoyer le point de la semaine à Mr and Mrs Wilson' });
    if (!weeklyReportDue()) {
      await expect(task).toHaveCount(0);
      return;
    }
    await task.getByTestId('buyer-report-open-weekly_report').click();
    await expect(task.getByTestId('buyer-report-message')).toHaveValue(
      /^Dear Mr and Mrs Wilson,\nHere is this week’s update on your search\./,
    );
  });

  await test.step('« Écarter pour lui » : le bien sort, « Annuler » le rend', async () => {
    // Les biens idéaux des Keller, le marché simulé de la démo (aucun appel, « 0 annonce facturée »).
    await page.goto('/acquereurs');
    await page.getByRole('link', { name: 'Famille Keller', exact: true }).click();
    await expect(page.getByTestId('buyer-name')).toHaveText('Famille Keller');
    // Mission 143 (B1) — leur offre est acceptée : la sélection est masquée sur la fiche, les biens
    // idéaux restent joignables par leur adresse.
    await page.goto(`${new URL(page.url()).pathname}/biens-ideaux`);
    await expect(page.getByTestId('ideal-title')).toHaveText('Les biens idéaux de Famille Keller');
    await page.getByRole('button', { name: 'Trouver sur le marché' }).click();
    await page
      .getByTestId('ideal-paid-confirm')
      .getByRole('button', { name: 'Lancer et payer' })
      .click();
    await expect(page.getByTestId('ideal-market-summary')).toContainText('0 annonce facturée', {
      timeout: 60_000,
    });
    const hits = page.getByTestId('ideal-market-hit');
    await expect(hits.first()).toBeVisible();
    const before = await hits.count();
    const label = (
      await hits
        .filter({ has: page.getByTestId('dismiss-open') })
        .first()
        .locator('.font-title')
        .first()
        .innerText()
    ).trim();
    // Le bien, tenu par son libellé : ouvert, il ne porte plus « Écarter pour lui ».
    const first = hits.filter({ hasText: label }).first();
    await first.getByTestId('dismiss-open').click();
    await first.getByTestId('dismiss-reason-over_budget').click();
    await expect(page.getByTestId('dismissed-now')).toContainText(`Écarté pour lui : ${label}`);
    await expect(hits).toHaveCount(before - 1);
    await page.getByTestId('dismiss-undo').click();
    await expect(hits).toHaveCount(before);
    await expect(page.getByText(/disponible|estimation/i)).toHaveCount(0);
  });
});
