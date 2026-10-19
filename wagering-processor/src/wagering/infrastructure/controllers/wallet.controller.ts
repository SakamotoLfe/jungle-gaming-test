import { Controller, Get, Post, Body, Param, HttpCode, HttpStatus } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';
import { WalletEntity } from '../persistence/wallet.entity.js';
import { WalletLedgerEntryEntity } from '../persistence/wallet-ledger-entry.entity.js';

class CreateWalletDto {
  playerId!: string;
  currency!: string;
  initialBalance?: string;
}

@Controller('wallets')
export class WalletController {
  constructor(private readonly em: EntityManager) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  createWallet(@Body() dto: CreateWalletDto) {
    const walletId = crypto.randomUUID();
    const initialBalance = dto.initialBalance || '0.00';

    const wallet = this.em.create(WalletEntity, {
      id: walletId,
      playerId: dto.playerId,
      currency: dto.currency,
      balance: initialBalance,
      version: 1,
    });

    this.em.persist(wallet);

    return {
      walletId: wallet.id,
      playerId: wallet.playerId,
      currency: wallet.currency,
      balance: wallet.balance,
    };
  }

  @Get(':walletId')
  async getWallet(@Param('walletId') walletId: string) {
    const wallet = await this.em.findOne(WalletEntity, { id: walletId });
    if (!wallet) {
      return { error: 'Wallet not found' };
    }

    return {
      walletId: wallet.id,
      playerId: wallet.playerId,
      currency: wallet.currency,
      balance: wallet.balance,
      version: wallet.version,
    };
  }

  @Get(':walletId/ledger')
  async getWalletLedger(@Param('walletId') walletId: string) {
    const entries = await this.em.find(WalletLedgerEntryEntity, { walletId }, { orderBy: { createdAt: 'DESC' } });
    
    return entries.map(entry => ({
      id: entry.id,
      transactionId: entry.transactionId,
      direction: entry.direction,
      amount: entry.amount,
      currency: entry.currency,
      balanceBefore: entry.balanceBefore,
      balanceAfter: entry.balanceAfter,
      createdAt: entry.createdAt,
    }));
  }
}