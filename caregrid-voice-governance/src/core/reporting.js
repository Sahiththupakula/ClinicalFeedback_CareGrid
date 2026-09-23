const DOMAIN_LABELS = {
  access: "Access",
  communication: "Communication",
  respect: "Respect & Dignity",
  coordination: "Coordination",
  safety: "Safety",
  affordability: "Affordability",
  outcome: "Outcomes",
  equity: "Equity & Accessibility",
  narrative: "Open Narrative",
  specialty: "Specialty Experience"
};

function boundedScore(records) {
  if (!records.length) return null;
  const penalty = records.reduce((sum, record) => sum + Math.min(record.severity ?? 0, 4), 0);
  return Math.max(0, Math.round(100 - (penalty / records.length) * 14));
}

export function buildDashboard({ patientEvidence, publicEvidence, providers }) {
  const domains = Object.entries(DOMAIN_LABELS).map(([id, label]) => {
    const patientRecords = patientEvidence.filter((record) => record.domain === id);
    const publicRecords = publicEvidence.filter((record) => record.domain === id);
    return {
      id,
      label,
      patientSignalCount: patientRecords.length,
      publicMeasureCount: publicRecords.length,
      experienceIndex: boundedScore(patientRecords),
      status: patientRecords.some((record) => record.severity >= 3) ? "review" : patientRecords.length ? "observed" : "insufficient"
    };
  });

  return {
    generatedAt: new Date().toISOString(),
    methodology: "Patient signals and public measures are displayed separately; demo indexes are not provider rankings.",
    totals: {
      conversations: new Set(patientEvidence.map((record) => record.source.sessionId)).size,
      patientSignals: patientEvidence.length,
      publicMeasures: publicEvidence.length,
      providers: providers.length,
      reviewQueue: patientEvidence.filter((record) => record.reviewStatus === "required").length
    },
    domains,
    recentSignals: patientEvidence.slice(-6).reverse()
  };
}
