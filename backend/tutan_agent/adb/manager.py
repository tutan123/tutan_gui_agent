import subprocess
import time
import threading
import os
import re
from typing import List, Dict, Optional, Tuple
from loguru import logger

class ADBDevice:
    def __init__(self, serial: str, status: str, model: Optional[str] = None):
        self.serial = serial
        self.status = status  # 'device', 'offline', 'unauthorized'
        self.model = model
        self.last_seen = time.time()

    def __repr__(self):
        return f"ADBDevice(serial={self.serial}, status={self.status}, model={self.model})"

class ADBManager:
    _instance = None
    _lock = threading.Lock()

    def __new__(cls):
        with cls._lock:
            if cls._instance is None:
                cls._instance = super(ADBManager, cls).__new__(cls)
                cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        
        self.adb_path = self._find_adb()
        self._devices: Dict[str, ADBDevice] = {}
        self._cache_lock = threading.Lock()
        self._cache_ttl = 5.0  # 5 seconds cache
        self._last_scan = 0
        
        # Start background monitor
        self._stop_monitor = threading.Event()
        self._monitor_thread = threading.Thread(target=self._monitor_loop, daemon=True)
        self._monitor_thread.start()
        
        self._initialized = True
        logger.info(f"ADBManager initialized with adb: {self.adb_path}")

    def _find_adb(self) -> str:
        """Find ADB executable in multiple locations."""
        # 1. Check environment variable
        env_adb = os.environ.get("ADB_PATH")
        if env_adb and os.path.exists(env_adb):
            return env_adb

        # 2. Check system PATH
        try:
            subprocess.run(["adb", "version"], capture_output=True, check=True)
            return "adb"
        except (subprocess.CalledProcessError, FileNotFoundError):
            pass

        # 3. Check common Android SDK paths (Windows)
        if os.name == 'nt':
            common_paths = [
                os.path.expandvars(r"%LOCALAPPDATA%\Android\Sdk\platform-tools\adb.exe"),
                r"C:\Android\sdk\platform-tools\adb.exe",
            ]
            for p in common_paths:
                if os.path.exists(p):
                    return p

        return "adb"  # Fallback to path

    def _execute(self, args: List[str], timeout: int = 10) -> Tuple[int, str, str]:
        """Execute an ADB command with timeout."""
        cmd = [self.adb_path] + args
        try:
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                encoding='utf-8',
                errors='ignore',
                timeout=timeout
            )
            return result.returncode, result.stdout, result.stderr
        except subprocess.TimeoutExpired:
            logger.error(f"ADB command timeout: {' '.join(cmd)}")
            return -1, "", "timeout"
        except Exception as e:
            logger.error(f"ADB execution error: {e}")
            return -1, "", str(e)

    def scan_devices(self, force: bool = False) -> List[ADBDevice]:
        """Scan for connected devices with caching."""
        now = time.time()
        if not force and (now - self._last_scan < self._cache_ttl):
            with self._cache_lock:
                return list(self._devices.values())

        code, stdout, stderr = self._execute(["devices", "-l"])
        if code != 0:
            logger.error(f"Failed to list devices: {stderr}")
            return []

        new_devices = {}
        lines = stdout.strip().split('\n')
        for line in lines[1:]:  # Skip header
            if not line.strip():
                continue
            
            parts = line.split()
            if len(parts) >= 2:
                serial = parts[0]
                status = parts[1]
                model = None
                
                # Parse model from -l output
                model_match = re.search(r'model:(\S+)', line)
                if model_match:
                    model = model_match.group(1)
                
                new_devices[serial] = ADBDevice(serial, status, model)

        with self._cache_lock:
            self._devices = new_devices
            self._last_scan = now
            return list(self._devices.values())

    def connect_wireless(self, address: str) -> Tuple[bool, str]:
        """Connect to a device via WiFi."""
        if ":" not in address:
            address = f"{address}:5555"
        
        code, stdout, stderr = self._execute(["connect", address], timeout=15)
        if "connected" in stdout.lower():
            self.scan_devices(force=True)
            return True, f"Successfully connected to {address}"
        return False, stdout.strip() or stderr.strip()

    def disconnect(self, serial: Optional[str] = None) -> bool:
        args = ["disconnect"]
        if serial:
            args.append(serial)
        code, _, _ = self._execute(args)
        self.scan_devices(force=True)
        return code == 0

    def restart_server(self):
        logger.warning("Restarting ADB server...")
        self._execute(["kill-server"])
        time.sleep(1)
        self._execute(["start-server"])
        self.scan_devices(force=True)

    def _monitor_loop(self):
        """Background thread to keep device list fresh."""
        while not self._stop_monitor.is_set():
            try:
                self.scan_devices(force=True)
            except Exception as e:
                logger.error(f"ADB monitor error: {e}")
            time.sleep(10)

    def stop(self):
        self._stop_monitor.set()
        if self._monitor_thread.is_alive():
            self._monitor_thread.join(timeout=2)
