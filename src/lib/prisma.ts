import { PrismaClient } from '@prisma/client'
import * as Sentry from '@sentry/nextjs'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: [
      {
        emit: 'event',
        level: 'query',
      },
      {
        emit: 'event',
        level: 'error',
      },
      {
        emit: 'event',
        level: 'warn',
      },
    ],
  })

// Note: Prisma event handlers are disabled due to TypeScript type issues
// The monitoring is still available through Sentry's automatic instrumentation
// and the console logging integration will capture any console output

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma