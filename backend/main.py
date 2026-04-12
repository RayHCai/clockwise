"""FastAPI server for Guidr speech graph analysis and multimodal fusion."""

import os
import uuid

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from speech_graph import analyze_transcript
from fusion import analyze_fusion
from conversation import get_session, remove_session

app = FastAPI(title="Guidr API", version="0.1.0")

@app.on_event("startup")
def _debug_routes():
    paths = [r.path for r in app.routes if hasattr(r, "methods")]
    print(f"[DEBUG] Registered routes: {paths}")

allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:3000").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SpeechRequest(BaseModel):
    transcript: str
    window_size: int = 0


class FusionRequest(BaseModel):
    drawing_observations: list[str]
    speech_metrics: dict
    transcript: str


class ConversationTurnRequest(BaseModel):
    session_id: str
    message: str


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/analyze-speech")
def speech_endpoint(req: SpeechRequest):
    result = analyze_transcript(req.transcript, window_size=req.window_size)
    return result


@app.post("/analyze-fusion")
async def fusion_endpoint(req: FusionRequest):
    result = await analyze_fusion(
        drawing_observations=req.drawing_observations,
        speech_metrics=req.speech_metrics,
        transcript=req.transcript,
    )
    return result


@app.post("/conversation/start")
async def conversation_start():
    """Start a new CDT session. Agent speaks first."""
    session_id = uuid.uuid4().hex[:12]
    session = get_session(session_id)
    agent_message = await session.start()
    return {"session_id": session_id, "message": agent_message}


@app.post("/conversation/turn")
async def conversation_turn(req: ConversationTurnRequest):
    """Send patient speech, get agent response."""
    session = get_session(req.session_id)
    agent_message = await session.respond(req.message)
    return {"message": agent_message}


@app.post("/conversation/end")
async def conversation_end(req: dict):
    """End a conversation session and clean up."""
    session_id = req.get("session_id", "")
    if session_id:
        session = get_session(session_id)
        transcript = session.get_transcript()
        remove_session(session_id)
        return {"transcript": transcript}
    return {"transcript": []}
