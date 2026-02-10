import { ADB } from './adb';
import { RefSystem } from './ref-system';

export class ActionExecutor {
  constructor(private serial: string, private refSystem: RefSystem) {}

  async execute(action: string, params: any): Promise<boolean> {
    console.log(`[Executor] Executing ${action} with params:`, params);

    try {
      switch (action) {
        case 'click':
          return await this.handleClick(params);
        case 'type':
          return await this.handleType(params);
        case 'scroll':
          return await this.handleScroll(params);
        case 'long_press':
          return await this.handleLongPress(params);
        case 'back':
          await ADB.sendKey(this.serial, 'BACK');
          return true;
        case 'home':
          await ADB.sendKey(this.serial, 'HOME');
          return true;
        case 'wait':
          await new Promise(resolve => setTimeout(resolve, (params.seconds || 1) * 1000));
          return true;
        default:
          console.error(`[Executor] Unknown action: ${action}`);
          return false;
      }
    } catch (error) {
      console.error(`[Executor] Action failed:`, error);
      return false;
    }
  }

  private async handleClick(params: any): Promise<boolean> {
    const { ref_id, x, y } = params;
    
    if (ref_id) {
      const node = this.refSystem.getNode(ref_id);
      if (!node) return false;
      
      const centerX = Math.floor((node.bounds.left + node.bounds.right) / 2);
      const centerY = Math.floor((node.bounds.top + node.bounds.bottom) / 2);
      await ADB.tap(this.serial, centerX, centerY);
      return true;
    } else if (x !== undefined && y !== undefined) {
      await ADB.tap(this.serial, x, y);
      return true;
    }
    return false;
  }

  private async handleType(params: any): Promise<boolean> {
    const { ref_id, text } = params;
    if (ref_id) {
      // Focus first
      await this.handleClick({ ref_id });
      await new Promise(resolve => setTimeout(resolve, 500));
    }
    await ADB.typeText(this.serial, text);
    return true;
  }

  private async handleScroll(params: any): Promise<boolean> {
    const { direction } = params;
    const { width, height } = await ADB.getScreenSize(this.serial);
    
    const centerX = Math.floor(width / 2);
    const centerY = Math.floor(height / 2);
    const offset = Math.floor(height * 0.4);

    switch (direction) {
      case 'up':
        await ADB.swipe(this.serial, centerX, centerY - offset, centerX, centerY + offset);
        break;
      case 'down':
        await ADB.swipe(this.serial, centerX, centerY + offset, centerX, centerY - offset);
        break;
      case 'left':
        await ADB.swipe(this.serial, centerX + 200, centerY, centerX - 200, centerY);
        break;
      case 'right':
        await ADB.swipe(this.serial, centerX - 200, centerY, centerX + 200, centerY);
        break;
      default:
        return false;
    }
    return true;
  }

  private async handleLongPress(params: any): Promise<boolean> {
    const { ref_id, x, y, duration } = params;
    let targetX = x;
    let targetY = y;

    if (ref_id) {
      const node = this.refSystem.getNode(ref_id);
      if (!node) return false;
      targetX = Math.floor((node.bounds.left + node.bounds.right) / 2);
      targetY = Math.floor((node.bounds.top + node.bounds.bottom) / 2);
    }

    if (targetX !== undefined && targetY !== undefined) {
      await ADB.longPress(this.serial, targetX, targetY, duration || 1000);
      return true;
    }
    return false;
  }
}
