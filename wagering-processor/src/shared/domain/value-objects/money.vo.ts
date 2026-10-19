import { Decimal } from 'decimal.js';

export interface MoneyProps {
  amount: string; // e.g., "25.00"
  currency: string; // e.g., "BRL"
}

export class Money {
  private constructor(
    private readonly value: Decimal,
    public readonly currency: string,
  ) {}

  static from(props: MoneyProps): Money {
    if (!props.amount || typeof props.amount !== 'string') {
      throw new Error('Amount must be a non-empty string');
    }

    // Validate no scientific notation, NaN, Infinity, etc.
    if (!/^-?\d+(\.\d{1,2})?$/.test(props.amount)) {
      throw new Error(`Invalid decimal amount format: ${props.amount}`);
    }

    const decimalValue = new Decimal(props.amount);
    if (decimalValue.isNaN() || !decimalValue.isFinite()) {
      throw new Error('Amount must be a finite number');
    }

    if (decimalValue.decimalPlaces() > 2) {
      throw new Error('Amount cannot have more than 2 decimal places');
    }

    return new Money(decimalValue.toDecimalPlaces(2), props.currency.toUpperCase());
  }

  static zero(currency: string): Money {
    return new Money(new Decimal('0.00'), currency.toUpperCase());
  }

  add(other: Money): Money {
    this.assertSameCurrency(other);
    const sum = this.value.plus(other.value);
    return new Money(sum, this.currency);
  }

  subtract(other: Money): Money {
    this.assertSameCurrency(other);
    const diff = this.value.minus(other.value);
    return new Money(diff, this.currency);
  }

  negate(): Money {
    return new Money(this.value.negated(), this.currency);
  }

  isZero(): boolean {
    return this.value.isZero();
  }

  isPositive(): boolean {
    return this.value.isPositive() && !this.isZero();
  }

  isNegative(): boolean {
    return this.value.isNegative();
  }

  isLessThan(other: Money): boolean {
    this.assertSameCurrency(other);
    return this.value.lessThan(other.value);
  }

  equals(other: Money): boolean {
    return this.currency === other.currency && this.value.equals(other.value);
  }

  toJSON(): MoneyProps {
    return {
      amount: this.value.toFixed(2),
      currency: this.currency,
    };
  }

  toString(): string {
    return `${this.value.toFixed(2)} ${this.currency}`;
  }

  private assertSameCurrency(other: Money): void {
    if (this.currency !== other.currency) {
      throw new Error(`Currency mismatch: ${this.currency} vs ${other.currency}`);
    }
  }
}