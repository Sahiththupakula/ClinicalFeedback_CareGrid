const IMMEDIATE_PATTERNS = [
  /can(?:not|'t) breathe/i,
  /severe chest pain/i,
  /heavy bleeding/i,
  /passed out|unconscious/i,
  /kill myself|suicide|end my life/i,
  /kill (?:him|her|them|someone)/i,
  /in immediate danger/i
];

const PRIORITY_PATTERNS = [
  /wrong medication/i,
  /medication error/i,
  /fell during/i,
  /was injured/i,
  /ignored my concern/i,
  /discriminat/i,
  /abuse|neglect/i,
  /without my consent/i
];

const MEDICAL_ADVICE_PATTERNS = [
  /what should i take/i,
  /should i stop (?:my )?medication/i,
  /do i have [a-z]/i,
  /is this symptom/i,
  /diagnose/i
];

export function assessSafety(text) {
  const input = String(text ?? "");
  if (IMMEDIATE_PATTERNS.some((pattern) => pattern.test(input))) {
    return {
      level: 4,
      category: "immediate_risk",
      action: "interrupt_and_emergency_route",
      message: "This may be an emergency. CareGrid cannot provide emergency care. Call 911 or your local emergency service now."
    };
  }
  if (PRIORITY_PATTERNS.some((pattern) => pattern.test(input))) {
    return {
      level: 3,
      category: "priority_safety_signal",
      action: "priority_human_review",
      message: "I will document this as a priority safety concern for human review."
    };
  }
  if (MEDICAL_ADVICE_PATTERNS.some((pattern) => pattern.test(input))) {
    return {
      level: 2,
      category: "medical_advice_boundary",
      action: "decline_and_redirect",
      message: "I cannot provide medical advice. Please contact a qualified clinician; call 911 if you may be in immediate danger."
    };
  }
  return { level: 0, category: "routine", action: "continue", message: null };
}

/**
 * REVIEW-NOTE: Pattern rules are intentionally visible and testable. In a
 * production deployment, add a validated classifier in parallel—never replace
 * deterministic emergency rules with a single generative model.
 */
export function shouldInterrupt(assessment) {
  return assessment.level === 4;
}
