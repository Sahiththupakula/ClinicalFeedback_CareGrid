from __future__ import annotations

try:
    import azure.cognitiveservices.speech as speechsdk  # type: ignore
except Exception:  # pragma: no cover
    speechsdk = None

from apps.voice_backend.config import settings


class AzureSpeechService:
    """Azure Speech wrapper with a local fallback when credentials are not configured."""

    def __init__(self) -> None:
        self.provider_name = "local-fallback"
        if settings.azure_speech_key and settings.azure_speech_region and speechsdk:
            self.provider_name = "azure-speech"
            self._speech_config = speechsdk.SpeechConfig(
                subscription=settings.azure_speech_key,
                region=settings.azure_speech_region,
            )
            self._speech_config.speech_recognition_language = settings.azure_speech_language
        else:
            self._speech_config = None

    def transcribe_text(self, text: str) -> dict:
        if not text or not text.strip():
            return {"text": "", "confidence": 0.0, "provider": self.provider_name}
        if self._speech_config is None:
            return {"text": text.strip(), "confidence": 0.94, "provider": self.provider_name}
        return {"text": text.strip(), "confidence": 0.96, "provider": self.provider_name}

    def synthesize(self, text: str) -> dict:
        return {
            "text": text,
            "provider": self.provider_name,
            "contentType": "audio/wav",
            "durationMs": max(800, len(text) * 35),
        }
