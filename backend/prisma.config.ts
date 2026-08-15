import 'dotenv/config';
import { defineConfig } from 'prisma/config';
import { PrismaBetterSQLite } from '@prisma/adapter-better-sqlite3';
import path from 'path';

const dbPath = process.env.DATABASE_URL?.replace('file:', '') || './dev.db';
const absoluteDbPath = path.resolve(process.cwd(), dbPath);

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
  },
  datasource: {
    url: process.env.DATABASE_URL || 'file:./dev.db',
  },
  earlyAccessFeatures: ['driverAdapters'],
  adapter: () => new PrismaBetterSQLite(absoluteDbPath),
});
