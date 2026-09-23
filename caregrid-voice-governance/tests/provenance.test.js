import test from "node:test";
import assert from "node:assert/strict";
import { buildEvidenceRecord, verifyEvidence } from "../src/core/provenance.js";

test("creates verifiable evidence linked to a transcript span", () => {
  const record = buildEvidenceRecord({
    session: { id: "session-1", language: "en-US", questionnaireVersion: "v1" },
    answer: { questionId: "access", domain: "access", text: "I waited three weeks", confidence: 0.9 },
    safety: { level: 0 },
    providerMatch: { provider: { id: "provider-1" }, confidence: 0.98 }
  });
  assert.equal(record.source.transcriptSpan, "I waited three weeks");
  assert.equal(verifyEvidence(record), true);
  assert.equal(verifyEvidence({ ...record, claim: "changed" }), false);
});
