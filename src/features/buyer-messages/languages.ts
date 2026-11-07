// Mission 139 — la langue de l'acquéreur. Mission 140 — la même liste vaut pour tout client (le
// vendeur aussi) : elle vit dans `src/lib/client-language.ts` ; ce module garde ses noms.
export {
  CLIENT_LANGUAGES as BUYER_LANGUAGES,
  CLIENT_LANGUAGE_LABELS as BUYER_LANGUAGE_LABELS,
  LANGUE_ALLEMAND_PROPOSEE,
  LANGUE_ANGLAIS_PROPOSEE,
  LANGUE_ITALIEN_PROPOSEE,
  LANGUE_RUSSE_PROPOSEE,
  clientLanguage as buyerLanguage,
  isClientLanguage as isBuyerLanguage,
  offeredLanguages,
  type ClientLanguage as BuyerLanguage,
} from '@/lib/client-language';
