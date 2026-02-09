import httpx
import asyncio
from typing import Dict, Any, Optional, Tuple
from loguru import logger
from PIL import Image
import io

from tutan_agent.core.ref_system import RefSystem, RefNode

class DeviceController:
    """
    Hybrid Device Controller for TUTAN_AGENT.
    Implements intelligent fallback: Accessibility Service -> ADB shell -> Vision (VLM).
    """
    def __init__(self, serial: str, port: int = 8080):
        self.serial = serial
        self.base_url = f"http://localhost:{port}"
        self.ref_system = RefSystem()
        self.client = httpx.AsyncClient(timeout=15.0)
        self._use_accessibility = True

    async def setup_forwarding(self):
        """Setup ADB port forwarding for the Helper App."""
        from tutan_agent.adb.manager import ADBManager
        adb = ADBManager()
        code, stdout, stderr = adb._execute(["-s", self.serial, "forward", f"tcp:8080", "tcp:8080"])
        if code == 0:
            logger.info(f"Port forwarding established for {self.serial}")
        else:
            logger.error(f"Failed to setup port forwarding: {stderr}")

    async def get_ui_context(self) -> Tuple[str, str]:
        """
        Get UI context using the best available method.
        Returns: (Context Text for LLM, Mode used)
        """
        # 1. Try Accessibility Service (Aria Tree)
        if self._use_accessibility:
            try:
                response = await self.client.get(f"{self.base_url}/aria-tree")
                if response.status_code == 200:
                    tree_json = response.json()
                    context = self.ref_system.parse_aria_tree(tree_json)
                    return context, "accessibility"
            except Exception as e:
                logger.warning(f"Accessibility context failed, falling back: {e}")
                self._use_accessibility = False # Temporary disable

        # 2. Fallback to ADB + Vision (Placeholder)
        logger.info("Falling back to ADB/Vision for context")
        # In a real implementation, we would take a screenshot and use a VLM
        return "UI Context unavailable via Accessibility. Please use visual reasoning.", "vision"

    async def execute_action(self, action: str, params: Dict[str, Any]) -> bool:
        """Execute action with intelligent fallback."""
        if action == "click":
            ref_id = params.get("ref_id")
            if ref_id:
                return await self.click_ref(ref_id)
            else:
                return await self.tap(params.get("x", 0), params.get("y", 0))
        
        elif action == "type":
            return await self.type_text(params.get("ref_id"), params.get("text", ""))
        
        elif action == "back":
            return await self.send_key("BACK")
        
        elif action == "home":
            return await self.send_key("HOME")
            
        return False

    async def click_ref(self, ref_id: str) -> bool:
        """Click an element by its Ref ID."""
        node = self.ref_system.get_node(ref_id)
        if not node:
            logger.error(f"Ref ID {ref_id} not found")
            return False
        
        bounds = node.bounds
        x = (bounds["left"] + bounds["right"]) // 2
        y = (bounds["top"] + bounds["bottom"]) // 2
        
        # Try Accessibility Tap first
        if self._use_accessibility:
            success = await self.tap(x, y)
            if success: return True

        # Fallback to ADB Tap
        return await self.adb_tap(x, y)

    async def tap(self, x: int, y: int) -> bool:
        """Tap via Helper App."""
        try:
            response = await self.client.post(f"{self.base_url}/tap", json={"x": x, "y": y})
            return response.status_code == 200 and response.json().get("success", False)
        except Exception:
            return False

    async def adb_tap(self, x: int, y: int) -> bool:
        """Tap via ADB Shell."""
        from tutan_agent.adb.manager import ADBManager
        adb = ADBManager()
        code, _, _ = adb._execute(["-s", self.serial, "shell", "input", "tap", str(x), str(y)])
        return code == 0

    async def type_text(self, ref_id: Optional[str], text: str) -> bool:
        """Type text into an element or globally."""
        if ref_id:
            await self.click_ref(ref_id) # Focus the element
            await asyncio.sleep(0.5)
        
        from tutan_agent.adb.manager import ADBManager
        adb = ADBManager()
        # Use ADB for typing (more reliable for now)
        escaped_text = text.replace(" ", "%s")
        code, _, _ = adb._execute(["-s", self.serial, "shell", "input", "text", escaped_text])
        return code == 0

    async def send_key(self, key: str) -> bool:
        """Send system key event."""
        from tutan_agent.adb.manager import ADBManager
        adb = ADBManager()
        code, _, _ = adb._execute(["-s", self.serial, "shell", "input", "keyevent", key])
        return code == 0

    async def get_screenshot(self) -> Optional[bytes]:
        """Get screenshot via ADB."""
        from tutan_agent.adb.manager import ADBManager
        adb = ADBManager()
        # Simplified: use adb exec-out for speed
        cmd = [adb.adb_path, "-s", self.serial, "exec-out", "screencap", "-p"]
        process = await asyncio.create_subprocess_exec(*cmd, stdout=subprocess.PIPE)
        stdout, _ = await process.communicate()
        return stdout if process.returncode == 0 else None

    async def close(self):
        await self.client.aclose()
import subprocess
