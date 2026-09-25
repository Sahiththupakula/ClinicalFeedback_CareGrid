# CareGrid cloud voice backend

This backend follows the Azure ART Accelerator separation of channel, transport, inference, and governance:

```text
Browser/ACS → FastAPI WebSocket → Speech adapter → constrained response layer → CareGrid governance
```

## Current cloud slice

- Azure Speech STT/TTS adapter with local fallback
- Optional Azure OpenAI response phrasing with strict action/question validation
- Deterministic CareGrid safety and questionnaire rules remain authoritative
- REST and WebSocket session lifecycle
- Evidence SHA-256 integrity hashes
- Contract tests for consent, escalation, WebSocket lifecycle, and prompt-injection resistance

## Run

```bash
cd caregrid-voice-governance
python3 -m venv .venv
source .venv/bin/activate
pip install -r apps/voice_backend/requirements.txt
uvicorn apps.voice_backend.main:app --host 0.0.0.0 --port 8010 --reload
```

Run tests:

```bash
pytest apps/voice_backend/test_main.py
```

## Modes

- `CLOUD_MODE=speech_cascade`: Azure Speech STT → constrained response layer → Azure Speech TTS
- `CLOUD_MODE=voice_live`: reserved for the Azure Voice Live adapter; do not enable until that adapter is configured and tested

The model is not allowed to skip consent, choose an arbitrary question, change safety severity, alter provider attribution, or execute transcript-derived tools.
