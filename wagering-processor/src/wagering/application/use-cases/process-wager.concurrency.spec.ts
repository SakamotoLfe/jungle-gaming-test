import { MikroORM } from '@mikro-orm/core';
import { ProcessWagerUseCase, ProcessWagerCommand } from './process-wager.use-case.js';
import { WalletEntity } from '../../infrastructure/persistence/wallet.entity.js';
import { WagerTransactionKind } from '../../domain/entities/wager-transaction.domain.js';
import mikroOrmConfig from '../../../../mikro-orm.config.js';
import * as crypto from 'crypto';

describe('ProcessWagerUseCase Concurrency & Race Conditions', () => {
  let orm: MikroORM;
  let useCase: ProcessWagerUseCase;

  beforeAll(async () => {
    orm = await MikroORM.init(mikroOrmConfig);
    
    // Drop and recreate tables fresh for the test run
    await orm.schema.ensureDatabase();
    await orm.schema.drop();
    await orm.schema.create();
    
    useCase = new ProcessWagerUseCase(orm.em);
  });

  afterAll(async () => {
    if (orm) {
      await orm.close(true);
    }
  });

  it('should handle concurrent bets correctly, allowing only valid funds to be spent', async () => {
    const walletId = crypto.randomUUID();
    const playerId = crypto.randomUUID();

    // 1. Fork a safe entity manager context for seeding
    const em = orm.em.fork();

    // 2. Create and flush the wallet using the forked EM
    const walletRecord = em.create(WalletEntity, {
      id: walletId,
      playerId: playerId,
      currency: 'USD',
      balance: '100.00',
      version: 1,
    });
    
    em.persist(walletRecord);
    await em.flush();

    console.log("Id: ", walletId);

    const checkEmAll = orm.em.fork();
    const wallets = await checkEmAll.findAll(WalletEntity);
    console.log("saved Id: ", wallets[0].id);
    

    // 👉 ADD THIS LINE TO DEBUG:
    const count = await em.count(WalletEntity, { id: walletId });
    console.log('Wallet count in database right after flush:', count);

    const concurrentRequestsCount = 5;
    const betAmount = '80.00';

    const promises = Array.from({ length: concurrentRequestsCount }).map((_, index) => {
      const command: ProcessWagerCommand = {
        providerId: 'TEST_PROVIDER',
        externalTransactionId: `ext-tx-${index}-${Date.now()}`,
        idempotencyKey: `idemp-key-${index}-${crypto.randomUUID()}`,
        payloadHash: crypto.createHash('sha256').update(`payload-${index}`).digest('hex'),
        playerId: playerId,
        walletId: walletId,
        roundId: 'round-concurrency-test',
        gameId: 'game-slot-1',
        kind: WagerTransactionKind.Bet,
        money: { amount: betAmount, currency: 'USD' },
      };

      return useCase.execute(command);
    });

    const results = await Promise.all(promises);

    const successfulBets = results.filter((r) => r.status === 'PROCESSED');
    const rejectedBets = results.filter((r) => r.status === 'REJECTED');

    expect(successfulBets.length).toBe(1);
    expect(rejectedBets.length).toBe(concurrentRequestsCount - 1);

    const checkEm = orm.em.fork();
    const finalWallet = await checkEm.findOne(WalletEntity, { id: walletId });

    expect(finalWallet).toBeDefined();
    expect(finalWallet?.balance).toBe('20.00');
  });
});