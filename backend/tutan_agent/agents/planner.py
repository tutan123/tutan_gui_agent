import json
from typing import List, Dict, Any, Optional
import httpx
from loguru import logger

class TutanPlanner:
    """
    Handles LLM reasoning and task planning for TUTAN_AGENT.
    Uses an OpenAI-compatible API.
    """
    def __init__(self, api_key: str, base_url: str, model: str):
        self.api_key = api_key
        self.base_url = base_url
        self.model = model
        self.client = httpx.AsyncClient(
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=60.0
        )

    async def plan_next_step(self, task: str, ui_context: str, history: List[Dict[str, str]]) -> Dict[str, Any]:
        """
        Ask the LLM to decide the next action based on the task and UI context.
        """
        system_prompt = """
        You are an Android GUI Agent. Your goal is to complete the user's task by interacting with the screen.
        You are provided with a 'UI Context' which lists elements with IDs like [e1], [e2], etc.
        
        Available Actions:
        - click(ref_id): Click on an element by its ID (e.g., click("e5"))
        - type(ref_id, text): Type text into an editable element (e.g., type("e2", "hello"))
        - back(): Press the back button
        - home(): Press the home button
        - finish(message): Task is completed with a final message
        
        Output Format (JSON only):
        {
            "thinking": "Your reasoning process",
            "action": "click",
            "params": {"ref_id": "e1"}
        }
        """

        prompt = f"User Task: {task}\n\nUI Context (Ref System):\n{ui_context}\n\nDecide the next step."

        messages = [
            {"role": "system", "content": system_prompt},
            *history,
            {"role": "user", "content": prompt}
        ]

        try:
            response = await self.client.post(
                f"{self.base_url}/chat/completions",
                json={
                    "model": self.model,
                    "messages": messages,
                    "response_format": {"type": "json_object"}
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
