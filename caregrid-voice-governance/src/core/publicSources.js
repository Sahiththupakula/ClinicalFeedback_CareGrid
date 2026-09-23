import { buildPublicEvidence } from "./provenance.js";

const ALLOWED_SOURCES = new Set(["CMS Care Compare", "NPPES / NPI", "State Licensure"]);

export function ingestPublicRows(rows, sourceName) {
  if (!ALLOWED_SOURCES.has(sourceName)) {
    throw new Error(`Source is not approved: ${sourceName}`);
  }
  return rows.map((row) => {
    if (!row.providerId || !row.domain || !row.effectiveDate || !row.sourceRecordId) {
      throw new Error("Public row is missing required provenance fields");
    }
    return buildPublicEvidence({ row, sourceName });
  });
}
