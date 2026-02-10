import { ADB } from './adb';
import { RefSystem } from './ref-system';
import { ActionExecutor } from './action-executor';
import { TutanPlanner, PlanResult } from './planner';

export interface AgentEvent {
  type: 'status' | 'step' | 'done' | 'error' | 'warning';
  data: any;
}

export class TutanAgent {
  private refSystem: RefSystem;
  private executor: ActionExecutor;
  private planner: TutanPlanner;
  private history: any[] = [];
  private isRunning: boolean = false;
  private abortRequested: boolean = false;
  private maxSteps: number = 20;

  constructor(private serial: string, private clientConfig?: any) {
    this.refSystem = new RefSystem();
    this.executor = new ActionExecutor(serial, this.refSystem);
    this.planner = new TutanPlanner();
  }

  async *runTask(task: string): AsyncGenerator<AgentEvent> {
    this.isRunning = true;
    this.abortRequested = false;
    this.history = [];
    let stepCount = 0;

    yield { type: 'status', data: { message: 'Task started' } };

    try {
      while (this.isRunning && stepCount < this.maxSteps) {
        if (this.abortRequested) {
          yield { type: 'status', data: { message: 'Task aborted by user' } };
          return;
        }

        stepCount++;
        yield { type: 'status', data: { message: `Executing Step ${stepCount}...` } };

        // 1. Perception: Get UI context
        console.log(`[Agent] Step ${stepCount}: Dumping UI hierarchy...`);
        const xml = await ADB.dumpHierarchy(this.serial);
        const uiContext = this.refSystem.parseXmlDump(xml);
        console.log(`[Agent] UI context parsed, found ${uiContext.split('\n').length} elements.`);

        // 2. Planning: Call LLM
        console.log(`[Agent] Calling planner...`);
        const plan: PlanResult = await this.planner.planNextStep(task, uiContext, this.history, this.clientConfig);
        console.log(`[Agent] Plan received: ${plan.action}`, plan.params);

        if (plan.error || plan.action === 'error') {
          console.error(`[Agent] Planner error: ${plan.error}`);
          yield { type: 'error', data: { message: plan.error || 'Planner error' } };
          break;
        }

        // 3. Emit Step Event
        yield {
          type: 'step',
          data: {
            step: stepCount,
            thinking: plan.thinking,
            action: plan.action,
            params: plan.params
          }
        };

        // 4. Termination Check
        if (plan.action === 'finish') {
          console.log(`[Agent] Task finished: ${plan.params.message}`);
          yield { type: 'done', data: { message: plan.params.message || 'Task completed' } };
          break;
        }

        // 5. Execution: Perform action
        console.log(`[Agent] Executing action: ${plan.action}...`);
        const success = await this.executor.execute(plan.action, plan.params);
        console.log(`[Agent] Action execution result: ${success ? 'SUCCESS' : 'FAILED'}`);

        // 6. Update History
        this.history.push({
          role: 'assistant',
          content: JSON.stringify(plan)
        });
        this.history.push({
          role: 'user',
          content: `Action result: ${success ? 'Success' : 'Failed'}`
        });

        if (!success) {
          yield { type: 'warning', data: { message: `Action ${plan.action} failed, retrying...` } };
        }

        // Wait for UI to settle
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      if (stepCount >= this.maxSteps) {
        yield { type: 'error', data: { message: 'Maximum steps reached' } };
      }
    } catch (error: any) {
      yield { type: 'error', data: { message: error.message } };
    } finally {
      this.isRunning = false;
    }
  }

  abort() {
    this.abortRequested = true;
  }
}
