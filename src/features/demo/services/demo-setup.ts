import { DEMO_BUYERS } from '@/features/demo/services/demo-buyers';
import {
  DEMO_SEED_STAGE,
  DEMO_SEEDS,
  DEMO_STAGE_LABELS,
  DEMO_STAGES,
  demoSeedPlan,
  type DemoSeedKey,
  type DemoStage,
} from '@/features/demo/services/demo-seed';

// Mission 147 (partie B, planche M147-5) — « Remettre ma démo à zéro » en étapes courtes, appelées
// l'une après l'autre par l'écran : supprimer, puis chaque dossier, puis les acquéreurs, puis
// vérifier. « Votre démo est prête » ne se dit que sur la vérification, qui relit la base. Pur.

export type DemoSetupStepKey = 'delete' | DemoSeedKey | 'buyers' | 'verify';

// « Préparer ma démo » ou « Remettre ma démo à zéro » : les mêmes étapes, et un échec dit laquelle
// n'a pas abouti (Jean-Guy, 10/11). Le mode ne change que les mots ; une valeur inconnue vaut
// « remise à zéro ».
export type DemoSetupMode = 'prepare' | 'reset';

export function readSetupMode(value: unknown): DemoSetupMode {
  return value === 'prepare' ? 'prepare' : 'reset';
}

export function setupName(mode: DemoSetupMode): string {
  return mode === 'prepare' ? 'La préparation de la démo' : 'La remise à zéro';
}

// « La remise à zéro n'a pas abouti : … Rien n'est prêt. »
export function setupFailure(mode: DemoSetupMode, reason: string): string {
  return `${setupName(mode)} n’a pas abouti : ${reason}. Rien n’est prêt.`;
}

// Mission 155 — un dossier porte le numéro du groupe que le serveur crée d'un coup.
export type DemoSetupStepView = { key: DemoSetupStepKey; label: string; group?: number };

// Mission 155 — douze dossiers : créés un par un, la remise à zéro passait de 21 à 43 s (mesuré sur
// l'essai, 13/11). Le serveur les crée par groupes, en même temps (les appels d'un écran au serveur,
// eux, partent l'un après l'autre) ; chaque groupe reste une étape, qui dit les dossiers qu'il crée.
export const DEMO_SEED_GROUPS: readonly (readonly DemoSeedKey[])[] = [
  ['to_prepare', 'ready', 'direct', 'signed'],
  ['signed_vence', 'signed_antibes', 'signed_juan', 'signed_villeneuve'],
  ['signed_la_colle', 'signed_saint_paul', 'signed_valbonne', 'follow_up'],
];

export function demoSeedGroup(keys: unknown): DemoSeedKey[] | null {
  if (!Array.isArray(keys)) return null;
  const group = DEMO_SEED_GROUPS.find(
    (each) => each.length === keys.length && each.every((key, index) => keys[index] === key),
  );
  return group ? [...group] : null;
}

const lowerFirst = (text: string): string => text.charAt(0).toLowerCase() + text.slice(1);

// Le libellé d'un dossier dans la barre : « M. Lefebvre, conclu, mandat signé ».
export function demoSeedLabel(key: DemoSeedKey): string {
  const plan = demoSeedPlan(key, new Date());
  return `${plan.sellerName}, ${lowerFirst(DEMO_STAGE_LABELS[DEMO_SEED_STAGE[key]])}`;
}

export function demoSetupSteps(): DemoSetupStepView[] {
  return [
    { key: 'delete', label: 'Vos anciens dossiers et acquéreurs supprimés' },
    ...DEMO_SEEDS.map((key) => ({
      key,
      label: demoSeedLabel(key),
      group: DEMO_SEED_GROUPS.findIndex((group) => group.includes(key)),
    })),
    { key: 'buyers', label: 'Acquéreurs' },
    { key: 'verify', label: 'Vérification' },
  ];
}

export function isDemoSeedKey(value: unknown): value is DemoSeedKey {
  return typeof value === 'string' && (DEMO_SEEDS as readonly string[]).includes(value);
}

// Le « maintenant » de la remise à zéro, choisi par la première étape et rendu par l'écran à
// chacune des suivantes : toutes les dates d'une démo partent du même instant. Le serveur le
// relit : une date illisible, future, ou plus vieille de 15 minutes (une remise à zéro restée
// en plan) est refusée.
export const DEMO_SETUP_MAX_AGE_MS = 15 * 60_000;

export function readSetupMoment(value: unknown, serverNow: Date): Date | null {
  if (typeof value !== 'string') return null;
  const moment = new Date(value);
  const time = moment.getTime();
  if (Number.isNaN(time)) return null;
  const age = serverNow.getTime() - time;
  if (age < -60_000 || age > DEMO_SETUP_MAX_AGE_MS) return null;
  return moment;
}

export const EXPECTED_DEMO_STAGES: Record<DemoStage, number> = Object.fromEntries(
  DEMO_STAGES.map((stage) => [
    stage,
    DEMO_SEEDS.filter((key) => DEMO_SEED_STAGE[key] === stage).length,
  ]),
) as Record<DemoStage, number>;

export type DemoSetupCheck = { ok: true } | { ok: false; message: string };

const plural = (count: number, word: string): string => `${count} ${word}${count > 1 ? 's' : ''}`;
const quoted = (labels: string[]): string => labels.map((label) => `« ${label} »`).join(', ');

// La preuve : les dossiers de démo du closer, relus en base, un par étape attendue (deux mandats
// signés), et ses neuf acquéreurs. Tout autre résultat dit ce qui manque ou ce qui est en trop,
// jamais « prête ». Plus de dossiers ou d'acquéreurs que prévu : une autre remise à zéro a
// peut-être tourné en même temps (pas de verrou, Jean-Guy, 09/11).
export function checkDemoSetup(
  stages: readonly string[],
  buyers: number,
  mode: DemoSetupMode = 'reset',
): DemoSetupCheck {
  const expectedDossiers = DEMO_SEEDS.length;
  const expectedBuyers = DEMO_BUYERS.length;
  const missing: string[] = [];
  const doubled: string[] = [];
  for (const stage of DEMO_STAGES) {
    const found = stages.filter((item) => item === stage).length;
    const wanted = EXPECTED_DEMO_STAGES[stage];
    if (found < wanted) missing.push(DEMO_STAGE_LABELS[stage]);
    if (found > wanted) doubled.push(DEMO_STAGE_LABELS[stage]);
  }
  const unknown = stages.filter((stage) => !(DEMO_STAGES as readonly string[]).includes(stage));
  if (missing.length === 0 && doubled.length === 0 && unknown.length === 0) {
    if (buyers === expectedBuyers) return { ok: true };
  }
  const parts: string[] = [];
  if (stages.length !== expectedDossiers || missing.length > 0 || doubled.length > 0) {
    const count =
      stages.length > expectedDossiers
        ? `${plural(stages.length, 'dossier')} au lieu de ${expectedDossiers}`
        : `${plural(stages.length, 'dossier')} sur ${expectedDossiers}`;
    const details = [
      missing.length > 0 ? `il manque ${quoted(missing)}` : null,
      doubled.length > 0 ? `en double : ${quoted(doubled)}` : null,
    ].filter(Boolean);
    parts.push(details.length > 0 ? `${count} (${details.join(' ; ')})` : count);
  }
  if (buyers !== expectedBuyers) {
    parts.push(
      buyers > expectedBuyers
        ? `${plural(buyers, 'acquéreur')} au lieu de ${expectedBuyers}`
        : `${plural(buyers, 'acquéreur')} sur ${expectedBuyers}`,
    );
  }
  const concurrent =
    stages.length > expectedDossiers || buyers > expectedBuyers
      ? ' Une autre remise à zéro a peut-être été lancée en même temps.'
      : '';
  return {
    ok: false,
    message: `${setupName(mode)} n’a pas abouti : ${parts.join(', ')}.${concurrent} Rien n’est prêt.`,
  };
}
