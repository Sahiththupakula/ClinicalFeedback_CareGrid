import test from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../src/store.js";
import { createConversationEngine } from "../src/conversation/conversationEngine.js";
import { applySessionTransition, canTransition } from "../src/conversation/sessionState.js";

test("state transitions permit the active to escalated path", () => {
  const session = { status: "active" };
  assert.equal(canTransition(session, "escalated"), true);
  applySessionTransition(session, "escalated", { reason: "immediate_risk" });
  assert.equal(session.status, "escalated");
  assert.equal(Array.isArray(session.stateHistory), true);
});

test("engine escalates immediate-risk responses and preserves evidence", () => {
  const store = createStore();
  const session = store.createSession({
    consent: true,
    language: "en-US",
    specialty: "primary_care",
    providerQuery: { npi: "1234567890" }
  });
  session.providerMatch = { provider: store.providers[0], confidence: 1 };

  const result = createConversationEngine().processTurn({
    session,
    text: "I have severe chest pain and cannot breathe",
    confidence: 0.95,
    providerMatch: session.providerMatch
  });

  assert.equal(session.status, "escalated");
  assert.equal(result.safety.level, 4);
  assert.equal(result.evidence.reviewStatus, "required");
  assert.equal(result.nextQuestion, null);
});
