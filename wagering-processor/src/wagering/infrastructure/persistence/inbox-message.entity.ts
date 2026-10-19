import { Entity, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';

@Entity({ tableName: 'inbox_messages' })
export class InboxMessageEntity {
  @PrimaryKey({ fieldName: 'message_id', type: 'varchar', length: 100 })
  messageId!: string;

  @Property({ fieldName: 'consumer_name', type: 'varchar', length: 100 })
  consumerName!: string;

  @Property({ fieldName: 'payload_hash', type: 'varchar', length: 64 })
  payloadHash!: string;

  @Property({ fieldName: 'received_at', type: 'datetime', defaultRaw: 'CURRENT_TIMESTAMP', nullable: true })
  receivedAt?: Date;

  @Property({ fieldName: 'processed_at', type: 'datetime', nullable: true })
  processedAt?: Date;
}