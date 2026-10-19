import { Money } from './money.vo.js';

describe('Money Value Object', () => {
  it('should format money with 2 decimal places', () => {
    const money = Money.from({ amount: '50.5', currency: 'BRL' });
    expect(money.toJSON()).toEqual({ amount: '50.50', currency: 'BRL' });
  });

  it('should reject invalid decimal amounts or scientific notation', () => {
    expect(() => Money.from({ amount: '1e5', currency: 'BRL' })).toThrow();
    expect(() => Money.from({ amount: 'invalid', currency: 'BRL' })).toThrow();
    expect(() => Money.from({ amount: '10.555', currency: 'BRL' })).toThrow();
  });

  it('should correctly add money of the same currency', () => {
    const m1 = Money.from({ amount: '10.50', currency: 'BRL' });
    const m2 = Money.from({ amount: '5.25', currency: 'BRL' });
    const sum = m1.add(m2);

    expect(sum.toString()).toBe('15.75 BRL');
  });

  it('should throw an error when adding different currencies', () => {
    const brl = Money.from({ amount: '10.00', currency: 'BRL' });
    const usd = Money.from({ amount: '10.00', currency: 'USD' });

    expect(() => brl.add(usd)).toThrow('Currency mismatch: BRL vs USD');
  });
});