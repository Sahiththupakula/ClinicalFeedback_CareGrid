function normalize(value) {
  return String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function similarity(left, right) {
  const a = normalize(left);
  const b = normalize(right);
  if (!a || !b) return 0;
  if (a === b) return 1;
  if (a.includes(b) || b.includes(a)) return 0.82;
  const aTokens = new Set(String(left).toLowerCase().split(/\s+/));
  const bTokens = new Set(String(right).toLowerCase().split(/\s+/));
  const overlap = [...aTokens].filter((token) => bTokens.has(token)).length;
  return overlap / Math.max(aTokens.size, bTokens.size);
}

export function matchProvider(query, providers) {
  const requestedNpi = String(query.npi ?? "").trim();
  if (requestedNpi) {
    const exact = providers.find((provider) => provider.npi === requestedNpi);
    if (exact) return { provider: exact, confidence: 1, method: "npi_exact", requiresReview: false };
  }

  const candidates = providers
    .map((provider) => {
      const nameScore = similarity(query.name, provider.name);
      const cityScore = query.city ? similarity(query.city, provider.city) : 0.5;
      const specialtyScore = query.specialty ? similarity(query.specialty, provider.specialty) : 0.5;
      return { provider, confidence: Number((nameScore * 0.65 + cityScore * 0.2 + specialtyScore * 0.15).toFixed(2)) };
    })
    .sort((a, b) => b.confidence - a.confidence);

  const best = candidates[0] ?? { provider: null, confidence: 0 };
  return {
    ...best,
    method: "weighted_name_location_specialty",
    // REVIEW-NOTE: Never auto-publish feedback below this threshold.
    requiresReview: best.confidence < 0.86
  };
}
