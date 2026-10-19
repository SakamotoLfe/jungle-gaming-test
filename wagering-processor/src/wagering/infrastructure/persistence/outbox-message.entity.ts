import { Entity, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';

@Entity({ tableName: 'outbox_messages' })
export class OutboxMessageEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'aggregate_id', type: 'uuid' })
  aggregateId!: string;

  @Property({ fieldName: 'event_type', type: 'varchar', length: 100 })
  eventType!: string;

  @Property({ type: 'json' })
  payload!: Record<string, unknown>;

  @Property({ fieldName: 'occurred_at', type: 'datetime' })
  occurredAt!: Date;

  @Property({ type: 'integer', default: 0 })
  attempts?: number = 0;

  @Property({ fieldName: 'next_attempt_at', type: 'datetime', nullable: true })
  nextAttemptAt?: Date;

  @Property({ fieldName: 'published_at', type: 'datetime', nullable: true })
  publishedAt?: Date;
}