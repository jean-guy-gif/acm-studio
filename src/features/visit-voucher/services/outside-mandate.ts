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

// « 2026-02-31 » n'existe pas : relue par le calendrier, la date doit revenir identique.
function realDay(day: string): boolean {
  const date = new Date(`${day}T12:00:00Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === day;
}

export const outsideTitleSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('search'),
    number: trimmed(1, 40),
    // AAAA-MM-JJ, une date qui existe (jamais le 31/02), jamais dans le futur (relu au serveur).
    signedOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/)
      .refine(realDay),
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
// La phrase de l'engagement nomme UN confrère : en collaboration, un bien par bon (relecteur).
export const OUTSIDE_COLLEAGUE_ONE =
  'En collaboration, un bien par bon : signez les autres sur un bon à part.';
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
