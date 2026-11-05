import { expect, test, type BrowserContext, type Page } from '@playwright/test';

import {
  demoCredentials,
  expectNoHorizontalScroll,
  goViaAccountMenu,
  login,
  mainText,
  openAccountMenu,
  pagePayload,
  removeDemoRunDossiers,
  uniqueDossierName,
  withoutSpaces,
  readDemoLinkAnswers,
} from './support';

// Mission 114 (point 14) — la démonstration des closers, de bout en bout, sur l'URL d'essai, avec
// le compte de l'AGENCE DE DÉMONSTRATION (E2E_DEMO_EMAIL / E2E_DEMO_PASSWORD, dans
// `.env.e2e.local`) : importer la fiche d'Antibes, chercher, retenir et importer 5 concurrents,
// voir leurs adresses arriver confirmées, décider le prix, mener le Live (bureau, puis tablette),
// conclure, mettre à jour les prix (une baisse simulée), signer le mandat, prospecter (courriers,
// lot, tournée, « Ne plus solliciter »), la synthèse et son lien, le tableau du manager.
//
// Décision de Jean-Guy du 23/10 : rien ne dit « démonstration » à l'écran ni à l'impression — le
// parcours le vérifie sur chaque page qu'il traverse (`expectUnspoken`).
//
// Toute requête vers un autre hôte qu'ACM et Supabase est BLOQUÉE par le navigateur : si une
// étape en dépendait, elle casserait ici. Les hôtes bloqués sont comptés ; seuls les outils de
// Vercel sur un déploiement d'aperçu (barre d'outils, retours) sont tolérés dans ce compte.
//
// Le dossier créé porte un nom « TEST AUTOMATIQUE … » : il est retiré de l'agence de démo en fin
// de passage, réussi ou non, avec les oppositions inscrites pendant le passage (support.ts).
// Partie B (« Préparer ma démo », « Remettre ma démo à zéro ») : pas encore là, pas joué ici.

const SUBJECT = { surface: '68', rooms: '3', city: 'Antibes', postalCode: '06600' };
const LISTED_PRICE = 405_000; // le prix de l'annonce de démo : « pour information », jamais écrit
// La fourchette du conseiller, non ronde : aucun prix du jeu de données ne lui ressemble, et elle
// ne doit jamais apparaître devant le vendeur.
const FOURCHETTE = { min: 380_500, max: 429_500 };
const RETAINED = 5;
// Le téléphone du compte de démo, s'il manque : sans lui, aucun courrier propriétaire (M90).
// Mission 130 — un numéro de la plage 06 39 98, réservée à la fiction (ARCEP).
const DEMO_PHONE = '06 39 98 00 01';
const PERCEIVED_PRICE = 415_500;
const REVISED_PRICE = 401_500;
const COMMERCIALIZATION_PRICE = 392_500;
const COMMENT = 'Réponse saisie par le test automatique (démo)';
const MISSING_FOR_TEN = 'Le délai, d’après le test automatique';
// Ce qu'aucune page de l'agence de démo ne doit dire. (« fictifs » reste : « Bienvenue » le dit
// du dossier d'exemple, M97, dans toute agence.)
const UNSPOKEN = /d[ée]monstration|données fictives/i;
const DEMO_LISTING_HOST = 'annonces.demonstration.invalid';
const SUPABASE_HOST = /\.supabase\.(co|in)$/;
// Les outils de Vercel sur un déploiement d'aperçu : bloqués comme le reste, mais tolérés dans le
// compte — l'application n'en a pas besoin, c'est le point.
const VERCEL_TOOLING = /(^|\.)vercel\.live$|(^|\.)vercel-scripts\.com$|(^|\.)vercel-insights\.com$/;

type Competitor = { price: number };

async function expectUnspoken(page: Page, screen: string): Promise<void> {
  await expect(page.getByTestId('demo-banner'), screen).toHaveCount(0);
  await expect(page.getByTestId('demo-watermark'), screen).toHaveCount(0);
  await expect(page.getByTestId('demo-live-note'), screen).toHaveCount(0);
  expect(await page.locator('body').innerText(), `« ${screen} » dit « démonstration »`).not.toMatch(
    UNSPOKEN,
  );
}

// Budget de la démo : 8 minutes (décision de Jean-Guy, 25/10 ; 40 minutes depuis la M114 B).
test.setTimeout(8 * 60_000);

async function blockOutsideHosts(context: BrowserContext, blocked: Map<string, number>) {
  const own = new URL(process.env.E2E_BASE_URL ?? 'http://localhost').hostname;
  await context.route('**/*', (route) => {
    const host = new URL(route.request().url()).hostname;
    if (host === own || SUPABASE_HOST.test(host)) return route.continue();
    blocked.set(host, (blocked.get(host) ?? 0) + 1);
    return route.abort('blockedbyclient');
  });
}

test('la démo des closers : du bien importé à la prospection, sans rien d’extérieur', async ({
  page,
}) => {
  const startedAt = new Date();
  const blocked = new Map<string, number>();
  await blockOutsideHosts(page.context(), blocked);
  const dossierName = uniqueDossierName();
  let projectId = '';
  let competitors: Competitor[] = [];

  try {
    await test.step('Connexion : rien ne dit « démonstration », « Bienvenue » sans extension', async () => {
      await login(page, demoCredentials());
      await expectUnspoken(page, 'Mes dossiers');
      await goViaAccountMenu(page, 'Aide');
      await expect(page).toHaveURL(/\/bienvenue$/);
      // Sans extension ni Localisateur, tout est coché : rien à installer, et rien ne le commente.
      await expect(page.getByTestId('need-extension')).toHaveAttribute('data-state', 'done');
      await expect(page.getByTestId('need-locator')).toHaveAttribute('data-state', 'done');
      await expectUnspoken(page, 'Bienvenue');
      // « Ce qu'il vous faut » (M97) : le téléphone du profil. Le compte de démo le renseigne une
      // fois, s'il manque — sans lui, aucun courrier propriétaire ne se prépare (M90).
      if ((await page.getByTestId('need-phone').getAttribute('data-state')) === 'todo') {
        await page.goto('/profil');
        await page
          .locator('label')
          .filter({ has: page.locator('span', { hasText: /^Téléphone$/ }) })
          .locator('input')
          .fill(DEMO_PHONE);
        await page.getByRole('button', { name: /Enregistrer/ }).click();
        await expect(page.getByText('Profil enregistré.')).toBeVisible();
      }
    });

    // Mission 114 (partie B) — « Préparer ma démo » : quatre dossiers à quatre étapes, à soi. Un
    // passage précédent les a peut-être déjà préparés : ils sont alors là, et la fin du passage
    // les remet à zéro.
    await test.step('Ma démo : cinq dossiers, un par étape', async () => {
      // Mission 125 — « Ma démo » s'ouvre par l'entrée du menu de la carte (Aide → Ma démo).
      await goViaAccountMenu(page, 'Ma démo');
      await expect(page).toHaveURL(/\/ma-demo$/);
      await expect(page.getByTestId('demo-dossiers')).toBeVisible();
      await expectUnspoken(page, 'Ma démo');
      const prepared = (await page.getByTestId('demo-dossier').count()) === 0;
      if (prepared) {
        await page.getByRole('button', { name: 'Préparer ma démo' }).click();
        await expect(page.getByTestId('demo-dossier')).toHaveCount(5, { timeout: 180_000 });
      }
      const stages = await page
        .getByTestId('demo-dossier')
        .evaluateAll((items) => items.map((item) => item.getAttribute('data-stage')));
      // Mission 131 — « Prêt, en présentation directe », jouable comme le vrai produit.
      expect(stages).toEqual(['to_prepare', 'ready', 'direct', 'signed', 'follow_up']);
      // Mission 117 — les deux acquéreurs de la démo, et « Rapprocher » trouve le mandat de Mougins.
      // Des dossiers préparés avant la mission n'en ont pas : la remise à zéro, en fin de passage,
      // les prouve alors.
      if (prepared) await expectDemoBuyers(page);
      // Chacun à sa place : le prêt dans la liste du Live, les deux conclus dans le Suivi.
      await page.goto('/live');
      await expect(page.locator('li').filter({ hasText: 'Mme Garcia' })).toBeVisible();
      await page.goto('/suivi');
      const signed = page.getByTestId('suivi-row').filter({ hasText: 'M. Lefebvre' });
      await expect(signed.getByTestId('outcome-badge')).toHaveText('Mandat signé · exclusif');
      const followUp = page.getByTestId('suivi-row').filter({ hasText: 'M. et Mme Martin' });
      await expect(followUp.getByTestId('outcome-badge')).toHaveText('À relancer');
      await followUp.getByTestId('suivi-link-details').click();
      await expect(followUp.getByTestId('objections-line')).toHaveText(
        'Ce qui le freine : le prix, le délai',
      );
      // Mission 130 — « À faire aujourd'hui » : la relance de M. et Mme Martin, due aujourd'hui, et
      // le premier Point marché de M. Lefebvre, signé il y a un mois ; le compteur du menu.
      if (prepared) {
        const today = page.getByTestId('suivi-today');
        await expect(
          today.getByTestId('suivi-task').filter({ hasText: 'Relancer M. et Mme Martin' }),
        ).toContainText(/dernier contact il y a 8 jours · relance prévue aujourd’hui/);
        await expect(
          today.getByTestId('suivi-task').filter({ hasText: 'Point marché de M. Lefebvre' }),
        ).toContainText(
          // Un 29, 30 ou 31, le mois précédent est plus court : le point peut être en retard.
          /premier Point marché dû \(tous les mois\)|en retard/,
        );
        await expect(page.getByTestId('suivi-task-count')).toHaveText(/^[1-9]\d*$/);
      }
      // Mission 125 — « Ma démo » est au menu de la carte, dans l'agence de démo ; pas « Erreurs »,
      // réservé aux opérateurs ; le menu de gauche n'a que ses quatre espaces.
      await expect(page.locator('nav[data-mode] a')).toHaveCount(4);
      const menu = await openAccountMenu(page);
      await expect(menu.getByRole('menuitem', { name: /^Ma démo/ })).toBeVisible();
      await expect(menu.getByRole('menuitem', { name: /^Erreurs/ })).toHaveCount(0);
      await page.keyboard.press('Escape');
      await expect(menu).toHaveCount(0);
    });

    await test.step('Nouveau dossier', async () => {
      await page.goto('/builder/new');
      await page.getByLabel('Nom du vendeur').fill(dossierName);
      await page.getByRole('button', { name: 'Créer le dossier' }).click();
      await expect(page).toHaveURL(/\/builder\/[0-9a-f-]{36}$/);
      projectId = page.url().split('/').pop() ?? '';
    });

    await test.step('Le bien vendeur : l’annonce de démo, proposée d’avance, remplit la fiche', async () => {
      await page.goto(`/builder/${projectId}/property`);
      // Aucun message d'extension en démonstration.
      await expect(page.getByText(/Installer l’extension|extension ACM/)).toHaveCount(0);
      // Mission 97 — après un import, le libellé porte la pastille « À vérifier ».
      const field = (label: string) =>
        page
          .locator('label')
          .filter({
            has: page.locator('span', { hasText: new RegExp(`^${label}(\\s*À vérifier)?$`) }),
          })
          .locator('input');
      // La fiche PDF de démo se lit comme une vraie (M43), dans le navigateur, sans rien d'extérieur.
      // D'abord elle, puis l'annonce : c'est l'annonce qui porte l'adresse fictive et les photos.
      const brochures = page.getByTestId('demo-brochure-choices');
      await expect(brochures).toContainText('Fiches à importer :');
      await brochures.getByRole('button', { name: 'Appartement 3 pièces à Antibes' }).click();
      await expect(page.getByText('Analyse de la fiche…')).toHaveCount(0, { timeout: 60_000 });
      // (Le seul « alert » attendu est l'annonceur de route de Next.js, hors de tout formulaire.)
      await expect(page.locator('p[role="alert"]')).toHaveCount(0);
      await expect(page.getByText('Informations reprises')).toBeVisible();
      await expect(field('Surface')).toHaveValue(SUBJECT.surface);

      const choices = page.getByTestId('demo-listing-choices');
      await expect(choices).toContainText('Annonces à importer :');
      await expect(
        choices.getByRole('button', { name: 'Appartement 3 pièces à Antibes' }),
      ).toBeVisible();
      const url = page.locator('input[type="url"]');
      await expect(url).toHaveValue(
        new RegExp(`^https://${DEMO_LISTING_HOST}/bien-vendeur/antibes$`),
      );
      await page.getByRole('button', { name: 'Importer l’annonce' }).click();
      await expect(page.getByText('Informations détectées')).toBeVisible({ timeout: 30_000 });
      // Le prix lu reste « pour information » (M38) : affiché, jamais dans un champ.
      const read = page.getByText('Prix lu sur l’annonce').locator('..');
      expect(withoutSpaces(await read.innerText())).toContain(String(LISTED_PRICE));
      await expect(read).toContainText('pour information');
      const values = await page
        .locator('input')
        .evaluateAll((inputs) =>
          inputs.map((input) => (input as HTMLInputElement).value.replace(/\s/g, '')),
        );
      expect(values, 'Le prix lu a rempli un champ').not.toContain(String(LISTED_PRICE));

      await expect(field('Surface')).toHaveValue(SUBJECT.surface);
      await expect(field('Pièces')).toHaveValue(SUBJECT.rooms);
      await expect(field('Ville')).toHaveValue(SUBJECT.city);
      await expect(field('Code postal')).toHaveValue(SUBJECT.postalCode);
      // Mission 97 — ce qui vient d'un import se vérifie.
      await expect(page.getByTestId('verify-banner')).toBeVisible();
      expect(await page.getByTestId('verify-mark').count()).toBeGreaterThan(0);

      // Les photos de l'annonce : récupérées sur un clic, depuis l'application elle-même.
      await expect(page.getByText(/\d+ photo\(s\) détectée\(s\) sur l’annonce/)).toBeVisible();
      await page.getByRole('button', { name: 'Récupérer ces photos' }).click();
      await expect(page.getByText(/[1-9]\d* photo\(s\) récupérée\(s\)/)).toBeVisible({
        timeout: 60_000,
      });
      await expect(page.getByText(/échec\(s\)/)).toHaveCount(0);

      // La fourchette du conseiller, puis « Enregistrer ».
      await field('De').fill(String(FOURCHETTE.min));
      await field('À').fill(String(FOURCHETTE.max));
      await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
      await expect(page.getByText('Enregistré', { exact: true })).toBeVisible();
      await expectUnspoken(page, 'Bien vendeur');
    });

    await test.step('Chercher les concurrents : simulé, sans coût ni portail', async () => {
      await page.goto(`/builder/${projectId}/comparables/find`);
      await expect(page.getByText('Coût maximal : 0,60 € par recherche')).toHaveCount(0);
      await expect(page.getByText('Ou chercher vous-même sur les portails')).toHaveCount(0);
      await expect(page.getByText(/Installer l’extension/)).toHaveCount(0);
      await page.getByRole('button', { name: 'Chercher les concurrents' }).click();
      const anyRetain = page.getByRole('button', {
        name: /^Retenir et importer les \d+ concurrents? cochés?$/,
      });
      await expect(anyRetain, 'La recherche simulée ne propose rien à retenir').toBeVisible({
        timeout: 90_000,
      });
      await expect(page.getByText(/0 annonce facturée/)).toBeVisible();
      expect(await page.getByTestId('match-percent').count()).toBeGreaterThanOrEqual(RETAINED);
      // Seuls les premiers de la liste principale sont cochés d'office (un prix hors fourchette ne
      // l'est pas) : le closer en coche jusqu'à cinq, comme un conseiller le ferait.
      const boxes = page
        .locator('label')
        .filter({ hasText: /^À retenir$/ })
        .locator('input');
      for (const box of await boxes.all()) {
        const checked = await boxes.evaluateAll(
          (inputs) => inputs.filter((input) => (input as HTMLInputElement).checked).length,
        );
        if (checked >= RETAINED) break;
        if (!(await box.isChecked())) await box.check();
      }
      const retain = page.getByRole('button', {
        name: new RegExp(`^Retenir et importer les ${RETAINED} concurrents cochés$`),
      });
      await expect(retain, 'Cinq concurrents cochés attendus').toBeVisible();
      // Les annonces proposées sont celles de la démo : aucun portail réel.
      for (const href of await page
        .locator('a[target="_blank"][href^="http"]')
        .evaluateAll((links) => links.map((link) => (link as HTMLAnchorElement).href))) {
        expect(new URL(href).hostname, `Une annonce d’un vrai portail : ${href}`).toBe(
          DEMO_LISTING_HOST,
        );
      }

      await retain.click();
      await expect(page.getByRole('button', { name: /Import en cours…/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /Import en cours…/ })).toHaveCount(0, {
        timeout: 120_000,
      });
      await expect(page.getByText(/en échec/)).toHaveCount(0);
      await expect(page.locator('p[role="alert"]')).toHaveCount(0);
      await expectUnspoken(page, 'Trouver des concurrents');
    });

    await test.step('Cinq concurrents importés, à vérifier, et leurs adresses confirmées', async () => {
      await page.goto(`/builder/${projectId}/comparables`);
      const cards = page
        .locator('li')
        .filter({ has: page.locator('input[type="checkbox"][aria-label^="Sélectionner"]') });
      await expect(cards).toHaveCount(RETAINED);
      // Mission 97 — chaque fiche importée porte ce qu'il reste à relire.
      await expect(page.getByTestId('competitor-to-verify')).toHaveCount(RETAINED);
      // Le Localisateur simulé : les adresses arrivent confirmées, après le court délai.
      await expect(cards.filter({ hasText: 'Adresse confirmée' })).toHaveCount(RETAINED, {
        timeout: 60_000,
      });
      await expect(page.getByText(/Installez le Localisateur/)).toHaveCount(0);
      // Les prix, dans l'ordre du Live : ce que le Live ne doit jamais montrer avant la devinette.
      competitors = [];
      for (const card of await cards.all()) {
        const text = await card.innerText();
        const match = /(\d{1,3}(?:[\s  ]\d{3})+)\s*€(?![\s  ]*\/)/.exec(text);
        expect(match, `Prix introuvable sur la carte : ${text.slice(0, 80)}`).not.toBeNull();
        competitors.push({ price: Number(withoutSpaces(match![1])) });
      }
      expect(new Set(competitors.map((c) => c.price)).size, 'Deux concurrents au même prix').toBe(
        RETAINED,
      );
      console.log(
        'Prix des concurrents de la démo, dans l’ordre :',
        competitors.map((c) => c.price),
      );
      await expectUnspoken(page, 'Concurrents');
    });

    await test.step('Avant le rendez-vous : la décision de prix, le dossier est prêt', async () => {
      await page.goto(`/builder/${projectId}/avant-rendez-vous`);
      await expect(page.getByText(/[1-9]\d* informations? importées? à vérifier/)).toBeVisible();
      // Mission 116 — l'analyse du conseiller : le prix convenu sera en couleur face à elle.
      await page
        .locator('label')
        .filter({ hasText: 'Votre analyse de valeur' })
        .locator('input')
        .fill(String(LISTED_PRICE));
      await page.getByRole('button', { name: 'Enregistrer la décision' }).click();
      await expect(page.getByText('Ce dossier est prêt')).toBeVisible();
      await expectUnspoken(page, 'Avant le rendez-vous');
      await page.goto(`/builder/${projectId}`);
      await expect(page.getByTestId('next-step')).toHaveText('Lancer le Live →');
    });

    await test.step('Le Live, au bureau', async () => {
      await walkLive(page, projectId, competitors, { firstPass: true, tablet: false });
    });

    await test.step('Le Live, rejoué en tablette (768 × 1024)', async () => {
      await page.setViewportSize({ width: 768, height: 1024 });
      await walkLive(page, projectId, competitors, { firstPass: false, tablet: true });
      await page.setViewportSize({ width: 1280, height: 720 });
    });

    await test.step('Conclusion « à relancer » avec un motif et des freins', async () => {
      await page.getByRole('link', { name: /Terminer le rendez-vous/ }).click();
      await expect(page).toHaveURL(new RegExp(`/live/${projectId}/merci$`));
      await expect(page.getByRole('heading', { name: 'Merci pour cet échange' })).toBeVisible();
      await expectUnspoken(page, 'Merci');
      await page.getByRole('link', { name: 'Accès conseiller' }).click();
      await expect(page).toHaveURL(new RegExp(`/builder/${projectId}/conclusion$`));
      await page
        .locator('label')
        .filter({ hasText: /^À relancer$/ })
        .click();
      await page
        .locator('label')
        .filter({ hasText: /^Réfléchit au prix$/ })
        .click();
      const objections = page.getByTestId('objections');
      await objections.locator('label').filter({ hasText: 'Le prix' }).click();
      await page.getByRole('button', { name: 'Conclure le rendez-vous' }).click();
      await expect(page).toHaveURL(/\/suivi/);
    });

    await test.step('Suivi : « Mettre à jour les concurrents » lit le jeu de données, une baisse apparaît, le point s’écrit', async () => {
      const row = page.getByTestId('suivi-row').filter({ hasText: dossierName });
      await expect(row).toBeVisible();
      await expect(row.getByText('À relancer', { exact: true })).toBeVisible();
      // Mission 130 — le Point marché s'ouvre dans la carte, par son lien.
      await row.getByTestId('suivi-link-point').click();
      await row.getByTestId('refresh-prices').click();
      const summary = row.getByTestId('price-refresh-summary');
      await expect(summary).toBeVisible({ timeout: 60_000 });
      const summaryText = await summary.innerText();
      console.log('Mise à jour des prix (démo) :', summaryText);
      expect(summaryText).toMatch(/\d+ annonces? relues?/);
      expect(summaryText, 'Aucune baisse simulée après le rendez-vous').toMatch(
        /[1-9]\d* baisses? de prix/,
      );
      // Mission 127 — le point daté s'écrit à la fin de la mise à jour.
      await expect(row.getByTestId('market-update-recorded')).toBeVisible({ timeout: 30_000 });
      await expect(row.getByTestId('market-update-recorded')).toContainText(
        /Point marché du \d{2}\/\d{2}\/\d{4} prêt/,
      );
      await expect(page.getByText(/Installer l’extension|extension ACM/)).toHaveCount(0);
      await expectUnspoken(page, 'Suivi');
    });

    await test.step('Mandat signé, exclusif, depuis la ligne du Suivi', async () => {
      await page.goto('/suivi');
      const row = page.getByTestId('suivi-row').filter({ hasText: dossierName });
      await row.getByTestId('suivi-link-issue').click();
      await row
        .locator('label')
        .filter({ hasText: /^Mandat signé$/ })
        .click();
      await row
        .locator('label')
        .filter({ hasText: /^Exclusif$/ })
        .click();
      await expect(row.locator('input[name="commercialization_price"]')).toHaveValue(
        String(COMMERCIALIZATION_PRICE),
      );
      await row.getByRole('button', { name: 'Enregistrer l’issue' }).click();
      await expect(row.getByTestId('outcome-badge')).toHaveText('Mandat signé · exclusif');
      // Mission 130 — adresses confirmées : la prochaine étape est de démarcher, bouton plein.
      await expect(row.getByTestId('suivi-step-button')).toHaveText('Prospecter');
      await expect(row.getByTestId('suivi-frieze')).toContainText(
        `Concurrents · ${RETAINED} à démarcher`,
      );
    });

    await test.step('Prospection : adresses déjà confirmées, courriers, lot, tournée, sans mention', async () => {
      await page.goto(`/prospection?bien=${projectId}`);
      const cards = page.getByTestId('prospecting-card');
      await expect(cards).toHaveCount(RETAINED);
      // Les adresses sont arrivées confirmées : rien à confirmer, tout est prêt.
      await expect(
        page.getByTestId('prospecting-column-to_confirm').getByTestId('prospecting-card'),
      ).toHaveCount(0);
      const ready = page.getByTestId('prospecting-column-ready');
      await expect(ready.getByTestId('prospecting-card')).toHaveCount(RETAINED);

      // Un courrier : la page imprimable porte le filigrane, quelle que soit sa version.
      const href = await ready
        .getByTestId('prospecting-card')
        .first()
        .getByRole('link', { name: /Préparer le dossier/ })
        .first()
        .getAttribute('href');
      expect(href, 'Le lien du courrier est introuvable').toMatch(/\/prospection\/[0-9a-f-]{36}/);
      await page.goto(href!);
      await expectUnspoken(page, 'Courrier de prospection');
      await expect(page.getByText(/Installer l’extension|Installez le Localisateur/)).toHaveCount(
        0,
      );

      // Mission 115 — « Photo de son bien » : une photo de l'annonce, choisie par le closer, sur un
      // courrier dont la version est connue (un seul « Préparer le dossier » : pas la carte « À
      // qui s'adresser ? », que le lot retient) ; elle s'imprime à l'unité, et en lot.
      await page.goto(`/prospection?bien=${projectId}`);
      const hrefs = await ready
        .getByTestId('prospecting-card')
        .getByRole('link', { name: 'Préparer le dossier', exact: true })
        .evaluateAll((links) => links.map((link) => link.getAttribute('href') ?? ''));
      expect(hrefs.length, 'Aucun courrier à version connue parmi les concurrents').toBeGreaterThan(
        0,
      );
      await page.goto(hrefs[0]);
      const photoChoice = page.getByTestId('their-photo-choice');
      await expect(photoChoice).toBeVisible();
      const theirPhoto = page.locator('.pf-doc [data-testid="their-photo"] img');
      await expect(theirPhoto, 'Une photo s’imprime sans que le closer l’ait choisie').toHaveCount(
        0,
      );
      await photoChoice.getByRole('img', { name: 'Photo 1 de son annonce' }).click();
      await expect(theirPhoto).toHaveCount(1);
      await page.getByRole('button', { name: 'Enregistrer', exact: true }).click();
      await expect(page.getByText(/^Enregistré\./)).toBeVisible();
      await page.reload();
      await expect(theirPhoto, 'La photo choisie n’est pas gardée').toHaveCount(1);
      await page.goto(`/prospection/courriers?bien=${projectId}`);
      await expect(
        page.locator('.pf-doc [data-testid="their-photo"] img'),
        'La photo choisie manque au lot',
      ).toHaveCount(1);

      // Mission 115 — le confrère. Le closer précise « Exclusivité : Oui » sur deux concurrents
      // depuis la page du dossier (M83), puis, sur Prospection : contacté → « Collaboration
      // refusée » remet le bien en courrier propriétaire, avec la phrase proposée ; contacté →
      // « Collaboration obtenue » clôt sa prospection, comptée à part.
      await page.goto(`/builder/${projectId}`);
      const exclusivityGroups = page.getByRole('group', { name: 'Exclusivité' });
      await expect(exclusivityGroups.first()).toBeVisible();
      for (const index of [0, 1]) {
        const yes = () =>
          exclusivityGroups.nth(index).getByRole('button', { name: 'Oui', exact: true });
        await yes().click();
        await expect(yes()).toHaveAttribute('aria-pressed', 'true');
        // Le chip est optimiste : on attend que la correction soit EN BASE avant de continuer
        // (une navigation pendant l'envoi l'aurait interrompue).
        await expect
          .poll(
            async () => {
              await page.reload();
              return yes().getAttribute('aria-pressed');
            },
            {
              message: `La correction « Exclusivité : Oui » n’est pas enregistrée (ligne ${index + 1})`,
            },
          )
          .toBe('true');
      }
      await page.goto(`/prospection?bien=${projectId}`);
      const colleague = () =>
        ready
          .getByTestId('prospecting-card')
          .filter({ hasText: 'Exclusivité · appeler le confrère' })
          .first();
      await expect(
        ready
          .getByTestId('prospecting-card')
          .filter({ hasText: 'Exclusivité · appeler le confrère' }),
      ).toHaveCount(2);

      // Refusée : le bien repasse propriétaire, et son courrier le dit.
      const first = colleague();
      const firstAddress = (await first.innerText()).split('\n')[0];
      await first.getByRole('button', { name: 'Marquer contacté' }).click();
      // Contacté, le confrère passe dans « Dossier remis » ; ses gestes sont la collaboration.
      const handed = page.getByTestId('prospecting-column-handed');
      const contacted = handed.getByTestId('prospecting-card').filter({ hasText: firstAddress });
      await expect(contacted.getByRole('button', { name: 'Collaboration refusée' })).toBeVisible();
      await expect(contacted.getByRole('button', { name: 'Collaboration obtenue' })).toBeVisible();
      await expect(contacted.getByRole('button', { name: 'RDV obtenu' })).toHaveCount(0);
      await contacted.getByRole('button', { name: 'Collaboration refusée' }).click();
      // Refusée : le bien revient dans « Prêt à envoyer », en propriétaire.
      const back = ready.getByTestId('prospecting-card').filter({ hasText: firstAddress });
      await expect(back.getByTestId('collaboration-declined-badge')).toContainText(
        'Collaboration refusée',
      );
      await expect(back.getByText('Propriétaire · aller sonner')).toBeVisible();
      const ownerLetter = await back
        .getByRole('link', { name: 'Préparer le dossier', exact: true })
        .getAttribute('href');
      expect(ownerLetter).toContain('version=owner');
      await page.goto(ownerLetter!);
      await expect(page.locator('.pf-doc')).toContainText('elle a refusé cette collaboration');
      await expectUnspoken(page, 'Courrier propriétaire après refus');

      // Obtenue : le concurrent quitte les biens à prospecter, compté à part.
      await page.goto(`/prospection?bien=${projectId}`);
      const second = colleague();
      const secondAddress = (await second.innerText()).split('\n')[0];
      await second.getByRole('button', { name: 'Marquer contacté' }).click();
      await handed
        .getByTestId('prospecting-card')
        .filter({ hasText: secondAddress })
        .getByRole('button', { name: 'Collaboration obtenue' })
        .click();
      const closed = page
        .getByTestId('prospecting-column-meeting')
        .getByTestId('prospecting-card')
        .filter({ hasText: secondAddress });
      await expect(closed.getByTestId('collaboration-badge')).toContainText(
        'Collaboration obtenue',
      );
      await expect(ready.getByTestId('prospecting-card')).toHaveCount(RETAINED - 1);
      await expect(page.getByTestId('collaborations-counter')).toContainText('1');

      // « Ne plus solliciter » sur une carte : inscrit, la carte sort du tableau.
      await page.goto(`/prospection?bien=${projectId}`);
      const refused = ready.getByTestId('prospecting-card').last();
      const refusedText = await refused.innerText();
      await refused.getByRole('button', { name: 'Ne plus solliciter', exact: true }).click();
      await refused.getByRole('button', { name: 'Confirmer : ne plus solliciter' }).click();
      await expect(page.getByTestId('opposition-notice')).toHaveText(
        'Inscrit : plus aucun courrier pour cette adresse',
      );
      await expect(ready.getByTestId('prospecting-card')).toHaveCount(RETAINED - 2);
      console.log('Carte « Ne plus solliciter » (démo) :', refusedText.split('\n')[0]);

      // Les courriers en lot et la tournée : la feuille entière porte le filigrane.
      await page.goto(`/prospection/courriers?bien=${projectId}`);
      await expect(page.getByRole('heading', { name: 'Courriers de prospection' })).toBeVisible();
      await expectUnspoken(page, 'Courriers en lot');
      await expect(
        page.getByText('Ce propriétaire a demandé à ne plus être sollicité'),
      ).toBeVisible();
      await page.goto(`/prospection/tournee?bien=${projectId}`);
      await expect(page.getByRole('heading', { name: 'Ma tournée de prospection' })).toBeVisible();
      await expectUnspoken(page, 'Tournée');
    });

    await test.step('La synthèse au vendeur : sans mention, à l’écran et par le lien public', async () => {
      await page.goto(`/builder/${projectId}/synthese`);
      const synthesis = page.getByTestId('seller-synthesis');
      await expect(synthesis).toBeVisible();
      await expectUnspoken(page, 'Synthèse');
      await expect(synthesis.getByTestId('synthesis-competitor')).toHaveCount(RETAINED + 1);
      await expect(synthesis.getByText('Le plus dangereux selon vous').first()).toBeVisible();
      await expect(synthesis.getByTestId('agreed-price')).toHaveAttribute(
        'data-alignment',
        'green',
      );
      await expect(synthesis.getByTestId('price-alignment')).toHaveText(
        'Prix aligné sur le marché',
      );
      const text = await synthesis.innerText();
      expect(text).not.toMatch(/Vendu par|Exclusivité|[Ee]stimation|demonstration\.invalid/);
      for (const bound of [FOURCHETTE.min, FOURCHETTE.max]) {
        expect(
          withoutSpaces(text),
          'La fourchette du conseiller est dans la synthèse',
        ).not.toContain(String(bound));
      }
      await page.getByRole('button', { name: /Créer un lien pour le vendeur/ }).click();
      const link = (await page.getByTestId('synthesis-link').innerText()).trim();
      expect(link).toMatch(/\/synthese\/[A-Za-z0-9_-]{43}$/);
      const bypass = process.env.E2E_VERCEL_BYPASS;
      const stranger = await page
        .context()
        .browser()!
        .newContext(bypass ? { extraHTTPHeaders: { 'x-vercel-protection-bypass': bypass } } : {});
      try {
        await blockOutsideHosts(stranger, blocked);
        const visitor = await stranger.newPage();
        const response = await visitor.goto(link);
        expect(response?.headers()['x-robots-tag']).toContain('noindex');
        await expect(visitor.getByTestId('seller-synthesis')).toBeVisible();
        await expectUnspoken(visitor, 'Synthèse, lien public');
        await page.getByRole('button', { name: 'Retirer le lien' }).first().click();
        await expect(page.getByText('Lien retiré : il ne s’ouvre plus.')).toBeVisible();
        const after = await visitor.goto(link);
        expect(after?.status(), 'Un lien retiré s’ouvre encore').toBe(404);
      } finally {
        await stranger.close();
      }
    });

    await test.step('Le Point marché (mission 127) : sur le mandat signé de Mougins, une baisse, une vente probable, un retrait', async () => {
      // Le dossier « Conclu, mandat signé » de « Préparer ma démo » : cinq concurrents, dont une
      // annonce qui baisse, une qui disparaît à 150 jours, une à 320 jours.
      await page.goto('/suivi');
      const row = page.getByTestId('suivi-row').filter({ hasText: 'M. Lefebvre' });
      await expect(row).toBeVisible();
      // Mission 130 — « Faire le point » d'« À faire aujourd'hui » ramène à la carte et lance le
      // point (le premier est dû : signé il y a un mois) ; à défaut, par la carte elle-même.
      const pointTask = page
        .getByTestId('suivi-task')
        .filter({ hasText: 'Point marché de M. Lefebvre' });
      if ((await pointTask.count()) > 0) {
        await pointTask.getByRole('link', { name: 'Faire le point' }).click();
      } else if ((await row.getByTestId('suivi-link-point').count()) > 0) {
        await row.getByTestId('suivi-link-point').click();
        await row.getByTestId('refresh-prices').click();
      } else {
        await row.getByTestId('suivi-step-button').click();
      }
      const recorded = row.getByTestId('market-update-recorded');
      await expect(recorded).toBeVisible({ timeout: 60_000 });
      const recordedText = await recorded.innerText();
      console.log(
        'Point marché (démo, Mougins) :',
        recordedText.split('\n').slice(0, 2).join(' · '),
      );
      expect(recordedText).toMatch(/[1-9] baisses?/);
      expect(recordedText).toContain('1 vente probable');
      expect(recordedText).toContain('1 retiré sans vente');
      expect(recordedText).toMatch(/négociation estimée de 5 à 10 %/);
      await expect(row.getByTestId('market-updates')).toContainText(/Point du \d{2}\/\d{2}\/\d{4}/);
      await expect(row.getByTestId('dropped-since-meeting')).toContainText(
        /Ont baissé depuis le rendez-vous : 1 sur 5/,
      );
      // Mission 127 B — (c) « Chercher les nouveaux venus » : simulé en démo, aucun appel ; deux
      // biens vus sur le marché après le rendez-vous ; un retenu. Mission 129 — de −5 % du prix
      // (1 557 000 €), mou-07 seul : la recherche s'élargit à −10 % et trouve mou-03.
      await expect(row.getByTestId('newcomers-proposal')).toContainText(
        'jusqu’à 0,60 €, 1,20 € si la recherche s’élargit',
      );
      await row.getByTestId('newcomers-search').click();
      const results = row.getByTestId('newcomers-results');
      await expect(results).toBeVisible({ timeout: 60_000 });
      await expect(results).toContainText(/2 trouvés/);
      await expect(results).toContainText('0 annonce facturée');
      await expect(results).toContainText(/cherchés de 1\s?475\s?000\s?€ à 1\s?639\s?500\s?€/);
      await expect(results).toContainText(
        'recherche élargie à 10 % sous le prix de commercialisation',
      );
      await expect(results.getByTestId('newcomer-card')).toHaveCount(2);
      await expect(
        results
          .getByText(/Vu par la recherche le \d{2}\/\d{2}\/\d{4}, après le rendez-vous/)
          .first(),
      ).toBeVisible();
      const newcomerText = await results.innerText();
      expect(newcomerText).not.toMatch(/Publié le|[Ee]stimation|demonstration\.invalid/);
      await results.getByTestId('newcomer-retain').first().click();
      await expect(results.getByTestId('newcomer-note').first()).toContainText('Retenu ✓', {
        timeout: 60_000,
      });
      await expect(row.getByTestId('market-update-recorded')).toContainText('1 nouveau venu');
      // Mission 129 — sur la ligne : le verdict et les trois étapes ; puis le nouveau venu est
      // désigné le plus dangereux aujourd'hui.
      const compact = row.getByTestId('market-update-ranking-compact');
      await expect(compact.getByTestId('ranking-verdict')).toBeVisible();
      await expect(compact.getByTestId('ranking-step')).toHaveCount(3);
      await compact.getByTestId('dangerous-designate').click();
      await compact
        .getByTestId('dangerous-options')
        .locator('label')
        .filter({ hasText: 'Nouveau' })
        .first()
        .locator('input')
        .check();
      await compact.getByTestId('dangerous-save').click();
      await expect(compact.getByText(/le plus dangereux aujourd’hui est/)).toBeVisible();
      await row.getByTestId('open-market-update').click();
      await expect(page).toHaveURL(/\/builder\/[0-9a-f-]+\/point-marche/);
      const document = page.getByTestId('market-update');
      await expect(document).toBeVisible();
      await expectUnspoken(page, 'Point marché');
      // 5 concurrents du rendez-vous, plus le nouveau venu retenu (127 B), avant les trois lignes.
      await expect(document.getByTestId('market-update-competitor')).toHaveCount(6);
      await expect(document.getByTestId('market-update-newcomers')).toBeVisible();
      await expect(
        document.getByTestId('market-update-newcomers').getByText(/Vu sur le marché depuis le/),
      ).toBeVisible();
      await expect(
        document.getByText('Vente probable, négociation estimée de 5 à 10 %'),
      ).toBeVisible();
      await expect(document.getByText('Retiré du marché sans vente').first()).toBeVisible();
      // Mission 129 — le classement : verdict, trois étapes, une ligne par bien encore en vente
      // (3 concurrents, le nouveau venu, votre bien), la légende ; plus de couleur M116.
      const ranking = document.getByTestId('price-ranking');
      await expect(ranking.getByTestId('ranking-verdict')).toBeVisible();
      await expect(ranking.getByTestId('ranking-step')).toHaveCount(3);
      await expect(ranking.getByTestId('ranking-row')).toHaveCount(5);
      await expect(ranking.getByTestId('ranking-legend')).toContainText('dernier tiers : danger');
      await expect(document.getByText('Prix aligné sur le marché')).toHaveCount(0);
      // Le nouveau venu désigné aujourd'hui : cadre doré et bandeau sur sa fiche, sur sa ligne, et
      // la phrase du verdict le dit ; l'ancien garde « votre choix au rendez-vous ».
      await expect(document.getByTestId('market-update-dangerous-band')).toHaveCount(1);
      await expect(document.getByTestId('market-update-dangerous-band')).toHaveText(
        'Le plus dangereux aujourd’hui',
      );
      await expect(ranking.getByTestId('ranking-dangerous')).toHaveText(
        'Le plus dangereux aujourd’hui',
      );
      await expect(ranking.getByTestId('ranking-verdict')).toContainText(
        'Un nouveau venu devient le plus dangereux',
      );
      await expect(document.getByText(/votre choix au rendez-vous/).first()).toBeVisible();
      const text = await document.innerText();
      expect(text).not.toMatch(
        /Vendu par|Exclusivité|[Ee]stimation|demonstration\.invalid|Publié le/,
      );
      for (const bound of [FOURCHETTE.min, FOURCHETTE.max]) {
        expect(
          withoutSpaces(text),
          'La fourchette du conseiller est dans le Point marché',
        ).not.toContain(String(bound));
      }
      await page.getByRole('button', { name: /Créer un lien pour le vendeur/ }).click();
      const link = (await page.getByTestId('market-update-link').innerText()).trim();
      expect(link).toMatch(/\/point-marche\/[A-Za-z0-9_-]{43}$/);
      const bypass = process.env.E2E_VERCEL_BYPASS;
      const stranger = await page
        .context()
        .browser()!
        .newContext(bypass ? { extraHTTPHeaders: { 'x-vercel-protection-bypass': bypass } } : {});
      try {
        await blockOutsideHosts(stranger, blocked);
        const visitor = await stranger.newPage();
        const response = await visitor.goto(link);
        expect(response?.headers()['x-robots-tag']).toContain('noindex');
        await expect(visitor.getByTestId('market-update')).toBeVisible();
        await expect(visitor.getByTestId('ranking-verdict')).toBeVisible();
        await expect(visitor.getByTestId('market-update-dangerous-band')).toHaveText(
          'Le plus dangereux aujourd’hui',
        );
        await expectUnspoken(visitor, 'Point marché, lien public');
        await page.getByRole('button', { name: 'Retirer le lien' }).first().click();
        await expect(page.getByText('Lien retiré : il ne s’ouvre plus.')).toBeVisible();
        const after = await visitor.goto(link);
        expect(after?.status(), 'Un lien retiré s’ouvre encore').toBe(404);
        // Mission 127 B — la page parle au vendeur : ni « agence », ni « mes dossiers ».
        await expect(
          visitor.getByRole('heading', { name: 'Ce lien n’est plus valable' }),
        ).toBeVisible();
        const expiredText = await visitor.locator('main').innerText();
        expect(expiredText).not.toMatch(/agence|mes dossiers/i);
      } finally {
        await stranger.close();
      }
    });

    await test.step('Le tableau du manager, sur l’agence de démo', async () => {
      await page.goto('/admin/equipe');
      const dashboard = page.getByTestId('mandate-dashboard');
      await expect(dashboard).toBeVisible();
      await expect(dashboard.getByText('Rendez-vous menés')).toBeVisible();
      const meetings = await dashboard.getByText('Rendez-vous menés').locator('..').innerText();
      expect(withoutSpaces(meetings)).toMatch(/[1-9]/);
      // Mission 115 — la collaboration obtenue pendant le passage, comptée à part.
      const collaborations = await dashboard
        .getByText('Collaborations obtenues')
        .locator('..')
        .innerText();
      expect(withoutSpaces(collaborations)).toMatch(/[1-9]/);
      await expectUnspoken(page, 'Vue manager');
    });

    await test.step('Suivi et Prospection tiennent sur tablette (768 × 1024)', async () => {
      await page.setViewportSize({ width: 768, height: 1024 });
      const overflow = () =>
        page.evaluate(
          () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
        );
      await page.goto(`/prospection?bien=${projectId}`);
      await expect(page.getByTestId('prospecting-card').first()).toBeVisible();
      expect(await overflow(), 'La page Prospection déborde sur tablette').toBeLessThanOrEqual(0);
      await page.goto('/suivi');
      await expect(page.getByTestId('suivi-row').filter({ hasText: dossierName })).toBeVisible();
      expect(await overflow(), 'Le Suivi déborde sur tablette').toBeLessThanOrEqual(0);
      await page.setViewportSize({ width: 1280, height: 720 });
    });

    // Mission 114 (partie B) — « Remettre ma démo à zéro » : confirmation dans l'écran, puis quatre
    // dossiers neufs (d'autres identifiants) ; les dossiers des collègues ne bougent pas (prouvé par
    // les tests unitaires : ce passage n'a qu'un compte de démo).
    await test.step('Remettre ma démo à zéro', async () => {
      await goViaAccountMenu(page, 'Ma démo');
      await expect(page).toHaveURL(/\/ma-demo$/);
      const before = await page
        .getByTestId('demo-dossier')
        .evaluateAll((items) => items.map((item) => item.querySelector('a')?.getAttribute('href')));
      expect(before).toHaveLength(5);
      await page.getByRole('button', { name: 'Remettre ma démo à zéro' }).click();
      const confirm = page.getByTestId('demo-reset-confirm');
      await expect(confirm).toContainText('Les dossiers de vos collègues ne bougent pas.');
      await confirm.getByRole('button', { name: 'Annuler' }).click();
      await expect(confirm).toHaveCount(0);
      await page.getByRole('button', { name: 'Remettre ma démo à zéro' }).click();
      await confirm.getByRole('button', { name: 'Remettre à zéro' }).click();
      // La remise à zéro dure (photos déposées, Live, conclusion) : on attend que la liste change
      // — les anciens dossiers s'affichent jusqu'au retour de l'action.
      const hrefs = () =>
        page
          .getByTestId('demo-dossier')
          .evaluateAll((items) =>
            items.map((item) => item.querySelector('a')?.getAttribute('href')),
          );
      await expect
        .poll(async () => (await hrefs())[0], {
          message: 'La remise à zéro n’a pas remplacé les dossiers',
          timeout: 180_000,
        })
        .not.toBe(before[0]);
      await expect(page.locator('p[role="alert"]')).toHaveCount(0);
      await expect(page.getByTestId('demo-dossier')).toHaveCount(5);
      const after = await hrefs();
      for (const href of after.slice(0, 4)) expect(before).not.toContain(href);
      await expectUnspoken(page, 'Ma démo, remise à zéro');
      // Mission 117 — deux acquéreurs à nouveau, pas plus : les anciens sont partis avec les dossiers.
      await expectDemoBuyers(page);
    });

    await test.step('Aucune requête vers l’extérieur', async () => {
      const outside = [...blocked.entries()].filter(([host]) => !VERCEL_TOOLING.test(host));
      console.log('Hôtes bloqués pendant le passage :', Object.fromEntries(blocked));
      expect(outside, 'La démo a tenté de joindre un hôte extérieur').toEqual([]);
    });
  } finally {
    // Réussi ou non : le dossier de ce passage quitte l'agence de démonstration.
    const removed = removeDemoRunDossiers(startedAt);
    console.log('Nettoyage de la démo :', removed);
    if (projectId) {
      expect(
        removed.dossiers,
        'Le dossier de démo du passage n’a pas été retiré',
      ).toBeGreaterThanOrEqual(1);
    }
  }
});

// ---------------------------------------------------------------------------------------
// Le Live avec cinq concurrents importés de la démo (rythme accéléré à partir du 4e), dans
// l'ordre de build-live-pages.ts. Au premier passage, les réponses sont données et les règles
// absolues vérifiées sur chaque écran (jamais un prix avant la devinette, jamais la fourchette,
// jamais une adresse d'annonce de démo) ; au second (tablette), elles sont relues, et l'on
// vérifie l'absence de défilement horizontal. Le « DPE face au marché » (M80) est là : les
// concurrents de la démo affichent une classe.
// ---------------------------------------------------------------------------------------

async function walkLive(
  page: Page,
  projectId: string,
  competitors: Competitor[],
  { firstPass, tablet }: { firstPass: boolean; tablet: boolean },
): Promise<void> {
  const validate = () => page.getByRole('button', { name: /Valider et continuer/ }).click();
  const choose = (label: string) =>
    page
      .locator('label')
      .filter({ hasText: new RegExp(`^${label}$`) })
      .click();
  const lockedAnswer = page.locator('[data-locked-answer]');
  const guess = (competitor: Competitor) => competitor.price - 10_000;
  const onScreen = async (screen: string) => {
    const payload = await pagePayload(page);
    for (const bound of [FOURCHETTE.min, FOURCHETTE.max]) {
      expect(
        payload,
        `La fourchette du conseiller (${bound}) est dans « ${screen} »`,
      ).not.toContain(String(bound));
    }
    expect(payload, `Une adresse d’annonce de démo est dans « ${screen} »`).not.toContain(
      DEMO_LISTING_HOST,
    );
    // Décision du 23/10 — le Live ne dit pas non plus « démonstration ».
    await expectUnspoken(page, screen);
    if (tablet) await expectNoHorizontalScroll(page, screen);
  };
  const expectPriceHidden = async (competitor: Competitor, screen: string) => {
    expect(
      await pagePayload(page),
      `Le prix ${competitor.price} est dans la page avant la devinette (« ${screen} »)`,
    ).not.toContain(String(competitor.price));
  };

  if (firstPass) {
    // Mission 112 — un vrai dossier jamais lancé : la confirmation « devant le vendeur » d'abord.
    await page.goto(`/live/${projectId}`);
    await expect(page).toHaveURL(new RegExp(`/builder/${projectId}/lancer-le-live$`));
    await page.getByTestId('launch-for-real').click();
    await expect(page).toHaveURL(new RegExp(`/live/${projectId}$`));
  } else {
    await page.goto(`/live/${projectId}`);
  }

  await expect(page.getByRole('button', { name: 'Démarrer la présentation' })).toBeVisible();
  await onScreen('Introduction');
  await page.getByRole('button', { name: 'Démarrer la présentation' }).click();

  await expect(page.getByRole('heading', { name: 'Votre bien', exact: true })).toBeVisible();
  await onScreen('Votre bien');
  if (firstPass) {
    for (const competitor of competitors) await expectPriceHidden(competitor, 'Votre bien');
    await choose('Oui, c’est bien mon bien');
    await page.locator('textarea[name="seller_property_comment"]').fill(COMMENT);
  }
  await validate();

  await expect(
    page.getByRole('heading', { name: 'À quel prix positionneriez-vous aujourd’hui votre bien ?' }),
  ).toBeVisible();
  await onScreen('Votre valeur perçue');
  await expect(page.locator('[data-price-band]')).toHaveCount(0);
  const perceivedInput = page.locator('input[name="seller_perceived_property_price"]');
  if (firstPass) {
    for (const competitor of competitors)
      await expectPriceHidden(competitor, 'Votre valeur perçue');
    await perceivedInput.fill(String(PERCEIVED_PRICE));
    await validate();
    const confirm = page.getByRole('button', { name: /Confirmer et continuer/ });
    await expect(confirm).toBeVisible();
    await confirm.click();
  } else {
    await expect(perceivedInput).toHaveCount(0);
    expect(withoutSpaces(await lockedAnswer.innerText())).toContain(String(PERCEIVED_PRICE));
    await validate();
  }

  for (const [index, competitor] of competitors.entries()) {
    const label = `Concurrent ${index + 1} sur ${competitors.length}`;

    if (index >= 3) {
      // Mission 95 — rythme accéléré : deux écrans.
      await expect(
        page.getByRole('heading', { name: 'Un sérieux concurrent ? Et à quel prix, selon vous ?' }),
      ).toBeVisible();
      await expect(page.getByText(`${label} · Étape 1 sur 2`)).toBeVisible();
      await onScreen(`${label} · accéléré, écran 1`);
      if (firstPass) await expectPriceHidden(competitor, `${label} · accéléré, écran 1`);
      const quickGuess = page.locator('input[name="seller_estimated_listing_price"]');
      if (firstPass) {
        await choose('Oui, un concurrent sérieux');
        await quickGuess.fill(String(guess(competitor)));
      } else {
        await expect(quickGuess).toHaveCount(0);
      }
      await validate();

      await expect(page.getByRole('heading', { name: 'Voici son prix.' })).toBeVisible();
      expect(await mainText(page), `Le prix du ${label} n’est pas révélé`).toContain(
        String(competitor.price),
      );
      const quickDays = page.locator('input[name="seller_estimated_days_on_market"]');
      if (firstPass && (await quickDays.count()) > 0) {
        await quickDays.fill('90');
        await page.getByRole('button', { name: /Révéler la durée/ }).click();
        await expect(page.getByText('Durée observée sur le marché')).toBeVisible();
      }
      await onScreen(`${label} · accéléré, écran 2`);
      await validate();
      continue;
    }

    // 1. Un sérieux concurrent ? — sans prix.
    await expect(
      page.getByRole('heading', { name: 'Est-il un sérieux concurrent pour votre bien ?' }),
    ).toBeVisible();
    await expect(page.getByText(new RegExp(`${label} · Étape 1 sur [34]`))).toBeVisible();
    await onScreen(`${label} · Un sérieux concurrent ?`);
    if (firstPass) {
      await expectPriceHidden(competitor, `${label} · Un sérieux concurrent ?`);
      await choose('Oui, un concurrent sérieux');
      await page.locator('textarea[name="seller_serious_competitor_comment"]').fill(COMMENT);
    }
    await validate();

    // 2. À quel prix ? — toujours sans prix.
    await expect(
      page.getByRole('heading', { name: 'À quel prix pensez-vous que ce bien est proposé ?' }),
    ).toBeVisible();
    await onScreen(`${label} · À quel prix ?`);
    const guessInput = page.locator('input[name="seller_estimated_listing_price"]');
    if (firstPass) {
      await expectPriceHidden(competitor, `${label} · À quel prix ?`);
      await guessInput.fill(String(guess(competitor)));
    } else {
      await expect(guessInput).toHaveCount(0);
      expect(withoutSpaces(await lockedAnswer.innerText())).toContain(String(guess(competitor)));
    }
    await validate();

    // 3. Révélation.
    await expect(
      page.getByRole('heading', { name: 'Ce prix vous paraît-il cohérent ?' }).first(),
    ).toBeVisible();
    await onScreen(`${label} · Ce prix vous paraît-il cohérent ?`);
    expect(await mainText(page), `Le prix du ${label} n’est pas révélé`).toContain(
      String(competitor.price),
    );
    if (firstPass) {
      await choose('Oui, ce prix paraît cohérent');
      await page.locator('textarea[name="seller_price_coherence_comment"]').fill(COMMENT);
    }
    await validate();

    // 4. Pourquoi toujours en vente ? — si la durée est connue (M92).
    const duration = page.getByRole('heading', {
      name: 'Pourquoi est-il toujours sur le marché ?',
    });
    const dangerous = page.getByRole('heading', {
      name: /Quel concurrent vous paraît le plus dangereux|Le DPE face au marché|Est-il un sérieux concurrent|Un sérieux concurrent \? Et à quel prix/,
    });
    await expect(duration.or(dangerous).first()).toBeVisible();
    if (await duration.isVisible()) {
      await onScreen(`${label} · Pourquoi toujours en vente ?`);
      const daysInput = page.locator('input[name="seller_estimated_days_on_market"]');
      if (firstPass) {
        await daysInput.fill('90');
        await page.getByRole('button', { name: /Révéler la durée/ }).click();
      } else {
        await expect(daysInput).toHaveCount(0);
      }
      await expect(page.getByText('Durée observée sur le marché')).toBeVisible();
      await onScreen(`${label} · durée révélée`);
      if (firstPass) {
        await choose('Prix trop élevé');
        await page.locator('textarea[name="seller_market_duration_comment"]').fill(COMMENT);
      }
      await validate();
    }
  }

  // Mission 80 — « Le DPE face au marché » : les concurrents de la démo affichent une classe.
  await expect(page.getByRole('heading', { name: 'Le DPE face au marché' })).toBeVisible();
  await onScreen('Le DPE face au marché');
  expect(await mainText(page), 'Un montant sur l’écran DPE').not.toMatch(/\d€/);
  await validate();

  // Le concurrent le plus dangereux
  await expect(
    page.getByRole('heading', { name: 'Quel concurrent vous paraît le plus dangereux ?' }),
  ).toBeVisible();
  await onScreen('Le concurrent le plus dangereux');
  if (firstPass) {
    await page.getByTestId('review-competitor').first().click();
    const review = page.getByTestId('competitor-review');
    await expect(review).toBeVisible();
    await review.getByRole('button', { name: 'Fermer' }).click();
    await expect(review).toHaveCount(0);
    await page
      .locator('label')
      .filter({ has: page.locator('input[name="seller_most_dangerous_comparable_id"]') })
      .first()
      .click();
    await choose('Meilleure localisation');
    await page.locator('textarea[name="seller_most_dangerous_comment"]').fill(COMMENT);
  }
  await validate();

  // Mission 94 — le prix reformulé, avant l'analyse.
  await expect(
    page.getByRole('heading', {
      name: 'Après avoir vu ces biens, à quel prix mettriez-vous votre bien en vente ?',
    }),
  ).toBeVisible();
  await onScreen('Votre prix après le marché');
  const revisedInput = page.locator('input[name="seller_revised_property_price"]');
  if (firstPass) {
    await revisedInput.fill(String(REVISED_PRICE));
    await validate();
    const confirmRevised = page.getByRole('button', { name: /Confirmer et continuer/ });
    await expect(confirmRevised).toBeVisible();
    await confirmRevised.click();
  } else {
    await expect(revisedInput).toHaveCount(0);
    await validate();
  }

  // Analyse des prix
  await expect(page.getByRole('heading', { name: 'Analyse des prix', exact: true })).toBeVisible();
  expect(withoutSpaces(await page.locator('[data-seller-path]').innerText())).toBe(
    `Audébut:${PERCEIVED_PRICE}€→Aprèsavoirvulemarché:${REVISED_PRICE}€`,
  );
  await expect(page.getByText(/Calculé sur \d+ concurrents/)).toBeVisible();
  const band = page.locator('[data-price-band]');
  await expect(band.locator('[data-band-dot]')).toHaveCount(competitors.length);
  await expect(band.locator('[data-band-marker="competitors"]')).toHaveCount(1);
  // Mission 115 — le plus dangereux désigné est nommé sur la bande.
  await expect(band.locator('[data-band-marker="dangerous"]')).toHaveCount(1);
  await onScreen('Analyse des prix');
  await validate();

  // Conclusion — « Sur quel prix partons-nous ? »
  await expect(page.getByRole('heading', { name: 'Conclusion', exact: true })).toBeVisible();
  await onScreen('Conclusion');
  if (firstPass) {
    const commercialization = page.locator('input[name="commercialization_price"]');
    await expect(commercialization).toHaveValue('');
    await commercialization.fill(String(COMMERCIALIZATION_PRICE));
    // Mission 94 — un repère parmi les biens comparés, sans conseil : « le 3e moins cher sur 6 »,
    // « le plus cher des 6 biens comparés », « dans la moyenne »…
    await expect(page.locator('[data-price-position]')).toContainText(
      /sur \d+|biens comparés|dans la moyenne|parmi les/,
    );
    await page.getByRole('button', { name: 'Enregistrer le prix' }).click();
    await expect(page.getByText('Prix de commercialisation enregistré.')).toBeVisible();
  }
  await validate();

  // Mission 85 — la note de 1 à 10.
  await expect(
    page.getByRole('heading', {
      name: 'Sur une échelle de 1 à 10, où en êtes-vous pour lancer la vente à ce prix ?',
    }),
  ).toBeVisible();
  await onScreen('Prêt à lancer ?');
  // Mission 116 — 392 500 € face à 405 000 € : « Prix aligné sur le marché », vert.
  if (firstPass) {
    await expect(page.getByTestId('agreed-price')).toHaveAttribute('data-alignment', 'green');
    await expect(page.getByTestId('price-alignment')).toHaveText('Prix aligné sur le marché');
  }
  const scale = page.getByRole('group', { name: 'Votre note, de 1 à 10' });
  const score = (value: number) => scale.getByRole('button', { name: String(value), exact: true });
  if (firstPass) {
    // L'échelle entre avec une transition : on attend qu'elle soit stable avant de la toucher (un
    // clic pendant la transition a trouvé l'élément « détaché » lors d'un passage).
    await page.waitForFunction(() =>
      document.getAnimations().every((animation) => animation.playState !== 'running'),
    );
    await score(7).click();
    await page.locator('textarea[name="seller_launch_readiness_missing"]').fill(MISSING_FOR_TEN);
    await score(10).click();
    await expect(page.getByText('Note enregistrée')).toBeVisible();
  } else {
    await expect(score(10)).toHaveAttribute('aria-pressed', 'true');
  }
  await expect(page.getByRole('link', { name: /Terminer le rendez-vous/ })).toBeVisible();
}

// Mission 117 — les deux acquéreurs de la démo : M. et Mme Rossi (appartement, Antibes) et la
// famille Keller (villa, Mougins), exactement deux ; « Rapprocher » sur les Keller ouvre le
// rapprochement pré-rempli et y trouve le mandat signé de Mougins.
async function expectDemoBuyers(page: Page): Promise<void> {
  await page.goto('/acquereurs');
  await expectUnspoken(page, 'Acquéreurs');
  const rows = page.getByTestId('buyer-row');
  await expect(rows).toHaveCount(2);
  await expect(rows.filter({ hasText: 'M. et Mme Rossi' })).toContainText(
    'Appartement · Antibes · Juan-les-Pins',
  );
  const keller = rows.filter({ hasText: 'Famille Keller' });
  await expect(keller).toContainText('Maison · Mougins');
  // Essai de Jean-Guy (26/10) : le bouton de la carte dit l'étape suivante — sa sélection est
  // retenue (« Préparer ma démo »), elle est à présenter.
  await expect(keller.getByTestId('buyer-next-step')).toHaveText('Présenter maintenant →');
  // Mission 130 B — la ligne dit sa prochaine étape et depuis quand.
  await expect(keller).toContainText(/Prochaine étape · Lui présenter sa sélection · depuis le/);
  await expect(
    rows.filter({ hasText: 'M. et Mme Rossi' }).getByTestId('buyer-next-step'),
  ).toHaveText('Trouver les biens idéaux →');
  await keller.getByRole('link', { name: 'Famille Keller' }).click();
  await expect(page.getByTestId('buyer-name')).toHaveText('Famille Keller');
  // Mission 130 B — en tête : ses mots, ses critères (★ indispensables), son téléphone ; ses
  // quatre étapes ; UNE prochaine étape ; « Rapprocher » en bloc.
  await expect(page.getByTestId('buyer-words')).toBeVisible();
  await expect(page.getByTestId('buyer-criteria')).toContainText('★');
  const steps = page.getByTestId('buyer-step');
  await expect(steps).toHaveCount(4);
  await expect(steps.nth(0)).toContainText('1 · Biens idéaux');
  await expect(steps.nth(0)).toContainText('3 biens sélectionnés');
  await expect(steps.nth(1)).toContainText('2 · Présenter');
  await expect(steps.nth(1)).toHaveAttribute('data-status', 'current');
  await expect(steps.nth(2)).toContainText('3 · Sa réponse');
  await expect(steps.nth(3)).toContainText('4 · Visites');
  await expect(page.getByTestId('buyer-next-step')).toContainText('Lui présenter sa sélection');
  await expect(page.getByTestId('buyer-timeline')).toContainText('3 biens sélectionnés');
  await expect(page.getByTestId('buyer-matching')).toContainText(
    /Voir les correspondances · [1-9]/,
  );
  await page.getByRole('link', { name: /^Voir les correspondances/ }).click();
  const panel = page.getByTestId('buyer-search');
  await expect(panel.locator('input[name="city"]')).toHaveValue(
    'Mougins, Mouans-Sartoux, Valbonne',
  );
  await expect(panel.getByText(/correspond(ent)? à cet acquéreur/)).toBeVisible();
  await expect(panel.getByText('M. Lefebvre').first()).toBeVisible();

  // Mission 118 (partie B) — « Trouver les biens idéaux » : l'agence d'abord (le mandat de
  // Mougins), puis le marché simulé (M114), en trois catégories ; trois biens retenus, retrouvés.
  await page.goBack();
  // Relecture des rendus (25/10) : « Préparer ma démo » (ou sa remise à zéro) a déjà retenu pour
  // les Keller le mandat de Mougins, un compromis au budget en orange et un bien à vérifier.
  await expect(page.getByTestId('ideal-selection-item')).toHaveCount(3);
  await page.getByRole('link', { name: 'Changer la sélection' }).click();
  await expect(page.getByTestId('ideal-title')).toHaveText('Les biens idéaux de Famille Keller');
  await expectUnspoken(page, 'Biens idéaux');
  // Essai de Jean-Guy (26/10) : la sélection actuelle n'apparaît qu'une fois, dans le bandeau
  // « Sélection actuelle : A, B, C », chaque bien avec sa case, cochée en arrivant — A le mandat de
  // Mougins (il coche tout), B le compromis au budget en orange, C le bien avec un « ? » — ; ni le
  // mandat ni ces annonces ne se répètent dans les listes ; « Retenir » ne s'active que si la
  // sélection cochée change ; aucun texte interne (« M86 », « règles du rapprochement »).
  const current = page.getByTestId('ideal-current');
  await expect(current).toContainText('Sélection actuelle : A, B, C');
  await expect(current.getByRole('link', { name: 'Présenter' })).toBeVisible();
  await expect(current.getByRole('link', { name: 'Dossier acquéreur' })).toBeVisible();
  const currentItem = (letter: string) =>
    page.locator(`[data-testid="ideal-current-item"][data-letter="${letter}"]`);
  await expect(page.getByTestId('ideal-current-item')).toHaveCount(3);
  await expect(currentItem('A')).toContainText('Dans l’agence');
  await expect(currentItem('B')).toContainText(/1\s720\s000/);
  await expect(currentItem('C')).toContainText('Annonce du marché');
  for (const letter of ['A', 'B', 'C']) {
    await expect(currentItem(letter).getByRole('checkbox')).toBeChecked();
  }
  await expect(
    page.getByTestId('ideal-agency-hit').filter({ hasText: 'Mes mandats' }),
    'le mandat de Mougins n’apparaît qu’une fois, dans le bandeau',
  ).toHaveCount(0);
  await expect(page.getByText(/\bM\d{2,3}\b|règles? du rapprochement/)).toHaveCount(0);
  await page.getByRole('button', { name: 'Trouver sur le marché' }).click();
  await page
    .getByTestId('ideal-paid-confirm')
    .getByRole('button', { name: 'Lancer et payer' })
    .click();
  await expect(page.getByTestId('ideal-market-summary')).toBeVisible({ timeout: 60_000 });
  await expect(page.getByTestId('ideal-market-summary')).toContainText('0 annonce facturée');
  for (const category of ['strong', 'compromise', 'explore']) {
    await expect(page.getByTestId(`ideal-category-${category}`)).toBeVisible();
  }
  await expect(page.getByText(/disponible/i)).toHaveCount(0);
  const marketHits = page.getByTestId('ideal-market-hit');
  await expect(marketHits.first()).toContainText(/affiché le \d{2}\/\d{2}\/\d{4}/);
  // B et C, déjà dans le bandeau, ne se répètent pas dans les annonces du marché.
  await expect(marketHits.filter({ hasText: /1\s720\s000/ })).toHaveCount(0);
  await expect(page.getByTestId('ideal-current-item')).toHaveCount(3);
  await expect(marketHits.first()).toContainText(/\d+ critères? sur \d+/);
  await expect(page.getByText(/% de correspondance/)).toHaveCount(0);
  await expect(page.getByText(/\bM\d{2,3}\b|règles? du rapprochement/)).toHaveCount(0);
  await expect(page.getByTestId('ideal-retain')).toHaveText('Retenir la sélection (3/3)');
  await expect(page.getByTestId('ideal-retain')).toBeDisabled();
  await expect(marketHits.getByRole('checkbox', { checked: false }).first()).toBeDisabled();
  // Décocher C dans le bandeau active « Retenir » ; le recocher revient à la sélection actuelle.
  const toCheck = currentItem('C').getByRole('checkbox');
  await toCheck.uncheck();
  await expect(page.getByTestId('ideal-retain')).toBeEnabled();
  await toCheck.check();
  await expect(page.getByTestId('ideal-retain')).toBeDisabled();
  await expectUnspoken(page, 'Biens idéaux, sélection retenue');
  await page.goto('/acquereurs');
  await page.getByRole('link', { name: 'Famille Keller' }).click();
  await expect(page.getByTestId('ideal-selection-item')).toHaveCount(3);

  // Mission 122 (partie B) — avant la présentation, le lien du dossier des Keller, répondu au doigt
  // depuis un téléphone (390 × 844) : A « Je veux le visiter », B « Peut-être », C d'abord sans
  // réponse — « Envoyer ma réponse » demande confirmation (décision de Jean-Guy, 25/10) — puis
  // « Pas pour moi » avec une raison ; la base relue dit exactement ce qui a été touché ; le merci,
  // puis une seconde ouverture sans formulaire ; la réponse se lit sur la fiche, « depuis le lien ».
  await page.getByTestId('buyer-dossier').click();
  const dossier = page.getByTestId('buyer-dossier');
  await expect(dossier.getByTestId('dossier-item')).toHaveCount(3);
  await expect(dossier.getByTestId('dossier-choice-row')).toHaveCount(3);
  await expectUnspoken(page, 'Dossier acquéreur');
  await page.getByRole('button', { name: /Créer un lien pour l’acquéreur/ }).click();
  const dossierLink = (await page.getByTestId('dossier-link').innerText()).trim();
  // Essai de Jean-Guy (26/10) : le lien s'affiche avec « Copier », « SMS », « WhatsApp »,
  // « E-mail », qui ouvrent un message prérempli, lien compris, signé du prénom du conseiller.
  await expect(page.getByTestId('dossier-link-message')).toContainText(
    `Bonjour, voici les biens que j’ai sélectionnés pour vous : ${dossierLink}`,
  );
  await expect(page.getByTestId('dossier-link-message')).toContainText(
    'Dites-moi lesquels vous voulez visiter.',
  );
  await expect(page.getByTestId('dossier-share-copy')).toHaveText('Copier');
  for (const [testId, scheme] of [
    ['dossier-share-sms', 'sms:'],
    ['dossier-share-whatsapp', 'https://wa.me/?text='],
    ['dossier-share-email', 'mailto:'],
  ] as const) {
    const href = (await page.getByTestId(testId).getAttribute('href')) ?? '';
    expect(href.startsWith(scheme), `${testId} : ${scheme}`).toBe(true);
    expect(decodeURIComponent(href), `${testId} porte le lien`).toContain(dossierLink);
  }
  const phoneContext = () =>
    page
      .context()
      .browser()!
      .newContext({
        viewport: { width: 390, height: 844 },
        isMobile: true,
        hasTouch: true,
        ...(process.env.E2E_VERCEL_BYPASS
          ? { extraHTTPHeaders: { 'x-vercel-protection-bypass': process.env.E2E_VERCEL_BYPASS } }
          : {}),
      });
  const answering = await phoneContext();
  try {
    const visitor = await answering.newPage();
    const response = await visitor.goto(dossierLink);
    expect(response?.headers()['x-robots-tag']).toContain('noindex');
    const phone = visitor.getByTestId('dossier-phone-deck');
    await expect(phone).toHaveAttribute('data-screen', 'words');
    expect(await visitor.locator('body').innerText()).not.toMatch(UNSPOKEN);
    // Essai de Jean-Guy (26/10) : le premier écran est la couverture du PDF — la photo du bien A,
    // « Votre sélection du [date] », sa phrase, le conseiller — avec un seul bouton principal.
    // Le document imprimé porte déjà `dossier-cover` : la couverture du téléphone a son propre nom.
    const cover = visitor.getByTestId('dossier-link-cover');
    await expect(cover.locator('img')).toHaveCount(1);
    await expect(cover).toContainText(/Votre sélection du \d{2}\/\d{2}\/\d{4}/);
    await expect(cover).toContainText('« ');
    await expect(cover.getByTestId('dossier-advisor-line')).toBeVisible();
    await expect(visitor.getByTestId('dossier-nav')).toBeHidden();
    await expectNoHorizontalScroll(visitor, 'Le lien — couverture (390 × 844)');
    await visitor.getByTestId('dossier-start').tap();
    await expect(phone).toHaveAttribute('data-screen', 'grid');
    const linkAnswer = (value: string) =>
      visitor.locator(`[data-testid="deck-answer"][data-answer="${value}"]`);
    // Essai de Jean-Guy (25/10) : A et B « Je veux le visiter », au doigt. Mission 120 B — B, en
    // exclusivité (mou-02), porte la visite qui se joue par le dossier au confrère : sa demande
    // « depuis le dossier » survit au « Peut-être » de la présentation (M122).
    const sendBar = visitor.getByTestId('dossier-send-bar');
    for (const [letter, value] of [
      ['A', 'visit'],
      ['B', 'visit'],
    ] as const) {
      await visitor.getByTestId('dossier-next').tap();
      await expect(phone).toHaveAttribute('data-screen', 'item');
      await expect(visitor.getByText(`Bien ${letter} · `).first()).toBeVisible();
      expect(await visitor.locator('body').innerText()).not.toMatch(UNSPOKEN);
      // Essai de Jean-Guy (26/10) : rien n'est plein avant d'être choisi, « Je veux le visiter »
      // compris ; la réponse choisie devient pleine.
      await expect(linkAnswer('visit')).toHaveAttribute('aria-pressed', 'false');
      await linkAnswer(value).tap();
      await expect(linkAnswer(value)).toHaveAttribute('aria-pressed', 'true');
      // Dès la première réponse, « Envoyer ma réponse » est fixé en bas ; en fin de défilement,
      // aucune réponse n'est sous lui.
      await expect(sendBar).toBeVisible();
      await visitor.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
      const bar = await sendBar.boundingBox();
      const last = await linkAnswer('no').boundingBox();
      expect(
        last!.y + last!.height,
        `bien ${letter} : aucune réponse sous la barre d'envoi`,
      ).toBeLessThanOrEqual(bar!.y);
      // Ni « Précédent », ni « Suivant » : la navigation reste au-dessus de la barre d'envoi.
      const previousBox = await visitor.getByTestId('dossier-previous').boundingBox();
      expect(
        previousBox!.y + previousBox!.height,
        `bien ${letter} : la navigation au-dessus de la barre d'envoi`,
      ).toBeLessThanOrEqual(bar!.y);
    }
    await visitor.getByTestId('dossier-to-answer').tap();
    const answerScreen = visitor.getByTestId('dossier-answer');
    await expect(answerScreen).toContainText('Vous voulez visiter les biens A et B.');
    await expect(answerScreen).not.toContainText('Vous hésitez');
    await expect(answerScreen).not.toContainText('pas pour vous');
    await visitor.getByTestId('dossier-availability').filter({ hasText: 'Samedi matin' }).tap();
    await expect(visitor.getByTestId('dossier-download')).toHaveText('Télécharger en PDF');
    await expectNoHorizontalScroll(visitor, 'Le lien — sa réponse (390 × 844)');
    // C sans réponse : la confirmation, qui prend le focus ; « Annuler », puis C depuis la grille.
    await visitor.getByTestId('dossier-send').tap();
    const confirm = visitor.getByTestId('dossier-send-confirm');
    await expect(confirm).toContainText('1 bien sans réponse : C. Envoyer quand même ?');
    await expect(confirm).toBeFocused();
    await confirm.getByRole('button', { name: 'Annuler' }).tap();
    await expect(confirm).toHaveCount(0);
    await visitor.getByTestId('dossier-previous').tap();
    await expect(phone).toHaveAttribute('data-screen', 'grid');
    await visitor.locator('[data-testid="deck-open-item"][data-letter="C"]').tap();
    await expect(visitor.getByText('Bien C · ').first()).toBeVisible();
    await linkAnswer('no').tap();
    await expect(linkAnswer('no')).toHaveAttribute('aria-pressed', 'true');
    // « Pas pour moi » : ses raisons tout de suite dessous.
    await visitor.getByTestId('item-reason').filter({ hasText: 'Le prix' }).tap();
    await expect(visitor.getByTestId('item-reason').filter({ hasText: 'Le prix' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    // Le dernier bien : « Envoyer ma réponse » à la place de « Suivant ».
    await expect(visitor.getByTestId('dossier-next')).toHaveCount(0);
    await visitor.getByTestId('dossier-last-send').tap();
    await expect(answerScreen).toContainText('Le bien C : pas pour vous. Pourquoi ?');
    await expect(answerScreen).toContainText('Vous voulez visiter les biens A et B.');
    await expect(
      visitor.getByTestId('dossier-reason').filter({ hasText: 'Le prix' }),
    ).toHaveAttribute('aria-pressed', 'true');
    await visitor.getByTestId('dossier-send').tap();
    await expect(visitor.getByTestId('dossier-thanks')).toContainText(
      'Merci, j’ai bien reçu votre réponse',
    );
    await expect(visitor.getByTestId('dossier-recap-item')).toHaveCount(3);
    // La base dit ce qui a été touché, et rien d'autre.
    expect(readDemoLinkAnswers('Famille Keller')).toEqual([
      { position: 1, answer: 'visit', reasons: [] },
      { position: 2, answer: 'visit', reasons: [] },
      { position: 3, answer: 'no', reasons: ['price'] },
    ]);
    await visitor.goto(dossierLink);
    await expect(visitor.getByTestId('dossier-thanks')).toBeVisible();
    await expect(visitor.getByTestId('dossier-recap-item')).toHaveCount(3);
    await expect(visitor.getByTestId('dossier-send')).toHaveCount(0);
  } finally {
    await answering.close();
  }
  await page.goto('/acquereurs');
  await page.getByRole('link', { name: 'Famille Keller' }).click();
  await expect(page.getByTestId('buyer-answers')).toContainText('depuis le lien');
  await expect(page.getByTestId('buyer-answers')).toContainText('Pas pour lui : Le prix');
  // Mission 120 B — A et B « Je veux le visiter » sur le lien : aucun « Peut-être » ici.
  await expect(page.getByTestId('buyer-answers')).toContainText('Veut le visiter');
  // Mission 130 B — sa réponse sur le lien : l'étape 3 la dit ; l'étape du jour est « 4 · Visites »,
  // la prochaine étape « Organiser la visite », vers Visites ; le fil la date.
  await expect(page.getByTestId('buyer-step').nth(2)).toContainText('reçue par le lien');
  const visitsStep = page.locator('[data-testid="buyer-step"][data-step="visits"]');
  await expect(visitsStep).toContainText(/\d+ demandées?, à organiser/);
  await expect(visitsStep).toHaveAttribute('data-status', 'current');
  await expect(page.locator('[data-testid="buyer-step"][data-step="present"]')).toHaveAttribute(
    'data-status',
    'done',
  );
  await expect(page.getByTestId('buyer-next-step')).toContainText('Organiser la visite');
  await expect(page.getByTestId('buyer-next-button')).toHaveAttribute('href', '/visites');
  await expect(page.getByTestId('buyer-timeline')).toContainText('Sa réponse reçue par le lien');
  await expect(page.getByTestId('deck-prepare')).toHaveCount(0);
  await expect(page.getByTestId('buyer-answer-group').first()).toContainText(
    /Sélection du \d{2}\/\d{2}\/\d{4}/,
  );
  // « Créer un nouveau lien » remplace l'ancien, qui cesse de marcher ; la réponse reçue reste.
  await page.getByTestId('buyer-dossier').click();
  await page.getByTestId('dossier-link-renew').click();
  const renewedLink = (await page.getByTestId('dossier-link').innerText()).trim();
  expect(renewedLink).not.toBe(dossierLink);
  await expect(page.getByText(/^Lien créé le /)).toHaveCount(1);
  const checking = await phoneContext();
  try {
    const visitor = await checking.newPage();
    expect((await visitor.goto(dossierLink))?.status(), 'l’ancien lien ne s’ouvre plus').toBe(404);
    await visitor.goto(renewedLink);
    await expect(visitor.getByTestId('dossier-thanks')).toBeVisible();
    await expect(visitor.getByTestId('dossier-recap-item')).toHaveCount(3);
  } finally {
    await checking.close();
  }
  await page.goto('/visites');
  await expect(page.getByTestId('visits-pending')).toContainText('depuis le dossier');
  await page.goto('/acquereurs');
  await page.getByRole('link', { name: 'Famille Keller' }).click();

  // Mission 122 — le dossier qui fait agir : ses mots, la grille des trois biens ; le bien C ouvert
  // EN PREMIER depuis la grille (essai de Jean-Guy, 25/10), « Je veux le visiter », retour à la
  // grille qui montre la réponse ; A : « Pas pour moi » (la surface) ; « Terminer » avec B sans
  // réponse demande confirmation ; B : « Peut-être » ; ses créneaux ; la fiche montre ses réponses.
  // Mission 130 B — « Avant de présenter » ouvre la présentation, pour le conseiller seul.
  await page.getByTestId('reread-before-presenting').click();
  await expect(page.getByTestId('deck-prelude')).toBeVisible();
  await expect(page.getByTestId('deck-prepare-item')).toHaveCount(3);
  await page.getByTestId('deck-start').click();
  const scene = page.getByTestId('buyer-presentation');
  await expect(scene).toHaveAttribute('data-screen', 'words');
  await expectUnspoken(page, 'Présentation — ses mots');
  await expect(page.getByTestId('deck-words')).toContainText('Une maison');
  await page.getByTestId('presentation-next').click();
  await expect(scene).toHaveAttribute('data-screen', 'grid');
  await expect(page.getByTestId('deck-grid-row').first()).toBeVisible();
  const gridRows = await page.getByTestId('deck-grid-row').count();
  // Relecture des rendus par Jean-Guy (25/10) : une miniature et sa lettre en tête de chaque
  // colonne ; le budget du compromis en orange ; une seule phrase de tête, sur le bien qui coche tout.
  await expect(page.getByTestId('deck-open-item').locator('img')).toHaveCount(3);
  await expect(page.locator('[data-testid="deck-grid-cell"][data-tone="orange"]')).toHaveCount(1);
  // Le bien à vérifier porte son « ? » (sa piscine n'est pas indiquée).
  await expect(page.locator('[data-testid="deck-grid-cell"][data-mark="check"]')).not.toHaveCount(
    0,
  );
  await expect(page.getByTestId('deck-lead')).toContainText('Le bien A coche tous vos critères');
  // Essai de Jean-Guy (26/10) : en 1024 × 768 et 1280 × 800, la phrase de tête (au-dessus de la
  // grille), « Voir le bien A », la grille et sa légende tiennent dans l'écran, sans défiler.
  for (const viewport of [
    { width: 1024, height: 768 },
    { width: 1280, height: 800 },
  ]) {
    await page.setViewportSize(viewport);
    await page.evaluate(() => window.scrollTo(0, 0));
    const size = `${viewport.width} × ${viewport.height}`;
    const barTop = await page
      .getByTestId('deck-nav-bar')
      .evaluate((element) => element.parentElement!.getBoundingClientRect().top);
    const bottomOf = (testId: string) =>
      page
        .getByTestId(testId)
        .last()
        .evaluate((element) => element.getBoundingClientRect().bottom);
    const leadBottom = await bottomOf('deck-lead');
    const tableTop = await page
      .getByTestId('deck-grid-row')
      .first()
      .evaluate((element) => element.getBoundingClientRect().top);
    expect(leadBottom, `la phrase de tête au-dessus de la grille en ${size}`).toBeLessThan(
      tableTop,
    );
    for (const testId of ['deck-lead-open', 'deck-grid-row', 'grid-legend']) {
      expect(await bottomOf(testId), `${testId} dans l'écran en ${size}`).toBeLessThanOrEqual(
        barTop,
      );
    }
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  await expect(page.getByTestId('deck-grid-cell')).toHaveCount(gridRows * 3);
  await expectUnspoken(page, 'Présentation — la grille');
  const answer = (value: string) =>
    page.locator(`[data-testid="deck-answer"][data-answer="${value}"]`);
  const openItem = async (letter: string) => {
    await page.locator(`[data-testid="deck-open-item"][data-letter="${letter}"]`).click();
    await expect(scene).toHaveAttribute('data-screen', 'item');
    await expect(page.getByTestId('deck-kicker')).toContainText(`Bien ${letter}`);
  };
  const gridAnswer = (letter: string) =>
    page.locator(`[data-testid="deck-grid-answer"][data-letter="${letter}"]`);
  // C d'abord : « Je veux le visiter » ne fait pas avancer, la présentation n'est pas terminée.
  await openItem('C');
  await expectUnspoken(page, 'Présentation — le bien C');
  // La barre d'un écran de bien, en tablette dans les deux sens : une seule ligne, « Suivant » à
  // droite, et rien du contenu caché dessous (essai du 25/10).
  for (const viewport of [
    { width: 768, height: 1024 },
    { width: 1024, height: 768 },
  ]) {
    const size = `${viewport.width} × ${viewport.height}`;
    await page.setViewportSize(viewport);
    const bar = page.getByTestId('deck-nav-bar');
    const boxes = await bar.locator('button').evaluateAll((buttons) =>
      buttons.map((button) => {
        const rect = button.getBoundingClientRect();
        return { id: button.getAttribute('data-testid'), top: rect.top, right: rect.right };
      }),
    );
    expect(
      boxes.map((box) => box.id),
      `boutons de la barre en ${size}`,
    ).toEqual([
      'presentation-previous',
      'deck-back-to-grid',
      'deck-go-answer',
      'presentation-next',
    ]);
    const tops = boxes.map((box) => box.top);
    expect(
      Math.max(...tops) - Math.min(...tops),
      `la barre tient sur une ligne en ${size}`,
    ).toBeLessThan(2);
    expect(boxes.at(-1)!.right, `« Suivant » à droite en ${size}`).toBe(
      Math.max(...boxes.map((box) => box.right)),
    );
    await page.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight));
    const barTop = await bar.evaluate((element) => element.getBoundingClientRect().top);
    const lastAnswer = await page
      .locator('[data-testid="deck-answer"]')
      .last()
      .evaluate((element) => element.getBoundingClientRect().bottom);
    expect(lastAnswer, `rien du contenu sous la barre en ${size}`).toBeLessThanOrEqual(barTop);
    await expectNoHorizontalScroll(page, `Présentation — un bien (${size})`);
  }
  await page.setViewportSize({ width: 1280, height: 720 });
  await answer('visit').click();
  await expect(answer('visit')).toHaveAttribute('aria-pressed', 'true');
  await expect(scene).toHaveAttribute('data-screen', 'item');
  await expect(page.getByTestId('presentation-next')).toBeDisabled();
  await expect(page.getByTestId('presentation-finished')).toHaveCount(0);
  await page.getByTestId('deck-back-to-grid').click();
  await expect(scene).toHaveAttribute('data-screen', 'grid');
  await expect(gridAnswer('C')).toHaveAttribute('data-answer', 'visit');
  await expect(gridAnswer('C')).toHaveText('À visiter');
  // Puis A, et « Suivant » mène à B.
  await openItem('A');
  await expectUnspoken(page, 'Présentation — le bien A');
  await answer('no').click();
  await expect(answer('no')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('presentation-next').click();
  await expect(page.getByTestId('deck-kicker')).toContainText('Bien B');
  // « Terminer » avec B sans réponse : confirmation, et l'on revient.
  await page.getByTestId('deck-go-answer').click();
  await expect(scene).toHaveAttribute('data-screen', 'answer');
  await page.getByTestId('presentation-finish').click();
  await expect(page.getByTestId('deck-finish-confirm')).toContainText(
    '1 bien sans réponse : B. Terminer quand même ?',
  );
  // La confirmation prend le focus dès qu'elle s'ouvre.
  await expect(page.getByTestId('deck-finish-confirm')).toBeFocused();
  await page.getByTestId('deck-finish-confirm').getByRole('button', { name: 'Annuler' }).click();
  await expect(page.getByTestId('deck-finish-confirm')).toHaveCount(0);
  await page.getByTestId('deck-back-to-grid').click();
  await openItem('B');
  await expectUnspoken(page, 'Présentation — le bien B');
  await answer('maybe').click();
  await expect(answer('maybe')).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('deck-back-to-grid').click();
  await expect(gridAnswer('A')).toHaveAttribute('data-answer', 'no');
  await expect(gridAnswer('B')).toHaveAttribute('data-answer', 'maybe');
  await expectUnspoken(page, 'Présentation — la grille, ses réponses affichées');
  await page.getByTestId('deck-go-answer').click();
  await expect(scene).toHaveAttribute('data-screen', 'answer');
  await expect(page.getByTestId('deck-response')).toContainText('Vous voulez visiter le bien C.');
  await expect(page.getByTestId('deck-response')).toContainText('Vous hésitez pour le bien B.');
  const surface = page.getByTestId('deck-reason').filter({ hasText: 'La surface' });
  await surface.click();
  await expect(surface).toHaveAttribute('aria-pressed', 'true');
  await page.getByTestId('deck-availability').filter({ hasText: 'Samedi matin' }).click();
  await expectUnspoken(page, 'Présentation — sa réponse');
  await page.getByTestId('presentation-finish').click();
  await expect(page.getByTestId('present-selection')).toHaveText('Revoir la présentation');
  const answers = page.getByTestId('buyer-answers');
  // Trois réponses de la présentation, trois du lien.
  await expect(answers.getByTestId('buyer-answer')).toHaveCount(6);
  await expect(answers).toContainText('Veut le visiter');
  await expect(answers).toContainText('Pas pour lui : La surface');
  await expect(answers).toContainText('Peut-être');
  await page.goto('/visites');
  await expectUnspoken(page, 'Visites');
  await expect(page.getByTestId('visits-pending')).toContainText('Famille Keller');
  await expect(page.getByTestId('visit-availability').first()).toContainText('Samedi matin');
  await expect(page.getByTestId('visits-other-answers')).toContainText('Pas pour lui : La surface');
  await expect(page.getByTestId('visits-other-answers')).toContainText('Peut-être');

  // Mission 120 — « J'ai un acquéreur pour votre bien » : C, une annonce du marché sans
  // exclusivité, que les Keller veulent visiter, reçoit le courrier au propriétaire ; A, le mandat
  // de l'agence, se fait visiter (M86). Le courrier ne dit ni leur nom ni leur budget, ne promet
  // rien, porte les mentions de tout courrier propriétaire ; un mot interdit est refusé. Il se
  // retrouve dans Prospection, « Recherche acquéreur : Famille Keller », et se marque remis ; la
  // visite relit son état et attend le propriétaire.
  const pendingVisits = page.getByTestId('visits-pending');
  const visitC = pendingVisits.getByTestId('visit-line').filter({ hasText: 'Mouans-Sartoux' });
  await expect(visitC).toHaveCount(1);
  await expect(
    pendingVisits
      .getByTestId('visit-line')
      .filter({ hasText: 'Mougins' })
      .getByTestId('visit-seller-action'),
  ).toHaveText('Proposer une visite');
  await visitC.getByTestId('visit-prepare-owner-letter').click();
  await expect(page).toHaveURL(/\/acquereurs\/courrier\/[0-9a-f-]{36}$/);
  const letterDocument = page.getByTestId('buyer-letter-document');
  await expect(letterDocument).toContainText(
    'J’accompagne une recherche qui correspond aux caractéristiques de votre bien',
  );
  await expect(letterDocument).toContainText(
    'Je souhaiterais vérifier avec vous si une visite est envisageable.',
  );
  await expect(page.getByTestId('buyer-letter-addressee')).toContainText('Au propriétaire du');
  await expect(page.getByTestId('legal-mention')).toContainText(
    'Finalité : vous présenter une recherche qui correspond à votre bien.',
  );
  expect(await letterDocument.innerText()).not.toMatch(
    /Keller|1\s?500\s?000|1\s?650\s?000|certain|offre|prête/i,
  );
  await expectUnspoken(page, 'Courrier au propriétaire — recherche acquéreur');
  const letterText = page.getByTestId('buyer-letter-text');
  const proposedLetter = await letterText.inputValue();
  await letterText.fill(`${proposedLetter}\n\nLa famille Keller fera une offre.`);
  await page.getByTestId('buyer-letter-save').click();
  await expect(page.getByRole('status')).toContainText('ne nomme ni l’acquéreur');
  await letterText.fill(proposedLetter);
  await page.getByTestId('buyer-letter-save').click();
  await expect(page.getByRole('status')).toHaveText('Enregistré.');
  await page.goto('/prospection?origine=acquereur');
  const kellerCard = (column: string) =>
    page
      .getByTestId(`prospecting-column-${column}`)
      .getByTestId('prospecting-card')
      .filter({ has: page.getByTestId('buyer-origin').filter({ hasText: 'Famille Keller' }) });
  await expect(kellerCard('ready')).toHaveCount(1);
  await expect(kellerCard('ready').getByTestId('buyer-origin')).toContainText(
    /Recherche acquéreur\s*:\s*Famille Keller/,
  );
  await expectUnspoken(page, 'Prospection — recherche acquéreur');
  await kellerCard('ready').getByRole('button', { name: 'Marquer remis' }).click();
  await expect(kellerCard('handed')).toHaveCount(1);
  await page.goto('/visites');
  const visitCAfter = page
    .getByTestId('visits-pending')
    .getByTestId('visit-line')
    .filter({ hasText: 'Mouans-Sartoux' });
  await expect(visitCAfter.getByTestId('visit-letter-state')).toHaveText(/^Remis le \d{2}\/\d{2}$/);
  await expect(visitCAfter.getByTestId('visit-outcome')).toHaveText('En attente du propriétaire');

  // Mission 120 B — B, en exclusivité : le dossier de collaboration au confrère, sans nom, budget
  // ni condition ; dans Prospection, « Marquer contacté » puis
  // « Collaboration obtenue » ; la visite redevient « À planifier », sans autre geste.
  const visitB = () =>
    page
      .getByTestId('visits-pending')
      .getByTestId('visit-line')
      .filter({ hasText: /7 pièces · 220\sm²/ });
  await expect(visitB()).toHaveCount(1);
  await expect(visitB().getByTestId('visit-prepare-owner-letter')).toHaveCount(0);
  await visitB().getByTestId('visit-prepare-colleague-letter').click();
  await expect(page).toHaveURL(/\/acquereurs\/courrier\/[0-9a-f-]{36}$/);
  const colleagueDocument = page.getByTestId('buyer-letter-document');
  await expect(colleagueDocument).toHaveAttribute('data-version', 'colleague');
  await expect(page.getByTestId('buyer-letter-addressee')).toContainText(
    'Agence titulaire de l’exclusivité',
  );
  await expect(page.getByTestId('colleague-question')).toHaveText(
    'Votre mandat est-il ouvert à la collaboration pour une visite de mon acquéreur ?',
  );
  await expect(page.getByTestId('exclusivity-card')).toContainText(/Annonce .+ n° mou-02/);
  expect(await colleagueDocument.innerText()).not.toMatch(
    /Keller|1\s?500\s?000|1\s?650\s?000|1\s?720\s?000|certain|offre|prête|honoraires|CNIL/i,
  );
  await expectUnspoken(page, 'Dossier de collaboration au confrère');
  await page.getByTestId('buyer-letter-save').click();
  await expect(page.getByRole('status')).toHaveText('Enregistré.');
  await page.goto('/prospection?origine=acquereur');
  const colleagueCard = () =>
    page
      .getByTestId('prospecting-card')
      .filter({ has: page.getByTestId('buyer-origin').filter({ hasText: 'Famille Keller' }) })
      .filter({ hasText: /220\sm²/ });
  await expect(colleagueCard()).toHaveCount(1);
  await expect(colleagueCard()).toContainText('Exclusivité · appeler le confrère');
  await colleagueCard().getByRole('button', { name: 'Marquer contacté' }).click();
  await expect(colleagueCard()).toContainText(/Contacté le \d{2}\/\d{2}/);
  await colleagueCard().getByRole('button', { name: 'Collaboration obtenue' }).click();
  await expect(
    page
      .getByTestId('prospecting-column-meeting')
      .getByTestId('prospecting-card')
      .filter({ hasText: /220\sm²/ }),
  ).toHaveCount(1);
  await page.goto('/visites');
  await expect(visitB().getByTestId('visit-letter-state')).toHaveText('Collaboration obtenue');
  await expect(visitB().getByTestId('visit-outcome')).toHaveText('À planifier');

  await page
    .getByTestId('visits-pending')
    .getByRole('button', { name: 'Visite faite' })
    .first()
    .click();
  const doneForm = page.getByTestId('visit-done-form');
  await doneForm.getByLabel('Retour de visite').fill('Belle lumière, jardin un peu petit');
  await doneForm.getByLabel('Issue de la visite').selectOption('offer');
  await doneForm.getByRole('button', { name: 'Enregistrer la visite' }).click();
  await expect(page.getByTestId('visits-done')).toContainText('Offre envisagée');

  // Mission 122 (partie B) — la présentation terminée, le même lien devient « Ce que nous avons vu
  // ensemble » : ses réponses du rendez-vous, le conseiller, « Télécharger en PDF », sans
  // formulaire (décision de Jean-Guy, 25/10) ; le lien retiré ne s'ouvre plus.
  await page.goto('/acquereurs');
  await page.getByRole('link', { name: 'Famille Keller' }).click();
  await page.getByTestId('buyer-dossier').click();
  await expect(page.getByTestId('buyer-dossier').getByTestId('dossier-item')).toHaveCount(3);
  const rereading = await phoneContext();
  try {
    const visitor = await rereading.newPage();
    await visitor.goto(renewedLink);
    const seen = visitor.getByTestId('dossier-seen-together');
    await expect(seen).toContainText('Ce que nous avons vu ensemble');
    await expect(seen).toContainText('Je veux le visiter');
    await expect(seen).toContainText('Peut-être');
    // Ses seuls créneaux du rendez-vous, rangés à « Terminer » (décision de Jean-Guy, 25/10).
    await expect(seen.getByTestId('dossier-recap-availability')).toHaveText(
      'Vos créneaux : Samedi matin',
    );
    await expect(visitor.getByTestId('dossier-download')).toBeVisible();
    await expect(visitor.getByTestId('dossier-send')).toHaveCount(0);
    await expect(visitor.getByTestId('dossier-phone-deck')).toHaveCount(0);
    expect(await visitor.locator('body').innerText()).not.toMatch(UNSPOKEN);
    await expectNoHorizontalScroll(visitor, 'Le lien — ce que nous avons vu ensemble (390 × 844)');
    await page.getByRole('button', { name: 'Retirer le lien' }).first().click();
    await expect(page.getByText('Lien retiré : il ne s’ouvre plus.')).toBeVisible();
    expect((await visitor.goto(renewedLink))?.status()).toBe(404);
  } finally {
    await rereading.close();
  }
}
