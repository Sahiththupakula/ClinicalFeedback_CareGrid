import crypto from "node:crypto";
import providers from "../data/providers.json" with { type: "json" };
import publicRows from "../data/public-measures.json" with { type: "json" };
import { ingestPublicRows } from "./core/publicSources.js";

export function createStore() {
  const publicEvidence = ingestPublicRows(publicRows, "CMS Care Compare");
  return {
    providers,
    sessions: new Map(),
    patientEvidence: [],
    publicEvidence,
    events: new Set(),
    createSession(input) {
      const session = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        consent: Boolean(input.consent),
        language: input.language || "en-US",
        specialty: input.specialty || "primary_care",
        providerQuery: input.providerQuery || {},
        questionnaireVersion: "2026.09.demo-1",
        answers: [],
        status: "active"
      };
      this.sessions.set(session.id, session);
      return session;
    },
    publish(event) {
      for (const response of this.events) {
        response.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    }
  };
}
