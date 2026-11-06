import type { BuyerLanguage } from '@/features/buyer-messages/languages';
import { GERMAN } from '@/features/buyer-messages/templates/de';
import { ENGLISH } from '@/features/buyer-messages/templates/en';
import { FRENCH } from '@/features/buyer-messages/templates/fr';
import { ITALIAN } from '@/features/buyer-messages/templates/it';
import { RUSSIAN } from '@/features/buyer-messages/templates/ru';
import {
  DISMISS_REASONS,
  VISIT_TAGS,
  type DismissReason,
  type LanguageTemplates,
  type PluralForms,
  type PropertyKind,
  type VisitNextStep,
  type VisitOpinion,
  type VisitTag,
} from '@/features/buyer-messages/templates/types';

// Mission 139 — les messages prêts de l'après-visite et de la recherche, dans la langue du client :
// le code assemble, dans l'ordre, les phrases que chaque modèle a écrites ; il n'invente rien (un
// chiffre à zéro ne se dit pas, une semaine vide le dit). Copier / SMS / WhatsApp / E-mail ;
// l'outil n'envoie rien. Pur.

export const TEMPLATES: Record<BuyerLanguage, LanguageTemplates> = {
  fr: FRENCH,
  en: ENGLISH,
  it: ITALIAN,
  de: GERMAN,
  ru: RUSSIAN,
};

const signed = (lines: string[], advisorFirstName: string | null): string =>
  [...lines, advisorFirstName?.trim() ?? ''].filter(Boolean).join('\n');

// « la piscine et l'extérieur » : la conjonction de la langue.
function listOf(items: string[], locale: string): string {
  return new Intl.ListFormat(locale, { style: 'long', type: 'conjunction' }).format(items);
}

// Les étiquettes connues, dédoublonnées, dans l'ordre de la liste ; « autre » ne se dit pas.
function spokenTags(tags: readonly string[]): Exclude<VisitTag, 'other'>[] {
  const set = new Set(tags);
  return VISIT_TAGS.filter(
    (tag): tag is Exclude<VisitTag, 'other'> => tag !== 'other' && set.has(tag),
  );
}

// « maison », « appartement », sinon « bien » : le type tel que la fiche ou l'annonce le dit.
export function propertyKind(propertyType: string | null | undefined): PropertyKind {
  const type = (propertyType ?? '').toLowerCase();
  if (/house|maison|villa/.test(type)) return 'house';
  if (/apartment|appartement|flat/.test(type)) return 'apartment';
  return 'other';
}

// « 6 novembre », « 6 November », « 6. November », « 6 ноября », jour de Paris.
export function visitDay(iso: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Paris',
  }).format(new Date(iso));
}

export type VisitReport = {
  opinion: VisitOpinion;
  liked: readonly string[];
  disliked: readonly string[];
  nextStep: VisitNextStep;
};

// À l'acquéreur, dans sa langue : merci, ce qu'il a aimé, ce qui l'a gêné, la suite proposée. Jamais
// la note libre du conseiller, jamais un prix.
export function visitBuyerMessage(input: {
  language: BuyerLanguage;
  buyerName: string;
  property: { kind: PropertyKind; city: string | null };
  visitedAt: string;
  report: VisitReport;
  advisorFirstName: string | null;
}): string {
  const t = TEMPLATES[input.language];
  const liked = spokenTags(input.report.liked).map((tag) => t.visit.tags[tag].liked);
  const disliked = spokenTags(input.report.disliked).map((tag) => t.visit.tags[tag].disliked);
  return signed(
    [
      t.greeting(input.buyerName),
      t.visit.thanks(
        t.property(input.property.kind, input.property.city),
        visitDay(input.visitedAt, t.locale),
      ),
      liked.length > 0 ? t.visit.liked(listOf(liked, t.locale)) : '',
      disliked.length > 0 ? t.visit.disliked(listOf(disliked, t.locale)) : '',
      t.visit.next[input.report.nextStep],
    ],
    input.advisorFirstName,
  );
}

// La proposition entière, pour chaque avis : « pas convaincu » ne s'accorde pas avec « a été ».
const SELLER_OPINION: Record<VisitOpinion, string> = {
  love: 'l’acquéreur a eu un coup de cœur',
  interested: 'l’acquéreur a été intéressé',
  mixed: 'l’acquéreur est resté mitigé',
  not_for_me: 'le bien n’a pas convaincu l’acquéreur',
};

// Au vendeur (un bien de l'agence), en français : le retour honnête, sans le nom de l'acquéreur, ni
// son budget, ni la note libre, ni la suite qu'il envisage (décision du 06/11).
export function visitSellerMessage(input: {
  sellerName: string;
  visitedAt: string;
  report: Pick<VisitReport, 'opinion' | 'liked' | 'disliked'>;
  advisorFirstName: string | null;
}): string {
  const t = FRENCH;
  const liked = spokenTags(input.report.liked).map((tag) => t.visit.tags[tag].liked);
  const disliked = spokenTags(input.report.disliked).map((tag) => t.visit.tags[tag].disliked);
  return signed(
    [
      `Bonjour ${input.sellerName},`,
      `La visite de votre bien du ${visitDay(input.visitedAt, t.locale)} : ${SELLER_OPINION[input.report.opinion]}.`,
      liked.length > 0 ? `Ce qui lui a plu : ${listOf(liked, t.locale)}.` : '',
      disliked.length > 0 ? `Ce qui l’a gêné : ${listOf(disliked, t.locale)}.` : '',
      'Je reviens vers vous très vite.',
    ],
    input.advisorFirstName,
  );
}

// --- Le point de la semaine ------------------------------------------------------------------

export type WeekFigures = {
  studied: number;
  dismissed: Partial<Record<DismissReason, number>>;
  retained: number;
  visits: number;
};

export const dismissedTotal = (figures: WeekFigures): number =>
  Object.values(figures.dismissed).reduce((sum, count) => sum + (count ?? 0), 0);

// Rien d'étudié, d'écarté, de retenu ni de visité : la semaine est vide, et le message le dit.
export const isEmptyWeek = (figures: WeekFigures): boolean =>
  figures.studied === 0 &&
  dismissedTotal(figures) === 0 &&
  figures.retained === 0 &&
  figures.visits === 0;

function counted(forms: PluralForms, count: number, locale: string): string {
  const rule = new Intl.PluralRules(locale).select(count);
  const form =
    (rule === 'one'
      ? forms.one
      : rule === 'few'
        ? forms.few
        : rule === 'many'
          ? forms.many
          : null) ?? forms.other;
  return form.replace('{n}', String(count));
}

export function weeklyReportMessage(input: {
  language: BuyerLanguage;
  buyerName: string;
  figures: WeekFigures;
  advisorFirstName: string | null;
}): string {
  const t = TEMPLATES[input.language];
  const { figures } = input;
  let body = t.weekly.empty;
  if (!isEmptyWeek(figures)) {
    // Les raisons, de la plus fréquente à la moins fréquente, l'ordre de la liste à égalité.
    const reasons = DISMISS_REASONS.map(
      (reason) => [reason, figures.dismissed[reason] ?? 0] as const,
    )
      .filter(([, count]) => count > 0)
      .sort((a, b) => b[1] - a[1])
      .map(([reason, count]) => `${count} ${t.weekly.reasons[reason]}`);
    const dismissed = dismissedTotal(figures);
    const parts = [
      figures.studied > 0 ? counted(t.weekly.studied, figures.studied, t.locale) : '',
      dismissed > 0
        ? `${counted(t.weekly.dismissed, dismissed, t.locale)} (${reasons.join(', ')})`
        : '',
      figures.retained > 0 ? counted(t.weekly.retained, figures.retained, t.locale) : '',
      figures.visits > 0 ? counted(t.weekly.visits, figures.visits, t.locale) : '',
    ].filter(Boolean);
    body = `${t.weekly.lead}${parts.join(', ')}.`;
  }
  return signed(
    [t.greeting(input.buyerName), t.weekly.intro, body, t.weekly.closing],
    input.advisorFirstName,
  );
}

export function meetingProposalMessage(input: {
  language: BuyerLanguage;
  buyerName: string;
  advisorFirstName: string | null;
}): string {
  const t = TEMPLATES[input.language];
  return signed([t.greeting(input.buyerName), t.meeting.body], input.advisorFirstName);
}
