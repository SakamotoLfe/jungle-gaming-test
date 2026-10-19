export class WagerTransaction {

    id!: string;


    providerId!: string;


    externalTransactionId!: string;


    idempotencyKey!: string;


    payloadHash!: string;


    walletId!: string;


    playerId!: string;


    roundId!: string;


    gameId!: string;


    kind!: string; // BET, WIN, LOSS, REFUND, ROLLBACK, OPENING


    status!: string; // PENDING, PENDING_REFERENCE, PROCESSED, REJECTED, FAILED


    amount!: string;


    currency!: string;


    referenceExternalTransactionId?: string;


    failureCode?: string;


    createdAt: Date = new Date();


    processedAt?: Date;
}