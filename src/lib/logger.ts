import * as Sentry from '@sentry/nextjs'

interface LogContext {
  userId?: string
  orderId?: string
  paymentAmount?: number
  previousTransactions?: number
  action?: string
  component?: string
  [key: string]: unknown
}

// Use Sentry's built-in logger
const { logger } = Sentry

export class Logger {
  static info(message: string, context: LogContext = {}) {
    // Use Sentry's structured logging
    logger.info(message, context)
  }

  static warn(message: string, context: LogContext = {}) {
    // Use Sentry's structured logging
    logger.warn(message, context)
  }

  static error(message: string, error?: Error, context: LogContext = {}) {
    // Set user context if available
    if (context.userId) {
      Sentry.setUser({
        id: context.userId,
      })
    }

    // Add payment context if available
    if (context.paymentAmount || context.orderId) {
      Sentry.setContext('payment', {
        orderId: context.orderId,
        amount: context.paymentAmount,
        previousTransactions: context.previousTransactions,
      })
    }

    // Use Sentry's structured logging for the message
    logger.error(message, context)

    // Capture exception if provided
    if (error) {
      Sentry.captureException(error, {
        tags: {
          component: context.component || 'unknown',
        },
        extra: context,
      })
    }
  }
}

// Helper functions for common ecommerce logging patterns using Sentry's native logging
export const PaymentLogger = {
  attempt: (userId: string, orderId: string, amount: number) => {
    logger.info('Payment attempt started', {
      userId,
      orderId,
      paymentAmount: amount,
      component: 'payment',
      action: 'attempt',
    })
  },

  success: (userId: string, orderId: string, amount: number, previousTransactions: number) => {
    logger.info('Payment completed successfully', {
      userId,
      orderId,
      paymentAmount: amount,
      previousTransactions,
      component: 'payment',
      action: 'success',
    })
  },

  failure: (userId: string, orderId: string, amount: number, error: Error, previousTransactions?: number) => {
    // Set user context
    Sentry.setUser({
      id: userId,
    })

    // Log the error message with structured data
    logger.error('Payment failed', {
      userId,
      orderId,
      paymentAmount: amount,
      previousTransactions,
      component: 'payment',
      action: 'failure',
      errorMessage: error.message,
      errorName: error.name,
    })

    // Capture the exception
    Sentry.captureException(error, {
      tags: {
        component: 'payment',
        action: 'failure',
      },
      extra: {
        userId,
        orderId,
        paymentAmount: amount,
        previousTransactions,
      },
    })
  },

  timeout: (userId: string, orderId: string, amount: number, duration: number) => {
    // Set user context
    Sentry.setUser({
      id: userId,
    })

    // Log the timeout with structured data
    logger.error('Payment timeout', {
      userId,
      orderId,
      paymentAmount: amount,
      duration,
      component: 'payment',
      action: 'timeout',
    })

    // Create and capture a timeout error
    const timeoutError = new Error(`Payment timeout after ${duration}ms`)
    timeoutError.name = 'PaymentTimeoutError'
    
    Sentry.captureException(timeoutError, {
      tags: {
        component: 'payment',
        action: 'timeout',
      },
      extra: {
        userId,
        orderId,
        paymentAmount: amount,
        duration,
      },
    })
  },
}