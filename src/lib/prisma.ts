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

// Add Sentry performance monitoring for Prisma queries
prisma.$on('query', (e) => {
  // Log slow queries (>1000ms) to Sentry
  if (e.duration > 1000) {
    // Use console logging for now since Sentry logger has type issues
    console.warn('Slow database query detected', {
      query: e.query,
      duration: e.duration,
      params: e.params,
      target: e.target,
      component: 'database',
      query_type: 'slow_query',
    })

    // Capture as performance issue if very slow (>5000ms)
    if (e.duration > 5000) {
      console.error('Database timeout detected', {
        query: e.query,
        duration: e.duration,
        params: e.params,
        target: e.target,
        component: 'database',
        query_type: 'timeout',
      })
    }
  }

  // Log all queries in development
  if (process.env.NODE_ENV === 'development') {
    console.log(`Query: ${e.query} - Duration: ${e.duration}ms`)
  }
})

prisma.$on('error', (e) => {
  const { logger } = Sentry
  logger.error('Prisma database error', {
    message: e.message,
    target: e.target,
    timestamp: e.timestamp,
    component: 'database',
    error_type: 'prisma_error',
  })

  Sentry.captureException(new Error(`Prisma Error: ${e.message}`), {
    tags: {
      component: 'database',
      error_type: 'prisma_error',
    },
    extra: {
      target: e.target,
      timestamp: e.timestamp,
    },
  })
})

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma