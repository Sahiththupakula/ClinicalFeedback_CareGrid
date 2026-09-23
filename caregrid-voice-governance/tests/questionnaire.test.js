import test from "node:test";
import assert from "node:assert/strict";
import { createQuestionnaire, nextQuestion } from "../src/core/questionnaire.js";

test("keeps the universal core and appends specialty questions", () => {
  const questionnaire = createQuestionnaire({ specialty: "cardiology" });
  assert.equal(questionnaire.questions[0].id, "access");
  assert.ok(questionnaire.questions.some((question) => question.domain === "specialty"));
});

test("moves deterministically to the next unanswered question", () => {
  const session = { specialty: "primary_care", answers: [{ questionId: "access" }] };
  assert.equal(nextQuestion(session).id, "communication");
});
