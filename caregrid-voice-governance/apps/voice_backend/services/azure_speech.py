from __future__ import annotations

import base64
from typing import Any

try:
    import azure.cognitiveservices.speech as speechsdk  # type: ignore
except Exception:  # pragma: no cover
    speechsdk = None

from apps.voice_backend.config import settings


class AzureSpeechService:
    """SpeechCascade adapter. Text fallback keeps local tests and demos dependency-light."""

    def __init__(self) -> None:
        self.provider_name = "local-fallback"
        self._speech_config = None
        if settings.azure_speech_key and settings.azure_speech_region and speechsdk:
            self.provider_name = "azure-speech"
            self._speech_config = speechsdk.SpeechConfig(subscription=settings.azure_speech_key, region=settings.azure_speech_region)
            self._speech_config.speech_recognition_language = settings.azure_speech_language
            self._speech_config.speech_synthesis_voice_name = settings.azure_speech_voice

    def transcribe_text(self, text: str, language: str | None = None) -> dict[str, Any]:
        value = str(text or "").strip()
        return {"text": value, "confidence": 0.94 if value else 0.0, "provider": self.provider_name, "language": language or settings.azure_speech_language}

    def transcribe_wav(self, audio_base64: str, language: str | None = None) -> dict[str, Any]:
        if self._speech_config is None:
            return {"text": "", "confidence": 0.0, "provider": self.provider_name, "language": language or settings.azure_speech_language, "warning": "Azure Speech is not configured"}
        audio = base64.b64decode(audio_base64)
        stream = speechsdk.audio.PushAudioInputStream()
        stream.write(audio)
        stream.close()
        audio_config = speechsdk.audio.AudioConfig(stream=stream)
        recognizer = speechsdk.SpeechRecognizer(speech_config=self._speech_config, audio_config=audio_config)
        result = recognizer.recognize_once()
        if result.reason != speechsdk.ResultReason.RecognizedSpeech:
            return {"text": "", "confidence": 0.0, "provider": self.provider_name, "error": str(result.reason)}
        return {"text": result.text, "confidence": 0.9, "provider": self.provider_name, "language": language or settings.azure_speech_language}

    def synthesize(self, text: str) -> dict[str, Any]:
        value = str(text or "")
        if self._speech_config is None:
            return {"text": value, "provider": self.provider_name, "contentType": "audio/wav", "audioBase64": "", "warning": "Azure Speech is not configured"}
        synthesizer = speechsdk.SpeechSynthesizer(speech_config=self._speech_config, audio_config=None)
        result = synthesizer.speak_text_async(value).get()
        return {"text": value, "provider": self.provider_name, "contentType": "audio/wav", "audioBase64": base64.b64encode(result.audio_data).decode("ascii")}
