export class WalletLedgerEntry {

  id!: string;


  walletId!: string;


  transactionId!: string;


  direction!: string; // DEBIT or CREDIT


  amount!: string;


  currency!: string;


  balanceBefore!: string;


  balanceAfter!: string;


  createdAt: Date = new Date();
}