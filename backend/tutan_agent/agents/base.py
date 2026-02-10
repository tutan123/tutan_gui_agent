import asyncio
import uuid
from typing import Optional, List, Dict, Any, AsyncIterator
from loguru import logger
import time

from tutan_agent.core.device_controller import DeviceController
from tutan_agent.agents.planner import TutanPlanner
from tutan_agent.core.session_store import SessionStore

class TutanAgent:
    """
    Industrial-grade Android GUI Agent.
    Orchestrates between LLM, Ref System, and Hybrid Device Controller.
    Supports full async streaming and state management.
    """
    def __init__(self, device_serial: str, model_config: Dict[str, str]):
        self.serial = device_serial
        self.controller = DeviceController(device_serial)
        self.planner = TutanPlanner(
            api_key=model_config.get("api_key", "EMPTY"),
            base_url=model_config.get("base_url", "http://localhost:8000/v1"),
            model=model_config.get("model_name", "gpt-4o")
        )
        self.model_config = model_config
        self.history: List[Dict[str, str]] = []
        self._is_running = False
        self._abort_requested = False
        self.step_count = 0
        self.max_steps = 30
        self.session_id: Optional[str] = None
        self.store = SessionStore()

    async def initialize(self):
        """Setup environment and establish connection."""
        await self.controller.setup_forwarding()
        logger.info(f"Agent for {self.serial} initialized.")

    async def stream_task(self, task: str) -> AsyncIterator[Dict[str, Any]]:
        """
        Execute task and yield events for real-time monitoring.
        """
        self._is_running = True
        self._abort_requested = False
        self.step_count = 0
        self.history = []
        self.session_id = str(uuid.uuid4())
        
        # Create session in DB
        self.store.create_session(self.session_id, self.serial, task, self.model_config)
        
        logger.info(f"Starting task: {task} (Session: {self.session_id})")
        
        yield {"type": "status", "data": {"message": "Task started", "session_id": self.session_id}}

        while self._is_running and self.step_count < self.max_steps:
            if self._abort_requested:
                self.store.update_session_status(self.session_id, "aborted")
                yield {"type": "status", "data": {"message": "Task aborted by user"}}
                break

            self.step_count += 1
            yield {"type": "status", "data": {"message": f"Executing Step {self.step_count}..."}}

            # 1. Perception: Get UI context and screenshot
            ui_context, mode = await self.controller.get_ui_context()
            screenshot = await self.controller.get_screenshot()
            
            # Emit UI nodes for visual debugging
            yield {
                "type": "ui_update",
                "data": {
                    "nodes": self.controller.get_current_nodes()
                }
            }
            
            # 2. Planning: Call LLM
            plan = await self.planner.plan_next_step(task, ui_context, self.history)
            
            if "error" in plan:
                self.store.update_session_status(self.session_id, "failed")
                yield {"type": "error", "data": {"message": plan["error"]}}
                break

            thinking = plan.get("thinking", "")
            action = plan.get("action", "")
            params = plan.get("params", {})

            # 3. Execution: Perform action via controller
            success = await self.controller.execute_action(action, params)

            # 4. Persistence: Save step to DB
            step_data = {
                "step": self.step_count,
                "thinking": thinking,
                "action": action,
                "params": params,
                "result": "success" if success else "failed",
                "mode": mode
            }
            self.store.add_step(self.session_id, step_data)

            # 5. Emit Step Event
            yield {
                "type": "step",
                "data": step_data
            }

            # 6. Termination Check
            if action == "finish":
                self.store.update_session_status(self.session_id, "completed")
                yield {"type": "done", "data": {"message": params.get("message", "Task completed")}}
                break
            
            # 7. Update History
            self.history.append({
                "role": "assistant", 
                "content": f"Thinking: {thinking}\nAction: {action}({params})"
            })
            self.history.append({
                "role": "user", 
                "content": f"Action result: {'Success' if success else 'Failed'}"
            })

            if not success:
                logger.warning(f"Step {self.step_count} action failed.")
                yield {"type": "warning", "data": {"message": f"Action {action} failed, retrying..."}}

            await asyncio.sleep(1.5) # Wait for UI to settle

        if self.step_count >= self.max_steps:
            self.store.update_session_status(self.session_id, "timeout")
            yield {"type": "error", "data": {"message": "Maximum steps reached"}}

        self._is_running = False

    def abort(self):
        """Request task abortion."""
        self._abort_requested = True

    async def stop(self):
        """Cleanup resources."""
        self._is_running = False
        await self.controller.close()
        await self.planner.close()
