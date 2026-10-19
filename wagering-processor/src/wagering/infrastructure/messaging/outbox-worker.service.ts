import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { SQSClient, SendMessageCommand } from '@aws-sdk/client-sqs';
import { OutboxMessageEntity } from '../../../shared/infrastructure/database/inbox-outbox.entities.js';

@Injectable()
export class OutboxWorkerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(OutboxWorkerService.name);
  private isRunning = false;
  private intervalRef: any;
  private readonly sqsClient: SQSClient;

  constructor(private readonly em: EntityManager) {
    // Point SQS to LocalStack instance running locally
    this.sqsClient = new SQSClient({
      region: process.env.AWS_REGION || 'us-east-1',
      endpoint: process.env.AWS_ENDPOINT || 'http://localhost:4566',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || 'test',
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || 'test',
      },
    });
  }

  onModuleInit() {
    this.startWorker();
  }

  onModuleDestroy() {
    this.stopWorker();
  }

  private startWorker() {
    this.isRunning = true;
    this.logger.log('Outbox Background Worker started...');
    
    // Poll every 2 seconds
    this.intervalRef = setInterval(async () => {
      if (!this.isRunning) return;
      try {
        await this.processPendingOutboxMessages();
      } catch (error: any) {
        this.logger.error(`Error processing outbox messages: ${error.message}`, error.stack);
      }
    }, 2000);
  }

  private stopWorker() {
    this.isRunning = false;
    if (this.intervalRef) clearInterval(this.intervalRef);
    this.logger.log('Outbox Background Worker stopped.');
  }

  private async processPendingOutboxMessages() {
    const fork = this.em.fork();
    
    // Fetch up to 10 unpublished messages
    const messages = await fork.find(
      OutboxMessageEntity,
      { publishedAt: null, attempts: { $lt: 5 } },
      { limit: 10, orderBy: { occurredAt: 'ASC' } }
    );

    if (messages.length === 0) return;

    for (const msg of messages) {
      try {
        const queueUrl = process.env.SQS_QUEUE_URL || 'http://localhost:4566/000000000000/wager-transactions.fifo';
        
        this.sqsClient.send(
          new SendMessageCommand({
            QueueUrl: queueUrl,
            MessageBody: JSON.stringify(msg.payload),
            MessageGroupId: msg.aggregateId, // Required for FIFO queues
            MessageDeduplicationId: msg.id,  // Required for FIFO queues
          })
        );

        msg.publishedAt = new Date();
        msg.attempts = (msg.attempts || 0) + 1;
        fork.persist(msg);
        this.logger.log(`Published outbox event ${msg.id} (${msg.eventType}) to SQS`);
      } catch (error: any) {
        msg.attempts = (msg.attempts || 0) + 1;
        msg.nextAttemptAt = new Date(Date.now() + msg.attempts * 5000); // Backoff
        fork.persist(msg);
        this.logger.error(`Failed to publish outbox event ${msg.id}: ${error.message}`);
      }
    }
  }
}