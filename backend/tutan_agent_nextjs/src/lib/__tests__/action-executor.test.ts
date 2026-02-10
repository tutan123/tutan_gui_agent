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
});
