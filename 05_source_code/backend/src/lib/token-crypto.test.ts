import assert from "node:assert/strict";
import test from "node:test";
import { decryptToken, encryptToken } from "./token-crypto.js";

test("encryptToken and decryptToken round-trip the same value", () => {
  const original = "ig-access-token-for-test";
  const encrypted = encryptToken(original);

  assert.notEqual(encrypted, original);
  assert.equal(decryptToken(encrypted), original);
});