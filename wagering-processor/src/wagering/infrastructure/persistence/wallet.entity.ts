import { Entity, PrimaryKey, Property, Check } from '@mikro-orm/decorators/legacy';

@Entity({ tableName: 'wallets' })
@Check({ name: 'wallet_balance_not_negative', expression: 'balance >= 0' })
export class WalletEntity {
  @PrimaryKey({ type: 'uuid' })
  id!: string;

  @Property({ type: 'uuid', fieldName: 'player_id' })
  playerId!: string;

  @Property({ type: 'varchar', length: 3 })
  currency!: string;

  @Property({ type: 'decimal', precision: 18, scale: 2 })
  balance!: string;

  @Property({ type: 'integer' })
  version: number = 1;

  @Property({ fieldName: 'created_at', type: 'datetime', defaultRaw: 'CURRENT_TIMESTAMP', nullable: true })
  createdAt?: Date;

  @Property({ fieldName: 'updated_at', type: 'datetime', onUpdate: () => new Date(), defaultRaw: 'CURRENT_TIMESTAMP', nullable: true })
  updatedAt?: Date;
}