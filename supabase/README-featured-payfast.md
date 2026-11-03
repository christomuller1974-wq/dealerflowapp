# Secure featured vehicle PayFast deployment

The R200 featured-vehicle checkout is separate from the existing R2,000 membership renewal so the proven membership flow is not changed.

1. Apply `migrations/20261103163000_secure_featured_vehicle_payments.sql`.
2. Reuse the existing PayFast secrets: `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, `PAYFAST_PASSPHRASE`, `PAYFAST_MODE`, `PAYFAST_VALID_IPS`, and `SITE_URL`.
3. Keep `PAYFAST_MODE=sandbox` until the featured-vehicle test matrix passes.
4. Deploy `create-featured-checkout` with JWT verification enabled.
5. Deploy `featured-payfast-itn` with JWT verification disabled because PayFast cannot send a Supabase user token. The function independently verifies the PayFast signature, source IP, merchant, status, amount, stored order, transaction uniqueness, and PayFast server validation response.
6. The checkout-generated notify URL is `https://ddmvzypiccryjndcwlre.supabase.co/functions/v1/featured-payfast-itn`.
7. Verify valid, cancelled, failed, incorrect-amount, invalid-signature, invalid-source, wrong-vehicle-owner, and duplicate-ITN sandbox cases. A single verified valid payment must add exactly seven days; a duplicate must add zero additional time.

Neither the return URL nor browser JavaScript can activate a featured vehicle. Only the service-role ITN function can call the protected atomic finalizer.
