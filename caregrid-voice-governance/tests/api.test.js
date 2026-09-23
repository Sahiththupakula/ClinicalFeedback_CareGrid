import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "../src/server.js";

async function withServer(run) {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address();
  try {
    await run(`http://127.0.0.1:${port}`);
  } finally {
    await new Promise((resolve) => server.close(resolve));
  }
}

test("rejects a session without consent", async () => {
  await withServer(async (base) => {
    const response = await fetch(`${base}/api/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ consent: false })
    });
    assert.equal(response.status, 400);
  });
});

test("creates evidence and updates the dashboard", async () => {
  await withServer(async (base) => {
    const created = await fetch(`${base}/api/sessions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        consent: true,
        providerQuery: { npi: "1234567890" },
        specialty: "primary_care"
      })
    }).then((response) => response.json());
    const answered = await fetch(`${base}/api/sessions/${created.session.id}/messages`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: "The appointment took three weeks" })
    }).then((response) => response.json());
    assert.equal(answered.evidence.domain, "access");
    assert.equal(answered.dashboard.totals.patientSignals >= 1, true);
  });
});
