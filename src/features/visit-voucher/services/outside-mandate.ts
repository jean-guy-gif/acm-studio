import { z } from 'zod';

// Mission 153 — le bon de visite et l'offre d'achat sur un bien hors mandat de l'agence (une annonce
// du marché, un concurrent) : le conseiller dit OBLIGATOIREMENT à quel titre il intervient, et le
// document le porte à la place du numéro de mandat de vente (décision de Jean-Guy, 12/11) :
//   • son mandat de recherche signé avec l'acquéreur (numéro et date) ;
//   • la collaboration avec le confrère qui détient le mandat de vente (son agence, le numéro de son
//     mandat).
// Sans l'un des deux, aucun document. Les phrases sont celles validées par la juriste
// (`missions/M153-hors-mandat-pour-le-juriste.md`). Pur.

// Éteinte, rien ne change : un bien hors mandat n'a ni bon ni offre, la ligne grise de Visites le
// dit. Allumée par Jean-Guy le 12/11, la juriste ayant validé les textes.
export const HORS_MANDAT_OUVERT = true;

export type OutsideTitle =
  | { kind: 'search'; number: string; signedOn: string }
  | { kind: 'colleague'; agency: string; number: string };

const trimmed = (min: number, max: number) => z.string().trim().min(min).max(max);

export const outsideTitleSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('search'),
    number: trimmed(1, 40),
    // AAAA-MM-JJ, jamais dans le futur (relu au serveur).
    signedOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),
  z.object({
    kind: z.literal('colleague'),
    agency: trimmed(2, 160),
    number: trimmed(1, 40),
  }),
]);

export function readOutsideTitle(raw: unknown): OutsideTitle | null {
  const parsed = outsideTitleSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

// « 04/11/2026 » depuis « 2026-11-04 ».
export function titleDay(day: string): string {
  const [year, month, date] = day.split('-');
  return `${date}/${month}/${year}`;
}

// Deux titres disent-ils la même chose ? Un bon ne réunit que des biens au même titre : la phrase
// de l'engagement est une seule (le mandat de recherche, ou l'agence du confrère).
export function sameTitle(a: OutsideTitle, b: OutsideTitle): boolean {
  const norm = (value: string) => value.trim().toLowerCase().replace(/\s+/g, ' ');
  if (a.kind === 'search' && b.kind === 'search') {
    return norm(a.number) === norm(b.number) && a.signedOn === b.signedOn;
  }
  if (a.kind === 'colleague' && b.kind === 'colleague') {
    return norm(a.agency) === norm(b.agency);
  }
  return false;
}

// --- Le bon de visite -------------------------------------------------------------------------

export const VOUCHER_OUTSIDE_RECEIVED =
  "Reconnais m'être présenté(e) ce jour à l'Agence, avoir demandé et reçu de celle-ci les renseignements, adresses et conditions de vente des biens ci-dessous désignés, que l'Agence me présente en vertu du titre indiqué pour chacun d'eux.";

export function voucherOutsideCommitment(title: OutsideTitle): string {
  return title.kind === 'search'
    ? "Je reconnais avoir confié à l'Agence un mandat de recherche, et que ces biens m'ont été présentés dans le cadre de ce mandat."
    : `Je suis informé(e) que le vendeur a confié un mandat de vente à l'agence ${title.agency.trim()}, avec laquelle l'Agence collabore, et qu'il s'est engagé à ne pas traiter la vente de ces biens directement avec un acquéreur présenté par l'Agence.`;
}

export function voucherOutsideLine(
  title: OutsideTitle,
  bien: { price: string; address: string },
): string {
  const head =
    title.kind === 'search'
      ? `Mandat de recherche n° ${title.number.trim()} du ${titleDay(title.signedOn)}`
      : `En collaboration avec ${title.agency.trim()}, mandat de vente n° ${title.number.trim()}`;
  return `${head} · Prix affiché : ${bien.price} € · Adresse du bien : ${bien.address}`;
}

// --- L'offre d'achat --------------------------------------------------------------------------

export function offerOutsideNegotiated(title: OutsideTitle): string {
  return title.kind === 'search'
    ? `L'OFFRANT reconnait que ces conditions ont été négociées par l'Agence, titulaire d'un mandat de recherche signé par l'OFFRANT le ${titleDay(title.signedOn)}, régulièrement inscrit sur son Registre des mandats sous le numéro ${title.number.trim()} .`
    : `L'OFFRANT reconnait que ces conditions ont été négociées par l'Agence, en collaboration avec l'agence ${title.agency.trim()}, titulaire d'un mandat de vente inscrit sous le numéro ${title.number.trim()} .`;
}

// --- À l'écran (jamais dans un document) ------------------------------------------------------

export const OUTSIDE_TITLE_MISSING =
  'Choisissez à quel titre vous intervenez : sans lui, le document ne se crée pas.';
export const OUTSIDE_TITLE_MIXED = 'Un bien hors mandat se signe sur un bon à part.';
export const OUTSIDE_TITLE_DIFFERENT =
  'Un bon ne réunit que des biens au même titre : signez les autres sur un bon à part.';
// Jean-Guy, 12/11 : un rappel sous les honoraires, quand le titre est le mandat de recherche et que
// l'annonce dit le bien vendu par une agence.
export const OUTSIDE_FEES_REMINDER =
  'Ce bien est commercialisé par une agence : vérifiez avec elle la répartition des honoraires avant de faire signer.';

// « avec la famille Keller », « avec M. et Mme Lambert » : le nom de la fiche, tel quel, sauf
// « Famille » en tête, qui se lit en minuscule après « avec la ».
export function withBuyer(name: string): string {
  const clean = name.trim();
  return /^famille\s/i.test(clean) ? `la ${clean[0]!.toLowerCase()}${clean.slice(1)}` : clean;
}

export function outsideNote(buyerName: string): string {
  return `Hors mandat de l’agence : le bon de visite et l’offre d’achat demandent votre mandat de recherche avec ${withBuyer(buyerName)}, ou la collaboration du confrère.`;
}
