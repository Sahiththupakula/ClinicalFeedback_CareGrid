from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from typing import Any


@dataclass
class SafetyAssessment:
    level: int
    category: str
    action: str
    message: str | None = None


@dataclass
class Evidence:
    id: str
    provider_id: str | None
    domain: str
    claim: str
    severity: int
    confidence: float
    review_status: str
    source: dict[str, Any]
    integrity_hash: str


class GovernanceAdapter:
    """Bridge from cloud voice backend to the deterministic CareGrid governance layer.

    This keeps the Azure cloud implementation independent from the browser/demo app and
    makes the governance rules explicit, auditable, and replaceable.
    """

    def __init__(self) -> None:
        self.sessions: dict[str, dict[str, Any]] = {}
        self.evidence: list[dict[str, Any]] = []

    def create_session(self, payload: dict[str, Any]) -> dict[str, Any]:
        session_id = payload.get("sessionId") or f"session-{len(self.sessions) + 1}"
        session = {
            "id": session_id,
            "consent": bool(payload.get("consent", False)),
            "language": payload.get("language", "en-US"),
            "specialty": payload.get("specialty", "primary_care"),
            "providerQuery": payload.get("providerQuery", {}),
            "createdAt": datetime.now(timezone.utc).isoformat(),
            "answers": [],
            "status": "active",
            "questionnaireVersion": "2026.09.demo-1",
        }
        self.sessions[session_id] = session
        return session

    def get_session(self, session_id: str) -> dict[str, Any] | None:
        return self.sessions.get(session_id)

    def next_question(self, session: dict[str, Any]) -> dict[str, Any] | None:
        questions = [
            {"id": "access", "domain": "access", "prompt": "How easy was it to get the appointment or service when you needed it?"},
            {"id": "communication", "domain": "communication", "prompt": "Did the care team listen and explain things in a way you could understand?"},
            {"id": "safety", "domain": "safety", "prompt": "Did anything happen that made you concerned about your safety or the safety of your care?"},
            {"id": "narrative", "domain": "narrative", "prompt": "What went well, and what is the most important thing the provider should improve?"},
        ]
        answered = {answer["questionId"] for answer in session.get("answers", [])}
        for question in questions:
            if question["id"] not in answered:
                return question
        return None

    def match_provider(self, provider_query: dict[str, Any]) -> dict[str, Any]:
        provider = provider_query.get("provider") or {
            "id": "demo-provider",
            "name": provider_query.get("name", "Lakeside Primary Care")
        }
        return {
            "provider": provider,
            "confidence": 0.96,
            "method": "cloud_gateway_match",
            "requiresReview": False,
        }

    def assess_safety(self, text: str) -> SafetyAssessment:
        lowered = text.lower()
        if any(token in lowered for token in ["cannot breathe", "severe chest pain", "suicide", "immediate danger"]):
            return SafetyAssessment(4, "immediate_risk", "interrupt_and_emergency_route", "This may be an emergency. Call 911 or your local emergency service now.")
        if any(token in lowered for token in ["wrong medication", "medication error", "abuse", "neglect"]):
            return SafetyAssessment(3, "priority_safety_signal", "priority_human_review", "I will document this as a priority safety concern for human review.")
        if any(token in lowered for token in ["should i stop my medication", "diagnose", "what should i take"]):
            return SafetyAssessment(2, "medical_advice_boundary", "decline_and_redirect", "I cannot provide medical advice. Please contact a qualified clinician.")
        return SafetyAssessment(0, "routine", "continue", None)

    def process_turn(self, session: dict[str, Any], text: str, confidence: float = 0.92) -> dict[str, Any]:
        question = self.next_question(session)
        if question is None:
            session["status"] = "completed"
            return {
                "session_status": "completed",
                "safety": SafetyAssessment(0, "routine", "continue", None).__dict__,
                "evidence": None,
                "next_question": None,
                "response": {"type": "complete", "text": "Thank you. Your feedback has been recorded."},
            }

        safety = self.assess_safety(text)
        answer = {
            "questionId": question["id"],
            "domain": question["domain"],
            "text": text,
            "confidence": confidence,
            "capturedAt": datetime.now(timezone.utc).isoformat(),
        }
        session.setdefault("answers", []).append(answer)

        evidence = {
            "id": f"ev-{len(self.evidence) + 1}",
            "providerId": session.get("providerQuery", {}).get("provider", {}).get("id"),
            "domain": question["domain"],
            "claim": text,
            "severity": safety.level,
            "confidence": confidence,
            "reviewStatus": "required" if safety.level >= 3 else "not_required",
            "source": {
                "type": "patient_voice",
                "sessionId": session["id"],
                "capturedAt": datetime.now(timezone.utc).isoformat(),
                "language": session["language"],
                "modality": "cloud_voice"
            },
            "integrityHash": f"sha256:{len(text)}:{session['id']}" 
        }
        self.evidence.append(evidence)

        if safety.level >= 4:
            session["status"] = "escalated"
            next_question = None
        else:
            next_question = self.next_question(session)
            if not next_question:
                session["status"] = "completed"

        return {
            "session_status": session["status"],
            "safety": safety.__dict__,
            "evidence": evidence,
            "next_question": next_question,
            "response": {
                "type": "escalate" if safety.level >= 4 else ("complete" if next_question is None else "next_question"),
                "text": safety.message or (next_question["prompt"] if next_question else "Thank you. Your feedback has been recorded.")
            },
        }
