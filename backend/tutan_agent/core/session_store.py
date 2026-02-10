import sqlite3
import json
import time
from typing import List, Dict, Any, Optional
from loguru import logger
import os

class SessionStore:
    """
    SQLite-based persistence for TUTAN_AGENT sessions and steps.
    """
    def __init__(self, db_path: str = "tutan_sessions.db"):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            # Sessions table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS sessions (
                    id TEXT PRIMARY KEY,
                    device_serial TEXT,
                    task TEXT,
                    status TEXT,
                    start_time REAL,
                    end_time REAL,
                    model_config TEXT
                )
            """)
            # Steps table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS steps (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT,
                    step_number INTEGER,
                    thinking TEXT,
                    action TEXT,
                    params TEXT,
                    result TEXT,
                    screenshot_path TEXT,
                    timestamp REAL,
                    FOREIGN KEY (session_id) REFERENCES sessions (id)
                )
            """)
            conn.commit()

    def create_session(self, session_id: str, serial: str, task: str, model_config: Dict[str, Any]):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "INSERT INTO sessions (id, device_serial, task, status, start_time, model_config) VALUES (?, ?, ?, ?, ?, ?)",
                (session_id, serial, task, "running", time.time(), json.dumps(model_config))
            )
            conn.commit()

    def add_step(self, session_id: str, step_data: Dict[str, Any]):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                """INSERT INTO steps 
                   (session_id, step_number, thinking, action, params, result, screenshot_path, timestamp) 
                   VALUES (?, ?, ?, ?, ?, ?, ?, ?)""",
                (
                    session_id,
                    step_data.get("step"),
                    step_data.get("thinking"),
                    step_data.get("action"),
                    json.dumps(step_data.get("params")),
                    step_data.get("result", "success"),
                    step_data.get("screenshot_path"),
                    time.time()
                )
            )
            conn.commit()

    def update_session_status(self, session_id: str, status: str):
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE sessions SET status = ?, end_time = ? WHERE id = ?",
                (status, time.time(), session_id)
            )
            conn.commit()

    def get_all_sessions(self) -> List[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM sessions ORDER BY start_time DESC")
            return [dict(row) for row in cursor.fetchall()]

    def get_session_steps(self, session_id: str) -> List[Dict[str, Any]]:
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM steps WHERE session_id = ? ORDER BY step_number ASC", (session_id,))
            return [dict(row) for row in cursor.fetchall()]
