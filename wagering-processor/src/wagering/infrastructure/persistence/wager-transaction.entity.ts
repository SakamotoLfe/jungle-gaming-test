import { Entity, PrimaryKey, Property, Unique } from '@mikro-orm/decorators/legacy';

@Entity({ tableName: 'wager_transactions' })
@Unique({ properties: ['providerId', 'externalTransactionId'] })
@Unique({ properties: ['idempotencyKey'] })
export class WagerTransactionEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'provider_id', type: 'varchar', length: 50 })
  providerId!: string;

  @Property({ fieldName: 'external_transaction_id', type: 'varchar', length: 100 })
  externalTransactionId!: string;

  @Property({ fieldName: 'idempotency_key', type: 'varchar', length: 150 })
  idempotencyKey!: string;

  @Property({ fieldName: 'payload_hash', type: 'varchar', length: 64 })
  payloadHash!: string;

  @Property({ fieldName: 'wallet_id', type: 'uuid' })
  walletId!: string;

  @Property({ fieldName: 'player_id', type: 'uuid' })
  playerId!: string;

  @Property({ fieldName: 'round_id', type: 'varchar', length: 100 })
  roundId!: string;

  @Property({ fieldName: 'game_id', type: 'varchar', length: 100 })
  gameId!: string;

  @Property({ type: 'varchar', length: 30 })
  kind!: string;

  @Property({ type: 'varchar', length: 20 })
  status!: string;

  @Property({ type: 'decimal', precision: 18, scale: 2 })
  amount!: string;

  @Property({ type: 'varchar', length: 3 })
  currency!: string;

  @Property({ fieldName: 'failure_code', type: 'varchar', length: 50, nullable: true })
  failureCode?: string;

  @Property({ fieldName: 'created_at', type: 'datetime', defaultRaw: 'CURRENT_TIMESTAMP' })
  createdAt?: Date = new Date();

  @Property({ fieldName: 'processed_at', type: 'datetime', nullable: true })
  processedAt?: Date;
}