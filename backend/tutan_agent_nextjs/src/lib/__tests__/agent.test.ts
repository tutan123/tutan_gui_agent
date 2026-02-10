import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TutanAgent } from '@/lib/agent';
import { ADB } from '@/lib/adb';
import { TutanPlanner } from '@/lib/planner';

// Mock ADB and Planner
vi.mock('@/lib/adb', () => ({
  ADB: {
    dumpHierarchy: vi.fn().mockResolvedValue('<node class="android.view.View" bounds="[0,0][100,100]" clickable="true" />'),
    tap: vi.fn().mockResolvedValue(undefined),
    getScreenSize: vi.fn().mockResolvedValue({ width: 1080, height: 1920 })
  }
}));

vi.mock('@/lib/planner', () => {
  const mockPlanNextStep = vi.fn()
    .mockResolvedValueOnce({
      thinking: "I will click.",
      action: "click",
      params: { ref_id: "e1" }
    })
    .mockResolvedValueOnce({
      thinking: "Task done.",
      action: "finish",
      params: { message: "Success" }
    });

  return {
    TutanPlanner: vi.fn().mockImplementation(() => ({
      planNextStep: mockPlanNextStep
    }))
  };
});

describe('TutanAgent', () => {
  const serial = 'test_serial';
  let agent: TutanAgent;

  beforeEach(() => {
    agent = new TutanAgent(serial);
    vi.clearAllMocks();
  });

  it('should run a task loop correctly', async () => {
    const events = [];
    for await (const event of agent.runTask('test task')) {
      events.push(event);
    }

    // Verify events sequence
    expect(events[0].type).toBe('status'); // Task started
    expect(events.some(e => e.type === 'step')).toBe(true);
    expect(events.some(e => e.type === 'done')).toBe(true);

    // Verify ADB calls
    expect(ADB.dumpHierarchy).toHaveBeenCalledWith(serial);
    expect(ADB.tap).toHaveBeenCalled();
  });

  it('should respect abort request', async () => {
    const events: any[] = [];
    const generator = agent.runTask('test task');
    
    // We need to trigger the loop first to check abortRequested
    const firstPromise = generator.next();
    agent.abort();
    
    let result = await firstPromise;
    while (!result.done) {
      events.push(result.value);
      result = await generator.next();
    }

    expect(events.some(e => e.data?.message?.includes('aborted'))).toBe(true);
  });
});
