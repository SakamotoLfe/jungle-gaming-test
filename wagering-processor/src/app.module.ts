import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { createObserveModule } from '@nestjs/observe';
import { AppController } from './app.controller.js';
import { AppService } from './app.service.js';
import { ProcessWagerUseCase } from './wagering/application/use-cases/process-wager.use-case.js';
import mikroOrmConfig from './mikro-orm.config.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    MikroOrmModule.forRoot(mikroOrmConfig),
    ObserveModule.forRoot({
      appKey: 'YOUR_APP_KEY',
      appSecret: 'YOUR_APP_SECRET',
      serviceId: 'wagering-processor',
    }),
  ],
  controllers: [AppController],
  providers: [
    AppService,
    ProcessWagerUseCase,
  ],
  exports: [ProcessWagerUseCase],
})
export class AppModule {}