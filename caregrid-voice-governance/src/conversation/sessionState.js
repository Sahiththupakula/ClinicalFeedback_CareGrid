export const SESSION_STATES = Object.freeze([
  "created",
  "consent_pending",
  "active",
  "paused",
  "escalated",
  "completed",
  "abandoned",
  "failed"
]);

const ALLOWED_TRANSITIONS = Object.freeze({
  created: ["consent_pending", "active"],
  consent_pending: ["active", "abandoned", "failed"],
  active: ["paused", "escalated", "completed", "abandoned", "failed"],
  paused: ["active", "completed", "abandoned", "failed"],
  escalated: ["completed", "abandoned", "failed"],
  completed: [],
  abandoned: [],
  failed: []
});

export function normalizeSessionState(session) {
  const state = session?.status ?? "created";
  return SESSION_STATES.includes(state) ? state : "created";
}

export function canTransition(session, nextState) {
  const current = normalizeSessionState(session);
  const allowed = ALLOWED_TRANSITIONS[current] ?? [];
  return nextState === current || allowed.includes(nextState);
}

export function applySessionTransition(session, nextState, metadata = {}) {
  if (!session) throw new Error("Session is required to apply a transition");
  const current = normalizeSessionState(session);
  if (!canTransition(session, nextState)) {
    throw new Error(`Invalid state transition from ${current} to ${nextState}`);
  }

  session.status = nextState;
  const history = Array.isArray(session.stateHistory) ? session.stateHistory : [];
  history.push({
    state: nextState,
    at: new Date().toISOString(),
    ...metadata
  });
  session.stateHistory = history;
  return session;
}
