// Constantes du thème applicatif, importables côté serveur COMME côté client.
// ATTENTION : ne pas déplacer dans un module 'use client' — un export non-React
// d'un module client devient une référence client côté serveur (la valeur
// réelle est perdue), ce qui casserait la lecture du cookie dans les layouts.

export type AppTheme = 'light' | 'dark';

export const APP_THEME_COOKIE = 'acm-theme';
