import { NextRequest, NextResponse } from 'next/server'
import * as Sentry from '@sentry/nextjs'
import { prisma } from '@/lib/prisma'

export async function POST(request: NextRequest) {
  return Sentry.startSpan(
    {
      name: 'Process Payment',
      op: 'payment',
    },
    async (span) => {
      try {
        const body = await request.json()
        const { userId, orderId, amount, paymentMethod } = body

        // Add user context to Sentry
        Sentry.setUser({
          id: userId,
          paymentMethod,
        })

        // Add custom context
        Sentry.setContext('payment', {
          orderId,
          amount,
          paymentMethod,
          timestamp: new Date().toISOString(),
        })

        // Log payment attempt with Sentry's native logging
        const { logger } = Sentry
        logger.info('Payment attempt started', {
          userId,
          orderId,
          paymentAmount: amount,
          component: 'payment',
          action: 'attempt',
        })

        // Add initial delay to show spinner (2.5 seconds)
        await new Promise(resolve => setTimeout(resolve, 2500))

        // Simulate database timeout more frequently (70% chance)
        const shouldTimeout = Math.random() < 0.7
        
        if (shouldTimeout) {
          // Simulate database timeout with longer delay
          const startTime = Date.now()
          
          // Log database query start with Sentry's native logging
          logger.info('Database query started', {
            operation: 'fetch_user_payments',
            userId,
            orderId,
            component: 'database',
          })

          // Simulate a database timeout (10 seconds total - 2.5 initial + 7.5 timeout)
          await new Promise(resolve => setTimeout(resolve, 7500))
          
          const duration = Date.now() - startTime
          
          // Log timeout with Sentry's native logging
          logger.error('Database timeout occurred', {
            duration,
            operation: 'fetch_user_payments',
            userId,
            orderId,
            component: 'database',
          })

          // Log timeout with structured logging
          logger.error('Payment timeout', {
            userId,
            orderId,
            paymentAmount: amount,
            duration,
            component: 'payment',
            action: 'timeout',
          })
          
          // Create a more detailed error for Sentry
          const timeoutError = new Error(`Database timeout after ${duration}ms during payment processing`)
          timeoutError.name = 'DatabaseTimeoutError'
          
          // Add additional context to the error
          Sentry.setContext('database_timeout', {
            duration,
            operation: 'fetch_user_payments',
            userId,
            orderId,
            amount,
            paymentMethod,
            timestamp: new Date().toISOString(),
          })

          // Set error level and tags
          Sentry.setTag('error_type', 'database_timeout')
          Sentry.setTag('payment_status', 'failed')
          Sentry.setTag('timeout_duration', duration.toString())
          
          // Capture the exception in Sentry
          Sentry.captureException(timeoutError, {
            tags: {
              error_type: 'database_timeout',
              payment_status: 'failed',
              timeout_duration: duration.toString(),
            },
            extra: {
              userId,
              orderId,
              amount,
              paymentMethod,
              duration,
            },
          })
          
          throw timeoutError
        }

        // Get previous successful transactions for context (only if no timeout)
        const previousTransactions = await prisma.order.findMany({
          where: {
            userId,
            status: 'CONFIRMED'
          },
          orderBy: { createdAt: 'desc' },
          take: 5
        })

        // Simulate other failure scenarios (only 20% chance since timeout is 70%)
        const randomFailure = Math.random()
        
        if (randomFailure < 0.2) {
          throw new Error('Payment gateway declined the transaction')
        }

        // Simulate successful payment processing
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Update order status
        const updatedOrder = await prisma.order.update({
          where: { id: orderId },
          data: { status: 'CONFIRMED' }
        })

        // Log successful payment with Sentry's native logging
        logger.info('Payment completed successfully', {
          userId,
          orderId,
          paymentAmount: amount,
          previousTransactions: previousTransactions.length,
          component: 'payment',
          action: 'success',
        })

        // Log successful payment processing
        logger.info('Payment processed successfully', {
          orderId,
          amount,
          previousTransactions: previousTransactions.length,
          component: 'payment',
        })

        return NextResponse.json({
          success: true,
          orderId: updatedOrder.id,
          status: updatedOrder.status,
        })

      } catch (error) {
        const body = await request.json().catch(() => ({}))
        
        // Set user context for error logging
        Sentry.setUser({
          id: body?.userId || 'unknown',
        })

        // Log payment failure with Sentry's native logging
        const { logger } = Sentry
        logger.error('Payment failed', {
          userId: body?.userId || 'unknown',
          orderId: body?.orderId || 'unknown',
          paymentAmount: body?.amount || 0,
          component: 'payment',
          action: 'failure',
          errorMessage: error instanceof Error ? error.message : 'Unknown error',
          errorName: error instanceof Error ? error.name : 'UnknownError',
        })

        // Capture the exception
        if (error instanceof Error) {
          Sentry.captureException(error, {
            tags: {
              component: 'payment',
              action: 'failure',
            },
            extra: {
              userId: body?.userId || 'unknown',
              orderId: body?.orderId || 'unknown',
              paymentAmount: body?.amount || 0,
            },
          })
        }

        // Add error context to Sentry
        if (error instanceof Error) {
          Sentry.setContext('payment_error', {
            errorName: error.name,
            errorMessage: error.message,
            stack: error.stack,
            userId: body?.userId || 'unknown',
            orderId: body?.orderId || 'unknown',
            amount: body?.amount || 0,
          })
        }

        return NextResponse.json(
          { 
            error: 'Payment processing failed',
            message: error instanceof Error ? error.message : 'Unknown error'
          },
          { status: 500 }
        )
      }
    }
  )
}