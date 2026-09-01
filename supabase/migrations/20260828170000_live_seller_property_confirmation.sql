-- Mission 39 — La slide « Votre bien » (acte 1).
-- The seller recognises the property before any competitor is shown, and answers
-- "does this presentation match your bien?" (yes/no) with an optional free comment.
-- Additive: two nullable columns on the existing summary; existing rows stay valid.

alter table public.live_seller_summary
  add column seller_property_confirmed text
    check (seller_property_confirmed is null
      or seller_property_confirmed in ('yes', 'no')),
  add column seller_property_comment text
    check (seller_property_comment is null
      or char_length(seller_property_comment) <= 2000);
