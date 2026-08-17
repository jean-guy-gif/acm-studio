-- Seller's estimate must be captured before Live reveals the observed duration.
-- Additive migration: existing responses remain valid and keep a NULL estimate.
alter table public.live_seller_responses
  add column seller_estimated_days_on_market integer
  check (
    seller_estimated_days_on_market is null
    or seller_estimated_days_on_market between 0 and 36500
  );
