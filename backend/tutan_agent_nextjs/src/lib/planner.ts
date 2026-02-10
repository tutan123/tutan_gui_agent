import axios from 'axios';
import { RefSystem } from './ref-system';

export interface PlanResult {
  thinking: string;
  action: string;
  params: Record<string, any>;
  error?: string;
}

export class TutanPlanner {
  private apiKey: string;
  private baseUrl: string;
  private model: string;

  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY || 'sk-vP6XdXWgDHA9IpF7XqsTT0Laov8xb7XqPiIMW42NSWBExA1a';
    this.baseUrl = process.env.OPENAI_BASE_URL || 'https://api.moonshot.cn/v1';
    this.model = process.env.OPENAI_MODEL || 'kimi-k2.5';
  }

  private getSystemPrompt(): string {
    return `
You are an expert Android GUI Agent. Your goal is to complete the user's task by interacting with the device.
You are provided with a 'UI Context' which lists elements with semantic IDs like [e1], [e2], etc.

### Strategy:
1. **Semantic Understanding**: Use the text and labels in the UI Context to identify elements.
2. **Stable References**: Always prefer using [eX] IDs over coordinates.
3. **Step-by-Step Reasoning**: Explain your thinking before choosing an action.
4. **Error Recovery**: If an action fails, try an alternative path or check if you are on the right screen.

### Available Actions:
- click(ref_id): Click on an element by its ID (e.g., click("e5"))
- type(ref_id, text): Type text into an editable element (e.g., type("e2", "hello"))
- scroll(direction): Scroll the screen ("up", "down", "left", "right")
- back(): Press the system back button
- home(): Press the system home button
- wait(seconds): Wait for the UI to update
- finish(message): Task is completed with a summary message

### Output Format (Strict JSON):
{
    "thinking": "Analyze the current screen and plan the next move.",
    "action": "click | type | scroll | back | home | wait | finish",
    "params": {
        "ref_id": "eX",
        "text": "optional text",
        "direction": "up|down",
        "message": "final result"
    }
}
    `.trim();
  }

  async planNextStep(task: string, uiContext: string, history: any[]): Promise<PlanResult> {
    const prompt = `User Task: ${task}\n\nUI Context (Ref System):\n${uiContext}\n\nDecide the next step.`;

    const messages = [
      { role: 'system', content: this.getSystemPrompt() },
      ...history,
      { role: 'user', content: prompt }
    ];

    try {
      const response = await axios.post(`${this.baseUrl}/chat/completions`, {
        model: this.model,
        messages: messages,
        response_format: { type: 'json_object' },
        temperature: 0
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.status === 200) {
        const content = response.data.choices[0].message.content;
        return JSON.parse(content) as PlanResult;
      } else {
        return { thinking: "", action: "error", params: {}, error: `API returned ${response.status}` };
      }
    } catch (error: any) {
      console.error('[Planner Error]', error.response?.data || error.message);
      return { thinking: "", action: "error", params: {}, error: error.message };
    }
  }
}
