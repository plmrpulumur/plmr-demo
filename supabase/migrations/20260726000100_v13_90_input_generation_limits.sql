-- PLMR V13.90
-- Adds centrally manageable input token and front-post clear-spacing limits.
-- Additive only. This migration is packaged for deployment; it is not applied
-- automatically to production by the ZIP build process.

insert into public.app_limit_defaults
  (limit_key, limit_value, factory_value, minimum_value, hard_cap)
values
  ('maxWidthDigits', 5, 5, 1, 5),
  ('maxOpeningDigits', 5, 5, 1, 5),
  ('maxHeightDigits', 4, 4, 1, 4),
  ('maxRayCountDigits', 1, 1, 1, 1),
  ('maxPostCountDigits', 2, 2, 1, 2),
  ('minPostClearSpacingMm', 150, 150, 50, 1000)
on conflict (limit_key) do nothing;
