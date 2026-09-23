const state = { sessionId: null, nextQuestion: null, evidence: [] };
const $ = (selector) => document.querySelector(selector);

async function request(path, options = {}) {
  const response = await fetch(path, {
    headers: { "content-type": "application/json", ...(options.headers || {}) },
    ...options
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.error || "Request failed");
  return payload;
}

function addMessage(text, type = "agent") {
  const message = document.createElement("div");
  message.className = `message ${type}`;
  message.textContent = text;
  $("#messages").append(message);
  $("#messages").scrollTop = $("#messages").scrollHeight;
}

function renderEvidence() {
  $("#ledger-count").textContent = `${state.evidence.length} record${state.evidence.length === 1 ? "" : "s"}`;
  if (!state.evidence.length) return;
  $("#evidence-list").innerHTML = state.evidence.map((item) => `
    <article class="evidence-item">
      <header><span>${item.domain}</span><span>Severity ${item.severity}</span></header>
      <p>${escapeHtml(item.claim)}</p>
      <footer><span>Confidence ${Math.round(item.confidence * 100)}%</span><span>Hash ${item.integrityHash.slice(0, 10)}…</span></footer>
    </article>
  `).join("");
}

function renderDashboard(data) {
  const stats = [
    ["Conversations", data.totals.conversations],
    ["Patient signals", data.totals.patientSignals],
    ["Public measures", data.totals.publicMeasures],
    ["Matched providers", data.totals.providers],
    ["Council review queue", data.totals.reviewQueue]
  ];
  $("#stat-grid").innerHTML = stats.map(([label, value]) => `<div class="stat"><small>${label}</small><strong>${value}</strong></div>`).join("");
  $("#domain-grid").innerHTML = data.domains.slice(0, 9).map((domain) => `
    <div class="domain">
      <header><span>${domain.label}</span><i class="${domain.status}"></i></header>
      <p>${domain.patientSignalCount} patient signals · ${domain.publicMeasureCount} public measures</p>
    </div>
  `).join("");
}

function escapeHtml(value) {
  const element = document.createElement("div");
  element.textContent = String(value);
  return element.innerHTML;
}

async function initialize() {
  const [{ results: providers }, dashboard] = await Promise.all([
    request("/api/providers"),
    request("/api/dashboard")
  ]);
  $("#provider-select").innerHTML = providers.map((provider) =>
    `<option value="${provider.id}" data-name="${provider.name}" data-city="${provider.city}" data-specialty="${provider.specialty}">${provider.name} · ${provider.city}</option>`
  ).join("");
  renderDashboard(dashboard);

  const stream = new EventSource("/api/events");
  stream.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.type === "dashboard.updated") renderDashboard(message.dashboard);
  };
}

$("#start-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const selected = $("#provider-select").selectedOptions[0];
  try {
    const result = await request("/api/sessions", {
      method: "POST",
      body: JSON.stringify({
        consent: $("#consent").checked,
        language: $("#language-select").value,
        specialty: $("#specialty-select").value,
        providerQuery: {
          name: selected.dataset.name,
          city: selected.dataset.city,
          specialty: selected.dataset.specialty
        }
      })
    });
    state.sessionId = result.session.id;
    state.nextQuestion = result.nextQuestion;
    $("#start-form").classList.add("hidden");
    $("#conversation").classList.remove("hidden");
    addMessage("Thank you. I will ask about your experience, not provide medical advice. You may stop at any time.");
    addMessage(result.nextQuestion.prompt);
  } catch (error) {
    alert(error.message);
  }
});

$("#answer-form").addEventListener("submit", async (event) => {
  event.preventDefault();
  const text = $("#answer").value.trim();
  if (!text || !state.sessionId) return;
  addMessage(text, "user");
  $("#answer").value = "";
  const result = await request(`/api/sessions/${state.sessionId}/messages`, {
    method: "POST",
    body: JSON.stringify({ text, confidence: 0.94 })
  });
  state.evidence.unshift(result.evidence);
  renderEvidence();
  renderDashboard(result.dashboard);

  if (result.safety.message) addMessage(result.safety.message, result.safety.level >= 3 ? "alert" : "agent");
  if (result.nextQuestion) {
    state.nextQuestion = result.nextQuestion;
    addMessage(result.nextQuestion.prompt);
  } else {
    $("#answer-form").classList.add("hidden");
    $("#session-state").textContent = result.sessionStatus === "escalated" ? "Escalated for immediate action" : "Session complete";
    if (result.sessionStatus !== "escalated") addMessage("Thank you. Your feedback has been recorded as evidence for review.");
  }
});

$("#voice-button").addEventListener("click", () => {
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    alert("Browser speech recognition is not available here. Type a response instead.");
    return;
  }
  const recognition = new Recognition();
  recognition.lang = $("#language-select").value;
  recognition.interimResults = true;
  recognition.onstart = () => { $("#voice-button").textContent = "● Listening…"; };
  recognition.onresult = (event) => {
    $("#answer").value = Array.from(event.results).map((result) => result[0].transcript).join(" ");
  };
  recognition.onend = () => { $("#voice-button").textContent = "◉ Use microphone"; };
  recognition.start();
});

initialize().catch((error) => {
  console.error(error);
  document.body.insertAdjacentHTML("afterbegin", `<div class="message alert">The demo could not initialize: ${escapeHtml(error.message)}</div>`);
});
