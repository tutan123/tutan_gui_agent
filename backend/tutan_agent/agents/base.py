import asyncio
from typing import Optional, List, Dict, Any
from loguru import logger

from tutan_agent.core.device_controller import DeviceController
from tutan_agent.agents.planner import TutanPlanner

class TutanAgent:
    """
    Core Agent logic for TUTAN_AGENT.
    Coordinates between LLM (Planner), Ref System, and Device Controller.
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

    async def initialize(self):
        await self.controller.setup_forwarding()

    async def run_task(self, task: str, sio_server=None):
        """
        Run a complete task loop with LLM reasoning.
        """
        self._is_running = True
        self.history = []
        logger.info(f"Starting task: {task}")
        
        step_count = 0
        max_steps = 20

        while self._is_running and step_count < max_steps:
            step_count += 1
            logger.info(f"--- Step {step_count} ---")

            # 1. Get UI context (Ref System)
            ui_context = await self.controller.get_ui_context()
            
            # 2. Ask Planner for next step
            plan = await self.planner.plan_next_step(task, ui_context, self.history)
            
            if "error" in plan:
                logger.error(f"Planner error: {plan['error']}")
                break

            thinking = plan.get("thinking", "")
            action = plan.get("action", "")
            params = plan.get("params", {})

            logger.info(f"Thinking: {thinking}")
            logger.info(f"Action: {action}({params})")

            # Notify frontend via Socket.IO if provided
            if sio_server:
                await sio_server.emit("agent_step", {
                    "serial": self.serial,
                    "step": step_count,
                    "thinking": thinking,
                    "action": action,
                    "params": params
                })

            # 3. Execute action
            if action == "finish":
                logger.info(f"Task finished: {params.get('message')}")
                break
            
            success = await self._execute_action(action, params)
            
            # 4. Update history
            self.history.append({"role": "assistant", "content": f"Thinking: {thinking}\nAction: {action}({params})"})
            self.history.append({"role": "user", "content": f"Action result: {'Success' if success else 'Failed'}"})

            if not success:
                logger.warning(f"Action {action} failed, retrying...")

            await asyncio.sleep(1) # Delay between steps

        self._is_running = False
        return "Task completed"

    async def _execute_action(self, action: str, params: Dict[str, Any]) -> bool:
        """Map LLM actions to DeviceController methods."""
        try:
            if action == "click":
                return await self.controller.click_ref(params.get("ref_id"))
            elif action == "type":
                # To be implemented in DeviceController
                # return await self.controller.type_ref(params.get("ref_id"), params.get("text"))
                pass
            elif action == "back":
                # To be implemented in DeviceController
                pass
            elif action == "home":
                # To be implemented in DeviceController
                pass
        except Exception as e:
            logger.error(f"Action execution error: {e}")
        return False

    async def stop(self):
        self._is_running = False
        await self.controller.close()
        await self.planner.close()
