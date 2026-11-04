import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const read = path => readFile(new URL(`../${path}`, import.meta.url), "utf8");
const [dashboard, successPage, checkout, itn, migration, membershipCheckout] = await Promise.all([
  read("dealer-admin.html"),
  read("featured-payment-success.html"),
  read("supabase/functions/create-featured-checkout/index.ts"),
  read("supabase/functions/featured-payfast-itn/index.ts"),
  read("supabase/migrations/20261103163000_secure_featured_vehicle_payments.sql"),
  read("supabase/functions/create-payfast-checkout/index.ts"),
]);

assert.match(dashboard, /create-featured-checkout/);
assert.match(dashboard, /body:\s*\{\s*vehicle_id:/);
assert.doesNotMatch(dashboard, /body:\s*\{[^}]*amount/s);
assert.doesNotMatch(dashboard, /\.from\(["']vehicles["']\)[\s\S]{0,160}\.update\([\s\S]{0,160}featured:\s*true/);

assert.match(checkout, /\.eq\("user_id",\s*user\.id\)/);
assert.match(checkout, /\^\[1-9\]\\d\{0,18\}\$/);
assert.match(checkout, /amount:\s*200/);
assert.match(checkout, /amount:\s*"200\.00"/);
assert.match(checkout, /featured-payfast-itn/);
assert.match(checkout, /value !== ""/);
assert.doesNotMatch(checkout, /body\.amount|body\.dealer_id|body\.user_id/);

assert.match(itn, /safeEqual\(signature\(entries,\s*passphrase\),\s*receivedSignature\)/);
assert.match(itn, /values\.payment_status\s*!==\s*"COMPLETE"/);
assert.match(itn, /amount\s*!==\s*200/);
assert.match(itn, /parameterString\(entries\)/);
assert.match(itn, /if \(key === "signature"\) break/);
assert.doesNotMatch(itn, /key === "signature"[\s\S]{0,120}value !== ""/);
assert.match(itn, /validationText\s*!==\s*"VALID"/);
assert.match(itn, /finalize_featured_vehicle_payment/);

assert.match(migration, /alter table public\.featured_vehicle_payments enable row level security/);
assert.match(migration, /vehicle_id bigint not null references public\.vehicles\(id\)/);
assert.match(migration, /using \(dealer_id = auth\.uid\(\)\)/);
assert.match(migration, /v_payment\.status = 'COMPLETE'/);
assert.match(migration, /v_payment\.pf_payment_id <> p_pf_payment_id/);
assert.match(migration, /v_start := greatest\([\s\S]*v_vehicle\.featured_until/);
assert.match(migration, /v_end := v_start \+ interval '7 days'/);
assert.match(migration, /set featured = true,[\s\S]*featured_until = v_end/);
assert.match(migration, /revoke all on function public\.finalize_featured_vehicle_payment[\s\S]*public, anon, authenticated/);
assert.match(migration, /grant execute on function public\.finalize_featured_vehicle_payment[\s\S]*service_role/);

assert.match(successPage, /\.from\("featured_vehicle_payments"\)/);
assert.doesNotMatch(successPage, /\.from\("vehicles"\)[\s\S]{0,200}\.update\(/);
assert.doesNotMatch(successPage, /featured_until\s*:/);
assert.match(successPage, /data\.status !== "COMPLETE"/);

assert.match(membershipCheckout, /amount:\s*2000/);
assert.match(membershipCheckout, /amount:\s*"2000\.00"/);
assert.doesNotMatch(membershipCheckout, /featured_vehicle_payments|create-featured|featured-payfast/);

console.log("Featured payment security audit passed.");
