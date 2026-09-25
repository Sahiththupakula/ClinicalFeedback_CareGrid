from __future__ import annotations

from typing import Any

ALLOWED_ACTIONS = frozenset({
    "acknowledge",
    "ask_next_question",
    "ask_clarification",
    "decline_medical_advice",
    "announce_emergency_route",
    "complete_session",
    "escalate_for_review",
})


def validate_response(response: dict[str, Any], current_question: dict[str, Any] | None) -> dict[str, Any]:
    """Validate a model response before it can affect the conversation."""
    action = response.get("action")
    text = str(response.get("spokenText", "")).strip()
    if action not in ALLOWED_ACTIONS:
        raise ValueError(f"Unsupported response action: {action}")
    if not text:
        raise ValueError("Response spokenText is required")
    if action == "ask_next_question":
        question_id = response.get("questionId")
        if not current_question or question_id != current_question.get("id"):
            raise ValueError("Model may only ask the currently governed question")
    if action in {"announce_emergency_route", "escalate_for_review"} and current_question is None:
        raise ValueError("Escalation responses require an active session context")
    return {"action": action, "questionId": response.get("questionId"), "spokenText": text}


def deterministic_response(safety: dict[str, Any], next_question: dict[str, Any] | None) -> dict[str, Any]:
    if safety.get("level") == 4:
        return {"action": "announce_emergency_route", "questionId": None, "spokenText": safety["message"]}
    if safety.get("category") == "medical_advice_boundary":
        return {"action": "decline_medical_advice", "questionId": next_question["id"] if next_question else None, "spokenText": safety["message"]}
    if next_question:
        return {"action": "ask_next_question", "questionId": next_question["id"], "spokenText": next_question["prompt"]}
    return {"action": "complete_session", "questionId": None, "spokenText": "Thank you. Your feedback has been recorded."}
