import assert from "node:assert/strict";
import test from "node:test";
import { md5, parameterString as checkoutParameterString } from "../_shared/payfast.ts";
import { parameterString, signature } from "./file2.ts";

const entries: Array<[string, string]> = [
  ["merchant_id", "10000100"],
  ["name_last", ""],
  ["amount_gross", "2000.00"],
  ["signature", "incoming-signature"],
  ["field_after_signature", "must-not-be-included"],
];

test("ITN serialization retains empty fields and stops at signature", () => {
  assert.equal(
    parameterString(entries),
    "merchant_id=10000100&name_last=&amount_gross=2000.00",
  );
});

test("ITN serialization appends an encoded passphrase", () => {
  const expected =
    "merchant_id=10000100&name_last=&amount_gross=2000.00&passphrase=sandbox+passphrase";

  assert.equal(parameterString(entries, "sandbox passphrase"), expected);
  assert.equal(signature(entries, "sandbox passphrase"), md5(expected));
});

test("checkout serialization keeps its existing blank-field behaviour", () => {
  assert.equal(
    checkoutParameterString(entries),
    "merchant_id=10000100&amount_gross=2000.00&field_after_signature=must-not-be-included",
  );
});
