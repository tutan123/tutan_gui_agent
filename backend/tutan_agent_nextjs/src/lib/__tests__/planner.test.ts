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

  it('should update config from client', async () => {
    const planner = new TutanPlanner();
    const mockResponse = {
      status: 200,
      data: {
        choices: [{
          message: {
            content: JSON.stringify({ thinking: "ok", action: "wait", params: {} })
          }
        }]
      }
    };
    (axios.post as any).mockResolvedValue(mockResponse);

    const clientConfig = {
      apiKey: 'new-key',
      baseUrl: 'https://new-api.com',
      model: 'new-model'
    };

    await planner.planNextStep('task', 'context', [], clientConfig);

    expect(axios.post).toHaveBeenCalledWith(
      'https://new-api.com/chat/completions',
      expect.objectContaining({ model: 'new-model' }),
      expect.objectContaining({
        headers: expect.objectContaining({
          'Authorization': 'Bearer new-key'
        })
      })
    );
  });

  it('should handle non-200 API response', async () => {
    const planner = new TutanPlanner();
    const mockResponse = {
      status: 401,
      data: { error: "Unauthorized" }
    };
    (axios.post as any).mockResolvedValue(mockResponse);

    const result = await planner.planNextStep('task', 'context', []);
    expect(result.action).toBe('error');
    expect(result.error).toContain('401');
  });
});
