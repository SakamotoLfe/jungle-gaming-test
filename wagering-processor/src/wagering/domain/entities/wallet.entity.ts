export class Wallet {
  id!: string;

  playerId!: string;

  currency!: string;

  balance!: string;

  version: number = 1;

  createdAt: Date = new Date();

  updatedAt: Date = new Date();
}