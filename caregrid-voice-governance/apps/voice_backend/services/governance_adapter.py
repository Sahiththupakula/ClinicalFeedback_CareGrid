from __future__ import annotations

import hashlib
import json
import re
import secrets
from datetime import datetime, timezone
from typing import Any


UNIVERSAL_QUESTIONS = [
    {"id": "access", "domain": "access", "prompt": "How easy was it to get the appointment or service when you needed it?"},
    {"id": "communication", "domain": "communication", "prompt": "Did the care team listen and explain things in a way you could understand?"},
    {"id": "respect", "domain": "respect", "prompt": "Were you treated with respect and involved in decisions about your care?"},
    {"id": "coordination", "domain": "coordination", "prompt": "Were your referrals, prescriptions, records, and next steps coordinated clearly?"},
    {"id": "safety", "domain": "safety", "prompt": "Did anything happen that made you concerned about your safety or the safety of your care?"},
    {"id": "affordability", "domain": "affordability", "prompt": "Were costs, coverage, and possible charges explained clearly?"},
    {"id": "outcome", "domain": "outcome", "prompt": "Do you understand what happens next, and do you feel your main need was addressed?"},
    {"id": "equity", "domain": "equity", "prompt": "Did language, disability, transportation, technology, or another barrier affect your care?"},
    {"id": "narrative", "domain": "narrative", "prompt": "What went well, and what is the most important thing the provider should improve?"},
]

SPECIALTY_MODULES = {
    "primary_care": "Were follow-up and referral responsibilities clear?",
    "cardiology": "Were testing, medicines, and follow-up instructions coordinated clearly?",
    "orthopedics": "Did the team explain recovery, mobility, and rehabilitation expectations clearly?",
    "behavioral_health": "Did you feel your privacy, trust, and continuity needs were respected?",
    "telehealth": "Could you connect privately and complete the visit without technical barriers?",
}

IMMEDIATE_PATTERNS = [
    re.compile(pattern, re.I) for pattern in [
        r"can(?:not|'t) breathe", r"severe chest pain", r"heavy bleeding",
        r"passed out|unconscious", r"kill myself|suicide|end my life",
        r"kill (?:him|her|them|someone)", r"in immediate danger",
    ]
]
PRIORITY_PATTERNS = [
    re.compile(pattern, re.I) for pattern in [
        r"wrong medication", r"medication error", r"fell during", r"was injured",
        r"ignored my concern", r"discriminat", r"abuse|neglect", r"without my consent",
    ]
]
MEDICAL_ADVICE_PATTERNS = [
    re.compile(pattern, re.I) for pattern in [
        r"what should i take", r"should i stop (?:my )?medication", r"do i have [a-z]",
        r"is this symptom", r"diagnose",
    ]
]


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


def digest(value: dict[str, Any]) -> str:
    canonical = json.dumps(value, sort_keys=True, separators=(",", ":"))
    return hashlib.sha256(canonical.encode("utf-8")).hexdigest()


class GovernanceAdapter:
    """Cloud-facing implementation of CareGrid's deterministic governance boundary."""

    def __init__(self) -> None:
        self.sessions: dict[str, dict[str, Any]] = {}
        self.evidence: list[dict[str, Any]] = []

    def create_session(self, payload: dict[str, Any]) -> dict[str, Any]:
        if not payload.get("consent"):
            raise ValueError("Consent is required before feedback is stored.")
        session_id = payload.get("sessionId") or secrets.token_urlsafe(18)
        session = {
            "id": session_id,
            "consent": True,
            "language": payload.get("language", "en-US"),
            "specialty": payload.get("specialty", "primary_care"),
            "providerQuery": payload.get("providerQuery", {}),
            "providerMatch": self.match_provider(payload.get("providerQuery", {})),
            "createdAt": utc_now(),
            "answers": [],
            "status": "active",
            "questionnaireVersion": "2026.09.demo-1",
            "stateHistory": [{"state": "active", "at": utc_now(), "reason": "consent_granted"}],
        }
        self.sessions[session_id] = session
        return session

    def get_session(self, session_id: str) -> dict[str, Any] | None:
        return self.sessions.get(session_id)

    def next_question(self, session: dict[str, Any]) -> dict[str, Any] | None:
        questions = list(UNIVERSAL_QUESTIONS)
        specialty_prompt = SPECIALTY_MODULES.get(session.get("specialty", "primary_care"))
        if specialty_prompt:
            questions.append({"id": "specialty_1", "domain": "specialty", "prompt": specialty_prompt})
        answered = {answer["questionId"] for answer in session.get("answers", [])}
        return next((question for question in questions if question["id"] not in answered), None)

    def match_provider(self, provider_query: dict[str, Any]) -> dict[str, Any]:
        provider = provider_query.get("provider") or {
            "id": provider_query.get("providerId", "demo-provider"),
            "name": provider_query.get("name", "Lakeside Primary Care"),
        }
        return {"provider": provider, "confidence": 0.96, "method": "cloud_gateway_match", "requiresReview": False}

    def assess_safety(self, text: str) -> dict[str, Any]:
        value = str(text or "")
        if any(pattern.search(value) for pattern in IMMEDIATE_PATTERNS):
            return {"level": 4, "category": "immediate_risk", "action": "interrupt_and_emergency_route", "message": "This may be an emergency. CareGrid cannot provide emergency care. Call 911 or your local emergency service now."}
        if any(pattern.search(value) for pattern in PRIORITY_PATTERNS):
            return {"level": 3, "category": "priority_safety_signal", "action": "priority_human_review", "message": "I will document this as a priority safety concern for human review."}
        if any(pattern.search(value) for pattern in MEDICAL_ADVICE_PATTERNS):
            return {"level": 2, "category": "medical_advice_boundary", "action": "decline_and_redirect", "message": "I cannot provide medical advice. Please contact a qualified clinician; call 911 if you may be in immediate danger."}
        return {"level": 0, "category": "routine", "action": "continue", "message": None}

    def _transition(self, session: dict[str, Any], status: str, reason: str) -> None:
        session["status"] = status
        session.setdefault("stateHistory", []).append({"state": status, "at": utc_now(), "reason": reason})

    def process_turn(self, session: dict[str, Any], text: str, confidence: float = 0.92) -> dict[str, Any]:
        value = str(text or "").strip()
        if not value:
            raise ValueError("Turn text is required")
        if session["status"] != "active":
            raise ValueError(f"Session is no longer active: {session['status']}")
        question = self.next_question(session)
        if question is None:
            self._transition(session, "completed", "questionnaire_complete")
            return {"session_status": "completed", "safety": self.assess_safety(""), "evidence": None, "next_question": None, "response": {"type": "complete", "text": "Thank you. Your feedback has been recorded."}}

        safety = self.assess_safety(value)
        answer = {"questionId": question["id"], "domain": question["domain"], "text": value, "confidence": float(confidence or 0.92), "capturedAt": utc_now()}
        session["answers"].append(answer)
        provider = session.get("providerMatch", {}).get("provider", {})
        evidence = {
            "id": secrets.token_urlsafe(12), "providerId": provider.get("id"), "domain": question["domain"], "claim": value,
            "severity": safety["level"], "confidence": answer["confidence"], "reviewStatus": "required" if safety["level"] >= 3 else "not_required",
            "source": {"type": "patient_voice", "sessionId": session["id"], "capturedAt": answer["capturedAt"], "language": session["language"], "modality": "cloud_voice"},
            "transformations": [{"operation": "speech_to_text", "implementation": "azure_speech_or_fallback", "version": "0.1"}, {"operation": "question_alignment", "implementation": "deterministic", "version": session["questionnaireVersion"]}],
        }
        evidence["integrityHash"] = digest(evidence)
        self.evidence.append(evidence)

        if safety["level"] == 4:
            self._transition(session, "escalated", "immediate_risk")
            next_question = None
        else:
            next_question = self.next_question(session)
            if next_question is None:
                self._transition(session, "completed", "questionnaire_complete")
        response_type = "escalate" if safety["level"] == 4 else "complete" if next_question is None else "next_question"
        return {"session_status": session["status"], "safety": safety, "evidence": evidence, "next_question": next_question, "response": {"type": response_type, "text": safety["message"] or (next_question["prompt"] if next_question else "Thank you. Your feedback has been recorded.")}}
