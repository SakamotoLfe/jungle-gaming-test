import { EntityManager, LockMode } from '@mikro-orm/core';
import { Injectable } from '@nestjs/common';
import { Wallet } from '../../domain/entities/wallet.domain.js';
import { Money } from '../../../shared/domain/value-objects/money.vo.js';
import { WagerTransactionEntity } from '../../infrastructure/persistence/wager-transaction.entity.js';
import { WalletLedgerEntryEntity } from '../../infrastructure/persistence/wallet-ledger-entry.entity.js';
import { WagerTransaction, WagerTransactionKind } from '../../domain/entities/wager-transaction.domain.js';
import { WalletEntity } from '../../infrastructure/persistence/wallet.entity.js';
import { OutboxMessageEntity } from '../../infrastructure/persistence/outbox-message.entity.js';

export interface ProcessWagerCommand {
  providerId: string;
  externalTransactionId: string;
  idempotencyKey: string;
  payloadHash: string;
  playerId: string;
  walletId: string;
  roundId: string;
  gameId: string;
  kind: WagerTransactionKind;
  money: { amount: string; currency: string };
  referenceExternalTransactionId?: string;
}

@Injectable()
export class ProcessWagerUseCase {
  constructor(private readonly em: EntityManager) { }

  async execute(command: ProcessWagerCommand) {
    // We execute everything inside a single atomic transaction block
    return await this.em.transactional(async (em) => {

      // 1. Check Idempotency / Duplicate Key via WagerTransaction repository
      const existingTx = await em.findOne(WagerTransactionEntity, { idempotencyKey: command.idempotencyKey });
      if (existingTx) {
        // If it exists with the exact same payload hash, return idempotent replay
        if ((existingTx as any).payloadHash === command.payloadHash) {
          return {
            transactionId: (existingTx as any).id,
            status: (existingTx as any).status,
            balance: { amount: (existingTx as any).balanceAfter || '0.00', currency: command.money.currency },
            idempotentReplay: true,
          };
        }
        throw new Error('Idempotency conflict: Same key used with a different payload.');
      }

      // 2. Fetch Wallet with Pessimistic Write Lock (prevents race conditions / lost updates!)
      const walletRecord = await em.findOne(
        WalletEntity,
        { id: command.walletId },
        { lockMode: LockMode.PESSIMISTIC_WRITE } // Ensures concurrent bets wait in line safely
      );
      if (!walletRecord) {
        throw new Error(`Wallet not found: ${command.walletId}`);
      }

      // Rehydrate domain Wallet
      const wallet = Wallet.rehydrate({
        id: (walletRecord as any).id,
        playerId: (walletRecord as any).playerId,
        currency: (walletRecord as any).currency,
        balance: Money.from({ amount: (walletRecord as any).balance, currency: (walletRecord as any).currency }),
        version: (walletRecord as any).version,
        createdAt: (walletRecord as any).createdAt,
        updatedAt: (walletRecord as any).updatedAt,
      });

      const txAmount = Money.from(command.money);
      const transactionId = crypto.randomUUID();

      const wagerTx = WagerTransaction.create({
        id: transactionId,
        providerId: command.providerId,
        externalTransactionId: command.externalTransactionId,
        idempotencyKey: command.idempotencyKey,
        payloadHash: command.payloadHash,
        walletId: command.walletId,
        playerId: command.playerId,
        roundId: command.roundId,
        gameId: command.gameId,
        kind: command.kind,
        money: txAmount,
        referenceExternalTransactionId: command.referenceExternalTransactionId,
      });

      let balanceBefore = wallet.balance.toJSON();
      let balanceAfter = wallet.balance.toJSON();
      let ledgerDirection = 'DEBIT';

      try {
        // 3. Apply business rules based on transaction kind
        if (command.kind === WagerTransactionKind.Bet) {
          ledgerDirection = 'DEBIT';
          wallet.debit(txAmount); // Throws if insufficient funds
        } else if (
          command.kind === WagerTransactionKind.Win ||
          command.kind === WagerTransactionKind.Refund ||
          command.kind === WagerTransactionKind.Rollback
        ) {
          ledgerDirection = 'CREDIT';
          wallet.credit(txAmount);
        } else if (command.kind === WagerTransactionKind.Loss) {
          // Loss affects no balance, but is recorded
          ledgerDirection = 'NONE';
        }

        wagerTx.markProcessed();
        balanceAfter = wallet.balance.toJSON();

        // 4. Update persistent Wallet record
        (walletRecord as any).balance = wallet.balance.toJSON().amount;
        (walletRecord as any).version = wallet.version;
        em.persist(walletRecord);

        // 5. Insert Wallet Ledger Entry (if it affects balance)
        if (ledgerDirection !== 'NONE') {
          em.create(WalletLedgerEntryEntity, {
            id: crypto.randomUUID(),
            walletId: wallet.id,
            transactionId: transactionId,
            direction: ledgerDirection,
            amount: txAmount.toJSON().amount,
            currency: txAmount.currency,
            balanceBefore: balanceBefore.amount,
            balanceAfter: balanceAfter.amount,
          });
        }

        // 6. Persist Wager Transaction
        em.persist(em.create(WagerTransactionEntity, {
          id: wagerTx.id,
          providerId: wagerTx.providerId,
          externalTransactionId: wagerTx.externalTransactionId,
          idempotencyKey: wagerTx.idempotencyKey,
          payloadHash: wagerTx.payloadHash,
          walletId: wagerTx.walletId,
          playerId: wagerTx.playerId,
          roundId: wagerTx.roundId,
          gameId: wagerTx.gameId,
          kind: wagerTx.kind,
          status: wagerTx.status,
          amount: txAmount.toJSON().amount,
          currency: txAmount.currency,
        }));

        // 7. Enqueue Transactional Outbox Event
        em.create(OutboxMessageEntity, {
          id: crypto.randomUUID(),
          aggregateId: wallet.id,
          eventType: 'WalletBalanceChanged',
          payload: {
            walletId: wallet.id,
            transactionId: transactionId,
            direction: ledgerDirection,
            money: txAmount.toJSON(),
            balanceBefore,
            balanceAfter,
            walletVersion: wallet.version,
          },
          occurredAt: new Date(),
        });

      } catch (error: any) {
        wagerTx.reject('INSUFFICIENT_FUNDS');
        em.persist(em.create(WagerTransactionEntity, {
          id: wagerTx.id,
          providerId: wagerTx.providerId,
          externalTransactionId: wagerTx.externalTransactionId,
          idempotencyKey: wagerTx.idempotencyKey,
          payloadHash: wagerTx.payloadHash,
          walletId: wagerTx.walletId,
          playerId: wagerTx.playerId,
          roundId: wagerTx.roundId,
          gameId: wagerTx.gameId,
          kind: wagerTx.kind,
          status: wagerTx.status,
          amount: txAmount.toJSON().amount,
          currency: txAmount.currency,
          failureCode: wagerTx.failureCode,
        }));

        return {
          transactionId: wagerTx.id,
          status: 'REJECTED',
          failureCode: wagerTx.failureCode,
          balance: balanceBefore,
          idempotentReplay: false,
        };
      }

      return {
        transactionId: wagerTx.id,
        status: wagerTx.status,
        balance: balanceAfter,
        idempotentReplay: false,
      };
    });
  }
}