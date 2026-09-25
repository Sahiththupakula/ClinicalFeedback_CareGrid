from __future__ import annotations

from typing import Any

import httpx

from apps.voice_backend.config import settings
from apps.voice_backend.services.response_policy import deterministic_response, validate_response


class ConstrainedResponseService:
    """Optional Azure OpenAI response layer with deterministic fallback.

    The model can phrase a response, but cannot choose a question, safety result,
    provider match, or evidence classification outside the validated contract.
    """

    def __init__(self) -> None:
        self.provider_name = "deterministic-fallback"

    async def generate(self, *, safety: dict[str, Any], next_question: dict[str, Any] | None) -> dict[str, Any]:
        fallback = deterministic_response(safety, next_question)
        if not settings.azure_openai_endpoint or not settings.azure_openai_key:
            return fallback

        prompt = {
            "safety": safety,
            "currentQuestion": next_question,
            "allowedActions": ["acknowledge", "ask_next_question", "ask_clarification", "decline_medical_advice", "announce_emergency_route", "complete_session", "escalate_for_review"],
            "instruction": "Return JSON only. Preserve the governed questionId. Never provide diagnosis, treatment, or emergency advice beyond the supplied safety message.",
        }
        url = f"{settings.azure_openai_endpoint.rstrip('/')}/openai/deployments/{settings.azure_openai_deployment}/chat/completions?api-version={settings.azure_openai_api_version}"
        body = {
            "messages": [
                {"role": "system", "content": "You are a constrained CareGrid conversation layer. Output only the requested JSON object."},
                {"role": "user", "content": str(prompt)},
            ],
            "temperature": 0,
            "response_format": {"type": "json_object"},
        }
        try:
            async with httpx.AsyncClient(timeout=8) as client:
                response = await client.post(url, headers={"api-key": settings.azure_openai_key}, json=body)
                response.raise_for_status()
                content = response.json()["choices"][0]["message"]["content"]
                import json
                validated = validate_response(json.loads(content), next_question)
                self.provider_name = "azure-openai"
                return validated
        except (httpx.HTTPError, KeyError, TypeError, ValueError, json.JSONDecodeError):
            return fallback
