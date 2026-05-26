/**
 * QUEUE SERVICE
 * 
 * Async job processing infrastructure.
 * Heavy jobs must NEVER block API threads.
 */

import { Injectable, Logger } from '@nestjs/common';
import {
  IQueueService,
  IKernel,
  JobDefinition,
  JobOptions,
  JobId,
  JobHandler,
  JobContext,
  JobStatus,
} from '../contracts/module.contract';

// In-memory queue implementation (replace with Bull/Redis for production)
interface QueuedJob<T = any> {
  id: JobId;
  name: string;
  data: T;
  queue: string;
  options: JobOptions;
  status: JobStatus['state'];
  progress: number;
  attempts: number;
  error?: string;
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  handler?: JobHandler<T>;
}

@Injectable()
export class QueueService implements IQueueService {
  private readonly logger = new Logger(QueueService.name);
  private kernel: IKernel | undefined;
  private queues = new Map<string, QueuedJob[]>();
  private jobs = new Map<JobId, QueuedJob>();
  private processors = new Map<string, JobHandler<any>>();
  private running = false;
  private jobCounter = 0;

  // Configuration
  private readonly MAX_ATTEMPTS = 3;
  private readonly CONCURRENCY = 5;
  private readonly POLL_INTERVAL = 1000;
  private pollTimer: NodeJS.Timeout | null = null;

  setKernel(kernel: IKernel): void {
    this.kernel = kernel;
  }

  async initialize(): Promise<void> {
    this.logger.log('Queue service initialized');
  }

  async start(): Promise<void> {
    if (this.running) return;

    this.running = true;
    this.startPolling();
    this.logger.log('Queue processing started');
  }

  async stop(): Promise<void> {
    this.running = false;

    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }

    this.logger.log('Queue processing stopped');
  }

  /**
   * Add job to queue
   */
  async add<T = any>(
    queue: string,
    job: JobDefinition<T>,
    options?: JobOptions,
  ): Promise<JobId> {
    const jobId = this.generateJobId();

    const queuedJob: QueuedJob<T> = {
      id: jobId,
      name: job.name,
      data: job.data,
      queue,
      options: {
        attempts: this.MAX_ATTEMPTS,
        backoff: 'exponential',
        ...options,
      },
      status: options?.delay ? 'delayed' : 'pending',
      progress: 0,
      attempts: 0,
      createdAt: Date.now(),
    };

    // Store job
    this.jobs.set(jobId, queuedJob);

    // Add to queue
    const queueJobs = this.queues.get(queue) || [];
    queueJobs.push(queuedJob);
    this.queues.set(queue, queueJobs);

    this.logger.debug(`Job ${jobId} added to queue ${queue}`);

    // Emit event
    await this.kernel?.events.emit('job.created', {
      jobId,
      queue,
      name: job.name,
      tenantId: options?.tenantId,
    });

    // Trigger immediate processing
    if (this.running && !options?.delay) {
      this.processQueue(queue);
    }

    return jobId;
  }

  /**
   * Register job processor
   */
  process<T = any>(queue: string, handler: JobHandler<T>): void {
    this.processors.set(queue, handler as JobHandler<any>);
    this.logger.debug(`Processor registered for queue: ${queue}`);

    // Start processing if running
    if (this.running) {
      this.processQueue(queue);
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: JobId): Promise<JobStatus> {
    const job = this.jobs.get(jobId);

    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    return {
      id: job.id,
      state: job.status,
      progress: job.progress,
      attempts: job.attempts,
      error: job.error,
    };
  }

  /**
   * Cancel job
   */
  async cancelJob(jobId: JobId): Promise<boolean> {
    const job = this.jobs.get(jobId);

    if (!job) {
      return false;
    }

    if (job.status === 'completed' || job.status === 'failed') {
      return false; // Already finished
    }

    // Remove from queue
    const queueJobs = this.queues.get(job.queue) || [];
    const filtered = queueJobs.filter((j) => j.id !== jobId);
    this.queues.set(job.queue, filtered);

    // Update status
    job.status = 'failed';
    job.error = 'Cancelled by user';
    job.completedAt = Date.now();

    this.logger.debug(`Job ${jobId} cancelled`);

    return true;
  }

  /**
   * Get queue statistics
   */
  getQueueStats(queue: string): QueueStats {
    const jobs = this.queues.get(queue) || [];

    return {
      name: queue,
      pending: jobs.filter((j) => j.status === 'pending').length,
      active: jobs.filter((j) => j.status === 'active').length,
      completed: jobs.filter((j) => j.status === 'completed').length,
      failed: jobs.filter((j) => j.status === 'failed').length,
      delayed: jobs.filter((j) => j.status === 'delayed').length,
      total: jobs.length,
    };
  }

  /**
   * Get all queue statistics
   */
  async getAllStats(): Promise<QueueStats[]> {
    return Array.from(this.queues.keys()).map((queue) =>
      this.getQueueStats(queue),
    );
  }

  /**
   * Health check
   */
  async isHealthy(): Promise<boolean> {
    // Check if processing is working
    return this.running;
  }

  /**
   * Clean up old completed jobs
   */
  async cleanup(maxAge: number = 24 * 60 * 60 * 1000): Promise<number> {
    const now = Date.now();
    let cleaned = 0;

    for (const [id, job] of this.jobs) {
      if (
        (job.status === 'completed' || job.status === 'failed') &&
        job.completedAt &&
        now - job.completedAt > maxAge
      ) {
        this.jobs.delete(id);
        cleaned++;
      }
    }

    this.logger.debug(`Cleaned up ${cleaned} old jobs`);
    return cleaned;
  }

  // Private methods

  private startPolling(): void {
    if (!this.running) return;

    this.pollTimer = setTimeout(() => {
      this.pollQueues();
      this.startPolling();
    }, this.POLL_INTERVAL);
  }

  private pollQueues(): void {
    for (const queue of this.queues.keys()) {
      this.processQueue(queue);
    }
  }

  private async processQueue(queueName: string): Promise<void> {
    const processor = this.processors.get(queueName);
    if (!processor) return;

    const jobs = this.queues.get(queueName) || [];
    const pending = jobs.filter((j) => j.status === 'pending');

    // Process up to concurrency limit
    const toProcess = pending.slice(0, this.CONCURRENCY);

    await Promise.all(
      toProcess.map((job) => this.executeJob(job, processor)),
    );
  }

  private async executeJob(
    job: QueuedJob,
    handler: JobHandler<any>,
  ): Promise<void> {
    if (job.status !== 'pending') return;

    // Mark as active
    job.status = 'active';
    job.startedAt = Date.now();
    job.attempts++;

    this.logger.debug(`Executing job ${job.id} (attempt ${job.attempts})`);

    try {
      // Set tenant context
      if (job.options.tenantId) {
        this.kernel?.tenant.setContext(job.options.tenantId);
      }

      // Create job context
      const context: JobContext<any> = {
        id: job.id,
        name: job.name,
        data: job.data,
        attempts: job.attempts,
        tenantId: job.options.tenantId,
        progress: async (progress: number) => {
          job.progress = Math.min(100, Math.max(0, progress));
          await this.kernel?.events.emit('job.progress', {
            jobId: job.id,
            progress: job.progress,
          });
        },
      };

      // Execute handler
      await handler(context);

      // Mark as completed
      job.status = 'completed';
      job.progress = 100;
      job.completedAt = Date.now();

      this.logger.debug(`Job ${job.id} completed`);

      // Emit event
      await this.kernel?.events.emit('job.completed', {
        jobId: job.id,
        queue: job.queue,
        name: job.name,
        duration: job.completedAt - job.startedAt,
      });
    } catch (error) {
      // Mark as failed or retry
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      job.error = errorMessage;

      if (job.attempts < (job.options.attempts || this.MAX_ATTEMPTS)) {
        // Retry
        job.status = 'pending';

        const delay = this.calculateBackoff(job.attempts, job.options.backoff);
        this.logger.warn(
          `Job ${job.id} failed, retrying in ${delay}ms (attempt ${job.attempts})`,
        );

        setTimeout(() => {
          this.processQueue(job.queue);
        }, delay);
      } else {
        // Max attempts reached
        job.status = 'failed';
        job.completedAt = Date.now();

        this.logger.error(`Job ${job.id} failed permanently`, error as Error);

        // Emit failure event
        await this.kernel?.events.emit('job.failed', {
          jobId: job.id,
          queue: job.queue,
          name: job.name,
          error: errorMessage,
          attempts: job.attempts,
        });
      }
    } finally {
      this.kernel?.tenant.clearContext();
    }
  }

  private calculateBackoff(
    attempt: number,
    backoff?: 'fixed' | 'exponential',
  ): number {
    if (backoff === 'fixed') {
      return 5000; // 5 seconds
    }

    // Exponential backoff with jitter
    const base = Math.pow(2, attempt) * 1000;
    const jitter = Math.random() * 1000;
    return Math.min(base + jitter, 30000); // Max 30 seconds
  }

  private generateJobId(): JobId {
    return `job_${Date.now()}_${++this.jobCounter}`;
  }
}

/**
 * Queue Statistics
 */
export interface QueueStats {
  name: string;
  pending: number;
  active: number;
  completed: number;
  failed: number;
  delayed: number;
  total: number;
}
