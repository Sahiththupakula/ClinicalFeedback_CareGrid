import { nextQuestion } from "../core/questionnaire.js";
import { buildEvidenceRecord } from "../core/provenance.js";
import { assessSafety, shouldInterrupt } from "../core/safety.js";
import { applySessionTransition } from "./sessionState.js";

export function createConversationEngine({ safetyPolicy = assessSafety } = {}) {
  return {
    processTurn({ session, text, confidence = 0.92, providerMatch } = {}) {
      if (!session) throw new Error("Session is required to process a turn");
      const normalizedText = String(text ?? "").trim();
      if (!normalizedText) throw new Error("Turn text is required");

      const activeQuestion = nextQuestion(session);
      if (!activeQuestion) {
        applySessionTransition(session, "completed", { reason: "questionnaire_complete" });
        return {
          safety: { level: 0, category: "routine", action: "continue", message: null },
          evidence: null,
          nextQuestion: null,
          sessionStatus: session.status,
          response: { type: "complete", text: "Thank you. Your feedback has been recorded." }
        };
      }

      const safety = safetyPolicy(normalizedText);
      const answer = {
        questionId: activeQuestion.id,
        domain: activeQuestion.domain,
        text: normalizedText,
        confidence: Number(confidence || 0.92),
        capturedAt: new Date().toISOString()
      };

      session.answers.push(answer);
      const evidence = buildEvidenceRecord({ session, answer, safety, providerMatch });

      if (shouldInterrupt(safety)) {
        applySessionTransition(session, "escalated", { reason: "immediate_risk" });
      }

      const followingQuestion = session.status === "active" ? nextQuestion(session) : null;
      if (!followingQuestion && session.status === "active") {
        applySessionTransition(session, "completed", { reason: "questionnaire_complete" });
      }

      return {
        safety,
        evidence,
        nextQuestion: followingQuestion,
        sessionStatus: session.status,
        response: {
          type: shouldInterrupt(safety) ? "escalate" : followingQuestion ? "next_question" : "complete",
          text: shouldInterrupt(safety)
            ? safety.message
            : followingQuestion
              ? followingQuestion.prompt
              : "Thank you. Your feedback has been recorded."
        }
      };
    }
  };
}
