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

        // Add initial delay to show spinner (0.2 seconds)
        await new Promise(resolve => setTimeout(resolve, 200))

        // Simulate database timeout 100% of the time for demo
        const shouldTimeout = true // Changed to 100% for demo - ensures errors occur every time
        
        if (shouldTimeout) {
          // Simulate database timeout with longer delay
          const startTime = Date.now()
          
          // Create a CUSTOM SPAN for the slow database query with searchable data
          await Sentry.startSpan(
            {
              name: 'Database Query - User Payments',
              op: 'db.query',
            },
            async () => {
              // Set tags for searchability in Sentry
              Sentry.setTag('user_id', userId)
              Sentry.setTag('order_id', orderId)
              Sentry.setTag('payment_amount', amount.toString())
              Sentry.setTag('operation', 'fetch_user_payments')
              Sentry.setTag('query_type', 'pg_sleep')
              Sentry.setTag('module', 'database')
              
              // Create a REAL slow database query using PostgreSQL pg_sleep
              // This will show up in Sentry's Backend Performance as an actual slow query
              await prisma.$queryRaw`SELECT pg_sleep(1.5)`
            }
          )
          
          const duration = Date.now() - startTime
          
          // Create a CUSTOM SPAN for fetching previous transactions with searchable data
          const previousTransactions = await Sentry.startSpan(
            {
              name: 'Database Query - Previous Transactions',
              op: 'db.query',
            },
            async () => {
              // Set tags for searchability in Sentry
              Sentry.setTag('user_id', userId)
              Sentry.setTag('order_id', orderId)
              Sentry.setTag('payment_amount', amount.toString())
              Sentry.setTag('operation', 'fetch_previous_transactions')
              Sentry.setTag('query_type', 'findMany')
              Sentry.setTag('module', 'database')
              
              const transactions = await prisma.order.findMany({
                where: {
                  userId,
                  status: 'CONFIRMED'
                },
                orderBy: { createdAt: 'desc' },
                take: 5
              })
              
              // Set tag with result count
              Sentry.setTag('previous_transactions_count', transactions.length.toString())
              return transactions
            }
          ) as Array<{ id: string; userId: string; status: string; createdAt: Date }>
          
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

        // Simulate other failure scenarios (15% chance for demo)
        const randomFailure = Math.random()
        
        if (randomFailure < 0.15) {
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

        // Log successful payment processing with Sentry
        const { logger } = Sentry
        logger.info('Payment processed successfully', {
          userId,
          orderId: updatedOrder.id,
          paymentAmount: amount,
          paymentMethod,
          orderStatus: updatedOrder.status,
          previousTransactionsCount: previousTransactions.length,
          module: 'payment',
          action: 'process_success',
        })

        // Set success tags for Sentry
        Sentry.setTag('payment_status', 'success')
        Sentry.setTag('user_id', userId)
        Sentry.setTag('order_id', updatedOrder.id)
        Sentry.setTag('payment_amount', amount.toString())
        Sentry.setTag('previous_transactions', previousTransactions.length.toString())

        // Add success context to Sentry
        Sentry.setContext('payment_success', {
          userId,
          orderId: updatedOrder.id,
          paymentAmount: amount,
          paymentMethod,
          orderStatus: updatedOrder.status,
          previousTransactionsCount: previousTransactions.length,
          timestamp: new Date().toISOString(),
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