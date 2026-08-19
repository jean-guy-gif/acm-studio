import { describe, expect, it } from 'vitest';

import { parseRobots } from '@/features/comparable-import/utils/robots-policy';

const AGENT = 'acmstudiobot';

describe('parseRobots', () => {
  // Relevé le 19/08 sur les portails de Laurent.
  it('autorise les pages d’annonces quand le portail ne les interdit pas', () => {
    const policy = parseRobots(
      'User-agent: *\nDisallow: /classified-search?\nDisallow: /cgi/\n',
      AGENT,
    );
    expect(policy.isAllowed('/annonces/achat/appartement/antibes-06/1.htm')).toBe(true);
    expect(policy.isAllowed('/cgi/quelque-chose')).toBe(false);
  });

  it('obéit à une interdiction, même partielle', () => {
    const policy = parseRobots('User-agent: *\nDisallow: /annonces/\n', AGENT);
    expect(policy.isAllowed('/annonces/vente/1')).toBe(false);
    expect(policy.isAllowed('/agence/1')).toBe(true);
  });

  it('fait gagner la règle la plus précise', () => {
    const policy = parseRobots('User-agent: *\nDisallow: /a/\nAllow: /a/public/\n', AGENT);
    expect(policy.isAllowed('/a/prive')).toBe(false);
    expect(policy.isAllowed('/a/public/1')).toBe(true);
  });

  it('comprend * et $', () => {
    const policy = parseRobots('User-agent: *\nDisallow: /*?tri=\nDisallow: /*/contact$\n', AGENT);
    expect(policy.isAllowed('/recherche/x?tri=prix')).toBe(false);
    expect(policy.isAllowed('/agence/contact')).toBe(false);
    expect(policy.isAllowed('/agence/contact/horaires')).toBe(true);
  });

  it('préfère le groupe qui nous nomme au groupe générique', () => {
    const policy = parseRobots(
      'User-agent: *\nDisallow: /\n\nUser-agent: acmstudiobot\nDisallow: /prive/\n',
      AGENT,
    );
    expect(policy.isAllowed('/annonces/1')).toBe(true);
    expect(policy.isAllowed('/prive/1')).toBe(false);
  });

  it('autorise tout quand le fichier est vide, absent de règles, ou ne nous concerne pas', () => {
    expect(parseRobots('', AGENT).isAllowed('/x')).toBe(true);
    expect(parseRobots('User-agent: *\nDisallow:\n', AGENT).isAllowed('/x')).toBe(true);
    expect(parseRobots('User-agent: AhrefsBot\nDisallow: /\n', AGENT).isAllowed('/x')).toBe(true);
  });

  it('ignore les commentaires et les lignes inconnues', () => {
    const policy = parseRobots(
      '# commentaire\nUser-agent: *\nCrawl-delay: 1\nDisallow: /x/ # note\n',
      AGENT,
    );
    expect(policy.isAllowed('/x/1')).toBe(false);
    expect(policy.isAllowed('/y/1')).toBe(true);
  });
});
