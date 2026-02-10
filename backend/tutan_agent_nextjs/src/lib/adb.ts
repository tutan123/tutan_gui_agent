import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';

const execAsync = promisify(exec);

export interface ADBDeviceInfo {
  serial: string;
  status: string;
  model: string;
}

export class ADB {
  private static adbPath: string = '';

  public static async getAdbPath(): Promise<string> {
    if (this.adbPath) return this.adbPath;

    // 1. Check environment variable
    if (process.env.ADB_PATH && await this.exists(process.env.ADB_PATH)) {
      this.adbPath = process.env.ADB_PATH;
      return this.adbPath;
    }

    // 2. Check system PATH
    try {
      await execAsync('adb version');
      this.adbPath = 'adb';
      return this.adbPath;
    } catch (e) {
      // Not in path
    }

    // 3. Check common Android SDK paths (Windows)
    if (process.platform === 'win32') {
      const localAppData = process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local');
      const commonPaths = [
        path.join(localAppData, 'Android', 'Sdk', 'platform-tools', 'adb.exe'),
        'C:\\Android\\sdk\\platform-tools\\adb.exe',
      ];
      for (const p of commonPaths) {
        if (await this.exists(p)) {
          this.adbPath = p;
          return this.adbPath;
        }
      }
    }

    // 4. Default fallback
    this.adbPath = 'adb';
    return this.adbPath;
  }

  private static async exists(p: string): Promise<boolean> {
    try {
      await fs.access(p);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * List all connected devices.
   */
  static async listDevices(): Promise<ADBDeviceInfo[]> {
    try {
      const adb = await this.getAdbPath();
      const { stdout } = await execAsync(`"${adb}" devices -l`);
      const lines = stdout.trim().split('\n').slice(1);
      
      return lines.map(line => {
        const parts = line.split(/\s+/);
        if (parts.length < 2) return null;
        
        const serial = parts[0];
        const status = parts[1];
        const modelMatch = line.match(/model:(\S+)/);
        const model = modelMatch ? modelMatch[1] : 'unknown';
        
        return { serial, status, model };
      }).filter((d): d is ADBDeviceInfo => d !== null);
    } catch (error: any) {
      // Log the error but don't throw, so the API can return an empty list or error message
      console.error('[ADB] Failed to list devices:', error.message);
      return [];
    }
  }

  /**
   * Dump UI hierarchy to an XML string.
   * This is the foundation for the Ref System.
   */
  static async dumpHierarchy(serial: string): Promise<string> {
    const adb = await this.getAdbPath();
    const remotePath = '/data/local/tmp/uidump.xml';
    
    try {
      // 1. Trigger dump on device
      await execAsync(`"${adb}" -s ${serial} shell uiautomator dump ${remotePath}`);
      
      // 2. Read file content directly using cat to avoid pull/file system issues
      const { stdout } = await execAsync(`"${adb}" -s ${serial} shell cat ${remotePath}`);
      
      if (!stdout || !stdout.includes('<?xml')) {
        throw new Error('Invalid XML hierarchy received');
      }
      
      return stdout;
    } catch (error) {
      console.error(`Failed to dump hierarchy for ${serial}:`, error);
      throw error;
    }
  }

  /**
   * Perform a tap at coordinates.
   */
  static async tap(serial: string, x: number, y: number): Promise<void> {
    const adb = await this.getAdbPath();
    await execAsync(`"${adb}" -s ${serial} shell input tap ${x} ${y}`);
  }

  /**
   * Perform a swipe.
   */
  static async swipe(serial: string, x1: number, y1: number, x2: number, y2: number, duration: number = 300): Promise<void> {
    const adb = await this.getAdbPath();
    await execAsync(`"${adb}" -s ${serial} shell input swipe ${x1} ${y1} ${x2} ${y2} ${duration}`);
  }

  /**
   * Perform a long press (swipe at same point).
   */
  static async longPress(serial: string, x: number, y: number, duration: number = 1000): Promise<void> {
    await this.swipe(serial, x, y, x, y, duration);
  }

  /**
   * Input text.
   */
  static async typeText(serial: string, text: string): Promise<void> {
    const adb = await this.getAdbPath();
    // Use ADB Keyboard if possible, otherwise fallback to input text
    try {
      // Base64 encode for ADB Keyboard to support Chinese
      const b64 = Buffer.from(text).toString('base64');
      await execAsync(`"${adb}" -s ${serial} shell am broadcast -a ADB_INPUT_B64 --es msg "${b64}"`);
    } catch (e) {
      const escaped = text.replace(/\s/g, '%s');
      await execAsync(`"${adb}" -s ${serial} shell input text "${escaped}"`);
    }
  }

  /**
   * Send key event.
   */
  static async sendKey(serial: string, key: string | number): Promise<void> {
    const adb = await this.getAdbPath();
    await execAsync(`"${adb}" -s ${serial} shell input keyevent ${key}`);
  }

  /**
   * Get screen size.
   */
  static async getScreenSize(serial: string): Promise<{ width: number, height: number }> {
    const adb = await this.getAdbPath();
    const { stdout } = await execAsync(`${adb} -s ${serial} shell wm size`);
    const match = stdout.match(/Physical size: (\d+)x(\d+)/);
    if (match) {
      return { width: parseInt(match[1]), height: parseInt(match[2]) };
    }
    return { width: 1080, height: 1920 }; // Default
  }

  /**
   * Take screenshot and return as Buffer.
   */
  static async takeScreenshot(serial: string): Promise<Buffer> {
    const adb = await this.getAdbPath();
    try {
      // Use exec-out for faster transfer directly to buffer
      const { stdout } = await execAsync(`${adb} -s ${serial} exec-out screencap -p`, {
        encoding: 'buffer',
        maxBuffer: 10 * 1024 * 1024 // 10MB
      });
      return stdout;
    } catch (error) {
      console.error(`Failed to take screenshot for ${serial}:`, error);
      throw error;
    }
  }

  /**
   * Setup ADB Keyboard for reliable text input (including Chinese).
   */
  static async setupADBKeyboard(serial: string): Promise<void> {
    const adb = await this.getAdbPath();
    console.log(`[ADB] Setting up ADB Keyboard for ${serial}...`);
    try {
      await execAsync(`${adb} -s ${serial} shell ime set com.android.adbkeyboard/.AdbIME`);
    } catch (e) {
      console.warn(`[ADB] ADB Keyboard not found or failed to set. Make sure it is installed.`);
    }
  }
}
