from fastapi import FastAPI, HTTPException, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from apps.voice_backend.config import settings
from apps.voice_backend.services.azure_speech import AzureSpeechService
from apps.voice_backend.services.constrained_response import ConstrainedResponseService
from apps.voice_backend.services.governance_adapter import GovernanceAdapter

app = FastAPI(title=settings.app_name, version="0.3.0")
app.add_middleware(CORSMiddleware, allow_origins=settings.cors_origins, allow_credentials=True, allow_methods=["*"], allow_headers=["*"])
speech = AzureSpeechService()
governance = GovernanceAdapter()
responses = ConstrainedResponseService()


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "mode": settings.cloud_mode, "voice": "speech-cascade", "speech_service": speech.provider_name, "response_service": responses.provider_name, "governance": "deterministic"}


@app.get("/api/v1/health")
async def api_health() -> dict:
    return await health()


@app.post("/api/v1/sessions", status_code=201)
async def create_session(payload: dict) -> dict:
    try:
        session = governance.create_session(payload)
    except ValueError as error:
        raise HTTPException(status_code=400, detail=str(error)) from error
    return {"session": session, "next_question": governance.next_question(session), "provider_match": session["providerMatch"]}


@app.get("/api/v1/sessions/{session_id}")
async def get_session(session_id: str) -> dict:
    session = governance.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"session": session, "next_question": governance.next_question(session)}


async def process_message(session: dict, payload: dict) -> dict:
    try:
        result = governance.process_turn(session, payload.get("text", ""), confidence=payload.get("confidence", 0.92))
    except ValueError as error:
        raise HTTPException(status_code=409 if "no longer active" in str(error) else 400, detail=str(error)) from error
    response = await responses.generate(safety=result["safety"], next_question=result["next_question"])
    return {"sessionStatus": result["session_status"], "safety": result["safety"], "evidence": result["evidence"], "nextQuestion": result["next_question"], "response": response}


@app.post("/api/v1/sessions/{session_id}/messages")
async def submit_message(session_id: str, payload: dict) -> dict:
    session = governance.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return await process_message(session, payload)


@app.post("/api/v1/sessions/{session_id}/transcribe")
async def transcribe(session_id: str, payload: dict) -> dict:
    session = governance.get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if payload.get("audioBase64"):
        return {"transcript": speech.transcribe_wav(payload["audioBase64"], session["language"])}
    return {"transcript": speech.transcribe_text(payload.get("text", ""), session["language"])}


@app.websocket("/api/v1/realtime/conversation")
async def realtime_conversation(websocket: WebSocket) -> None:
    await websocket.accept()
    session = None
    try:
        while True:
            payload = await websocket.receive_json()
            event_type = payload.get("type", "turn")
            if event_type == "session.start":
                try:
                    session = governance.create_session(payload)
                except ValueError as error:
                    await websocket.send_json({"type": "error", "error": str(error)})
                    continue
                await websocket.send_json({"type": "session.started", "session": session, "nextQuestion": governance.next_question(session)})
                continue
            if not session:
                await websocket.send_json({"type": "error", "error": "Send session.start before sending turns"})
                continue
            if event_type != "turn":
                await websocket.send_json({"type": "error", "error": f"Unsupported event type: {event_type}"})
                continue
            try:
                result = await process_message(session, payload)
            except HTTPException as error:
                await websocket.send_json({"type": "error", "error": error.detail})
                continue
            await websocket.send_json({"type": "turn.result", **result})
    except WebSocketDisconnect:
        return


@app.websocket("/api/v1/media/stream")
async def media_stream(websocket: WebSocket) -> None:
    await websocket.accept()
    try:
        while True:
            payload = await websocket.receive_json()
            if payload.get("type") != "audio.chunk":
                await websocket.send_json({"type": "error", "error": "Expected audio.chunk"})
                continue
            transcript = speech.transcribe_wav(payload.get("audioBase64", ""), payload.get("language"))
            await websocket.send_json({"type": "transcript.final", "sequence": payload.get("sequence"), "transcript": transcript})
    except WebSocketDisconnect:
        return
