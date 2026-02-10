import { describe, it, expect, vi } from 'vitest';
import { TutanPlanner } from '@/lib/planner';
import axios from 'axios';

vi.mock('axios');

describe('TutanPlanner', () => {
  it('should plan next step correctly', async () => {
    const planner = new TutanPlanner();
    const mockResponse = {
      status: 200,
      data: {
        choices: [{
          message: {
            content: JSON.stringify({
              thinking: "I will click the login button.",
              action: "click",
              params: { ref_id: "e1" }
            })
          }
        }]
      }
    };

    (axios.post as any).mockResolvedValue(mockResponse);

    const result = await planner.planNextStep('Login to the app', '[e1] Button text="Login"', []);

    expect(result.action).toBe('click');
    expect(result.params.ref_id).toBe('e1');
    expect(result.thinking).toBe('I will click the login button.');
  });

  it('should handle API errors', async () => {
    const planner = new TutanPlanner();
    (axios.post as any).mockRejectedValue(new Error('Network Error'));

    const result = await planner.planNextStep('task', 'context', []);
    expect(result.action).toBe('error');
    expect(result.error).toBe('Network Error');
  });
});
