import os
import asyncio
from typing import Dict, List, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from loguru import logger
import socketio

from tutan_agent.adb.manager import ADBManager
from tutan_agent.agents.base import TutanAgent
from tutan_agent.core.session_store import SessionStore

# Initialize FastAPI
app = FastAPI(title="TUTAN_AGENT API", version="0.1.0")

# Initialize FastAPI
app = FastAPI(title="TUTAN_AGENT API", version="0.1.0")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Socket.IO
sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins='*')
socket_app = socketio.ASGIApp(sio, app)

# Initialize Managers
adb_manager = ADBManager()
store = SessionStore()
active_agents: Dict[str, TutanAgent] = {}

# Default model config (can be overridden via API)
default_model_config = {
    "api_key": os.environ.get("OPENAI_API_KEY", "EMPTY"),
    "base_url": os.environ.get("OPENAI_BASE_URL", "https://api.openai.com/v1"),
    "model_name": os.environ.get("OPENAI_MODEL", "gpt-4o")
}

@app.on_event("startup")
async def startup_event():
    logger.info("TUTAN_AGENT Backend starting up...")

@app.on_event("shutdown")
async def shutdown_event():
    logger.info("TUTAN_AGENT Backend shutting down...")
    for agent in active_agents.values():
        await agent.stop()
    adb_manager.stop()

# --- API Routes ---

@app.get("/api/sessions")
async def list_sessions():
    return {"success": True, "sessions": store.get_all_sessions()}

@app.get("/api/sessions/{session_id}/steps")
async def get_steps(session_id: str):
    return {"success": True, "steps": store.get_session_steps(session_id)}

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": "0.1.0"}

@app.get("/api/devices")
async def list_devices():
    devices = adb_manager.scan_devices()
    return {
        "success": True,
        "devices": [
            {
                "serial": d.serial,
                "status": d.status,
                "model": d.model
            } for d in devices
        ]
    }

@app.post("/api/devices/connect")
async def connect_device(address: str):
    success, message = adb_manager.connect_wireless(address)
    if not success:
        raise HTTPException(status_code=400, detail=message)
    return {"success": True, "message": message}

@app.post("/api/agents/start")
async def start_agent(serial: str, api_key: str = None, base_url: str = None, model: str = None):
    if serial in active_agents:
        return {"success": True, "message": "Agent already running"}
    
    config = default_model_config.copy()
    if api_key: config["api_key"] = api_key
    if base_url: config["base_url"] = base_url
    if model: config["model_name"] = model

    agent = TutanAgent(serial, config)
    await agent.initialize()
    active_agents[serial] = agent
    return {"success": True, "message": f"Agent started for {serial}"}

@app.post("/api/agents/run")
async def run_task(serial: str, task: str):
    if serial not in active_agents:
        raise HTTPException(status_code=404, detail="Agent not found for this device")
    
    agent = active_agents[serial]
    
    # Run task in background and stream events via Socket.IO
    async def run_and_stream():
        async for event in agent.stream_task(task):
            await sio.emit("agent_event", {
                "serial": serial,
                "type": event["type"],
                "data": event["data"]
            })
    
    asyncio.create_task(run_and_stream())
    return {"success": True, "message": "Task started and streaming"}

@app.post("/api/agents/abort")
async def abort_task(serial: str):
    if serial in active_agents:
        active_agents[serial].abort()
        return {"success": True, "message": "Abort requested"}
    raise HTTPException(status_code=404, detail="Agent not found")

@app.post("/api/adb/restart")
async def restart_adb():
    adb_manager.restart_server()
    return {"success": True, "message": "ADB server restarted"}

# --- Socket.IO Events ---

@sio.event
async def connect(sid, environ):
    logger.info(f"Client connected: {sid}")

@sio.event
async def disconnect(sid):
    logger.info(f"Client disconnected: {sid}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(socket_app, host="0.0.0.0", port=18888)
