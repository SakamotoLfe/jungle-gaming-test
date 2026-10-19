import { Body, Controller, Post, HttpCode, HttpStatus } from '@nestjs/common';
import { ProcessWagerCommand, ProcessWagerUseCase } from '../../application/use-cases/process-wager.use-case.js';
import { WagerTransactionKind } from '../../domain/entities/wager-transaction.domain.js';

class ProcessWagerDto {
  providerId!: string;
  externalTransactionId!: string;
  idempotencyKey!: string;
  payloadHash!: string;
  playerId!: string;
  walletId!: string;
  roundId!: string;
  gameId!: string;
  kind!: 'BET' | 'WIN' | 'LOSS' | 'REFUND' | 'ROLLBACK';
  money!: {
    amount: string;
    currency: string;
  };
  referenceExternalTransactionId?: string;
}

@Controller('wagering')
export class WageringController {
  constructor(private readonly processWagerUseCase: ProcessWagerUseCase) {}

  @Post('transactions')
  @HttpCode(HttpStatus.OK)
  async processTransaction(@Body() dto: ProcessWagerDto) {
    const command: ProcessWagerCommand = {
      providerId: dto.providerId,
      externalTransactionId: dto.externalTransactionId,
      idempotencyKey: dto.idempotencyKey,
      payloadHash: dto.payloadHash,
      playerId: dto.playerId,
      walletId: dto.walletId,
      roundId: dto.roundId,
      gameId: dto.gameId,
      kind: dto.kind as WagerTransactionKind,
      money: dto.money,
      referenceExternalTransactionId: dto.referenceExternalTransactionId,
    };

    return await this.processWagerUseCase.execute(command);
  }
}