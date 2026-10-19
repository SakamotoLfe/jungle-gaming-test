import { Money } from "../../../shared/domain/value-objects/money.vo.js";

export interface WalletState {
  id: string;
  playerId: string;
  currency: string;
  balance: Money;
  version: number;
  createdAt: Date;
  updatedAt: Date;
}

export class Wallet {
  private constructor(
    public readonly id: string,
    public readonly playerId: string,
    public readonly currency: string,
    private _balance: Money,
    private _version: number,
    public readonly createdAt: Date,
    private _updatedAt: Date,
  ) {}

  static open(props: { id: string; playerId: string; initialBalance: Money }): Wallet {
    return new Wallet(
      props.id,
      props.playerId,
      props.initialBalance.currency,
      props.initialBalance,
      1,
      new Date(),
      new Date(),
    );
  }

  static rehydrate(state: WalletState): Wallet {
    return new Wallet(
      state.id,
      state.playerId,
      state.currency,
      state.balance,
      state.version,
      state.createdAt,
      state.updatedAt,
    );
  }

  get balance(): Money {
    return this._balance;
  }

  get version(): number {
    return this._version;
  }

  get updatedAt(): Date {
    return this._updatedAt;
  }

  debit(amount: Money): void {
    this.assertSameCurrency(amount);

    if (this._balance.isLessThan(amount)) {
      throw new Error(`Insufficient funds: Wallet has ${this._balance.toString()}, tried to debit ${amount.toString()}`);
    }

    this._balance = this._balance.subtract(amount);
    this._version += 1;
    this._updatedAt = new Date();
  }

  credit(amount: Money): void {
    this.assertSameCurrency(amount);

    this._balance = this._balance.add(amount);
    this._version += 1;
    this._updatedAt = new Date();
  }

  private assertSameCurrency(money: Money): void {
    if (this.currency !== money.currency) {
      throw new Error(`Currency mismatch on wallet operation: Wallet is ${this.currency}, operation is ${money.currency}`);
    }
  }
}