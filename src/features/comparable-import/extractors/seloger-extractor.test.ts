import { describe, expect, it } from 'vitest';

import { extractSeLoger } from '@/features/comparable-import/extractors/seloger-extractor';

const SERVED = `
<meta property="og:title" content="Appartement à vendre T3/F3 52 m² 303000 € L'Estagnol Antibes" />
<meta property="og:url" content="https://www.seloger.com/annonces/achat/appartement/antibes-06/l-estagnol/265939571.htm" />
`;

const ORIGINAL_URL =
  'https://www.seloger.com/annonces/achat/appartement/antibes-06/l-estagnol/265939571.htm';

const BLOCKED = '<html><head><title>DataDome</title></head><body>Access denied</body></html>';

describe('extractSeLoger', () => {
  it('parses price, surface and rooms from og:title', () => {
    const data = extractSeLoger(SERVED, ORIGINAL_URL);
    expect(data.price).toBe(303000);
    expect(data.surfaceArea).toBe(52);
    expect(data.roomsCount).toBe(3);
  });

  it('mission 68 — un titre « Studio » sans T1/F1 compte pour 1 pièce', () => {
    const data = extractSeLoger(
      '<meta property="og:title" content="Studio à vendre 22 m² 149000 € Riquier Nice" />',
      'https://www.seloger.com/annonces/achat/appartement/nice-06/riquier/1.htm',
    );
    expect(data.surfaceArea).toBe(22);
    expect(data.roomsCount).toBe(1);
  });

  it('recovers city and district from the original advisor URL (Antibes / L’Estagnol)', () => {
    const data = extractSeLoger(SERVED, ORIGINAL_URL);
    expect(data.city).toBe('Antibes');
    expect(data.district).toBe("L'Estagnol");
  });

  it('prefers the original URL over the canonical og:url for the location', () => {
    // og:url points to a different (redirected) city; the advisor's URL must win.
    const html = `
<meta property="og:title" content="Appartement T3 52 m² 303000 €" />
<meta property="og:url" content="https://www.seloger.com/annonces/achat/appartement/nice-06/cimiez/999.htm" />
`;
    const data = extractSeLoger(html, ORIGINAL_URL);
    expect(data.city).toBe('Antibes');
    expect(data.district).toBe("L'Estagnol");
  });

  it('falls back to og:url when no original URL is provided', () => {
    const data = extractSeLoger(SERVED);
    expect(data.city).toBe('Antibes');
    expect(data.district).toBe("L'Estagnol");
  });

  it('does not extract DPE/GES itself (handled by the strict generic extractor)', () => {
    const data = extractSeLoger(SERVED, ORIGINAL_URL);
    expect(data.energyRating).toBeUndefined();
    expect(data.gesRating).toBeUndefined();
  });

  it('returns nothing usable for a blocked (DataDome) page', () => {
    const data = extractSeLoger(BLOCKED, ORIGINAL_URL);
    expect(data.price).toBeUndefined();
    expect(data.surfaceArea).toBeUndefined();
  });
});

// Terrain (19/08) — extrait RÉEL d'une annonce SeLoger (Antibes, 52,82 m²) :
// les classes DPE/GES ne sont pas écrites en clair, elles vivent dans un bloc de
// données doublement échappé où le libellé SUIT la note.
describe('extractSeLoger — classes énergétiques (page réelle)', () => {
  const REAL_EXCERPT = String.raw`<script>window.x="{\"efficiencyClass\":{\"index\":1,\"rating\":\"B\"},\"values\":[{\"value\":\"84 kWh/m².an\",\"label\":\"Consommation (énergie primaire)\"}],\"name\":\"Diagnostic de performance énergétique (DPE)\"},{\"efficiencyClass\":{\"index\":0,\"rating\":\"A\"},\"values\":[{\"value\":\"3 kg CO₂/m².an\",\"label\":\"Émissions\"}],\"name\":\"Indice d'émission de gaz à effet de serre (GES)\"}"</script>`;

  it('lit le DPE et le GES en distinguant les deux par leur libellé', () => {
    const data = extractSeLoger(REAL_EXCERPT, 'https://www.seloger.com/annonces/achat/1.htm');
    expect(data.energyRating).toBe('B');
    expect(data.gesRating).toBe('A');
  });

  it('ne devine aucune note quand aucun libellé reconnu n’accompagne la valeur', () => {
    const data = extractSeLoger(
      String.raw`<script>window.x="{\"rating\":\"D\"},{\"autre\":1}"</script>`,
      'https://www.seloger.com/annonces/achat/1.htm',
    );
    expect(data.energyRating).toBeUndefined();
    expect(data.gesRating).toBeUndefined();
  });
});

// Terrain (19/08) : la ville et le code postal sortaient nuls alors que la page
// les porte — mais avec les guillemets échappés.
describe('extractSeLoger — commune et code postal', () => {
  it('lit la commune et le code postal dans les données échappées de la page', () => {
    const html = String.raw`<script>JSON.parse("{\"city\":\"Antibes\",\"zipCode\":\"06600\"}")</script>`;
    const result = extractSeLoger(html, 'https://www.seloger.com/annonces/achat/appartement/1.htm');
    expect(result.city).toBe('Antibes');
    expect(result.postalCode).toBe('06600');
  });

  it('ne tranche pas quand la page porte deux communes différentes', () => {
    // Une page contient aussi l'adresse de l'agence : confondre les deux
    // placerait le bien dans la mauvaise ville.
    const html = '{"city":"Antibes","other":1,"city":"Paris","zipCode":"06600"}';
    const result = extractSeLoger(html, 'https://www.seloger.com/annonces/achat/appartement/1.htm');
    expect(result.city).toBeUndefined();
    expect(result.postalCode).toBe('06600');
  });
});

// Lancement, mission 4 (24/11) — sur de vrais dossiers, 4 fiches SeLoger sur 41 n'avaient pas de
// ville, et 39 pas de quartier. Mesuré le 24/11 sur l'annonce 26FSCHYRU6XR, dans le Chrome de
// Jean-Guy : la nouvelle adresse (`…/alpes-maritimes-06/nice-06000/26FSCHYRU6XR`) ne se lit plus
// comme l'ancienne, et la page écrit la ville sous deux formes (« Nice » trois fois, « Nizza » une
// fois) : deux valeurs, donc aucune retenue. Le bloc d'adresse de l'annonce elle-même
// (`"location":{"address":{…}}`) donne la ville, le code postal et le quartier.
describe('extractSeLoger — le bloc d’adresse de l’annonce (lancement, mission 4)', () => {
  const NEW_URL =
    'https://www.seloger.com/annonce/achat/provence-alpes-cote-d-azur/alpes-maritimes-06/nice-06000/26FSCHYRU6XR';
  // Les guillemets échappés, comme dans la page (des chaînes JSON imbriquées).
  const PAGE = `
    <meta property="og:title" content="Appartement à vendre T3/F3 70.98 m² 420000 € Cimiez Nice (06000)" />
    <script>window["__UFRN_LIFECYCLE_SERVERREQUEST__"]=JSON.parse("{\\"sections\\":{\\"location\\":{\\"address\\":{\\"country\\":\\"FRA\\",\\"city\\":\\"Nice\\",\\"zipCode\\":\\"06000\\",\\"district\\":\\"Cimiez\\"},\\"isAddressVisible\\":false}},\\"mortgage\\":{\\"zip\\":\\"06000\\",\\"city\\":\\"Nice\\"},\\"insights\\":{\\"city\\":\\"Nice\\"},\\"alternate\\":{\\"city\\":\\"Nizza\\"}}")</script>
  `;

  it('la ville, le code postal et le quartier viennent du bloc d’adresse de l’annonce', () => {
    const data = extractSeLoger(PAGE, NEW_URL);
    expect(data.city).toBe('Nice');
    expect(data.postalCode).toBe('06000');
    expect(data.district).toBe('Cimiez');
  });

  it('sans l’adresse d’origine (une adresse courte), le bloc suffit', () => {
    const data = extractSeLoger(PAGE, 'https://www.seloger.com/annonce/26FSCHYRU6XR');
    expect(data.city).toBe('Nice');
    expect(data.district).toBe('Cimiez');
  });

  it('deux blocs d’adresse qui se contredisent ne décident rien', () => {
    const two = PAGE.replace(
      '\\"mortgage\\"',
      '\\"other\\":{\\"location\\":{\\"address\\":{\\"city\\":\\"Paris\\",\\"zipCode\\":\\"75008\\"}}},\\"mortgage\\"',
    );
    const data = extractSeLoger(two, NEW_URL);
    expect(data.city).toBeUndefined();
    expect(data.district).toBeUndefined();
  });

  it('l’ancienne adresse garde la ville et le quartier de son chemin', () => {
    const data = extractSeLoger(SERVED, ORIGINAL_URL);
    expect(data.city).toBe('Antibes');
    expect(data.district).toBe("L'Estagnol");
  });
});
