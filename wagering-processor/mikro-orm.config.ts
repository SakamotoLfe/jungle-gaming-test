import { defineConfig } from '@mikro-orm/postgresql';
import { TsMorphMetadataProvider } from '@mikro-orm/reflection';

export default defineConfig({
  entities: ['./dist/**/*.entity.js'],
  entitiesTs: ['./src/**/*.entity.ts'],
  dbName: 'wagering_db',
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'Mikoto',
  password: process.env.DB_PASSWORD || 'bk201',
  metadataProvider: TsMorphMetadataProvider,
});