from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from apps.voice_backend.config import settings
from apps.voice_backend.services.governance_adapter import GovernanceAdapter
from apps.voice_backend.services.azure_speech import AzureSpeechService

app = FastAPI(title=settings.app_name, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

speech = AzureSpeechService()
governance = GovernanceAdapter()


@app.get("/health")
async def health() -> dict:
    return {
        "status": "ok",
        "mode": "cloud-ready",
        "voice": "azure-speech-or-voice-live",
        "speech_service": speech.provider_name,
        "governance": "deterministic"
    }


@app.get("/api/v1/health")
async def api_health() -> dict:
    return await health()


@app.post("/api/v1/sessions")
async def create_session(payload: dict) -> dict:
    if not payload.get("consent"):
        return {"error": "Consent is required before feedback is stored."}
    session = governance.create_session(payload)
    return {
        "session": session,
        "next_question": governance.next_question(session),
        "provider_match": governance.match_provider(payload.get("providerQuery", {}))
    }


@app.post("/api/v1/sessions/{session_id}/messages")
async def submit_message(session_id: str, payload: dict) -> dict:
    session = governance.get_session(session_id)
    if not session:
        return {"error": "Session not found"}

    result = governance.process_turn(session, payload.get("text", ""), confidence=payload.get("confidence", 0.92))
    return {
        "sessionStatus": result["session_status"],
        "safety": result["safety"],
        "evidence": result["evidence"],
        "nextQuestion": result["next_question"],
        "response": result["response"]
    }


@app.websocket("/api/v1/realtime/conversation")
async def realtime_conversation(websocket):
    await websocket.accept()
    while True:
        message = await websocket.receive_text()
        payload = {
            "text": message,
            "confidence": 0.94,
            "consent": True,
            "providerQuery": {},
        }
        session = governance.create_session(payload)
        result = governance.process_turn(session, message)
        await websocket.send_text(result["response"]["text"])


@app.websocket("/api/v1/media/stream")
async def media_stream(websocket):
    await websocket.accept()
    while True:
        message = await websocket.receive_text()
        if not message:
            continue
        transcript = speech.transcribe_text(message)
        await websocket.send_text(transcript["text"]) 
