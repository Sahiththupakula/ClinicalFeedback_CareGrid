import crypto from "node:crypto";

function digest(value) {
  return crypto.createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

export function buildEvidenceRecord({ session, answer, safety, providerMatch }) {
  const capturedAt = new Date().toISOString();
  const source = {
    type: "patient_voice",
    sessionId: session.id,
    questionId: answer.questionId,
    transcriptSpan: answer.text,
    language: session.language,
    capturedAt
  };

  const record = {
    id: crypto.randomUUID(),
    providerId: providerMatch?.provider?.id ?? null,
    providerMatchConfidence: providerMatch?.confidence ?? 0,
    domain: answer.domain,
    claim: answer.text,
    severity: safety.level,
    confidence: answer.confidence ?? 0.92,
    reviewStatus: safety.level >= 3 ? "required" : "not_required",
    source,
    transformations: [
      { operation: "speech_to_text", implementation: "demo_browser_or_text", version: "0.1" },
      { operation: "question_alignment", implementation: "deterministic", version: session.questionnaireVersion }
    ]
  };

  return { ...record, integrityHash: digest(record) };
}

export function buildPublicEvidence({ row, sourceName }) {
  const record = {
    id: crypto.randomUUID(),
    providerId: row.providerId,
    domain: row.domain,
    measure: row.measure,
    value: row.value,
    effectiveDate: row.effectiveDate,
    source: {
      type: "public_source",
      name: sourceName,
      retrievedAt: new Date().toISOString(),
      sourceRecordId: row.sourceRecordId
    },
    transformations: [
      { operation: "source_validation", implementation: "demo_allowlist", version: "0.1" },
      { operation: "provider_matching", implementation: "npi_exact", version: "0.1" },
      { operation: "normalization", implementation: "caregrid_domain_map", version: "0.1" }
    ]
  };
  return { ...record, integrityHash: digest(record) };
}

export function verifyEvidence(record) {
  const { integrityHash, ...unsigned } = record;
  return digest(unsigned) === integrityHash;
}
