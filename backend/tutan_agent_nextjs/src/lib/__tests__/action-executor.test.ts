import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ActionExecutor } from '@/lib/action-executor';
import { RefSystem } from '@/lib/ref-system';
import { ADB } from '@/lib/adb';

// Mock ADB
vi.mock('@/lib/adb', () => ({
  ADB: {
    tap: vi.fn(),
    swipe: vi.fn(),
    longPress: vi.fn(),
    typeText: vi.fn(),
    sendKey: vi.fn(),
    getScreenSize: vi.fn(() => ({ width: 1080, height: 1920 }))
  }
}));

describe('ActionExecutor', () => {
  let refSystem: RefSystem;
  let executor: ActionExecutor;
  const serial = 'test_serial';

  beforeEach(() => {
    refSystem = new RefSystem();
    executor = new ActionExecutor(serial, refSystem);
    vi.clearAllMocks();
  });

  it('should execute click by ref_id', async () => {
    const xml = `<node class="android.widget.Button" text="OK" bounds="[100,100][200,200]" clickable="true" />`;
    refSystem.parseXmlDump(xml);
    
    const success = await executor.execute('click', { ref_id: 'e1' });
    
    expect(success).toBe(true);
    expect(ADB.tap).toHaveBeenCalledWith(serial, 150, 150);
  });

  it('should execute type by ref_id', async () => {
    const xml = `<node class="android.widget.EditText" focusable="true" bounds="[100,100][500,200]" />`;
    refSystem.parseXmlDump(xml);
    
    const success = await executor.execute('type', { ref_id: 'e1', text: 'hello' });
    
    expect(success).toBe(true);
    expect(ADB.tap).toHaveBeenCalledWith(serial, 300, 150);
    expect(ADB.typeText).toHaveBeenCalledWith(serial, 'hello');
  });

  it('should execute scroll down', async () => {
    const success = await executor.execute('scroll', { direction: 'down' });
    
    expect(success).toBe(true);
    // Center is 540, 960. Offset is 1920 * 0.4 = 768.
    // Swipe from (540, 960+768) to (540, 960-768)
    expect(ADB.swipe).toHaveBeenCalledWith(serial, 540, 1728, 540, 192);
  });

  it('should execute long_press by ref_id', async () => {
    const xml = `<node class="android.view.View" bounds="[100,100][200,200]" clickable="true" />`;
    refSystem.parseXmlDump(xml);
    
    const success = await executor.execute('long_press', { ref_id: 'e1' });
    
    expect(success).toBe(true);
    expect(ADB.longPress).toHaveBeenCalledWith(serial, 150, 150, 1000);
  });

  it('should execute scroll up', async () => {
    const success = await executor.execute('scroll', { direction: 'up' });
    expect(success).toBe(true);
    expect(ADB.swipe).toHaveBeenCalledWith(serial, 540, 192, 540, 1728);
  });

  it('should execute scroll left', async () => {
    const success = await executor.execute('scroll', { direction: 'left' });
    expect(success).toBe(true);
    expect(ADB.swipe).toHaveBeenCalledWith(serial, 740, 960, 340, 960);
  });

  it('should execute scroll right', async () => {
    const success = await executor.execute('scroll', { direction: 'right' });
    expect(success).toBe(true);
    expect(ADB.swipe).toHaveBeenCalledWith(serial, 340, 960, 740, 960);
  });

  it('should return false for unknown scroll direction', async () => {
    const success = await executor.execute('scroll', { direction: 'invalid' });
    expect(success).toBe(false);
  });

  it('should execute back action', async () => {
    const success = await executor.execute('back', {});
    expect(success).toBe(true);
    expect(ADB.sendKey).toHaveBeenCalledWith(serial, 'BACK');
  });

  it('should execute home action', async () => {
    const success = await executor.execute('home', {});
    expect(success).toBe(true);
    expect(ADB.sendKey).toHaveBeenCalledWith(serial, 'HOME');
  });

  it('should execute wait action', async () => {
    const success = await executor.execute('wait', { seconds: 0.1 });
    expect(success).toBe(true);
  });

  it('should return false for unknown action', async () => {
    const success = await executor.execute('unknown', {});
    expect(success).toBe(false);
  });

  it('should return false when ref_id not found in handleClick', async () => {
    const success = await executor.execute('click', { ref_id: 'non-existent' });
    expect(success).toBe(false);
  });

  it('should return false when ref_id not found in handleLongPress', async () => {
    const success = await executor.execute('long_press', { ref_id: 'non-existent' });
    expect(success).toBe(false);
  });

  it('should return false when no target in handleLongPress', async () => {
    const success = await executor.execute('long_press', {});
    expect(success).toBe(false);
  });

  it('should execute click by coordinates', async () => {
    const success = await executor.execute('click', { x: 100, y: 200 });
    expect(success).toBe(true);
    expect(ADB.tap).toHaveBeenCalledWith(serial, 100, 200);
  });

  it('should handle errors in execute', async () => {
    vi.mocked(ADB.tap).mockRejectedValueOnce(new Error('ADB error'));
    const success = await executor.execute('click', { x: 100, y: 200 });
    expect(success).toBe(false);
  });
});
