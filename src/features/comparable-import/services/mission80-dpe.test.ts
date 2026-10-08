import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { readBienIciDpe } from '@/features/comparable-import/extractors/bienici-extractor';
import { readFigaroDpe } from '@/features/comparable-import/extractors/figaro-extractor';
import { readGreenAcresDpe } from '@/features/comparable-import/extractors/green-acres-extractor';
import { readMaisonsEtAppartementsDpe } from '@/features/comparable-import/extractors/maisons-et-appartements-extractor';
import { extractListingData } from '@/features/comparable-import/services/extract-listing-data';
import { normalizeListingData } from '@/features/comparable-import/services/normalize-listing-data';
import { detectSource } from '@/features/comparable-import/utils/detect-source';

// MISSION 80 — la classe DPE d'un concurrent ne vient que de la lettre MARQUÉE sur la page de
// l'annonce. Mesure du 08/10 sur les fixtures : Bien'ici ne lisait rien (C et D sur la page),
// Figaro lisait « D » pour une annonce classée C, Green Acres lisait « A » — la première lettre
// de l'échelle — et Maisons & Appartements ne lisait rien (D sur la page).

const fixture = (name: string): string =>
  readFileSync(join(__dirname, '..', 'extractors', '__fixtures__', name), 'utf8');

// Ce que l'import enregistre réellement : extracteurs puis fusion.
function importedDpe(name: string, url: string): string | null {
  const html = fixture(name);
  const source = detectSource(new URL(url).hostname);
  return normalizeListingData(extractListingData(html, url), url, source).data.energyRating;
}

describe('Mission 80 — la classe DPE lue sur chaque portail (une fixture par portail)', () => {
  it("Bien'ici, Antibes : C (la ligne active de la section énergie)", () => {
    expect(
      importedDpe(
        'bienici-antibes.html',
        'https://www.bienici.com/annonce/vente/antibes/appartement/3pieces/century-21-202_3419_5108',
      ),
    ).toBe('C');
  });

  it("Bien'ici, Cagnes (maison) : D", () => {
    expect(
      importedDpe(
        'bienici-cagnes-maison.html',
        'https://www.bienici.com/annonce/vente/cagnes-sur-mer/maison/5pieces/ag060345-123',
      ),
    ).toBe('D');
  });

  it('Figaro, Nice : C — la classe marquée « active », plus « D »', () => {
    expect(
      importedDpe(
        'figaro-nice-appartement.html',
        'https://immobilier.lefigaro.fr/annonces/annonce-12345678.html',
      ),
    ).toBe('C');
  });

  it('Maisons & Appartements, Villeneuve-Loubet : D (classe de l’étiquette)', () => {
    expect(
      importedDpe(
        'maisons-et-appartements-villeneuve.html',
        'https://www.maisonsetappartements.fr/fr/06/annonce-vente-appartement-villeneuve-loubet-1.php',
      ),
    ).toBe('D');
  });

  it('Green Acres, Cagnes : aucune barre marquée → vide, jamais « A »', () => {
    expect(
      importedDpe(
        'green-acres-cagnes.html',
        'https://www.green-acres.fr/fr/properties/appartement/cagnes-sur-mer/A98cqw1yg8fmz1bt.htm',
      ),
    ).toBeNull();
  });
});

describe('Mission 80 — une lettre qui n’est pas clairement marquée reste vide', () => {
  const figaroList = (items: string): string => `<ul class="unstyled dpe-list">${items}</ul>`;

  it('Figaro : échelle sans classe active → rien', () => {
    expect(
      readFigaroDpe(figaroList('<li class="dpe-a">A</li><li class="dpe-b">B</li>')),
    ).toBeNull();
  });

  it('Figaro : deux classes actives, ou une marque qui contredit la lettre → rien', () => {
    expect(
      readFigaroDpe(figaroList('<li class="active dpe-a">A</li><li class="active dpe-b">B</li>')),
    ).toBeNull();
    expect(readFigaroDpe(figaroList('<li class="active dpe-c">D</li>'))).toBeNull();
  });

  it("Bien'ici : section énergie sans ligne active → rien", () => {
    expect(
      readBienIciDpe(
        '<section class="energySection"><div class="dpe-line"><div class="dpe-line__classification"><span><div>A</div></span></div></div></section>',
      ),
    ).toBeNull();
  });

  it('Maisons & Appartements : étiquette sans lettre dans sa classe → rien', () => {
    expect(readMaisonsEtAppartementsDpe('<div id="dpe_etiquette" class="dpe2-"></div>')).toBeNull();
    expect(readMaisonsEtAppartementsDpe('<div id="dpe_etiquette" class="dpe2-e"></div>')).toBe('E');
  });

  const greenAcresScale = (marked: string | null): string =>
    `<div class="graphic dpe">${['A', 'B', 'C', 'D', 'E', 'F', 'G']
      .map(
        (letter) =>
          `<div class="ScaleGraph__InnerWrapper ${letter === marked ? 'selected' : ''}"><div class="ScaleGraph__KeyText">${letter}</div></div>`,
      )
      .join('')}</div><div class="graphic ges"></div>`;

  it('Green Acres : une seule barre distinguée → sa lettre ; aucune → rien', () => {
    expect(readGreenAcresDpe(greenAcresScale('E'))).toBe('E');
    expect(readGreenAcresDpe(greenAcresScale(null))).toBeNull();
  });
});
