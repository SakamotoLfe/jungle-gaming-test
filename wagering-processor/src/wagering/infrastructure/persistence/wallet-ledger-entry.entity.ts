import { Entity, PrimaryKey, Property } from '@mikro-orm/decorators/legacy';

@Entity({ tableName: 'wallet_ledger_entries' })
export class WalletLedgerEntryEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ fieldName: 'wallet_id', type: 'uuid' })
  walletId!: string;

  @Property({ fieldName: 'transaction_id', type: 'uuid' })
  transactionId!: string;

  @Property({ type: 'varchar', length: 10 })
  direction!: string;

  @Property({ type: 'decimal', precision: 18, scale: 2 })
  amount!: string;

  @Property({ type: 'varchar', length: 3 })
  currency!: string;

  @Property({ fieldName: 'balance_before', type: 'decimal', precision: 18, scale: 2 })
  balanceBefore!: string;

  @Property({ fieldName: 'balance_after', type: 'decimal', precision: 18, scale: 2 })
  balanceAfter!: string;

  @Property({ fieldName: 'created_at', type: 'datetime', defaultRaw: 'CURRENT_TIMESTAMP' })
  createdAt?: Date = new Date();
}