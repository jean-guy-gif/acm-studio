-- Mission 41 — Le quatrième écran par concurrent.
-- The price screen is split: after guessing, the seller reacts to the revealed
-- price on a dedicated "Ce prix vous paraît-il cohérent ?" screen. That reaction
-- is persisted here, alongside an optional free comment (same 2000-char limit as
-- the other Live comments). Additive: two nullable columns; existing rows stay
-- valid with a NULL reaction.

alter table public.live_seller_responses
  add column seller_price_coherence text
    check (seller_price_coherence is null
      or seller_price_coherence in ('coherent', 'too_high', 'too_low', 'unsure')),
  add column seller_price_coherence_comment text
    check (seller_price_coherence_comment is null
      or char_length(seller_price_coherence_comment) <= 2000);
