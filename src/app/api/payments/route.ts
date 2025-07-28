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

        // Log payment attempt with Sentry captureMessage
        Sentry.captureMessage('Payment attempt started', {
          level: 'info',
          tags: {
            module: 'payment',
            action: 'attempt',
            user_id: userId,
            payment_amount: amount.toString(),
            order_id: orderId,
          },
          extra: {
            userId,
            orderId,
            paymentAmount: amount,
            module: 'payment',
            action: 'attempt',
            user_id: userId,
            payment_amount: amount,
            order_id: orderId,
          },
        })

        // Add initial delay to show spinner (2.5 seconds)
        await new Promise(resolve => setTimeout(resolve, 2500))

        // Simulate database timeout more frequently (20% chance for demo)
        const shouldTimeout = Math.random() < 0.2 // Changed to 20% for demo - allows successful runs first
        
        if (shouldTimeout) {
          // Simulate database timeout with longer delay
          const startTime = Date.now()
          
          // Log database query start with Sentry captureMessage
          Sentry.captureMessage('Database query started', {
            level: 'info',
            tags: {
              operation: 'fetch_user_payments',
              user_id: userId,
              order_id: orderId,
              module: 'database',
            },
            extra: {
              operation: 'fetch_user_payments',
              userId,
              orderId,
              module: 'database',
            },
          })

          // Create a REAL slow database query using PostgreSQL pg_sleep
          // This will show up in Sentry's Backend Performance as an actual slow query
          await prisma.$queryRaw`SELECT pg_sleep(7.5)`
          
          const duration = Date.now() - startTime
          
          // Get previous successful transactions for context (AFTER timeout simulation)
          const previousTransactions = await prisma.order.findMany({
            where: {
              userId,
              status: 'CONFIRMED'
            },
            orderBy: { createdAt: 'desc' },
            take: 5
          })
          
          // Log timeout with Sentry captureMessage - including all required info
          Sentry.captureMessage('Database timeout occurred', {
            level: 'error',
            tags: {
              duration: duration.toString(),
              operation: 'fetch_user_payments',
              user_id: userId,
              order_id: orderId,
              payment_amount: amount.toString(),
              previous_transactions: previousTransactions.length.toString(),
              module: 'database',
            },
            extra: {
              duration,
              operation: 'fetch_user_payments',
              userId,
              orderId,
              paymentAmount: amount,
              previousTransactionsCount: previousTransactions.length,
              module: 'database',
              user_id: userId,
              payment_amount: amount,
              previous_transactions: previousTransactions.length,
              order_id: orderId,
            },
          })

          // Log timeout with structured logging - including all required info
          Sentry.captureMessage('Payment timeout', {
            level: 'error',
            tags: {
              user_id: userId,
              order_id: orderId,
              payment_amount: amount.toString(),
              previous_transactions: previousTransactions.length.toString(),
              duration: duration.toString(),
              module: 'payment',
              action: 'timeout',
            },
            extra: {
              userId,
              orderId,
              paymentAmount: amount,
              previousTransactionsCount: previousTransactions.length,
              duration,
              module: 'payment',
              action: 'timeout',
              user_id: userId,
              payment_amount: amount,
              previous_transactions: previousTransactions.length,
              order_id: orderId,
            },
          })
          
          // Create a more detailed error for Sentry
          const timeoutError = new Error(`Database timeout after ${duration}ms during payment processing`)
          timeoutError.name = 'DatabaseTimeoutError'
          
          // Add additional context to the error - including all required info
          Sentry.setContext('database_timeout', {
            duration,
            operation: 'fetch_user_payments',
            userId,
            orderId,
            amount,
            paymentMethod,
            previousTransactionsCount: previousTransactions.length,
            timestamp: new Date().toISOString(),
          })

          // Set error level and tags
          Sentry.setTag('error_type', 'database_timeout')
          Sentry.setTag('payment_status', 'failed')
          Sentry.setTag('timeout_duration', duration.toString())
          Sentry.setTag('user_id', userId)
          Sentry.setTag('payment_amount', amount.toString())
          Sentry.setTag('previous_transactions', previousTransactions.length.toString())
          
          // Capture the exception in Sentry - including all required info
          Sentry.captureException(timeoutError, {
            tags: {
              error_type: 'database_timeout',
              payment_status: 'failed',
              timeout_duration: duration.toString(),
              user_id: userId,
              payment_amount: amount.toString(),
              previous_transactions: previousTransactions.length.toString(),
            },
            extra: {
              userId,
              orderId,
              amount,
              paymentMethod,
              duration,
              previousTransactionsCount: previousTransactions.length,
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

        // Log previous transactions info
        Sentry.captureMessage('Previous transactions fetched', {
          level: 'info',
          tags: {
            user_id: userId,
            previous_transactions: previousTransactions.length.toString(),
            module: 'payment',
            action: 'fetch_history',
          },
          extra: {
            userId,
            previousTransactionsCount: previousTransactions.length,
            module: 'payment',
            action: 'fetch_history',
            user_id: userId,
            previous_transactions: previousTransactions.length,
          },
        })

        // Simulate other failure scenarios (only 5% chance since timeout is 20%)
        const randomFailure = Math.random()
        
        if (randomFailure < 0.05) {
          // Log payment gateway failure with all required info
          Sentry.captureMessage('Payment gateway declined transaction', {
            level: 'error',
            tags: {
              user_id: userId,
              order_id: orderId,
              payment_amount: amount.toString(),
              previous_transactions: previousTransactions.length.toString(),
              module: 'payment',
              action: 'gateway_decline',
            },
            extra: {
              userId,
              orderId,
              paymentAmount: amount,
              previousTransactionsCount: previousTransactions.length,
              module: 'payment',
              action: 'gateway_decline',
              user_id: userId,
              payment_amount: amount,
              previous_transactions: previousTransactions.length,
              order_id: orderId,
            },
          })

          const gatewayError = new Error('Payment gateway declined the transaction')
          gatewayError.name = 'PaymentGatewayError'
          
          // Capture gateway error with all required info
          Sentry.captureException(gatewayError, {
            tags: {
              error_type: 'payment_gateway_decline',
              payment_status: 'failed',
              user_id: userId,
              payment_amount: amount.toString(),
              previous_transactions: previousTransactions.length.toString(),
            },
            extra: {
              userId,
              orderId,
              amount,
              paymentMethod,
              previousTransactionsCount: previousTransactions.length,
            },
          })
          
          throw gatewayError
        }

        // Simulate successful payment processing
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Update order status
        const updatedOrder = await prisma.order.update({
          where: { id: orderId },
          data: { status: 'CONFIRMED' }
        })

        // Log successful payment with Sentry captureMessage
        Sentry.captureMessage('Payment completed successfully', {
          level: 'info',
          tags: {
            user_id: userId,
            order_id: orderId,
            payment_amount: amount.toString(),
            previous_transactions: previousTransactions.length.toString(),
            module: 'payment',
            action: 'success',
          },
          extra: {
            userId,
            orderId,
            paymentAmount: amount,
            previousTransactions: previousTransactions.length,
            module: 'payment',
            action: 'success',
            user_id: userId,
            payment_amount: amount,
            previous_transactions: previousTransactions.length,
            order_id: orderId,
          },
        })

        // Log successful payment processing
        Sentry.captureMessage('Payment processed successfully', {
          level: 'info',
          tags: {
            order_id: orderId,
            payment_amount: amount.toString(),
            previous_transactions: previousTransactions.length.toString(),
            module: 'payment',
            user_id: userId,
          },
          extra: {
            orderId,
            amount,
            previousTransactions: previousTransactions.length,
            module: 'payment',
            user_id: userId,
            payment_amount: amount,
            previous_transactions: previousTransactions.length,
            order_id: orderId,
          },
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

        // Try to fetch previous successful transactions for context
        let previousTransactionsCount = 0
        try {
          if (body?.userId) {
            const previousTransactions = await prisma.order.findMany({
              where: {
                userId: body.userId,
                status: 'CONFIRMED'
              },
              orderBy: { createdAt: 'desc' },
              take: 5
            })
            previousTransactionsCount = previousTransactions.length
          }
        } catch (fetchError) {
          console.error('Failed to fetch previous transactions:', fetchError)
        }

        // Log payment failure with Sentry captureMessage
        Sentry.captureMessage('Payment failed', {
          level: 'error',
          tags: {
            user_id: body?.userId || 'unknown',
            order_id: body?.orderId || 'unknown',
            payment_amount: (body?.amount || 0).toString(),
            previous_transactions: previousTransactionsCount.toString(),
            module: 'payment',
            action: 'failure',
            error_message: error instanceof Error ? error.message : 'Unknown error',
            error_name: error instanceof Error ? error.name : 'UnknownError',
          },
          extra: {
            userId: body?.userId || 'unknown',
            orderId: body?.orderId || 'unknown',
            paymentAmount: body?.amount || 0,
            previousTransactionsCount,
            module: 'payment',
            action: 'failure',
            errorMessage: error instanceof Error ? error.message : 'Unknown error',
            errorName: error instanceof Error ? error.name : 'UnknownError',
            user_id: body?.userId || 'unknown',
            payment_amount: body?.amount || 0,
            previous_transactions: previousTransactionsCount,
            order_id: body?.orderId || 'unknown',
          },
        })

        // Capture the exception
        if (error instanceof Error) {
          Sentry.captureException(error, {
            tags: {
              module: 'payment',
              action: 'failure',
              user_id: body?.userId || 'unknown',
              payment_amount: (body?.amount || 0).toString(),
              previous_transactions: previousTransactionsCount.toString(),
            },
            extra: {
              userId: body?.userId || 'unknown',
              orderId: body?.orderId || 'unknown',
              paymentAmount: body?.amount || 0,
              previousTransactionsCount,
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
            previousTransactionsCount,
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