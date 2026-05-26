/**
 * QUEUE SERVICE - REDIS/BULLMQ IMPLEMENTATION
 * 
 * Production-grade async job processing with BullMQ.
 * Supports distributed workers, retries, dead letter queues.
 */

import { Injectable, Logger, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Queue, Worker, Job as BullJob } from 'bullmq';
import Redis from 'ioredis';
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

@Injectable()
export class QueueServiceRedis implements IQueueService, OnModuleDestroy {
  private readonly logger = new Logger(QueueServiceRedis.name);
  private kernel: IKernel | undefined;
  private redis: Redis;
  private queues = new Map<string, Queue>();
  private workers = new Map<string, Worker>();
  // Note: BullMQ v5 doesn't require QueueScheduler - delayed jobs work automatically
  private running = false;

  constructor(private readonly configService: ConfigService) {
    // Initialize Redis connection
    const redisUrl = this.configService.get<string>('REDIS_URL') || 'redis://localhost:6379';
    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: null,
      enableReadyCheck: false,
    });

    this.redis.on('connect', () => {
      this.logger.log('Redis connected for queue service');
    });

    this.redis.on('error', (err) => {
      this.logger.error('Redis connection error:', err);
    });
  }

  setKernel(kernel: IKernel): void {
    this.kernel = kernel;
  }

  async initialize(): Promise<void> {
    this.logger.log('Queue service (Redis) initialized');
  }

  async onModuleDestroy(): Promise<void> {
    await this.stop();
  }

  async start(): Promise<void> {
    if (this.running) return;

    this.running = true;
    this.logger.log('Queue processing started (Redis)');

    // Resume all workers
    for (const worker of this.workers.values()) {
      await worker.resume();
    }
  }

  async stop(): Promise<void> {
    this.running = false;

    // Close all workers
    for (const [name, worker] of this.workers) {
      await worker.close();
      this.logger.debug(`Worker ${name} closed`);
    }
    this.workers.clear();

    // Note: BullMQ v5 doesn't require QueueScheduler cleanup

    // Close all queues
    for (const [name, queue] of this.queues) {
      await queue.close();
      this.logger.debug(`Queue ${name} closed`);
    }
    this.queues.clear();

    // Close Redis connection
    await this.redis.quit();

    this.logger.log('Queue processing stopped');
  }

  /**
   * Add job to queue
   */
  async add<T = any>(
    queueName: string,
    job: JobDefinition<T>,
    options?: JobOptions,
  ): Promise<JobId> {
    const queue = this.getQueue(queueName);

    const bullJob = await queue.add(job.name, {
      ...job.data,
      __tenantId: options?.tenantId,
      __moduleId: job.moduleId,
    }, {
      delay: options?.delay,
      attempts: options?.attempts || 3,
      backoff: {
        type: options?.backoff || 'exponential',
        delay: 1000,
      },
      priority: options?.priority,
      removeOnComplete: {
        age: 24 * 3600, // Keep completed jobs for 24 hours
        count: 1000,
      },
      removeOnFail: {
        age: 7 * 24 * 3600, // Keep failed jobs for 7 days
        count: 5000,
      },
    });

    const jobId = bullJob.id as string;

    this.logger.debug(`Job ${jobId} added to queue ${queueName}`);

    // Emit event
    await this.kernel?.events.emit('job.created', {
      jobId,
      queue: queueName,
      name: job.name,
      tenantId: options?.tenantId,
    });

    return jobId;
  }

  /**
   * Register job processor
   */
  process<T = any>(queueName: string, handler: JobHandler<T>): void {
    if (this.workers.has(queueName)) {
      throw new Error(`Worker already registered for queue: ${queueName}`);
    }

    // Create worker
    const worker = new Worker(
      queueName,
      async (bullJob: BullJob) => {
        const tenantId = bullJob.data.__tenantId as string | undefined;

        // Set tenant context
        if (tenantId) {
          this.kernel?.tenant.setContext(tenantId);
        }

        try {
          const context: JobContext<T> = {
            id: bullJob.id as string,
            name: bullJob.name,
            data: bullJob.data as T,
            attempts: bullJob.attemptsMade + 1,
            tenantId,
            progress: async (progress: number) => {
              await bullJob.updateProgress(Math.min(100, Math.max(0, progress)));
            },
          };

          await handler(context);

          // Emit completion event
          await this.kernel?.events.emit('job.completed', {
            jobId: bullJob.id,
            queue: queueName,
            name: bullJob.name,
            tenantId,
          });
        } finally {
          this.kernel?.tenant.clearContext();
        }
      },
      {
        connection: this.redis,
        concurrency: 5,
        limiter: {
          max: 100,
          duration: 1000,
        },
      },
    );

    // Handle worker events
    worker.on('completed', (job) => {
      this.logger.debug(`Job ${job.id} completed`);
    });

    worker.on('failed', (job, err) => {
      this.logger.error(`Job ${job?.id} failed:`, err);

      // Emit failure event
      this.kernel?.events.emit('job.failed', {
        jobId: job?.id,
        queue: queueName,
        name: job?.name,
        error: err.message,
        attempts: job?.attemptsMade,
      }).catch(() => {});
    });

    worker.on('error', (err) => {
      this.logger.error('Worker error:', err);
    });

    this.workers.set(queueName, worker);
    this.logger.debug(`Worker registered for queue: ${queueName}`);

    // Start processing if already running
    if (this.running) {
      worker.resume();
    }
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: JobId): Promise<JobStatus> {
    // Search across all queues
    for (const [queueName, queue] of this.queues) {
      const job = await queue.getJob(jobId);
      if (job) {
        return {
          id: job.id as string,
          state: await job.getState() as JobStatus['state'],
          progress: job.progress as number,
          attempts: job.attemptsMade + 1,
          error: job.failedReason || undefined,
        };
      }
    }

    throw new Error(`Job ${jobId} not found`);
  }

  /**
   * Cancel job
   */
  async cancelJob(jobId: JobId): Promise<boolean> {
    for (const [queueName, queue] of this.queues) {
      const job = await queue.getJob(jobId);
      if (job) {
        // Remove from queue if not yet processing
        const state = await job.getState();
        if (state === 'waiting' || state === 'delayed') {
          await job.remove();
          this.logger.debug(`Job ${jobId} cancelled`);
          return true;
        }

        // If already processing, can't cancel
        return false;
      }
    }

    return false;
  }

  /**
   * Get queue statistics
   */
  async getQueueStats(queueName: string): Promise<QueueStats> {
    const queue = this.getQueue(queueName);
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      queue.getWaitingCount(),
      queue.getActiveCount(),
      queue.getCompletedCount(),
      queue.getFailedCount(),
      queue.getDelayedCount(),
    ]);

    return {
      name: queueName,
      pending: waiting,
      active,
      completed,
      failed,
      delayed,
      total: waiting + active + completed + failed + delayed,
    };
  }

  /**
   * Get all queue statistics
   */
  async getAllStats(): Promise<QueueStats[]> {
    const stats: QueueStats[] = [];
    for (const queueName of this.queues.keys()) {
      stats.push(await this.getQueueStats(queueName));
    }
    return stats;
  }

  /**
   * Health check
   */
  async isHealthy(): Promise<boolean> {
    try {
      await this.redis.ping();
      return this.running;
    } catch {
      return false;
    }
  }

  /**
   * Clean up old completed jobs
   */
  async cleanup(maxAge: number = 24 * 60 * 60 * 1000): Promise<number> {
    let cleaned = 0;

    for (const [queueName, queue] of this.queues) {
      // Clean completed jobs older than maxAge
      const completed = await queue.clean(maxAge, 100, 'completed');
      cleaned += completed.length;

      // Clean failed jobs older than maxAge
      const failed = await queue.clean(maxAge, 100, 'failed');
      cleaned += failed.length;
    }

    this.logger.debug(`Cleaned up ${cleaned} old jobs`);
    return cleaned;
  }

  /**
   * Pause queue processing
   */
  async pauseQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.pause();
    this.logger.debug(`Queue ${queueName} paused`);
  }

  /**
   * Resume queue processing
   */
  async resumeQueue(queueName: string): Promise<void> {
    const queue = this.getQueue(queueName);
    await queue.resume();
    this.logger.debug(`Queue ${queueName} resumed`);
  }

  // Private methods

  private getQueue(name: string): Queue {
    if (!this.queues.has(name)) {
      const queue = new Queue(name, {
        connection: this.redis,
        defaultJobOptions: {
          removeOnComplete: 1000,
          removeOnFail: 5000,
          attempts: 3,
          backoff: {
            type: 'exponential',
            delay: 1000,
          },
        },
      });

      queue.on('error', (err) => {
        this.logger.error(`Queue ${name} error:`, err);
      });

      this.queues.set(name, queue);
    }

    return this.queues.get(name)!;
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
