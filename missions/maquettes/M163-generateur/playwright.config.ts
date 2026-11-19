import base from '../../../playwright.config';

// Mission 163 (maquette) — les variantes de l'Étude de marché imprimée, sur l'essai, compte de démo.
const config = { ...base, testDir: __dirname, globalTeardown: undefined, timeout: 10 * 60_000 };
export default config;
