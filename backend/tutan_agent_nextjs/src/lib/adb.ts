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
  private static adbPath: string = 'adb';

  /**
   * List all connected devices.
   */
  static async listDevices(): Promise<ADBDeviceInfo[]> {
    try {
      const { stdout } = await execAsync(`${this.adbPath} devices -l`);
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
    } catch (error) {
      console.error('Failed to list devices:', error);
      return [];
    }
  }

  /**
   * Dump UI hierarchy to an XML string.
   * This is the foundation for the Ref System.
   */
  static async dumpHierarchy(serial: string): Promise<string> {
    const remotePath = '/data/local/tmp/uidump.xml';
    const localPath = path.join(os.tmpdir(), `tutan_dump_${serial}.xml`);

    try {
      // 1. Trigger dump on device
      await execAsync(`${this.adbPath} -s ${serial} shell uiautomator dump ${remotePath}`);
      
      // 2. Pull to local machine
      await execAsync(`${this.adbPath} -s ${serial} pull ${remotePath} ${localPath}`);
      
      // 3. Read file content
      const xmlContent = await fs.readFile(localPath, 'utf-8');
      
      // Cleanup (async, don't wait)
      fs.unlink(localPath).catch(() => {});
      
      return xmlContent;
    } catch (error) {
      console.error(`Failed to dump hierarchy for ${serial}:`, error);
      throw error;
    }
  }

  /**
   * Perform a tap at coordinates.
   */
  static async tap(serial: string, x: number, y: number): Promise<void> {
    await execAsync(`${this.adbPath} -s ${serial} shell input tap ${x} ${y}`);
  }

  /**
   * Perform a swipe.
   */
  static async swipe(serial: string, x1: number, y1: number, x2: number, y2: number, duration: number = 300): Promise<void> {
    await execAsync(`${this.adbPath} -s ${serial} shell input swipe ${x1} ${y1} ${x2} ${y2} ${duration}`);
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
    // Replace spaces with %s for ADB
    const escaped = text.replace(/\s/g, '%s');
    await execAsync(`${this.adbPath} -s ${serial} shell input text "${escaped}"`);
  }

  /**
   * Send key event.
   */
  static async sendKey(serial: string, key: string): Promise<void> {
    await execAsync(`${this.adbPath} -s ${serial} shell input keyevent ${key}`);
  }

  /**
   * Get screen size.
   */
  static async getScreenSize(serial: string): Promise<{ width: number, height: number }> {
    const { stdout } = await execAsync(`${this.adbPath} -s ${serial} shell wm size`);
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
    try {
      // Use exec-out for faster transfer directly to buffer
      const { stdout } = await execAsync(`${this.adbPath} -s ${serial} exec-out screencap -p`, {
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
    console.log(`[ADB] Setting up ADB Keyboard for ${serial}...`);
    try {
      await execAsync(`${this.adbPath} -s ${serial} shell ime set com.android.adbkeyboard/.AdbIME`);
    } catch (e) {
      console.warn(`[ADB] ADB Keyboard not found or failed to set. Make sure it is installed.`);
    }
  }
}
