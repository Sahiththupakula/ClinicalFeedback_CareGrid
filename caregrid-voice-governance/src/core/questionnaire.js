export const DOMAINS = [
  "access",
  "communication",
  "respect",
  "coordination",
  "safety",
  "affordability",
  "outcome",
  "equity",
  "narrative"
];

const UNIVERSAL_QUESTIONS = [
  { id: "access", domain: "access", prompt: "How easy was it to get the appointment or service when you needed it?" },
  { id: "communication", domain: "communication", prompt: "Did the care team listen and explain things in a way you could understand?" },
  { id: "respect", domain: "respect", prompt: "Were you treated with respect and involved in decisions about your care?" },
  { id: "coordination", domain: "coordination", prompt: "Were your referrals, prescriptions, records, and next steps coordinated clearly?" },
  { id: "safety", domain: "safety", prompt: "Did anything happen that made you concerned about your safety or the safety of your care?" },
  { id: "affordability", domain: "affordability", prompt: "Were costs, coverage, and possible charges explained clearly?" },
  { id: "outcome", domain: "outcome", prompt: "Do you understand what happens next, and do you feel your main need was addressed?" },
  { id: "equity", domain: "equity", prompt: "Did language, disability, transportation, technology, or another barrier affect your care?" },
  { id: "narrative", domain: "narrative", prompt: "What went well, and what is the most important thing the provider should improve?" }
];

const SPECIALTY_MODULES = {
  primary_care: ["Were follow-up and referral responsibilities clear?"],
  cardiology: ["Were testing, medicines, and follow-up instructions coordinated clearly?"],
  orthopedics: ["Did the team explain recovery, mobility, and rehabilitation expectations clearly?"],
  behavioral_health: ["Did you feel your privacy, trust, and continuity needs were respected?"],
  telehealth: ["Could you connect privately and complete the visit without technical barriers?"]
};

/**
 * REVIEW-NOTE: This engine deliberately owns the required sequence. A language
 * model may rephrase a prompt, but it must not silently skip consent, safety,
 * or required evidence fields. Changes to this file should receive clinical,
 * patient-experience, accessibility, and privacy review.
 */
export function createQuestionnaire({ specialty = "primary_care" } = {}) {
  const specialtyPrompts = SPECIALTY_MODULES[specialty] ?? [];
  return {
    version: "2026.09.demo-1",
    specialty,
    questions: [
      ...UNIVERSAL_QUESTIONS,
      ...specialtyPrompts.map((prompt, index) => ({
        id: `specialty_${index + 1}`,
        domain: "specialty",
        prompt
      }))
    ]
  };
}

export function nextQuestion(session) {
  const questionnaire = createQuestionnaire({ specialty: session.specialty });
  const answered = new Set(session.answers.map((answer) => answer.questionId));
  return questionnaire.questions.find((question) => !answered.has(question.id)) ?? null;
}
