import http from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";
import { createStore } from "./store.js";
import { nextQuestion } from "./core/questionnaire.js";
import { assessSafety, shouldInterrupt } from "./core/safety.js";
import { matchProvider } from "./core/providerMatching.js";
import { buildEvidenceRecord } from "./core/provenance.js";
import { buildDashboard } from "./core/reporting.js";

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const PUBLIC = join(ROOT, "public");
const store = createStore();
const PORT = Number(process.env.PORT || 8787);

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml"
};

function send(response, status, payload, headers = {}) {
  response.writeHead(status, { "content-type": "application/json; charset=utf-8", ...headers });
  response.end(JSON.stringify(payload));
}

async function body(request) {
  const chunks = [];
  for await (const chunk of request) chunks.push(chunk);
  const raw = Buffer.concat(chunks).toString("utf8");
  return raw ? JSON.parse(raw) : {};
}

function dashboard() {
  return buildDashboard({
    patientEvidence: store.patientEvidence,
    publicEvidence: store.publicEvidence,
    providers: store.providers
  });
}

async function api(request, response, url) {
  if (request.method === "GET" && url.pathname === "/api/health") {
    return send(response, 200, { status: "ok", mode: "open-source-demo" });
  }
  if (request.method === "GET" && url.pathname === "/api/providers") {
    const query = url.searchParams.get("q") || "";
    const results = store.providers.filter((provider) =>
      `${provider.name} ${provider.city} ${provider.specialty}`.toLowerCase().includes(query.toLowerCase())
    );
    return send(response, 200, { results });
  }
  if (request.method === "GET" && url.pathname === "/api/dashboard") {
    return send(response, 200, dashboard());
  }
  if (request.method === "GET" && url.pathname === "/api/evidence") {
    return send(response, 200, {
      patientEvidence: store.patientEvidence,
      publicEvidence: store.publicEvidence
    });
  }
  if (request.method === "GET" && url.pathname === "/api/events") {
    response.writeHead(200, {
      "content-type": "text/event-stream",
      "cache-control": "no-cache",
      connection: "keep-alive"
    });
    response.write(`data: ${JSON.stringify({ type: "connected" })}\n\n`);
    store.events.add(response);
    request.on("close", () => store.events.delete(response));
    return;
  }
  if (request.method === "POST" && url.pathname === "/api/sessions") {
    const input = await body(request);
    if (!input.consent) return send(response, 400, { error: "Consent is required before feedback is stored." });
    const providerMatch = matchProvider(input.providerQuery || {}, store.providers);
    const session = store.createSession(input);
    session.providerMatch = providerMatch;
    return send(response, 201, { session, providerMatch, nextQuestion: nextQuestion(session) });
  }

  const messageMatch = url.pathname.match(/^\/api\/sessions\/([^/]+)\/messages$/);
  if (request.method === "POST" && messageMatch) {
    const session = store.sessions.get(messageMatch[1]);
    if (!session) return send(response, 404, { error: "Session not found" });
    if (session.status !== "active") return send(response, 409, { error: "Session is no longer active" });
    const input = await body(request);
    const question = nextQuestion(session);
    if (!question) return send(response, 409, { error: "Questionnaire is complete" });

    const safety = assessSafety(input.text);
    const answer = {
      questionId: question.id,
      domain: question.domain,
      text: String(input.text || "").trim(),
      confidence: Number(input.confidence || 0.92),
      capturedAt: new Date().toISOString()
    };
    session.answers.push(answer);
    const evidence = buildEvidenceRecord({ session, answer, safety, providerMatch: session.providerMatch });
    store.patientEvidence.push(evidence);

    if (shouldInterrupt(safety)) session.status = "escalated";
    const followingQuestion = session.status === "active" ? nextQuestion(session) : null;
    if (!followingQuestion && session.status === "active") session.status = "complete";

    const event = { type: "dashboard.updated", dashboard: dashboard() };
    store.publish(event);
    return send(response, 200, {
      safety,
      evidence,
      sessionStatus: session.status,
      nextQuestion: followingQuestion,
      dashboard: event.dashboard
    });
  }
  return send(response, 404, { error: "API route not found" });
}

async function staticFile(response, pathname) {
  const requested = pathname === "/" ? "/index.html" : pathname;
  const safePath = normalize(requested).replace(/^([.][.][/\\])+/, "");
  const target = join(PUBLIC, safePath);
  if (!target.startsWith(PUBLIC)) return send(response, 403, { error: "Forbidden" });
  try {
    const content = await readFile(target);
    response.writeHead(200, { "content-type": MIME[extname(target)] || "application/octet-stream" });
    response.end(content);
  } catch {
    send(response, 404, { error: "Not found" });
  }
}

export function createServer() {
  return http.createServer(async (request, response) => {
    try {
      const url = new URL(request.url, `http://${request.headers.host || "localhost"}`);
      if (url.pathname.startsWith("/api/")) return await api(request, response, url);
      return await staticFile(response, url.pathname);
    } catch (error) {
      // REVIEW-NOTE: Production logging must redact PHI before telemetry export.
      console.error(error);
      return send(response, 500, { error: "Internal server error" });
    }
  });
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  createServer().listen(PORT, () => {
    console.log(`CareGrid demo running at http://localhost:${PORT}`);
  });
}
