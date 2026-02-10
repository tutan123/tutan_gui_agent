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
  return {
    TutanPlanner: class {
      planNextStep = vi.fn()
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
      close = vi.fn();
    }
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

  it('should handle planner error', async () => {
    const planner = (agent as any).planner;
    planner.planNextStep.mockReset();
    planner.planNextStep.mockResolvedValue({
      error: "API Key invalid",
      action: "error",
      params: {}
    });

    const events = [];
    for await (const event of agent.runTask('test task')) {
      events.push(event);
    }

    expect(events.some(e => e.type === 'error' && e.data.message === 'API Key invalid')).toBe(true);
  });

  it('should handle action failure', async () => {
    const planner = (agent as any).planner;
    planner.planNextStep.mockReset();
    planner.planNextStep
      .mockResolvedValueOnce({
        thinking: "Clicking...",
        action: "click",
        params: { ref_id: "non-existent" }
      })
      .mockResolvedValueOnce({
        thinking: "Done.",
        action: "finish",
        params: { message: "Finished" }
      });

    const events = [];
    for await (const event of agent.runTask('test task')) {
      events.push(event);
    }

    expect(events.some(e => e.type === 'warning' && e.data.message.includes('failed'))).toBe(true);
  });

  it('should handle exceptions in the loop', async () => {
    vi.mocked(ADB.dumpHierarchy).mockRejectedValueOnce(new Error('ADB connection lost'));

    const events = [];
    for await (const event of agent.runTask('test task')) {
      events.push(event);
    }

    expect(events.some(e => e.type === 'error' && e.data.message === 'ADB connection lost')).toBe(true);
  });

  it('should handle max steps reached', async () => {
    const planner = (agent as any).planner;
    planner.planNextStep.mockReset();
    planner.planNextStep.mockResolvedValue({
      thinking: "Thinking...",
      action: "wait",
      params: { seconds: 0.01 }
    });
    (agent as any).maxSteps = 2;

    const events = [];
    for await (const event of agent.runTask('test task')) {
      events.push(event);
    }

    expect(events.some(e => e.type === 'error' && e.data.message === 'Maximum steps reached')).toBe(true);
  }, 10000);
});
