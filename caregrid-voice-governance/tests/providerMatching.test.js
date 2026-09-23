import test from "node:test";
import assert from "node:assert/strict";
import { matchProvider } from "../src/core/providerMatching.js";

const providers = [
  { id: "one", npi: "1234567890", name: "Lakeside Primary Care", city: "Tampa", specialty: "Primary Care" },
  { id: "two", npi: "2345678901", name: "Gulf Cardiology", city: "Wesley Chapel", specialty: "Cardiology" }
];

test("uses exact NPI matching when available", () => {
  const result = matchProvider({ npi: "2345678901" }, providers);
  assert.equal(result.provider.id, "two");
  assert.equal(result.confidence, 1);
  assert.equal(result.requiresReview, false);
});

test("flags ambiguous text matching for review", () => {
  const result = matchProvider({ name: "Gulf", city: "Miami" }, providers);
  assert.equal(result.requiresReview, true);
});
