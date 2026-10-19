import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { SQSClient, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs';
import * as crypto from 'crypto';
import { ProcessWagerCommand, ProcessWagerUseCase } from '../../application/use-cases/process-wager.use-case.js';
import { InboxMessageEntity } from '../../../shared/infrastructure/database/inbox-outbox.entities.js';

@Injectable()
export class SqsConsumerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(SqsConsumerService.name);
  private isRunning = false;
  private intervalRef: any;
  private readonly sqsClient: SQSClient;

  constructor(
    private readonly em: EntityManager,
    private readonly processWagerUseCase: ProcessWagerUseCase,
  ) {
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
    this.startConsumer();
  }

  onModuleDestroy() {
    this.stopConsumer();
  }

  private startConsumer() {
    this.isRunning = true;
    this.logger.log('SQS Consumer Worker started...');

    this.intervalRef = setInterval(async () => {
      if (!this.isRunning) return;
      try {
        await this.pollQueue();
      } catch (error: any) {
        this.logger.error(`Error polling SQS queue: ${error.message}`, error.stack);
      }
    }, 3000);
  }

  private stopConsumer() {
    this.isRunning = false;
    if (this.intervalRef) clearInterval(this.intervalRef);
    this.logger.log('SQS Consumer Worker stopped.');
  }

  private async pollQueue() {
    const queueUrl = process.env.SQS_QUEUE_URL || 'http://localhost:4566/000000000000/wager-transactions.fifo';

    const response = await this.sqsClient.send(
      new ReceiveMessageCommand({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: 5,
        WaitTimeSeconds: 2, // Long polling
      })
    );

    if (!response.Messages || response.Messages.length === 0) return;

    for (const sqsMessage of response.Messages) {
      const fork = this.em.fork();
      const messageId = sqsMessage.MessageId || crypto.randomUUID();
      const payloadString = sqsMessage.Body || '{}';
      const payloadHash = crypto.createHash('sha256').update(payloadString).digest('hex');

      try {
        // 1. Check Inbox Pattern (Idempotent SQS Consumption)
        const existingInbox = await fork.findOne(InboxMessageEntity, { messageId });
        if (existingInbox) {
          this.logger.warn(`Duplicate message received via SQS: ${messageId}. Skipping.`);
          // Delete message from queue so it doesn't re-deliver
          await this.deleteMessage(queueUrl, sqsMessage.ReceiptHandle!);
          continue;
        }

        // Save into Inbox table
        const inboxEntry = fork.create(InboxMessageEntity, {
          messageId,
          consumerName: 'WageringSqsConsumer',
          payloadHash,
        });
        fork.persist(inboxEntry);

        // 2. Parse payload and execute use case
        const payload = JSON.parse(payloadString);
        if (payload.walletId && payload.money) {
          const command: ProcessWagerCommand = {
            providerId: payload.providerId || 'SQS_PROVIDER',
            externalTransactionId: payload.transactionId || crypto.randomUUID(),
            idempotencyKey: `sqs-${messageId}`,
            payloadHash,
            playerId: payload.playerId || payload.walletId,
            walletId: payload.walletId,
            roundId: payload.roundId || 'SQS_ROUND',
            gameId: payload.gameId || 'SQS_GAME',
            kind: payload.kind || 'BET',
            money: payload.money,
          };

          await this.processWagerUseCase.execute(command);
        }

        // Mark inbox processed and flush
        inboxEntry.processedAt = new Date();
        await fork.flush();

        // 3. Delete message from SQS upon successful processing
        await this.deleteMessage(queueUrl, sqsMessage.ReceiptHandle!);
        this.logger.log(`Successfully processed SQS message ID: ${messageId}`);

      } catch (error: any) {
        this.logger.error(`Failed to process SQS message ${messageId}: ${error.message}`);
        // Do not delete message so it can go to DLQ (Dead Letter Queue) after max retries
      }
    }
  }

  private async deleteMessage(queueUrl: string, receiptHandle: string) {
    await this.sqsClient.send(
      new DeleteMessageCommand({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle,
      })
    );
  }
}