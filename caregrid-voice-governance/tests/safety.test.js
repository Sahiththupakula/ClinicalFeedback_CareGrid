import test from "node:test";
import assert from "node:assert/strict";
import { assessSafety, shouldInterrupt } from "../src/core/safety.js";

test("interrupts an immediate emergency phrase", () => {
  const result = assessSafety("I have severe chest pain and cannot breathe");
  assert.equal(result.level, 4);
  assert.equal(result.action, "interrupt_and_emergency_route");
  assert.equal(shouldInterrupt(result), true);
});

test("routes a safety allegation to priority human review", () => {
  const result = assessSafety("They gave me the wrong medication");
  assert.equal(result.level, 3);
  assert.equal(result.action, "priority_human_review");
});

test("enforces the medical advice boundary", () => {
  const result = assessSafety("Should I stop my medication?");
  assert.equal(result.category, "medical_advice_boundary");
});

test("allows routine feedback to continue", () => {
  assert.equal(assessSafety("The wait was too long").level, 0);
});
