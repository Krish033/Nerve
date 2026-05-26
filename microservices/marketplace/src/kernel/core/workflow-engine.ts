/**
 * WORKFLOW ENGINE
 * 
 * Event-driven automation system with triggers, actions, and conditions.
 * Supports: WHEN X THEN DO Y
 */

import { Injectable, Logger } from '@nestjs/common';
import { IKernel, Subscription } from '../contracts/module.contract';

export interface Workflow {
  id: string;
  name: string;
  description?: string;
  tenantId?: string;
  enabled: boolean;
  trigger: WorkflowTrigger;
  conditions?: WorkflowCondition[];
  actions: WorkflowAction[];
  createdAt: Date;
  updatedAt: Date;
}

export interface WorkflowTrigger {
  type: 'event' | 'schedule' | 'webhook' | 'manual';
  config: Record<string, any>;
  // For event triggers
  event?: string;
  // For schedule triggers
  cron?: string;
  // For webhook triggers
  webhook?: {
    method: string;
    path: string;
  };
}

export interface WorkflowCondition {
  id: string;
  type: 'equals' | 'not_equals' | 'contains' | 'gt' | 'lt' | 'regex' | 'custom';
  field: string;
  value: any;
  operator?: 'and' | 'or';
}

export interface WorkflowAction {
  id: string;
  type: string;
  name: string;
  config: Record<string, any>;
  // Action-specific configs
  delay?: number; // Delay before execution (ms)
  retry?: {
    attempts: number;
    delay: number;
  };
  onError?: 'continue' | 'stop' | 'retry';
}

export interface WorkflowExecution {
  id: string;
  workflowId: string;
  tenantId?: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  triggerData: any;
  context: WorkflowContext;
  startedAt?: Date;
  completedAt?: Date;
  error?: string;
  actionResults: ActionResult[];
  createdAt: Date;
}

export interface WorkflowContext {
  [key: string]: any;
}

export interface ActionResult {
  actionId: string;
  status: 'pending' | 'success' | 'failed' | 'skipped';
  output?: any;
  error?: string;
  startedAt?: Date;
  completedAt?: Date;
}

export interface ActionHandler {
  (context: WorkflowContext, config: Record<string, any>): Promise<any>;
}

@Injectable()
export class WorkflowEngine {
  private readonly logger = new Logger(WorkflowEngine.name);
  private kernel: IKernel | undefined;
  private workflows = new Map<string, Workflow>();
  private handlers = new Map<string, ActionHandler>();
  private executions = new Map<string, WorkflowExecution>();
  private subscriptions: Subscription[] = [];

  setKernel(kernel: IKernel): void {
    this.kernel = kernel;
  }

  async initialize(): Promise<void> {
    this.registerDefaultHandlers();
    this.logger.log('Workflow engine initialized');
  }

  /**
   * Register a workflow
   */
  async registerWorkflow(workflow: Workflow): Promise<void> {
    // Validate workflow
    this.validateWorkflow(workflow);

    // Store workflow
    this.workflows.set(workflow.id, workflow);

    // Setup trigger
    await this.setupTrigger(workflow);

    this.logger.log(`Workflow registered: ${workflow.name} (${workflow.id})`);
  }

  /**
   * Unregister a workflow
   */
  async unregisterWorkflow(workflowId: string): Promise<void> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) return;

    // Remove trigger subscription
    this.teardownTrigger(workflow);

    // Remove workflow
    this.workflows.delete(workflowId);

    this.logger.log(`Workflow unregistered: ${workflowId}`);
  }

  /**
   * Execute workflow manually
   */
  async executeWorkflow(
    workflowId: string,
    triggerData: any = {},
    context: WorkflowContext = {},
  ): Promise<WorkflowExecution> {
    const workflow = this.workflows.get(workflowId);
    if (!workflow) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    if (!workflow.enabled) {
      throw new Error(`Workflow ${workflowId} is disabled`);
    }

    // Create execution
    const execution: WorkflowExecution = {
      id: this.generateExecutionId(),
      workflowId,
      tenantId: workflow.tenantId,
      status: 'pending',
      triggerData,
      context: {
        ...context,
        workflowId,
        executionId: this.generateExecutionId(),
        timestamp: new Date().toISOString(),
      },
      actionResults: workflow.actions.map((action) => ({
        actionId: action.id,
        status: 'pending',
      })),
      createdAt: new Date(),
    };

    this.executions.set(execution.id, execution);

    // Execute asynchronously
    this.runExecution(execution, workflow);

    return execution;
  }

  /**
   * Get workflow execution status
   */
  getExecution(executionId: string): WorkflowExecution | undefined {
    return this.executions.get(executionId);
  }

  /**
   * Cancel workflow execution
   */
  async cancelExecution(executionId: string): Promise<boolean> {
    const execution = this.executions.get(executionId);
    if (!execution) return false;

    if (execution.status === 'completed' || execution.status === 'failed') {
      return false;
    }

    execution.status = 'cancelled';
    execution.completedAt = new Date();

    this.logger.log(`Execution cancelled: ${executionId}`);
    return true;
  }

  /**
   * Register an action handler
   */
  registerAction(type: string, handler: ActionHandler): void {
    this.handlers.set(type, handler);
    this.logger.debug(`Action handler registered: ${type}`);
  }

  /**
   * Get all workflows
   */
  getWorkflows(tenantId?: string): Workflow[] {
    const all = Array.from(this.workflows.values());
    if (tenantId) {
      return all.filter((w) => w.tenantId === tenantId || !w.tenantId);
    }
    return all;
  }

  /**
   * Get available action types
   */
  getAvailableActions(): string[] {
    return Array.from(this.handlers.keys());
  }

  // Private methods

  private validateWorkflow(workflow: Workflow): void {
    if (!workflow.id) throw new Error('Workflow ID is required');
    if (!workflow.name) throw new Error('Workflow name is required');
    if (!workflow.trigger) throw new Error('Workflow trigger is required');
    if (!workflow.actions || workflow.actions.length === 0) {
      throw new Error('Workflow must have at least one action');
    }

    // Validate actions have handlers
    for (const action of workflow.actions) {
      if (!this.handlers.has(action.type)) {
        throw new Error(`Unknown action type: ${action.type}`);
      }
    }
  }

  private async setupTrigger(workflow: Workflow): Promise<void> {
    const { trigger } = workflow;

    if (trigger.type === 'event' && trigger.event) {
      // Subscribe to event
      const subscription = this.kernel?.events.on(
        trigger.event,
        async (payload, metadata) => {
          // Check tenant if workflow is tenant-scoped
          if (
            workflow.tenantId &&
            metadata.tenantId !== workflow.tenantId
          ) {
            return;
          }

          // Execute workflow
          await this.executeWorkflow(workflow.id, payload, {
            event: trigger.event,
            tenantId: metadata.tenantId,
            userId: metadata.userId,
          });
        },
      );

      if (subscription) {
        this.subscriptions.push(subscription);
      }
    }

    // Schedule and webhook triggers would be set up here
    // For schedules, integrate with node-cron or bull
    // For webhooks, register with API router
  }

  private teardownTrigger(workflow: Workflow): void {
    // Unsubscribe from events
    this.subscriptions = this.subscriptions.filter((sub) => {
      // In a real implementation, we'd track which subscription belongs to which workflow
      // For now, we keep all subscriptions
      return true;
    });
  }

  private async runExecution(
    execution: WorkflowExecution,
    workflow: Workflow,
  ): Promise<void> {
    execution.status = 'running';
    execution.startedAt = new Date();

    this.logger.debug(`Starting execution: ${execution.id}`);

    try {
      // Check conditions
      if (workflow.conditions && workflow.conditions.length > 0) {
        const conditionsMet = this.evaluateConditions(
          workflow.conditions,
          execution.triggerData,
        );

        if (!conditionsMet) {
          execution.status = 'completed';
          execution.completedAt = new Date();
          this.logger.debug(`Execution ${execution.id} skipped (conditions not met)`);
          return;
        }
      }

      // Execute actions sequentially
      for (let i = 0; i < workflow.actions.length; i++) {
        const action = workflow.actions[i];
        const result = execution.actionResults[i];

        if (execution.status !== 'running') {
          result.status = 'skipped';
          continue;
        }

        try {
          result.startedAt = new Date();
          result.status = 'pending';

          // Handle delay
          if (action.delay) {
            await this.sleep(action.delay);
          }

          // Execute action
          const handler = this.handlers.get(action.type);
          if (!handler) {
            throw new Error(`No handler for action type: ${action.type}`);
          }

          const output = await handler(execution.context, action.config);

          result.status = 'success';
          result.output = output;
          result.completedAt = new Date();

          // Update context with action output
          execution.context[`action_${action.id}`] = output;
        } catch (error) {
          result.status = 'failed';
          result.error =
            error instanceof Error ? error.message : String(error);
          result.completedAt = new Date();

          this.logger.error(
            `Action ${action.id} failed in execution ${execution.id}`,
            error as Error,
          );

          // Handle error based on action config
          if (action.onError === 'stop') {
            throw error;
          } else if (action.onError === 'retry' && action.retry) {
            // Retry logic would go here
          }
          // Continue by default
        }
      }

      execution.status = 'completed';
      execution.completedAt = new Date();

      this.logger.debug(`Execution completed: ${execution.id}`);

      // Emit completion event
      await this.kernel?.events.emit('workflow.completed', {
        executionId: execution.id,
        workflowId: workflow.id,
        tenantId: workflow.tenantId,
        status: execution.status,
      });
    } catch (error) {
      execution.status = 'failed';
      execution.error = error instanceof Error ? error.message : String(error);
      execution.completedAt = new Date();

      this.logger.error(`Execution failed: ${execution.id}`, error as Error);

      // Emit failure event
      await this.kernel?.events.emit('workflow.failed', {
        executionId: execution.id,
        workflowId: workflow.id,
        tenantId: workflow.tenantId,
        error: execution.error,
      });
    }
  }

  private evaluateConditions(
    conditions: WorkflowCondition[],
    data: any,
  ): boolean {
    for (const condition of conditions) {
      const value = this.getValueByPath(data, condition.field);
      let result = false;

      switch (condition.type) {
        case 'equals':
          result = value === condition.value;
          break;
        case 'not_equals':
          result = value !== condition.value;
          break;
        case 'contains':
          result =
            typeof value === 'string' &&
            value.includes(condition.value);
          break;
        case 'gt':
          result = value > condition.value;
          break;
        case 'lt':
          result = value < condition.value;
          break;
        case 'regex':
          result = new RegExp(condition.value).test(String(value));
          break;
        case 'custom':
          // Custom condition logic would go here
          result = true;
          break;
      }

      if (!result && condition.operator !== 'or') {
        return false;
      }
      if (result && condition.operator === 'or') {
        return true;
      }
    }

    return true;
  }

  private getValueByPath(obj: any, path: string): any {
    return path.split('.').reduce((o, p) => o?.[p], obj);
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private generateExecutionId(): string {
    return `exec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private registerDefaultHandlers(): void {
    // Send notification action
    this.registerAction('notification', async (context, config) => {
      await this.kernel?.events.emit('notification.send', {
        userId: config.userId,
        title: config.title,
        message: config.message,
        type: config.type || 'info',
      });
      return { sent: true };
    });

    // HTTP request action
    this.registerAction('http', async (context, config) => {
      // HTTP request logic would go here
      this.logger.debug(`HTTP action: ${config.method} ${config.url}`);
      return { status: 200 };
    });

    // Delay action
    this.registerAction('delay', async (context, config) => {
      await this.sleep(config.duration || 1000);
      return { delayed: config.duration };
    });

    // Log action
    this.registerAction('log', async (context, config) => {
      this.logger.log(config.message, context);
      return { logged: true };
    });

    // Transform data action
    this.registerAction('transform', async (context, config) => {
      // Data transformation logic would go here
      return { transformed: true };
    });

    // Emit event action
    this.registerAction('emit_event', async (context, config) => {
      await this.kernel?.events.emit(config.event, config.payload);
      return { emitted: config.event };
    });
  }
}
