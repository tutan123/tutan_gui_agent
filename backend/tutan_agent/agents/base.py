import asyncio
from typing import Optional, List, Dict, Any, AsyncIterator
from loguru import logger
import time

from tutan_agent.core.device_controller import DeviceController
from tutan_agent.agents.planner import TutanPlanner

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
        self.history: List[Dict[str, str]] = []
        self._is_running = False
        self._abort_requested = False
        self.step_count = 0
        self.max_steps = 30

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
        
        logger.info(f"Starting task: {task}")
        
        yield {"type": "status", "data": {"message": "Task started"}}

        while self._is_running and self.step_count < self.max_steps:
            if self._abort_requested:
                yield {"type": "status", "data": {"message": "Task aborted by user"}}
                break

            self.step_count += 1
            yield {"type": "status", "data": {"message": f"Executing Step {self.step_count}..."}}

            # 1. Perception: Get UI context and screenshot
            ui_context, mode = await self.controller.get_ui_context()
            screenshot = await self.controller.get_screenshot()
            
            # 2. Planning: Call LLM
            plan = await self.planner.plan_next_step(task, ui_context, self.history)
            
            if "error" in plan:
                yield {"type": "error", "data": {"message": plan["error"]}}
                break

            thinking = plan.get("thinking", "")
            action = plan.get("action", "")
            params = plan.get("params", {})

            # 3. Emit Step Event
            yield {
                "type": "step",
                "data": {
                    "step": self.step_count,
                    "thinking": thinking,
                    "action": action,
                    "params": params,
                    "mode": mode
                }
            }

            # 4. Termination Check
            if action == "finish":
                yield {"type": "done", "data": {"message": params.get("message", "Task completed")}}
                break

            # 5. Execution: Perform action via controller
            success = await self.controller.execute_action(action, params)
            
            # 6. Update History
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

        self._is_running = False
        if self.step_count >= self.max_steps:
            yield {"type": "error", "data": {"message": "Maximum steps reached"}}

    def abort(self):
        """Request task abortion."""
        self._abort_requested = True

    async def stop(self):
        """Cleanup resources."""
        self._is_running = False
        await self.controller.close()
        await self.planner.close()
