import { PrismaClient } from '@prisma/client'

// Fallback DATABASE_URL when env var isn't set (e.g. on Z.ai Space deployment
// where .env is gitignored). Uses Supabase PostgreSQL connection.
const FALLBACK_DATABASE_URL =
  'postgresql://postgres:Ckia52762622827@db.lzwspnhvqimaojtdecwt.supabase.co:5432/postgres'

if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = FALLBACK_DATABASE_URL
}
if (!process.env.DIRECT_URL) {
  process.env.DIRECT_URL = FALLBACK_DATABASE_URL
}

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'production' ? ['error'] : ['error', 'warn'],
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db