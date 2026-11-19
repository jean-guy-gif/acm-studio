import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

// L'ouverture d'Academia à toutes les agences (décision de Jean-Guy, 19/11) part avec les deux textes
// de `/confidentialite` validés : le texte de l'API (`missions/ACADEMIA_API-confidentialite-pour-
// le-juriste.md`, §1 et §3) et la phrase du quartier montré au vendeur
// (`missions/M159-confidentialite-pour-le-juriste.md`). La page dit ce que le code fait (M73).
const page = readFileSync(join(__dirname, '..', '..', 'app', 'confidentialite', 'page.tsx'), 'utf8')
  .replace(/\{' '\}/g, ' ')
  .replace(/\s+/g, ' ');

describe('/confidentialite à l’ouverture d’Academia', () => {
  it('l’adresse du bien vendeur part vers Mon secteur : plus « ACM Studio n’envoie rien »', () => {
    expect(page).not.toContain('n’envoie rien à Academia');
    expect(page).not.toContain('copie l’adresse du bien dans le presse-papiers');
    expect(page).toContain(
      'Quand le conseiller le demande, ACM Studio envoie à Mon secteur, par le compte d’ACM Studio, l’adresse du bien, son type, son nombre de pièces et sa surface, et rien d’autre',
    );
    expect(page).toContain('Aucun autre bien que celui du vendeur n’est envoyé à Mon secteur.');
    expect(page).toContain('qui seul voit la valeur indicative et le diagnostic');
  });

  it('la ligne de Mon secteur dans « Où sont les données »', () => {
    expect(page).toContain(
      'Mon secteur, d’Academia (app.myacademia.ai) : l’adresse du bien vendeur, son type, son nombre de pièces et sa surface, par le compte d’ACM Studio',
    );
  });

  it('le quartier montré au vendeur, après l’alinéa du 9 novembre', () => {
    expect(page.indexOf('Jusqu’au 9 novembre 2026')).toBeLessThan(
      page.indexOf('Le quartier montré au vendeur.'),
    );
    expect(page).toContain('Le quartier montré au vendeur.');
    expect(page).toContain(
      'jamais le nom ni l’immatriculation d’une copropriété, ni une valeur du bien',
    );
  });

  it('aucune référence n’est envoyée : Academia refuse tout autre champ que l’adresse et le bien', () => {
    expect(page).not.toMatch(/référence sans signification/);
    // Ce que le code envoie est prouvé par le faux serveur d'Academia, qui refuse tout autre champ
    // que `adresse` et `bien` (Correctifs 161, contrat du 17/11).
  });
});
