import base from '../../../playwright.config';

// Mission 162 — le générateur des PDF A4 (Étude de marché, synthèse), joué sur l'essai avec le compte
// de l'agence de démonstration ; pas le nettoyage de l'agence de test (ce n'est pas elle).
const config = { ...base, testDir: __dirname, globalTeardown: undefined, timeout: 25 * 60_000 };
export default config;
