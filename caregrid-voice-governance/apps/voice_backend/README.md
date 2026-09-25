# CareGrid voice backend

This backend follows the Azure ART Accelerator patterns for a cloud voice pipeline:

- FastAPI server for REST + WebSocket endpoints
- Azure Speech adapter for STT/TTS or local fallback mode
- governance adapter for deterministic safety, questionnaire, and evidence rules
- ready for ACS, Azure OpenAI, Redis, and Container Apps deployment

## Quick start

```bash
cd caregrid-voice-governance
python3 -m venv .venv
source .venv/bin/activate
pip install -r apps/voice_backend/requirements.txt
uvicorn apps.voice_backend.main:app --host 0.0.0.0 --port 8010 --reload
```

## Endpoints

- `/health`
- `/api/v1/health`
- `/api/v1/sessions`
- `/api/v1/sessions/{session_id}/messages`
- `/api/v1/realtime/conversation` (WebSocket)
- `/api/v1/media/stream` (WebSocket)

## Azure deployment notes

Use Azure ART Accelerator patterns:

- SpeechCascade: Azure Speech STT + Azure OpenAI + Azure Speech TTS
- VoiceLive: Azure Voice Live SDK for lower-latency realtime mode
- ACS: Add phone and media streaming when the Browser/WebRTC path is ready
