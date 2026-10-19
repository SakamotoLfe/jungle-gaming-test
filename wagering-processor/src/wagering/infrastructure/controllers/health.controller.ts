import { Controller, Get, HttpCode, HttpStatus } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/core';

@Controller('health')
export class HealthController {
  constructor(private readonly em: EntityManager) {}

  @Get('live')
  @HttpCode(HttpStatus.OK)
  checkLive() {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }

  @Get('ready')
  @HttpCode(HttpStatus.OK)
  async checkReady() {
    try {
      // Simple connection check to PostgreSQL database
      await this.em.getConnection().execute('SELECT 1');
      return { status: 'ready', database: 'connected', timestamp: new Date().toISOString() };
    } catch (error: any) {
      return { status: 'unhealthy', database: 'disconnected', error: error.message };
    }
  }
}