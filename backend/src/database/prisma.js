import 'dotenv/config';
import { readFileSync } from 'node:fs';
import pkg from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../generated/prisma/index.js';

const { Pool } = pkg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    ca: readFileSync(
      new URL('../../prisma/certs/prod-ca-2021.crt', import.meta.url),
      'utf8',
    ),
    rejectUnauthorized: true,
  },
});

const adapter = new PrismaPg(pool, { disposeExternalPool: true });
const prisma = new PrismaClient({ adapter });

export default prisma;
