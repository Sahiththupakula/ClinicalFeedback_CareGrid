import pytest
from fastapi.testclient import TestClient

from apps.voice_backend.main import app


@pytest.fixture
def client():
    return TestClient(app)


def test_health_is_deterministic_and_cloud_ready(client):
    response = client.get("/api/v1/health")
    assert response.status_code == 200
    assert response.json()["governance"] == "deterministic"


def test_consent_is_required(client):
    response = client.post("/api/v1/sessions", json={"consent": False})
    assert response.status_code == 400


def test_immediate_risk_escalates(client):
    created = client.post("/api/v1/sessions", json={"consent": True}).json()
    session_id = created["session"]["id"]
    response = client.post(f"/api/v1/sessions/{session_id}/messages", json={"text": "I have severe chest pain and cannot breathe"})
    assert response.status_code == 200
    assert response.json()["sessionStatus"] == "escalated"
    assert response.json()["safety"]["level"] == 4
    assert response.json()["evidence"]["reviewStatus"] == "required"


def test_websocket_requires_explicit_session_start(client):
    with client.websocket_connect("/api/v1/realtime/conversation") as websocket:
        websocket.send_json({"type": "turn", "text": "hello"})
        assert websocket.receive_json()["type"] == "error"
