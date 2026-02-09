import httpx
import asyncio
from typing import Dict, Any, Optional
from loguru import logger

from tutan_agent.core.ref_system import RefSystem, RefNode

class DeviceController:
    """
    Handles high-level communication with the Tutan Helper app on the device.
    Implements intelligent fallback and Ref System integration.
    """
    def __init__(self, serial: str, port: int = 8080):
        self.serial = serial
        self.base_url = f"http://localhost:{port}" # Assumes port forwarding via ADB
        self.ref_system = RefSystem()
        self.client = httpx.AsyncClient(timeout=10.0)

    async def setup_forwarding(self):
        """Setup ADB port forwarding for the HTTP server."""
        from tutan_agent.adb.manager import ADBManager
        adb = ADBManager()
        code, stdout, stderr = adb._execute(["-s", self.serial, "forward", "tcp:8080", "tcp:8080"])
        if code == 0:
            logger.info(f"Port forwarding established for {self.serial}")
        else:
            logger.error(f"Failed to setup port forwarding: {stderr}")

    async def get_ui_context(self) -> str:
        """Fetch Aria Tree and return Ref System text for LLM."""
        try:
            response = await self.client.get(f"{self.base_url}/aria-tree")
            if response.status_code == 200:
                tree_json = response.json()
                return self.ref_system.parse_aria_tree(tree_json)
            else:
                return f"Error: Helper app returned {response.status_code}"
        except Exception as e:
            logger.error(f"Failed to get UI context: {e}")
            return f"Exception: {str(e)}"

    async def click_ref(self, ref_id: str) -> bool:
        """Click an element by its Ref ID."""
        node = self.ref_system.get_node(ref_id)
        if not node:
            logger.error(f"Ref ID {ref_id} not found in current context")
            return False
        
        # Calculate center coordinates
        bounds = node.bounds
        x = (bounds["left"] + bounds["right"]) // 2
        y = (bounds["top"] + bounds["bottom"]) // 2
        
        return await self.tap(x, y)

    async def tap(self, x: int, y: int) -> bool:
        """Direct tap via Helper app."""
        try:
            response = await self.client.post(
                f"{self.base_url}/tap",
                json={"x": x, "y": y}
            )
            return response.status_code == 200 and response.json().get("success", False)
        except Exception as e:
            logger.error(f"Tap failed: {e}")
            return False

    async def close(self):
        await self.client.aclose()
