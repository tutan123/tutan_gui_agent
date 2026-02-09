import json
from typing import List, Dict, Any, Optional
import httpx
from loguru import logger

class TutanPlanner:
    """
    Advanced LLM reasoning engine for TUTAN_AGENT.
    Integrates OpenClaw's prompt strategies and Ref System.
    """
    def __init__(self, api_key: str, base_url: str, model: str):
        self.api_key = api_key
        self.base_url = base_url
        self.model = model
        self.client = httpx.AsyncClient(
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=60.0
        )

    def _get_system_prompt(self) -> str:
        return """
        You are an expert Android GUI Agent. Your goal is to complete the user's task by interacting with the device.
        You are provided with a 'UI Context' which lists elements with semantic IDs like [e1], [e2], etc.
        
        ### Strategy:
        1. **Semantic Understanding**: Use the text and labels in the UI Context to identify elements.
        2. **Stable References**: Always prefer using [eX] IDs over coordinates.
        3. **Step-by-Step Reasoning**: Explain your thinking before choosing an action.
        4. **Error Recovery**: If an action fails, try an alternative path or check if you are on the right screen.
        
        ### Available Actions:
        - click(ref_id): Click on an element by its ID (e.g., click("e5"))
        - type(ref_id, text): Type text into an editable element (e.g., type("e2", "hello"))
        - scroll(direction): Scroll the screen ("up", "down", "left", "right")
        - back(): Press the system back button
        - home(): Press the system home button
        - wait(seconds): Wait for the UI to update
        - finish(message): Task is completed with a summary message
        
        ### Output Format (Strict JSON):
        {
            "thinking": "Analyze the current screen and plan the next move.",
            "action": "click | type | scroll | back | home | wait | finish",
            "params": {
                "ref_id": "eX",
                "text": "optional text",
                "direction": "up|down",
                "message": "final result"
            }
        }
        """

    async def plan_next_step(self, task: str, ui_context: str, history: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Call LLM to decide the next step.
        """
        prompt = f"User Task: {task}\n\nUI Context (Ref System):\n{ui_context}\n\nDecide the next step."

        messages = [
            {"role": "system", "content": self._get_system_prompt()},
            *history,
            {"role": "user", "content": prompt}
        ]

        try:
            response = await self.client.post(
                f"{self.base_url}/chat/completions",
                json={
                    "model": self.model,
                    "messages": messages,
                    "response_format": {"type": "json_object"},
                    "temperature": 0.0 # Deterministic for GUI actions
                }
            )
            
            if response.status_code == 200:
                result = response.json()
                content = result["choices"][0]["message"]["content"]
                return json.loads(content)
            else:
                logger.error(f"LLM API Error: {response.text}")
                return {"error": f"API returned {response.status_code}"}
        except Exception as e:
            logger.exception(f"Failed to call LLM: {e}")
            return {"error": str(e)}

    async def close(self):
        await self.client.aclose()
