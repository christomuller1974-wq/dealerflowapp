# Secure PayFast deployment

1. Apply `migrations/20260916090000_secure_subscription_payments.sql`.
2. Configure Edge Function secrets: `PAYFAST_MERCHANT_ID`, `PAYFAST_MERCHANT_KEY`, `PAYFAST_PASSPHRASE`, `PAYFAST_MODE`, `PAYFAST_VALID_IPS`, and `SITE_URL`.
3. `PAYFAST_MODE` must remain `sandbox` until all negative and idempotency tests pass. `PAYFAST_VALID_IPS` is a comma-separated allowlist of the current official PayFast ITN source IP addresses for the selected environment.
4. Deploy `create-payfast-checkout` and `payfast-itn`. Supabase supplies `SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY`; never copy those protected server values into frontend files.
5. Register the notify URL as `https://ddmvzypiccryjndcwlre.supabase.co/functions/v1/payfast-itn`.
6. Verify valid, cancelled, failed, incorrect-amount, invalid-signature, invalid-source and duplicate-ITN sandbox cases before changing `PAYFAST_MODE` to `live`.
